import serial
import time
import struct
import math
import collections
import threading
from threading import Lock
import numpy as np
import tkinter as tk
from tkinter import ttk, messagebox
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.animation import FuncAnimation

# ==========================================
# 0. 用户配置与全局参数
# ==========================================
IMU_PORT = '/dev/rfcomm0'       
MOTOR_PORT = '/dev/ttyACM0'     
BAUDRATE = 115200

ID_RIGHT_LEG = 0x68 
ID_LEFT_LEG  = 0x67 

# --- 新版 Torque Profile 参数 ---
# 逻辑：从 0% 开始助力，先升后降
# 0% = Max Extension (腿在最后方)
PEAK_TORQUE = 3.0       # 峰值力 (Nm)

# 时间轴设定 (0.0 ~ 1.0)
T_ONSET  = 0.90         # 起始: 0% (刚检测到 MHE)
T_PEAK   = 0.00         # 峰值: 20% (摆动初期)
T_OFFSET = 0.40         # 结束: 40% (摆动中期)

MAX_SAFE_TORQUE = 6.0   

# 静止检测的基础阈值 (deg/s)
# 注意：现在的逻辑增加了计时器，所以这个阈值可以设得比较敏感
GYRO_ACTIVE_THRESHOLD = 5.0

# ==========================================
# 1. 硬件驱动层
# ==========================================
class AKMotorDriver:
    def __init__(self, port, baudrate=115200):
        self.ser = None
        self.port = port
        self.baudrate = baudrate
        self.connected = False
        self.lock = Lock()
        self.FRAME_HEADER = b'\x01'
        self.FRAME_STD_ID = b'\x00\x00\x00\x00'
        self.FRAME_EXTEND = b'\x01'
        self.FRAME_DATA_PLACEHOLDER = b'\x00'
        self.FRAME_LEN_SEND = b'\x04'
        self.MODE_TORQUE = b'\x01\x00\x00'
        self.MODE_ORIGIN = b'\x05\x00\x00'
        self.CMD_ZERO    = b'\x00\x00\x00\x00'

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=0.05)
            self.connected = True
            print(f"[Motor] Connected on {self.port}")
            return True
        except Exception as e:
            print(f"[Motor] Connection Failed: {e}")
            return False

    def _build_frame(self, motor_id, mode_bytes, data_bytes):
        id_byte = bytes([motor_id])
        return (self.FRAME_HEADER + self.FRAME_STD_ID + id_byte + mode_bytes +
                self.FRAME_EXTEND + self.FRAME_DATA_PLACEHOLDER + self.FRAME_LEN_SEND + data_bytes)

    def set_zero(self, motor_id):
        if not self.connected: return
        with self.lock:
            self.ser.write(self._build_frame(motor_id, self.MODE_ORIGIN, self.CMD_ZERO))
        print(f"[Motor] Set Zero for ID {hex(motor_id)}")

    def send_torque(self, motor_id, torque_nm):
        if not self.connected: return
        torque_nm = max(min(torque_nm, MAX_SAFE_TORQUE), -MAX_SAFE_TORQUE)
        KT = 0.105
        #data_bytes = self._int_to_bytes(int((torque_nm / KT) * 1000.0))
        data_bytes = self._int_to_bytes(int((torque_nm) * 2000.0))
        with self.lock:
            self.ser.write(self._build_frame(motor_id, self.MODE_TORQUE, data_bytes))

    def _int_to_bytes(self, value):
        if value < 0: value = value & 0xFFFFFFFF
        return bytes([(value >> 24) & 0xFF, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF])

    def close(self):
        self.connected = False
        if self.ser: self.ser.close()

