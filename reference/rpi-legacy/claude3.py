#!/usr/bin/env python3
"""
data_collector_v2.py
MMH场景离线数据采集 (IMU + 双电机编码器)

改进:
  - 每个trial独立保存为单独文件
  - 文件命名: {subject}_{protocol}_{trial编号}_{时间戳}.csv
  - 科学实验范式: P0-P6共7个protocol
  - GUI支持protocol选择、trial自动编号、一键Start/Stop

硬件:
  RPi4B -> USB转CAN (/dev/ttyACM0) -> AK电机 L=0x67, R=0x68
  RPi4B -> 蓝牙 (/dev/rfcomm0) -> LPMS-B2 IMU

电机收发: 基于squat.py验证过的协议
IMU: 基于117.py验证过的协议
"""

import serial
import time
import struct
import collections
import threading
from threading import Lock, Thread
import csv
import os
from datetime import datetime
import tkinter as tk
from tkinter import ttk
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.animation import FuncAnimation

# ==========================================
# 配置
# ==========================================
IMU_PORT   = '/dev/rfcomm0'
MOTOR_PORT = '/dev/ttyACM0'
BAUDRATE   = 115200

ID_RIGHT_LEG = 0x68
ID_LEFT_LEG  = 0x67
MOTOR_IDS = [ID_LEFT_LEG, ID_RIGHT_LEG]

MAX_SAFE_TORQUE = 6.0

DATA_DIR = os.path.expanduser('~/exo_data')
os.makedirs(DATA_DIR, exist_ok=True)

# ==========================================
# 实验范式定义
# ==========================================
PROTOCOLS = {
    'P0_static': {
        'name': 'P0 静止站立',
        'desc': '自然站直不动10秒',
        'trials': 3,
        'key': 'F1',
    },
    'P1_walk_normal': {
        'name': 'P1 正常步速行走',
        'desc': '直线走12-15步(单程)',
        'trials': 5,
        'key': 'F2',
    },
    'P1_walk_slow': {
        'name': 'P1 慢速行走',
        'desc': '刻意放慢,直线走12-15步',
        'trials': 3,
        'key': 'F3',
    },
    'P1_walk_fast': {
        'name': 'P1 快速行走',
        'desc': '快步走(不跑),直线12-15步',
        'trials': 3,
        'key': 'F4',
    },
    'P2_gait_transition': {
        'name': 'P2 步态启停',
        'desc': '站3s→走8步→站3s',
        'trials': 6,
        'key': 'F5',
    },
    'P3_squat': {
        'name': 'P3 原地下蹲',
        'desc': '站2s→蹲下2s→蹲底停1s→起身2s→站2s,连续3次',
        'trials': 5,
        'key': 'F6',
    },
    'P4_walk_squat': {
        'name': 'P4 行走+下蹲',
        'desc': '站2s→走6步→停1s→蹲1次→站1s→走6步→站2s',
        'trials': 8,
        'key': 'F7',
    },
    'P5_mmh_full': {
        'name': 'P5 完整MMH序列',
        'desc': '站2s→走→停→蹲取→站→走→停→蹲放→站2s',
        'trials': 8,
        'key': 'F8',
    },
    'P6_mmh_continuous': {
        'name': 'P6 连续MMH(3循环)',
        'desc': '连续做3个完整MMH循环,不刻意停顿',
        'trials': 4,
        'key': 'F9',
    },
}


# ==========================================
# IMU驱动 (117.py原样)
# ==========================================
class LpmsB2Driver:
    def __init__(self, port):
        self.port = port
        self.ser = None
        self.running = False
        self.lock = Lock()
        self.euler_x = 0.0
        self.euler_y = 0.0
        self.euler_z = 0.0
        self.gyro_x = 0.0
        self.gyro_y = 0.0
        self.gyro_z = 0.0

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, 115200, timeout=0.1)
            self.running = True
            Thread(target=self._rx_loop, daemon=True).start()
            print(f"[IMU] Connected on {self.port}")
            return True
        except Exception as e:
            print(f"[IMU] FAIL: {e}")
            return False

    def _rx_loop(self):
        while self.running:
            try:
                if self.ser and self.ser.in_waiting:
                    if self.ser.read(1) != b'\x3a':
                        continue
                    header = self.ser.read(6)
                    if len(header) < 6:
                        continue
                    data_len = header[4] + (header[5] << 8)
                    payload = self.ser.read(data_len)
                    if len(payload) != data_len:
                        continue
                    self.ser.read(4)
                    if data_len == 28:
                        data = struct.unpack('<Iffffff', payload)
                        with self.lock:
                            self.gyro_x  = data[1] * 57.29578
                            self.gyro_y  = data[2] * 57.29578
                            self.gyro_z  = data[3] * 57.29578
                            self.euler_x = data[4] * 57.29578
                            self.euler_y = data[5] * 57.29578
                            self.euler_z = data[6] * 57.29578
            except:
                time.sleep(0.005)

    def get_data(self):
        with self.lock:
            return (self.euler_x, self.euler_y, self.euler_z,
                    self.gyro_x, self.gyro_y, self.gyro_z)

    def close(self):
        self.running = False
        if self.ser:
            try: self.ser.close()
            except: pass