class LpmsB2Driver:
    def __init__(self, port):
        self.port = port
        self.ser = None
        self.running = False
        self.lock = Lock()
        # 使用 Y 轴变量
        self.euler_y = 0.0
        self.gyro_y = 0.0

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, 115200, timeout=0.1)
            self.running = True
            threading.Thread(target=self.rx_loop, daemon=True).start()
            print(f"[IMU] Connected on {self.port}")
            return True
        except Exception as e:
            print(f"[IMU] Connection Failed: {e}")
            return False

    def rx_loop(self):
        while self.running:
            try:
                if self.ser.in_waiting:
                    if self.ser.read(1) != b'\x3a': continue
                    header = self.ser.read(6)
                    if len(header) < 6: continue
                    data_len = header[4] + (header[5] << 8)
                    payload = self.ser.read(data_len)
                    if len(payload) != data_len: continue
                    self.ser.read(4)
                   
                    if data_len == 28:
                        data = struct.unpack('<Iffffff', payload)
                        with self.lock:
                            # 修改: 使用 index 2 (Gyro Y) 和 5 (Euler Y)
                            self.gyro_y = data[2] * 57.29578
                            self.euler_y = data[5] * 57.29578
            except:
                time.sleep(0.005)

    def get_data(self):
        with self.lock:
            return self.euler_y, self.gyro_y

# ==========================================
# 2. 核心算法层 (Thigh MHE + Asymmetric Profile)
# ==========================================
class ThighMHEGaitEstimator:
    def __init__(self):
        self.last_event_time = time.time()
        self.avg_stride_duration = 1.2
        self.stride_buffer = collections.deque(maxlen=5)
       
        self.filter_window_size = 10 
        self.pitch_buffer = collections.deque(maxlen=self.filter_window_size)
        self.filtered_pitch = 0.0
       
        # 谷值检测参数
        self.valley_candidate = 999.0 
        self.noise_margin = 6.0       
       
        # 深度阈值: 只要小于 20 度，就开始寻找波谷 (适应 0~60 度的范围)
        self.max_extension_threshold = 20.0
       
        self.lockout_ratio = 0.7
        self.min_safe_lockout = 0.6
       
    def update(self, raw_pitch):
        t_now = time.time()
       
        self.pitch_buffer.append(raw_pitch)
        if self.pitch_buffer:
            self.filtered_pitch = sum(self.pitch_buffer) / len(self.pitch_buffer)
        else:
            self.filtered_pitch = raw_pitch
           
        current_lockout = max(self.min_safe_lockout, self.avg_stride_duration * self.lockout_ratio)
        time_since_last = t_now - self.last_event_time
       
        if time_since_last > current_lockout:
            if self.filtered_pitch < self.valley_candidate:
                self.valley_candidate = self.filtered_pitch
           
            delta_rise = self.filtered_pitch - self.valley_candidate
           
            if (delta_rise > self.noise_margin) and \
               (self.valley_candidate < self.max_extension_threshold):
               
                stride_time = time_since_last
                if 0.6 < stride_time < 3.0:
                    self.stride_buffer.append(stride_time)
                    self.avg_stride_duration = sum(self.stride_buffer) / len(self.stride_buffer)
               
                self.last_event_time = t_now
                self.valley_candidate = 999.0

        elapsed = t_now - self.last_event_time
        phase = elapsed / self.avg_stride_duration
       
        if elapsed > (1.3 * self.avg_stride_duration):
            phase = 0.0
        else:
            phase = phase % 1.0
           
        return phase

def get_profile_torque(phase, gain):
    """
    非对称力矩生成:
    Rise: T_ONSET -> T_PEAK
    Fall: T_PEAK -> T_OFFSET
    """
    # 1. 范围检查
    if phase < T_ONSET or phase > T_OFFSET:
        return 0.0
   
    # 2. 上升段 (Rise)
    if phase < T_PEAK:
        duration = T_PEAK - T_ONSET
        if duration <= 0: return PEAK_TORQUE * gain
        progress = (phase - T_ONSET) / duration
        # 半余弦插值 (0->1)
        scale = 0.5 * (1 - math.cos(math.pi * progress))
        return scale * PEAK_TORQUE * gain

    # 3. 下降段 (Fall)
    else:
        duration = T_OFFSET - T_PEAK
        if duration <= 0: return 0.0
        progress = (phase - T_PEAK) / duration
        # 半余弦插值 (1->0)
        scale = 0.5 * (1 + math.cos(math.pi * progress))
        return scale * PEAK_TORQUE * gain