# ==========================================
# 电机驱动 (基于squat.py，扩展双电机)
# ==========================================
class AKMotorDriver:
    def __init__(self, port, baudrate=115200):
        self.ser = None
        self.port = port
        self.baudrate = baudrate
        self.connected = False
        self.running = False
        self.serial_lock = Lock()
        self.data_lock = Lock()

        # === 帧常量 (squat.py原样) ===
        self.FRAME_HEADER_FIRST = bytes([0x01])
        self.FRAME_STANDARD_ID = bytes([0x00, 0x00, 0x00, 0x00])
        self.FRAME_EXTEND = bytes([0x01])
        self.FRAME_DATA = bytes([0x00])
        self.FRAME_LENGTH_4 = bytes([0x04])
        self.FRAME_LENGTH_8 = bytes([0x08])

        self.MODE_FEEDBACK = bytes([0x29, 0x00, 0x00])
        self.MODE_TORQUE   = bytes([0x01, 0x00, 0x00])
        self.MODE_ORIGIN   = bytes([0x05, 0x00, 0x00])
        self.ORIGIN_DATA   = bytes([0x00, 0x00, 0x00, 0x00])

        # === 为每个电机构建接收header ===
        self.RX_HEADERS = {}
        for mid in MOTOR_IDS:
            self.RX_HEADERS[mid] = (
                self.FRAME_HEADER_FIRST +
                self.FRAME_STANDARD_ID +
                bytes([mid]) +
                self.MODE_FEEDBACK +
                self.FRAME_EXTEND +
                self.FRAME_DATA +
                self.FRAME_LENGTH_8
            )
        self.RX_HEADER_LEN = len(self.RX_HEADERS[ID_RIGHT_LEG])
        self.RX_FRAME_TOTAL = self.RX_HEADER_LEN + 8

        # === 双电机状态 ===
        self.pos  = {mid: 0.0 for mid in MOTOR_IDS}
        self.spd  = {mid: 0.0 for mid in MOTOR_IDS}
        self.cur  = {mid: 0.0 for mid in MOTOR_IDS}
        self.temp = {mid: 0   for mid in MOTOR_IDS}
        self.err  = {mid: 0   for mid in MOTOR_IDS}
        self.fb_count = 0

    def connect(self):
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=0.1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            time.sleep(2)
            self.connected = True
            self.running = True
            Thread(target=self._rx_loop, daemon=True).start()
            print(f"[Motor] Connected on {self.port}")
            return True
        except Exception as e:
            print(f"[Motor] FAIL: {e}")
            return False

    def _rx_loop(self):
        buf = b''
        while self.running:
            try:
                with self.serial_lock:
                    if self.ser and self.ser.in_waiting > 0:
                        new_data = self.ser.read(self.ser.in_waiting)
                        buf += new_data

                keep_searching = True
                while keep_searching and len(buf) >= self.RX_FRAME_TOTAL:
                    keep_searching = False

                    earliest_idx = -1
                    earliest_mid = None
                    for mid in MOTOR_IDS:
                        idx = buf.find(self.RX_HEADERS[mid])
                        if idx >= 0:
                            if earliest_idx < 0 or idx < earliest_idx:
                                earliest_idx = idx
                                earliest_mid = mid

                    if earliest_mid is None:
                        keep_len = min(len(buf), self.RX_HEADER_LEN - 1)
                        buf = buf[-keep_len:] if keep_len > 0 else b''
                        break

                    if earliest_idx > 0:
                        buf = buf[earliest_idx:]
                        earliest_idx = 0

                    if len(buf) < self.RX_FRAME_TOTAL:
                        break

                    full_frame = buf[:self.RX_FRAME_TOTAL]
                    data8 = full_frame[-8:]

                    self._decode(earliest_mid, data8)

                    buf = buf[self.RX_FRAME_TOTAL:]
                    keep_searching = True

                time.sleep(0.001)
            except Exception as e:
                time.sleep(0.01)

    def _decode(self, motor_id, data8):
        if len(data8) != 8:
            return
        try:
            pos_raw = (data8[0] << 8) | data8[1]
            if pos_raw >= 0x8000:
                position = (pos_raw - 0x10000) * 0.1
            else:
                position = pos_raw * 0.1

            spd_raw = (data8[2] << 8) | data8[3]
            if spd_raw >= 0x8000:
                speed = (spd_raw - 0x10000) * 10.0
            else:
                speed = spd_raw * 10.0

            cur_raw = (data8[4] << 8) | data8[5]
            if cur_raw >= 0x8000:
                current = (cur_raw - 0x10000) * 0.01
            else:
                current = cur_raw * 0.01

            temp_raw = data8[6]
            if temp_raw & 0x80:
                temperature = temp_raw - 0x100
            else:
                temperature = temp_raw

            error_code = data8[7]

            with self.data_lock:
                self.pos[motor_id]  = position
                self.spd[motor_id]  = speed
                self.cur[motor_id]  = current
                self.temp[motor_id] = temperature
                self.err[motor_id]  = error_code
                self.fb_count += 1

        except Exception as e:
            print(f"[Motor] Decode err: {e}")

    def _build_send_frame(self, motor_id, mode, data4):
        return (self.FRAME_HEADER_FIRST +
                self.FRAME_STANDARD_ID +
                bytes([motor_id]) +
                mode +
                self.FRAME_EXTEND +
                self.FRAME_DATA +
                self.FRAME_LENGTH_4 +
                data4)

    def _int_to_bytes_32(self, value):
        if value >= 0:
            return bytes([
                (value >> 24) & 0xFF,
                (value >> 16) & 0xFF,
                (value >> 8) & 0xFF,
                value & 0xFF
            ])
        else:
            positive_value = abs(value)
            inverted = (~positive_value) & 0xFFFFFFFF
            twos_complement = (inverted + 1) & 0xFFFFFFFF
            return bytes([
                (twos_complement >> 24) & 0xFF,
                (twos_complement >> 16) & 0xFF,
                (twos_complement >> 8) & 0xFF,
                twos_complement & 0xFF
            ])

    def send_torque(self, motor_id, torque_nm):
        if not self.connected:
            return
        torque_nm = max(min(torque_nm, MAX_SAFE_TORQUE), -MAX_SAFE_TORQUE)
        current_int = int(torque_nm * 1000.0)
        data = self._int_to_bytes_32(current_int)
        frame = self._build_send_frame(motor_id, self.MODE_TORQUE, data)
        with self.serial_lock:
            try:
                if self.ser and self.ser.is_open:
                    self.ser.write(frame)
                    self.ser.flush()
            except:
                pass

    def set_zero(self, motor_id):
        if not self.connected:
            return
        frame = self._build_send_frame(motor_id, self.MODE_ORIGIN, self.ORIGIN_DATA)
        with self.serial_lock:
            try:
                if self.ser and self.ser.is_open:
                    self.ser.write(frame)
                    self.ser.flush()
            except:
                pass
        print(f"[Motor] Zero set for {hex(motor_id)}")

    def get_feedback(self):
        with self.data_lock:
            return {
                'pos_L':  self.pos[ID_LEFT_LEG],
                'pos_R':  self.pos[ID_RIGHT_LEG],
                'spd_L':  self.spd[ID_LEFT_LEG],
                'spd_R':  self.spd[ID_RIGHT_LEG],
                'cur_L':  self.cur[ID_LEFT_LEG],
                'cur_R':  self.cur[ID_RIGHT_LEG],
                'temp_L': self.temp[ID_LEFT_LEG],
                'temp_R': self.temp[ID_RIGHT_LEG],
                'fb_count': self.fb_count,
            }

    def close(self):
        self.running = False
        self.connected = False
        time.sleep(0.2)
        if self.ser and self.ser.is_open:
            try: self.ser.close()
            except: pass