# ==========================================
# 3. 系统控制主类 (Smart Stillness Detection)
# ==========================================
class ExoController:
    def __init__(self):
        self.motor = AKMotorDriver(MOTOR_PORT, BAUDRATE)
        self.imu = LpmsB2Driver(IMU_PORT)
        self.gait_estimator = ThighMHEGaitEstimator()
       
        self.running = False
        self.motor_enabled = False
        self.lock = Lock()
        self.data_store = {
            'time': collections.deque(maxlen=200),
            'pitch': collections.deque(maxlen=200),
            'phase': collections.deque(maxlen=200),
            'torque_R': collections.deque(maxlen=200),
            'torque_L': collections.deque(maxlen=200)
        }
        self.start_time = time.time()
        self.safety_gain = 0.0
       
        # [新增] 防抖计时器
        self.stillness_timer = 0.0
        self.last_loop_time = time.time()

    def start(self):
        imu_ok = self.imu.connect()
        motor_ok = self.motor.connect()
        if not imu_ok: print("[Warn] IMU Failed")
        if not motor_ok: print("[Warn] Motor Failed")
        self.running = True
        self.start_time = time.time()
        threading.Thread(target=self.control_loop, daemon=True).start()
        return True

    def stop(self):
        self.running = False
        if self.motor.connected:
            self.motor.send_torque(ID_RIGHT_LEG, 0)
            self.motor.send_torque(ID_LEFT_LEG, 0)
            time.sleep(0.5)
            self.motor.close()

    def zero_motors(self):
        self.motor.set_zero(ID_RIGHT_LEG)
        self.motor.set_zero(ID_LEFT_LEG)

    def control_loop(self):
        self.last_loop_time = time.time()
       
        while self.running:
            # 计算循环时间间隔 dt
            current_sys_time = time.time()
            dt = current_sys_time - self.last_loop_time
            self.last_loop_time = current_sys_time
           
            t_now = current_sys_time - self.start_time
           
            # 1. 获取 Y 轴数据
            pitch, gyro_val = self.imu.get_data()
           
            # 如果波形方向反了 (比如向后摆动是正数增加)，请取消下一行的注释
            # pitch = -pitch
           
            # 2. 智能静止检测 (Smart Stillness Detection)
            # 只要角速度大于 5.0，就认为在动，并重置计时器
            if abs(gyro_val) > GYRO_ACTIVE_THRESHOLD:
                self.stillness_timer = 0.0
                is_moving = True
            else:
                # 如果角速度小，开始累积时间
                self.stillness_timer += dt
                # 如果停顿时间小于 0.3秒 (步态转换瞬间)，依然视为“运动中”
                if self.stillness_timer < 0.3:
                    is_moving = True
                else:
                    # 真的停下来了
                    is_moving = False
           
            # 3. 增益平滑控制
            if is_moving:
                self.safety_gain += 0.02 # 缓慢增加
            else:
                self.safety_gain -= 0.05 # 快速切断
            self.safety_gain = max(0.0, min(1.0, self.safety_gain))

            # 4. 算法更新
            phase_R = self.gait_estimator.update(pitch)
            phase_L = (phase_R + 0.5) % 1.0
           
            cmd_torque_R = get_profile_torque(phase_R, self.safety_gain)
            cmd_torque_L = get_profile_torque(phase_L, self.safety_gain)*(-1)
           
            # 5. 发送指令
            if self.motor_enabled and self.motor.connected:
                self.motor.send_torque(ID_RIGHT_LEG, cmd_torque_R)
                self.motor.send_torque(ID_LEFT_LEG, cmd_torque_L)
           
            with self.lock:
                self.data_store['time'].append(t_now)
                self.data_store['pitch'].append(pitch)
                self.data_store['phase'].append(phase_R * 100)
                self.data_store['torque_R'].append(cmd_torque_R)
                self.data_store['torque_L'].append(cmd_torque_L)
           
            # 保持约 100Hz 循环
            time.sleep(0.01)

# ==========================================
# 4. GUI 界面层 (3 Plots)
# ==========================================
class ExoGUI:
    def __init__(self, root, controller):
        self.root = root
        self.ctrl = controller
        self.root.title("Final Exo Control (Smart Stillness + 3Plots)")
        self.root.geometry("1000x800")
       
        frame_top = ttk.Frame(root)
        frame_top.pack(fill=tk.X, padx=10, pady=10)
        ttk.Button(frame_top, text="1. Connect & Start", command=self.on_start).pack(side=tk.LEFT, padx=5)
        ttk.Button(frame_top, text="2. Set Zero", command=self.on_zero).pack(side=tk.LEFT, padx=5)
        self.btn_mode = tk.Button(frame_top, text="MODE: SIMULATION", bg="green", fg="white",
                                  command=self.toggle_mode, width=25)
        self.btn_mode.pack(side=tk.LEFT, padx=20)
        ttk.Button(frame_top, text="EXIT", command=self.on_stop).pack(side=tk.RIGHT)
        self.lbl_status = ttk.Label(root, text="Waiting...", font=("Arial", 10))
        self.lbl_status.pack(pady=5)

        # 3 行 1 列，共享 X 轴
        self.fig, (self.ax1, self.ax2, self.ax3) = plt.subplots(3, 1, figsize=(10, 8), dpi=100, sharex=True)
        self.fig.subplots_adjust(hspace=0.3)
       
        # 1. Pitch
        self.ax1.set_title("1. Thigh Pitch (Y-Axis)")
        self.ax1.set_ylabel("Angle (deg)")
        self.ax1.grid(True)
        self.line_pitch, = self.ax1.plot([], [], 'g-', label='Pitch', linewidth=1.5)
        self.ax1.set_ylim(-20, 80) # 适应 0~60 范围
        self.ax1.legend(loc='upper right')

        # 2. Phase
        self.ax2.set_title("2. Gait Phase")
        self.ax2.set_ylabel("Phase (%)")
        self.ax2.grid(True)
        self.line_phase, = self.ax2.plot([], [], 'b--', label='Phase %', linewidth=1.5)
        self.ax2.set_ylim(-5, 105)
       
        # 3. Torque
        self.ax3.set_title(f"3. Torque (0% -> {T_PEAK*100}% -> {T_OFFSET*100}%)")
        self.ax3.set_ylabel("Nm")
        self.ax3.set_xlabel("Time (s)")
        self.ax3.grid(True)
        self.line_trq_r, = self.ax3.plot([], [], 'r-', label='Right', linewidth=2)
        self.line_trq_l, = self.ax3.plot([], [], 'orange', label='Left', linewidth=2, linestyle=':')
        self.ax3.set_ylim(-1, 8)
        self.ax3.legend(loc='upper right')
       
        self.canvas = FigureCanvasTkAgg(self.fig, master=root)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        self.ani = FuncAnimation(self.fig, self.update_plot, interval=100, blit=False)

    def on_start(self):
        if self.ctrl.start():
            self.lbl_status.config(text="Running")

    def on_zero(self):
        self.ctrl.zero_motors()

    def toggle_mode(self):
        if not self.ctrl.running: return
        self.ctrl.motor_enabled = not self.ctrl.motor_enabled
        state = "REAL (DANGER)" if self.ctrl.motor_enabled else "SIMULATION"
        color = "red" if self.ctrl.motor_enabled else "green"
        self.btn_mode.config(text=f"MODE: {state}", bg=color)
        self.lbl_status.config(text=f"Status: {state}")

    def on_stop(self):
        self.ctrl.stop()
        self.root.quit()
        self.root.destroy()

    def update_plot(self, frame):
        if not self.ctrl.running: return
        with self.ctrl.lock:
            t = list(self.ctrl.data_store['time'])
            p = list(self.ctrl.data_store['pitch'])
            ph = list(self.ctrl.data_store['phase'])
            tr = list(self.ctrl.data_store['torque_R'])
            tl = list(self.ctrl.data_store['torque_L'])
        if not t: return
       
        self.line_pitch.set_data(t, p)
        self.line_phase.set_data(t, ph)
        self.line_trq_r.set_data(t, tr)
        self.line_trq_l.set_data(t, tl)
       
        cur = t[-1]
        self.ax1.set_xlim(cur - 5, cur + 0.2)
        if p: self.ax1.set_ylim(min(p)-10, max(p)+10)

if __name__ == "__main__":
    root = tk.Tk()
    controller = ExoController()
    app = ExoGUI(root, controller)
    root.protocol("WM_DELETE_WINDOW", app.on_stop)
    root.mainloop()