# ==========================================
# 数据采集主控 (v2: 每trial独立文件)
# ==========================================
class DataCollector:
    def __init__(self):
        self.imu = LpmsB2Driver(IMU_PORT)
        self.motor = AKMotorDriver(MOTOR_PORT, BAUDRATE)
        self.hw_running = False          # 硬件采集循环是否运行
        self.lock = Lock()

        # trial状态
        self.trial_active = False        # 当前是否正在录制一个trial
        self.csv_file = None
        self.csv_writer = None
        self.filepath = ''
        self.frame_count = 0
        self.trial_start_time = 0

        # 当前实验信息
        self.subject_id = 'S01'
        self.current_protocol = 'P0_static'
        self.current_trial_num = 1       # 自动递增
        self.trial_history = {}          # {protocol: 已完成的trial数}

        # 实时状态
        self.actual_hz = 0
        self.global_start_time = 0

        # 绘图buffer
        self.buf = {
            'time':    collections.deque(maxlen=600),
            'euler_y': collections.deque(maxlen=600),
            'gyro_y':  collections.deque(maxlen=600),
            'pos_L':   collections.deque(maxlen=600),
            'pos_R':   collections.deque(maxlen=600),
        }

    def connect_hw(self):
        """连接硬件并启动后台数据轮询"""
        imu_ok = self.imu.connect()
        mot_ok = self.motor.connect()
        if not imu_ok:
            print("[!] IMU not connected")
        if not mot_ok:
            print("[!] Motor not connected")
        self.hw_running = True
        self.global_start_time = time.time()
        if mot_ok:
            self.motor.send_torque(ID_RIGHT_LEG, 0)
            self.motor.send_torque(ID_LEFT_LEG, 0)
        Thread(target=self._poll_loop, daemon=True).start()
        return imu_ok, mot_ok

    def set_protocol(self, proto_key):
        """切换protocol，自动重置trial编号"""
        self.current_protocol = proto_key
        # 获取该protocol已完成数
        done = self.trial_history.get(proto_key, 0)
        self.current_trial_num = done + 1
        print(f"[Protocol] -> {proto_key}, next trial = T{self.current_trial_num:02d}")

    def start_trial(self):
        """开始录制一个trial"""
        if self.trial_active:
            print("[!] Trial already running, stop it first")
            return False

        # 构建文件名: S01_P4_walk_squat_T03_20250101_120000.csv
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        fname = f"{self.subject_id}_{self.current_protocol}_T{self.current_trial_num:02d}_{ts}.csv"
        self.filepath = os.path.join(DATA_DIR, fname)

        self.csv_file = open(self.filepath, 'w', newline='')
        self.csv_writer = csv.writer(self.csv_file)
        self.csv_writer.writerow([
            'time_s',
            'imu_euler_x', 'imu_euler_y', 'imu_euler_z',
            'imu_gyro_x', 'imu_gyro_y', 'imu_gyro_z',
            'enc_pos_L', 'enc_pos_R',
            'enc_spd_L', 'enc_spd_R',
            'enc_cur_L', 'enc_cur_R',
            'protocol', 'trial',
        ])
        self.frame_count = 0
        self.trial_start_time = time.time()
        self.trial_active = True
        print(f"[TRIAL] Start: {fname}")
        return True

    def stop_trial(self):
        """停止录制并保存"""
        if not self.trial_active:
            return
        self.trial_active = False
        if self.csv_file:
            self.csv_file.flush()
            self.csv_file.close()
            self.csv_file = None

        elapsed = time.time() - self.trial_start_time
        print(f"[TRIAL] Saved: {self.filepath}")
        print(f"        {self.frame_count} frames, {elapsed:.1f}s")

        # 更新历史计数
        done = self.trial_history.get(self.current_protocol, 0)
        self.trial_history[self.current_protocol] = done + 1
        self.current_trial_num = done + 2  # 下一个trial编号

    def _poll_loop(self):
        """后台轮询: 读传感器、发零力矩、写CSV(如果trial进行中)"""
        hz_cnt = 0
        hz_t = time.time()
        while self.hw_running:
            t_global = time.time() - self.global_start_time

            # 读IMU
            eu_x, eu_y, eu_z, gy_x, gy_y, gy_z = self.imu.get_data()

            # 发零力矩 (保持电机激活, 无助力)
            if self.motor.connected:
                self.motor.send_torque(ID_RIGHT_LEG, 0)
                self.motor.send_torque(ID_LEFT_LEG, 0)

            # 读电机反馈
            fb = self.motor.get_feedback()

            # 如果trial正在录制，写CSV
            if self.trial_active and self.csv_writer:
                t_trial = time.time() - self.trial_start_time
                self.csv_writer.writerow([
                    f'{t_trial:.4f}',
                    f'{eu_x:.3f}', f'{eu_y:.3f}', f'{eu_z:.3f}',
                    f'{gy_x:.3f}', f'{gy_y:.3f}', f'{gy_z:.3f}',
                    f'{fb["pos_L"]:.2f}', f'{fb["pos_R"]:.2f}',
                    f'{fb["spd_L"]:.1f}', f'{fb["spd_R"]:.1f}',
                    f'{fb["cur_L"]:.3f}', f'{fb["cur_R"]:.3f}',
                    self.current_protocol,
                    f'T{self.current_trial_num:02d}',
                ])
                self.frame_count += 1
                if self.frame_count % 500 == 0:
                    self.csv_file.flush()

            # 更新绘图buffer (始终更新，不管是否录制)
            with self.lock:
                self.buf['time'].append(t_global)
                self.buf['euler_y'].append(eu_y)
                self.buf['gyro_y'].append(gy_y)
                self.buf['pos_L'].append(fb['pos_L'])
                self.buf['pos_R'].append(fb['pos_R'])

            # Hz计算
            hz_cnt += 1
            if time.time() - hz_t > 1.0:
                self.actual_hz = hz_cnt
                hz_cnt = 0
                hz_t = time.time()

            time.sleep(0.008)

    def shutdown(self):
        """关闭一切"""
        self.hw_running = False
        if self.trial_active:
            self.stop_trial()
        if self.motor.connected:
            self.motor.send_torque(ID_RIGHT_LEG, 0)
            self.motor.send_torque(ID_LEFT_LEG, 0)
            time.sleep(0.15)
            self.motor.close()
        self.imu.close()


# ==========================================
# GUI (v2)
# ==========================================
class GUI:
    def __init__(self, root, col):
        self.root = root
        self.col = col
        root.title("Exo Data Collector v2 — Per-Trial Recording")
        root.geometry("1200x950")

        # ---- 顶栏: 连接 & 零位 ----
        f_top = ttk.Frame(root)
        f_top.pack(fill=tk.X, padx=8, pady=4)

        ttk.Button(f_top, text="1. 连接硬件", command=self.on_connect).pack(side=tk.LEFT, padx=3)
        ttk.Button(f_top, text="2. 设零位", command=self.on_zero).pack(side=tk.LEFT, padx=3)

        ttk.Separator(f_top, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=10)

        ttk.Label(f_top, text="受试者ID:").pack(side=tk.LEFT)
        self.sv_subject = tk.StringVar(value='S01')
        ttk.Entry(f_top, textvariable=self.sv_subject, width=6).pack(side=tk.LEFT, padx=3)

        ttk.Button(f_top, text="退出", command=self.on_exit).pack(side=tk.RIGHT)

        # ---- 状态栏 ----
        self.lbl_status = ttk.Label(root, text="等待连接...", font=("Arial", 11))
        self.lbl_status.pack(pady=2)

        # ---- Protocol选择 ----
        f_proto = ttk.LabelFrame(root, text="Protocol 选择")
        f_proto.pack(fill=tk.X, padx=8, pady=3)

        self.proto_btns = {}
        proto_keys = list(PROTOCOLS.keys())
        for i, pk in enumerate(proto_keys):
            info = PROTOCOLS[pk]
            txt = f"{info['name']}\n建议{info['trials']}次"
            b = tk.Button(f_proto, text=txt, width=18, height=3,
                         font=("Arial", 9),
                         command=lambda p=pk: self.select_protocol(p))
            b.grid(row=i // 5, column=i % 5, padx=3, pady=3, sticky='nsew')
            self.proto_btns[pk] = b

        # ---- 当前Trial信息 ----
        f_trial = ttk.LabelFrame(root, text="当前Trial")
        f_trial.pack(fill=tk.X, padx=8, pady=3)

        self.lbl_proto = ttk.Label(f_trial, text="Protocol: --",
                                   font=("Arial", 13, "bold"), foreground="blue")
        self.lbl_proto.pack(side=tk.LEFT, padx=10)

        self.lbl_trial = ttk.Label(f_trial, text="Trial: T--",
                                   font=("Arial", 13, "bold"), foreground="darkgreen")
        self.lbl_trial.pack(side=tk.LEFT, padx=10)

        self.lbl_desc = ttk.Label(f_trial, text="", font=("Arial", 10),
                                  foreground="gray30", wraplength=400)
        self.lbl_desc.pack(side=tk.LEFT, padx=10)

        # ---- Start/Stop 大按钮 ----
        f_ctrl = ttk.Frame(root)
        f_ctrl.pack(fill=tk.X, padx=8, pady=5)

        self.btn_start = tk.Button(
            f_ctrl, text="▶ START TRIAL", font=("Arial", 14, "bold"),
            bg="#4CAF50", fg="white", width=20, height=2,
            command=self.on_start_trial, state=tk.DISABLED)
        self.btn_start.pack(side=tk.LEFT, padx=10)

        self.btn_stop = tk.Button(
            f_ctrl, text="■ STOP & SAVE", font=("Arial", 14, "bold"),
            bg="#888888", fg="white", width=20, height=2,
            command=self.on_stop_trial, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.LEFT, padx=10)

        self.lbl_rec = ttk.Label(f_ctrl, text="", font=("Arial", 12, "bold"),
                                 foreground="red")
        self.lbl_rec.pack(side=tk.LEFT, padx=20)

        # ---- 进度总览 ----
        f_prog = ttk.LabelFrame(root, text="采集进度")
        f_prog.pack(fill=tk.X, padx=8, pady=2)
        self.lbl_progress = ttk.Label(f_prog, text="", font=("Courier", 9))
        self.lbl_progress.pack(padx=5, pady=3)

        # ---- 图 ----
        self.fig, (self.ax1, self.ax2, self.ax3, self.ax4) = plt.subplots(
            4, 1, figsize=(10, 5.5), dpi=85, sharex=True)
        self.fig.subplots_adjust(hspace=0.45)

        self.ax1.set_ylabel("Pitch(°)"); self.ax1.grid(True)
        self.ax1.set_title("IMU euler_y", fontsize=9)
        self.ln1, = self.ax1.plot([], [], 'g-', lw=1.5)

        self.ax2.set_ylabel("Gyro(°/s)"); self.ax2.grid(True)
        self.ax2.set_title("IMU gyro_y", fontsize=9)
        self.ln2, = self.ax2.plot([], [], 'b-', lw=1.5)

        self.ax3.set_ylabel("L(°)"); self.ax3.grid(True)
        self.ax3.set_title("Left Hip Encoder", fontsize=9)
        self.ln3, = self.ax3.plot([], [], 'r-', lw=1.5)

        self.ax4.set_ylabel("R(°)"); self.ax4.grid(True)
        self.ax4.set_title("Right Hip Encoder", fontsize=9)
        self.ax4.set_xlabel("Time (s)")
        self.ln4, = self.ax4.plot([], [], 'm-', lw=1.5)

        self.canvas = FigureCanvasTkAgg(self.fig, master=root)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        self.ani = FuncAnimation(self.fig, self._update_plot, interval=120, blit=False)

        # ---- 键盘快捷键 ----
        root.bind('<space>', lambda e: self._toggle_trial())
        root.bind('<Escape>', lambda e: self.on_exit())

        # ---- 录制闪烁 ----
        self._blink_state = False
        self._blink_job = None

    # ---- Protocol选择 ----
    def select_protocol(self, pk):
        self.col.subject_id = self.sv_subject.get().strip() or 'S01'
        self.col.set_protocol(pk)
        info = PROTOCOLS[pk]
        self.lbl_proto.config(text=f"Protocol: {info['name']}")
        self.lbl_trial.config(text=f"Trial: T{self.col.current_trial_num:02d}")
        self.lbl_desc.config(text=f"动作: {info['desc']}")

        for k, b in self.proto_btns.items():
            if k == pk:
                b.config(bg='#BBDEFB', relief=tk.SUNKEN)
            else:
                b.config(bg='#d9d9d9', relief=tk.RAISED)

        if not self.col.trial_active:
            self.btn_start.config(state=tk.NORMAL)

        self._update_progress()

    # ---- Trial控制 ----
    def on_start_trial(self):
        if not self.col.hw_running:
            self.lbl_status.config(text="请先连接硬件!")
            return
        self.col.subject_id = self.sv_subject.get().strip() or 'S01'
        ok = self.col.start_trial()
        if ok:
            self.btn_start.config(state=tk.DISABLED, bg='#888888')
            self.btn_stop.config(state=tk.NORMAL, bg='#f44336')
            self._start_blink()

    def on_stop_trial(self):
        self.col.stop_trial()
        self.btn_start.config(state=tk.NORMAL, bg='#4CAF50')
        self.btn_stop.config(state=tk.DISABLED, bg='#888888')
        self._stop_blink()
        self.lbl_rec.config(text="")

        # 更新trial编号显示
        self.lbl_trial.config(text=f"Trial: T{self.col.current_trial_num:02d}")
        self._update_progress()

    def _toggle_trial(self):
        """空格键切换Start/Stop"""
        if self.col.trial_active:
            self.on_stop_trial()
        else:
            self.on_start_trial()

    # ---- 闪烁 ----
    def _start_blink(self):
        self._blink_state = True
        self._do_blink()

    def _do_blink(self):
        if not self.col.trial_active:
            return
        if self._blink_state:
            elapsed = time.time() - self.col.trial_start_time
            self.lbl_rec.config(
                text=f"● REC  {elapsed:.1f}s  {self.col.frame_count}帧",
                foreground="red")
        else:
            self.lbl_rec.config(text="")
        self._blink_state = not self._blink_state
        self._blink_job = self.root.after(500, self._do_blink)

    def _stop_blink(self):
        if self._blink_job:
            self.root.after_cancel(self._blink_job)
            self._blink_job = None

    # ---- 进度 ----
    def _update_progress(self):
        lines = []
        for pk, info in PROTOCOLS.items():
            done = self.col.trial_history.get(pk, 0)
            total = info['trials']
            bar = '█' * done + '░' * (total - done)
            check = '✓' if done >= total else ' '
            lines.append(f"[{check}] {pk:<25s} {bar} {done}/{total}")
        self.lbl_progress.config(text='\n'.join(lines))

    # ---- 连接/零位 ----
    def on_connect(self):
        imu_ok, mot_ok = self.col.connect_hw()
        parts = []
        if imu_ok: parts.append("IMU✓")
        else:      parts.append("IMU✗")
        if mot_ok: parts.append("Motor✓")
        else:      parts.append("Motor✗")
        self.lbl_status.config(text=f"连接: {' '.join(parts)}")

    def on_zero(self):
        if self.col.motor.connected:
            self.col.motor.set_zero(ID_RIGHT_LEG)
            self.col.motor.set_zero(ID_LEFT_LEG)
            time.sleep(0.1)
            self.lbl_status.config(text="零位已设定 ✓")

    def on_exit(self):
        self.col.shutdown()
        self.root.quit()
        self.root.destroy()

    # ---- 图表更新 ----
    def _update_plot(self, frame):
        if not self.col.hw_running:
            return
        with self.col.lock:
            t  = list(self.col.buf['time'])
            ey = list(self.col.buf['euler_y'])
            gy = list(self.col.buf['gyro_y'])
            pl = list(self.col.buf['pos_L'])
            pr = list(self.col.buf['pos_R'])
        if not t:
            return
        self.ln1.set_data(t, ey)
        self.ln2.set_data(t, gy)
        self.ln3.set_data(t, pl)
        self.ln4.set_data(t, pr)
        c = t[-1]
        for ax in (self.ax1, self.ax2, self.ax3, self.ax4):
            ax.set_xlim(c - 8, c + 0.5)
        if ey: self.ax1.set_ylim(min(ey)-10, max(ey)+10)
        if gy: self.ax2.set_ylim(min(gy)-30, max(gy)+30)
        if pl:
            mg = max(abs(max(pl) - min(pl)) * 0.2, 5)
            self.ax3.set_ylim(min(pl)-mg, max(pl)+mg)
        if pr:
            mg = max(abs(max(pr) - min(pr)) * 0.2, 5)
            self.ax4.set_ylim(min(pr)-mg, max(pr)+mg)

        # 状态栏
        fb = self.col.motor.get_feedback()
        rec_info = ""
        if self.col.trial_active:
            elapsed = time.time() - self.col.trial_start_time
            rec_info = f"REC {elapsed:.1f}s/{self.col.frame_count}帧"
        else:
            rec_info = "IDLE"

        self.lbl_status.config(
            text=f"{self.col.actual_hz}Hz | {rec_info} | "
                 f"fb:{fb['fb_count']} | "
                 f"L={fb['pos_L']:.1f}° R={fb['pos_R']:.1f}°")


# ==========================================
if __name__ == "__main__":
    root = tk.Tk()
    col = DataCollector()
    app = GUI(root, col)
    root.protocol("WM_DELETE_WINDOW", app.on_exit)
    root.mainloop()