# ExoKids 外骨骼教学平台 · Codex 实施规范 (SPEC.md)

> 本文档是面向 **Codex** 的可执行蓝本。Codex 在实现本项目时必须严格遵守本文档中的技术栈、目录结构、接口约定和阶段划分。任何与本文档冲突的临时决定都要在 PR 说明中标注并给出理由。

---

## 0. 重要前置说明（Codex 必读）

### 0.1 目标用户：小学生
本平台服务于 **K-12（以小学生为主）** 的外骨骼教学场景。**所有 UI、文案、交互、错误提示都必须面向小学生**：
> **硬件范围约束（全项目贯穿）**：本外骨骼**仅包含左髋、右髋两个主动关节**，**不含膝关节、踝关节**。所有代码、仿真模型、UI 展示、数据采集均以 2 自由度（L_hip, R_hip）为准。任何涉及膝/踝的逻辑都属于越界实现，一律不接受。
- 使用**大按钮、圆角、明亮色彩、卡通插画**
- 禁用专业术语直接暴露给学生（如 "telemetry"、"PID"、"torque"），统一用中文友好词（"实时数据"、"用力大小"）
- 错误提示不说 "Error 500"，改说 "小外外累了，休息一下再试试 🤖"
- 默认存在一个卡通吉祥物形象（占位即可，命名 `Exobot`），在加载/报错/引导时出现
- 字号默认 ≥ 16px，主要操作按钮 ≥ 48px 高

### 0.2 面向教师/管理员的界面
教师和管理员界面可以稍专业，但仍保持简洁。不要出现命令行风格内容。

### 0.3 编程语言统一
- 学生所有编程**统一使用 Python**
- Blockly 的代码生成器**必须生成 Python**（不是 JS）
- 浏览器内 Python 执行通过 **Pyodide** 在 **Web Worker** 中运行
- 仿真/真机的设备 SDK 暴露为 Python 模块 `exo`

### 0.4 参考资料位置（Codex 必查）

用户会在仓库 `reference/` 目录下放置以下三类资料：

#### (1) `reference/rpi-legacy/` —— 已跑通的树莓派控制代码

包含 3 个 Python 文件，均为实测跑通的代码：

- `claude3.py`：外骨骼**编码器数据采集**脚本。演示了通过 USB-CAN 模块读取编码器的完整流程。
- `control1.py`：**采集编码器 + IMU 信号，识别步态相位（gait phase），并据此向电机输出对应扭矩**的完整闭环控制代码。
- `control2.py`：与 `control1.py` 内容高度近似的另一版本（可能是另一条腿/另一种策略/另一轮迭代）。两份对照阅读有助于理解哪些是核心逻辑、哪些是可调部分。

**硬件链路**：树莓派 → USB 转 CAN 模块 → CAN 总线 → 电机 + 编码器（电机和编码器是集成一体的器件，共享同一条 CAN 总线）。

**重要**：USB-CAN 模块 + 该集成电机编码器存在一套**特殊的 CAN 帧编码/解码方式**（非标准 CANopen/J1939），这套编码方式在上述三份代码中均有完整体现。Phase 4 真机通信层**必须直接复用这三份代码中的编解码函数**，不允许按"通用 CAN 协议"自行重写。
- **CAN ID → 关节映射表**：左髋模块、右髋模块在 CAN 总线上使用**不同的 CAN ID** 区分。必须从 `reference/rpi-legacy/` 三份脚本中提取实际使用的 ID（以代码为准，不以手册为准，若两者不一致以代码为准并在文档中标注），在 `docs/real-device-notes.md` 中给出一张确定的映射表：
     | 关节 | 发送 CAN ID | 接收 CAN ID | 备注 |
     |---|---|---|---|
     | L_hip | 0x??? | 0x??? | 从 control1.py 第 ?? 行 |
     | R_hip | 0x??? | 0x??? | 从 control1.py 第 ?? 行 |

#### (2) `reference/motor-docs/` —— 电机 + 编码器合并技术手册

因为电机和编码器是**集成在一起的同一款器件**，官方只提供一份技术手册，统一放在 `motor-docs/`。该手册应涵盖：

- 电机控制字、状态字、模式切换
- 目标扭矩 / 目标位置 / 目标速度帧格式
- 编码器读取帧格式、分辨率、零点标定
- 错误码

#### (3) `reference/imu-docs/` —— IMU 技术手册（**V1 暂不使用，保留资料以备后续版本**）

> ⚠️ 初版（V1）**不采集、不展示、不依赖 IMU 信号**。此目录仅作为资料留存，Phase 4 的 `pi-agent` 不需要实现 IMU 读取。相关功能推迟到 V2 及以后版本再开发。
独立器件的技术手册，包含：

- IMU 通信接口（I2C / SPI / UART / CAN 之一）
- 寄存器映射或数据帧格式
- 量程、采样率配置
- 坐标系定义、安装朝向约定

---

**在实现 Phase 4（真机接入与树莓派部署）之前，Codex 必须先完整阅读上述三个目录下的所有内容，并在 PR 说明中产出 `docs/real-device-notes.md`，至少包括：**

1. 从 `claude3.py` / `control1.py` / `control2.py` 中提取的**可直接复用函数清单**（函数名 + 文件路径 + 行号 + 用途说明）
2. USB-CAN 模块的打开/读/写/关闭流程（对应代码位置）
3. 电机 + 编码器这套**特殊 CAN 编解码方式**的完整说明（发送帧格式、接收帧格式、字节序、校验方式、缩放系数）
4. 步态相位识别算法的核心逻辑摘录（来自 `control1.py` / `control2.py`）
5. （V1 跳过）IMU 的接入方式与采样频率 —— 暂不实现，但在 real-device-notes.md 中留一节占位说明"V2 再做"
6. `control1.py` 与 `control2.py` 的 diff 摘要，指出两者差异点

**不要重造轮子**。Phase 4 的真机通信层 = 把这三份脚本里已经调通的函数**封装**成 `RealExoDevice` 和 `pi-agent`，而不是照着手册从零写。

### 0.5 开发与部署形态
- **单仓库（monorepo）**：前端、后端、部署脚本、文档共存
- **开发环境**：`docker compose up` 一键启动全部服务
- **生产环境**：同一套 docker-compose，教室/机房内网部署即可
- **认证**：初版仅做简单 JWT 本地账号（管理员 / 教师 / 学生三类角色），无需对接 SSO

---

## 1. 技术栈（强制）

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | React 18 + Vite + TypeScript | 不用 Next.js，Vite 足够 |
| 前端样式 | Tailwind CSS | 卡通风格主题在 `tailwind.config.ts` 定制 |
| 前端路由 | React Router v6 | |
| 前端状态 | Zustand | 轻量，适合实时数据 |
| 3D 仿真 | Three.js + @react-three/fiber + @react-three/drei | 人偶 + 外骨骼可视化 |
| 图表 | Recharts | telemetry 时间序列 |
| 代码编辑器 | Monaco Editor | |
| 图形化编程 | Blockly + 自定义 Python Generator | |
| 浏览器 Python | Pyodide（Web Worker 中加载） | 学生代码沙箱 |
| 后端框架 | FastAPI + Uvicorn | Python 3.11+ |
| 实时通信 | WebSocket（FastAPI 原生支持） | |
| 数据库 | PostgreSQL 15 | 业务数据 |
| 时序数据 | PostgreSQL + TimescaleDB extension | telemetry |
| 对象存储 | MinIO | 导出文件、代码版本快照 |
| ORM | SQLModel (SQLAlchemy 2.0) | |
| 迁移 | Alembic | |
| 后端测试 | pytest | |
| 前端测试 | Vitest + React Testing Library | |
| LLM | DeepSeek API（OpenAI 兼容协议） | 通过环境变量 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 配置 |
| 容器 | Docker + docker-compose | |
| Pi 部署 | SSH + systemd user service | 后端通过 paramiko 操作 |

**不允许引入**：Next.js、NestJS、Vue、Django、MongoDB、Redis（P0-P5 内用不到）。如确有必要，在 PR 中单独说明。

---

## 2. Monorepo 目录结构

```
exokids/
├── README.md
├── SPEC.md                    # 本文档
├── docker-compose.yml         # 一键启动所有服务
├── docker-compose.dev.yml     # 开发环境覆盖
├── .env.example
├── reference/                 # 用户提供的参考资料（Codex 必读）
│   ├── rpi-legacy/            # 现有树莓派控制代码（已跑通）
│   │   ├── claude3.py         # 编码器数据采集
│   │   ├── control1.py        # 编码器+IMU → 步态相位 → 电机扭矩控制（闭环）
│   │   └── control2.py        # 同上，另一版本（与 control1 高度近似）
│   ├── motor-docs/            # 电机+编码器合并技术手册（集成器件，仅一份手册）
│   └── imu-docs/              # IMU 技术手册（V1 不使用，资料保留）
├── apps/
│   ├── web/                   # 前端主应用（学生+教师+管理员）
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── simulator/
│   │   │   │   ├── coding/      # Monaco + Pyodide
│   │   │   │   ├── blockly/
│   │   │   │   ├── classifier/
│   │   │   │   ├── llm/
│   │   │   │   ├── classroom/
│   │   │   │   └── deploy/      # 教师审批 & 部署
│   │   │   ├── sdk/             # 前端 exo SDK（TS）
│   │   │   ├── runtime/         # Pyodide Worker、沙箱
│   │   │   ├── simulation/      # Three.js 仿真内核
│   │   │   ├── store/
│   │   │   └── theme/           # 小学生主题
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── landing/               # 官网（可与 web 合并为同一域名下 /about）
│   │   └── ...
│   └── api/                   # 后端 FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── db/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   │   ├── device/      # IExoDevice 接口 + Real/Simulated 实现
│       │   │   ├── simulation/  # 后端仿真（可选，主要在前端）
│       │   │   ├── telemetry/
│       │   │   ├── experiment/
│       │   │   ├── deploy/      # Pi 部署服务
│       │   │   ├── classifier/
│       │   │   └── llm/
│       │   ├── routers/
│       │   └── ws/              # WebSocket 处理
│       ├── alembic/
│       ├── tests/
│       └── pyproject.toml
├── packages/
│   ├── exo-sdk-python/        # Pyodide 中加载的 Python SDK（给学生 import）
│   │   ├── exo/
│   │   │   ├── __init__.py
│   │   │   ├── device.py
│   │   │   ├── telemetry.py
│   │   │   └── bridge.py      # postMessage 桥
│   │   └── pyproject.toml
│   ├── blockly-exo/           # Blockly 自定义积木 + Python 生成器
│   │   └── src/
│   └── shared-types/          # 前后端共享 schema（OpenAPI 自动生成 TS 类型）
│       └── src/
├── pi-agent/                  # 部署在树莓派上的 agent
│   ├── agent/
│   │   ├── main.py
│   │   └── runner.py
│   ├── systemd/
│   │   └── exokids-agent.service
│   └── install.sh
├── scripts/
│   ├── seed_db.py
│   ├── build.sh
│   └── deploy.sh
└── docs/
    ├── architecture.md
    ├── exo-sdk.md             # Python SDK 完整文档（也给 LLM 用）
    ├── teacher-guide.md
    └── student-guide.md
```

---

## 3. 核心接口契约
> **V1 信号范围约束**：初版**只采集、只展示 encoder 类信号**，包括：
> - `L_hip_angle` / `R_hip_angle`（关节角度，单位 rad 或 deg，二选一并在 SPEC 中定死）
> - `L_hip_velocity` / `R_hip_velocity`（关节角速度，由 encoder 差分或电机内置输出）
> - `L_hip_torque_cmd` / `R_hip_torque_cmd`（下发给电机的目标扭矩，用于闭环对照）
>
> **不采集、不展示的信号（V1 明确排除）**：IMU 的加速度 / 角速度 / 姿态四元数、足底压力、肌电、视觉 —— 全部推迟到 V2 及以后。
> **人-外骨骼交互的定性仿真原则（V1）**：本项目仿真**不追求物理精确**，但必须让"控制策略好坏"在**动画、数据曲线、量化分数**三处同时可见。小学生应当能够仅凭观察就区分出至少 4 档策略效果（好助力 / 无助力 / 差助力 / 反助力）。实现方式是一个简化的"意图跟随 + 疲劳累积"模型，详见 §3.5。任何"让小人完全被动跟随外骨骼"或"完全忽略外骨骼扭矩"的实现都视为违反本原则。
### 3.1 设备统一抽象（后端 Python）

```python
# apps/api/app/services/device/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from app.schemas.device import DeviceState, DeviceCommand, TelemetryFrame

class IExoDevice(ABC):
    @abstractmethod
    async def connect(self) -> None: ...
    @abstractmethod
    async def disconnect(self) -> None: ...
    @abstractmethod
    async def get_state(self) -> DeviceState: ...
    @abstractmethod
    async def send_command(self, cmd: DeviceCommand) -> None: ...
    @abstractmethod
    def telemetry_stream(self) -> AsyncIterator[TelemetryFrame]: ...
    @property
    @abstractmethod
    def source(self) -> str:  # "real" | "simulated"
        ...
```

两套实现：
- `SimulatedExoDevice`（Phase 1）—— 后端不做复杂仿真，主要是前端驱动；后端保留 headless 模式用于 classifier 离线训练
- `RealExoDevice`（Phase 4）—— 基于 `reference/rpi-legacy/` 的 CAN 通信代码

### 3.2 Telemetry 数据帧（强制 schema）

```python
# apps/api/app/schemas/device.py
from pydantic import BaseModel
from typing import Literal, Optional

class IMU(BaseModel):
    ax: float; ay: float; az: float       # 加速度 (m/s^2)
    gx: float; gy: float; gz: float       # 角速度 (rad/s)

class JointAngles(BaseModel):
    left_hip: float    # 度
    right_hip: float

class MotorState(BaseModel):
    left_hip_torque: float     # N·m
    right_hip_torque: float
    left_hip_current: float    # A
    right_hip_current: float

class TelemetryFrame(BaseModel):
    timestamp: float           # 毫秒时间戳
    source: Literal["real", "simulated"]
    imu: IMU
    joints: JointAngles
    motors: MotorState
    step_count: int
    battery: float             # 0.0 - 1.0
    assist_mode: str           # "off" | "walk_assist" | "squat_assist" | ...

class DeviceState(BaseModel):
    connected: bool
    mode: str
    emergency_stop: bool
    errors: list[str]
    led_color: str
    battery: float
    firmware_version: Optional[str] = None

class DeviceCommand(BaseModel):
    type: Literal[
        "set_assist_mode", "set_led", "emergency_stop", "recover",
        "move_joint", "return_to_neutral", "set_param"
    ]
    payload: dict
```

### 3.3 学生 Python SDK（packages/exo-sdk-python）

学生在 Pyodide Worker 中 `import exo` 得到的 API（**文档放在 `docs/exo-sdk.md`，也作为 LLM 的系统提示一部分**）：

```python
import exo

# 连接（在仿真模式下只是握手）
await exo.connect()

# 读取状态
state = await exo.get_state()          # DeviceState
imu = await exo.read_imu()             # IMU
angles = await exo.get_joint_angles()  # JointAngles
battery = await exo.get_battery()      # float 0.0-1.0

# 控制
await exo.set_led("red")               # "red" | "green" | "blue" | "off"
await exo.set_assist_mode("walk_assist")
await exo.move_joint("left_hip", angle_deg=15.0, duration_s=1.0)
await exo.return_to_neutral()
await exo.emergency_stop()

# 订阅 telemetry（回调）
@exo.on_telemetry
def handle(frame):
    print(f"左髋: {frame.joints.left_hip:.1f}°")

# 工具
exo.log("小外外开始走路啦！")
await exo.sleep(0.5)                   # 秒
```

**关键原则**：
- SDK 不直接访问 JS 对象，一切通过 `exo.bridge` 向 Worker 主线程发 message
- Worker 主线程把消息路由到「前端仿真内核」或「后端 WebSocket」
- 学生代码看不到 `js`, `pyodide` 等底层对象
- 所有控制调用都**异步**，使用 `await`，学生代码模板强调这一点

### 3.4 前端仿真内核接口（TS）

```ts
// apps/web/src/simulation/kernel.ts
export type ActionTemplate = "stand" | "walk" | "squat" | "sit_to_stand" | "step";

export interface StrategyParams {
  speedScale: number;       // 0.3 - 2.0
  strideScale: number;      // 0.5 - 1.5
  leftGain: number;         // 0.5 - 1.5
  rightGain: number;        // 0.5 - 1.5
  hipAmplitudeDeg: number;  // 覆盖式修正
  phaseOffsetMs: number;
  assistStrength: number;   // 0 - 1
}

export interface SimulationKernel {
  playAction(action: ActionTemplate): void;
  stop(): void;
  setStrategy(params: Partial<StrategyParams>): void;
  // 同一状态导出给：1) 动画渲染 2) telemetry 流
  subscribe(cb: (frame: TelemetryFrame) => void): () => void;
  getPose(): Pose;  // 给 Three.js 用
}
```

**关键一致性要求**：动画和 telemetry **必须来自同一状态对象**，不得两套独立时间轴。

### 3.5 人-外骨骼交互的简化仿真模型（Interaction Model）

#### 3.5.1 设计目标

让小学生仅通过**观察动画 + 查看数据曲线 + 看右上角评分**，即可判断一个外骨骼控制策略的好坏。**不追求物理精确，只追求定性一致、方向正确、对比鲜明**。本模型是 §3.4 `SimulationKernel` 内部状态推进的底层实现。

#### 3.5.2 模型结构（左右髋各独立运行一份）
q_ref(t) ──┐
           ├──► [HumanTorqueModel: PD] ──► tau_human ──┐
q, dq  ────┘                                            │
                                                        ├──► [JointDynamics] ──► q, dq
学生策略 ──► [ExoController] ─────────► tau_exo ────────┘
                                                        │
                                 tau_human ──► [FatigueModel] ──► E, P
                                                        │
                          q, dq, q_ref, tau_human ──► [StrategyScorer] ──► score
#### 3.5.3 各子模块定义

**HumanIntentModel**
- 输出 `q_ref(t)`：理想步态下左右髋的角度参考轨迹
- V1 实现：正弦波，左右髋相位差 π，频率 1 Hz。Walk reference trajectory amplitude: **25°** (locked by decision 0001-walk-amplitude-25deg).

**HumanTorqueModel**
- 输入：`q_ref, q, dq`
- 输出：`tau_human = Kp * (q_ref - q) - Kd * dq`
- 含义：人在努力按照自己想走的方式走；Kp/Kd 代表肌肉力量与反应速度

**JointDynamics**
- 输入：`tau_human, tau_exo`
- 方程：\(\ddot{q} = (\tau_{\text{human}} + \tau_{\text{exo}} - b\dot{q}) / I\)
- 左右髋完全独立，无耦合；I、b 为配置项

**FatigueModel**
- 累积疲劳 \(E = \int_0^t |\tau_{\text{human}}(s)| \, ds\)
- 瞬时代谢功率 \(P = |\tau_{\text{human}} \cdot \dot{q}|\)

**StrategyScorer**（0–100 分）
- **省力度** = `100 * exp(-E_total / E_baseline)`，`E_baseline` 为"无助力"基准运行时的疲劳度
- **步速稳定性** = 由 `dq` 方差归一化，方差越小得分越高
- **跟踪精度** = 由 `|q_ref - q|` 的 RMSE 归一化，误差越小得分越高
- 总分 = 三子项加权平均，权重在 `sim/config.yaml` 中

#### 3.5.4 Strategy space (two orthogonal axes)

The exoskeleton assistance strategy space is modeled as two orthogonal axes:

**Intensity axis (primary, pedagogical line):**
Five graded levels L1..L5 already implemented in Phase 1 kernel.
This is the axis exposed to the primary teaching UI.

**Quality axis (demonstration / experimental):**
Two additional strategies layered on top of the L3 `good_assist` baseline:
- `bad_phase` — `good_assist` with reference torque phase shifted by **+π/2**.
- `reverse`   — `good_assist` with assistance gain **α negated** (α → −α).

Quality-axis strategies are surfaced via a secondary UI entry only;
they are not part of the primary L1..L5 progression.

Total registered strategies in kernel after Phase 2 implementation: **7**
(5 intensity + 2 quality). See decision 0002-strategy-space-two-axes for
the rationale and the implementation deferral note.

#### 3.5.5 小学生侧的可观测信号

- **动画**：小人头顶"体力条"（绿→黄→红映射瞬时 `P`）、步速快慢、步态是否顺滑
- **数据曲线**：`q` vs `q_ref` 的贴合程度、`tau_human` 与 `tau_exo` 的幅值与相位关系、疲劳度 `E` 的斜率
- **总分**：Dashboard 右上角常驻，结束时给出"金 / 银 / 铜 / 未通过"评价

#### 3.5.6 边界与免责

- 本模型**不是真实人体动力学**，不得用于科研、医疗或产品验证
- 仅用于 K-12 教育场景下的定性演示
- 未来如需更高保真度，可在不改动 §3.4 `SimulationKernel` 对外接口的前提下替换 `JointDynamics` 为 MuJoCo / PyBullet 后端（V2+）
- 所有参数（I, b, Kp, Kd, α, 评分权重）默认值**必须由人类先手动调到"5 档评分单调 + 动画视觉差异明显"后固化到 `sim/config.yaml`**，Codex 不得自行改动默认值

#### 3.5.7 Hip flexion ROM hard limit

Target hip flexion ROM: 75°.
Safety margin: 5°.
Hard limit enforced in kernel: **80°** (`HIP_ROM_LIMIT_RAD`).

Rationale: 6–12 yo pediatric squat comfortable range, well below
physiological limit; 5° margin guards against overshoot from controller
transients and reference-trajectory edge cases.
---

## 4. 数据库 Schema

```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL,  -- 'admin' | 'teacher' | 'student'
  display_name VARCHAR(64),
  avatar VARCHAR(32),          -- 小学生头像图标名
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- classes (班级)
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  teacher_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_members (
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id),
  PRIMARY KEY (class_id, student_id)
);

-- assignments (任务)
CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  title VARCHAR(128) NOT NULL,
  description TEXT,
  template_code TEXT,          -- 起始代码模板
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- submissions (学生提交)
CREATE TABLE submissions (
  id UUID PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id),
  student_id UUID REFERENCES users(id),
  code TEXT NOT NULL,
  blockly_xml TEXT,            -- 若来自 Blockly
  language VARCHAR(16) DEFAULT 'python',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(16) DEFAULT 'submitted'  -- 'submitted' | 'approved' | 'rejected' | 'deployed'
);

-- experiments (实验运行记录)
CREATE TABLE experiments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  class_id UUID REFERENCES classes(id),
  assignment_id UUID REFERENCES assignments(id),
  code_snapshot TEXT,
  source VARCHAR(16) NOT NULL,   -- 'real' | 'simulated'
  action VARCHAR(32),            -- 'walk' | ...
  strategy_params JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  telemetry_blob_url TEXT,       -- MinIO 引用
  summary JSONB                  -- 峰值/平均/步数等摘要
);

-- telemetry (TimescaleDB 超表)
CREATE TABLE telemetry (
  experiment_id UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  source VARCHAR(16),
  imu JSONB,
  joints JSONB,
  motors JSONB,
  step_count INT,
  battery REAL,
  assist_mode VARCHAR(32)
);
SELECT create_hypertable('telemetry', 'ts');
CREATE INDEX ON telemetry (experiment_id, ts DESC);

-- devices (真机注册)
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  name VARCHAR(64),
  pi_host VARCHAR(128),          -- ssh 目标
  pi_user VARCHAR(32),
  ssh_key_ref VARCHAR(128),      -- 密钥引用
  online BOOLEAN DEFAULT FALSE,
  current_deployment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- deployments (Pi 部署记录)
CREATE TABLE deployments (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  device_id UUID REFERENCES devices(id),
  approved_by UUID REFERENCES users(id),
  version INT,                    -- 递增版本号
  status VARCHAR(16),             -- 'pending' | 'deploying' | 'running' | 'stopped' | 'failed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  log_blob_url TEXT
);

-- classifier_datasets (动作分类数据集)
CREATE TABLE classifier_datasets (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name VARCHAR(64),
  samples JSONB,                  -- [{label, features, ts}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classifier_models (
  id UUID PRIMARY KEY,
  dataset_id UUID REFERENCES classifier_datasets(id),
  algorithm VARCHAR(32),          -- 'knn' | 'tree' | 'svm' | 'logreg'
  metrics JSONB,                  -- accuracy, confusion_matrix
  model_blob_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- llm_sessions
CREATE TABLE llm_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  messages JSONB,
  context JSONB,                  -- 当前代码/报错/设备状态快照
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(64),
  target VARCHAR(64),
  payload JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 分阶段实施计划

**原则**：每个 Phase 结束时必须**可单独演示、可验证**。不要把半成品留到下一个 Phase。

---

### Phase 0 · 基础设施骨架

**目标**：跑起来空壳，但已具备所有后续模块的接入点。

#### 任务清单
- [ ] 建立 monorepo 目录结构（见 §2）
- [ ] 配置 `docker-compose.yml`：
  - 服务：`api`, `web`, `db`（postgres+timescale）, `minio`
  - 网络：`exokids-net`
  - 挂载：`./data/postgres`, `./data/minio`
- [ ] 后端 FastAPI 骨架：`/health`, `/api/auth/login`, `/api/auth/me`
- [ ] 前端 Vite + React + Tailwind 骨架
- [ ] Tailwind 主题配置（小学生风格）：

```ts
// 圆角、糖果色
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#4FC3F7', dark: '#0288D1' },  // 天蓝
      accent:  { DEFAULT: '#FFB74D' },                    // 橙
      success: { DEFAULT: '#81C784' },
      danger:  { DEFAULT: '#E57373' },
    },
    borderRadius: { 'kid': '1.25rem' },
    fontFamily: { sans: ['"ZCOOL KuaiLe"', '"Comic Sans MS"', 'system-ui'] }
  }
}
```

- [ ] 引入卡通吉祥物 `Exobot`（用 emoji 🤖 + SVG 占位即可，Codex 在 `web/src/components/Exobot.tsx` 实现一个带简单动画的组件）
- [ ] 登录页（学生可选头像，用户名密码登录）
- [ ] 空白 Dashboard 页
- [ ] Alembic 迁移：建立 §4 中全部表
- [ ] Seed 脚本：创建默认管理员、1 个教师、1 个班级、5 个学生账号
- [ ] CI（GitHub Actions 或占位 makefile）：`make lint`, `make test`, `make build`

#### 验收标准
1. `cp .env.example .env && docker compose up -d` 后，浏览器访问 `http://localhost:5173` 看到登录页
2. 用 seed 账号能登录进各自角色的空 Dashboard
3. `make test` 通过（哪怕只有 smoke test）

---

### Phase 1 · 仿真内核 + 可视化 Dashboard

**目标**：学生能看到一个穿戴外骨骼的卡通小人，点按钮播放 Walk/Squat/Sit-to-Stand 动画，同时屏幕右侧实时显示传感器曲线，**学生还没开始编程，但能"看"到数据和动作的对应关系**。

#### 任务清单

**仿真内核**（`apps/web/src/simulation/`）
- [ ] 定义 `SimulationKernel` 类（见 §3.4）
- [ ] **实现交互模型（见 §3.5）**，作为 `SimulationKernel` 的底层状态推进器：
  - [ ] `HumanIntentModel`：输出 `q_ref(t)`，V1 正弦波
  - [ ] `HumanTorqueModel`：PD 控制器，输出 `tau_human`
  - [ ] `JointDynamics`：`ddq = (tau_human + tau_exo - b*dq) / I`，左右髋独立
  - [ ] `FatigueModel`：累积 `E`，输出瞬时 `P`
  - [ ] `StrategyScorer`：输出总分 + 省力度/稳定性/跟踪精度三子项
  - [ ] 所有模型参数集中到 `apps/web/src/simulation/config.ts`
  - [ ] 五档预设策略（`good_assist` / `mid_assist` / `zero` / `bad_phase` / `reverse`）内置为 `ExoController` 工厂
  - [ ] **单元测试**：五档策略评分从高到低严格单调；同随机种子 + 同策略 → 10s 输出字节一致（与 §6.3 仿真确定性测试合并）
- [ ] 实现动作模板（纯数学函数）：
  - `stand`: 所有关节角度 ≈ 0
  - `walk`: 左右髋 `sin` 相位差 π，关节角度 30° 峰值，周期 1.2s
  - `squat`: 左右同步，髋膝协调下蹲，最大膝角 90°
  - `sit_to_stand`: 从坐姿（膝 90° 屈）线性过渡到站立
  - `step`: 单步抬腿
- [ ] `StrategyParams` 调制：动作模板参数化后由策略层乘系数/偏移
- [ ] Telemetry 生成器：30Hz 或 60Hz 从 kernel 状态生成 `TelemetryFrame`
- [ ] IMU 合成：从 joint 角度数值求导 + 加噪声
- [ ] 电机扭矩/电流合成：基于角度加速度 × 简化动力学参数

**3D 可视化**（`apps/web/src/features/simulator/`）
- [ ] 用 @react-three/fiber 搭建场景
- [ ] 人偶：简化骨架（头、躯干、左右大腿、小腿、脚），盒子+圆柱体组装，面向小学生用鲜艳颜色
- [ ] 外骨骼：贴合髋部和大腿的"机械臂"（细长盒子 + 关节球），用灰/银色 + 发光蓝色 LED 条
- [ ] 地面参考网格
- [ ] 相机：OrbitControls，默认俯视角 30°
- [ ] 动画：从 kernel `getPose()` 每帧更新骨骼 `rotation`
- [ ] 人偶"想说话"气泡（吉祥物风格提示）

**Dashboard UI**
- [ ] 顶部：连接状态大徽章（绿色=连接 / 黄色=仿真 / 红色=断开）、电池图标、急停大红按钮
- [ ] 主区：左侧 3D 画面（≥ 60% 宽）、右侧数据面板
- [ ] 数据面板使用 Recharts：
  - 关节角度实时曲线（四条线：左右髋）
  - 步数计数器（大数字+脚印图标）
- [ ] 底部动作按钮排：😀 站立 / 🚶 走路 / 🏋️ 深蹲 / 🪑 起立 / 👣 迈步 —— 大号圆角卡片按钮
- [ ] LED 颜色选择器（4 个圆点）
- [ ] 助力模式选择（下拉替换为大型分段按钮组）
- [ ] 实时曲线面板：2 条角度曲线（L_hip_angle, R_hip_angle） + 2 条角速度曲线（L_hip_velocity, R_hip_velocity） + 2 条扭矩指令曲线（L_hip_torque_cmd, R_hip_torque_cmd），共 6 条
- [ ] 坐标轴、单位、采样率在 UI 右上角常驻显示
- [ ] 预留 IMU / 足底压力等信号通道的接口（数据结构里留字段，但 V1 不实际绑定数据源）
- [ ] 小人头顶"体力条"：绿→黄→红映射瞬时疲劳功率 `P`
- [ ] 右上角常驻"策略评分卡片"：总分 + 省力度/稳定性/跟踪精度三子项
- [ ] 曲线面板新增一行：`tau_human`（虚线）与 `tau_exo`（实线）叠加显示
- [ ] "策略对比"模式：并排播放两次运行（例 `good_assist` vs `reverse`），小人并排走、评分并排显示

**后端**
- [ ] `POST /api/sim/start`, `POST /api/sim/stop`, `POST /api/sim/action`, `POST /api/sim/strategy`
- [ ] WebSocket `/ws/telemetry`：前端仿真把 frames 发到后端（便于后续持久化），后端广播给其他订阅者（教师观摩）
- [ ] Phase 1 阶段 telemetry 尚不入库，内存环形缓冲即可

#### 验收标准
1. 打开 Dashboard，点"走路"按钮，看到 3D 小人迈腿走起来，右侧曲线同步呈正弦波
2. 拖动"步幅"滑块，小人步子明显变大/变小，曲线峰值跟随变化
3. 曲线和动画**不可能出现对不上**的情况（一致性测试）
4. 急停按钮点击后小人立即回到站立姿态，LED 显示红
5. 关闭浏览器标签再打开，Dashboard 应自动恢复到站立状态
6. 依次运行五档预设策略，评分从高到低严格单调，且 `reverse` 策略下小人明显走不动、体力条快速变红
7. "策略对比"模式下，好策略与反策略的小人动画差异小学生可以一眼看出

---

### Phase 2 · Python 代码编辑 + Blockly

**目标**：学生能在浏览器里写 Python 或者拖积木，运行后影响 Phase 1 的仿真。

#### 任务清单

**Pyodide Worker**（`apps/web/src/runtime/`）
- [ ] `pyodide.worker.ts`：在 Web Worker 中加载 Pyodide（使用 jsdelivr 预构建产物，本地缓存）
- [ ] 定义 `exo-sdk-python` 包（`packages/exo-sdk-python/exo/*.py`）：
  - `exo/__init__.py`：暴露公共 API
  - `exo/bridge.py`：`async def _call(method, params)` 通过 `js.postMessage` 与主线程通信
  - `exo/device.py`：`connect / get_state / read_imu / get_joint_angles / set_led / set_assist_mode / move_joint / return_to_neutral / emergency_stop`
  - `exo/telemetry.py`：`on_telemetry` 装饰器，注册回调
- [ ] Worker 启动时 `pyodide.loadPackage` 把 `exo-sdk-python` 注入
- [ ] 主线程路由：
  - `exo.*` 调用 → 如果当前是 simulated 源 → 走前端 SimulationKernel
  - `exo.*` 调用 → 如果是 real 源 → 走后端 WebSocket（Phase 4 启用）
- [ ] 运行控制：`runCode(code)`, `stop()`, `reset()`
- [ ] 资源保护：
  - 最大运行时间 60s（可配置），超时强制终止 Worker
  - 调用频率限制：同一 `exo.*` 方法每 10ms 一次
- [ ] 标准输出捕获：`sys.stdout` 重定向到 postMessage，主线程展示到控制台面板

**代码编辑器 UI**（`apps/web/src/features/coding/`）
- [ ] Monaco Editor，Python 语法高亮
- [ ] 顶部工具栏：▶️ 运行（绿）、⏹️ 停止（红）、💾 保存、📂 加载、✨ 找小助手（跳 LLM，Phase 5 启用）
- [ ] 左侧：示例代码列表（点击插入到编辑器）
  - 示例 1：让灯变红色
  - 示例 2：读取 IMU 并打印
  - 示例 3：当传感器超过某值时自动急停
  - 示例 4：让左腿抬一下
- [ ] 右侧：Dashboard 的仿真画面（复用 Phase 1 组件）
- [ ] 底部：控制台输出面板，清空按钮，区分 info/warn/error 用不同颜色和图标

**Blockly**（`packages/blockly-exo/` + `apps/web/src/features/blockly/`）
- [ ] 引入 Blockly
- [ ] 自定义分类：
  - 🤖 外骨骼动作：set_led, set_assist_mode, move_joint, return_to_neutral, emergency_stop
  - 📡 读传感器：read_imu, get_joint_angles, get_battery
  - 🎯 事件：on_telemetry
  - 💬 输出：log
  - ⏱️ 时间：sleep, every_n_seconds
  - 🔁 逻辑/循环/变量：使用 Blockly 默认类别
- [ ] **Python 生成器**：每个积木必须实现 `Blockly.Python['block_name']`，产出合法 Python
- [ ] 顶栏：▶️ 运行（直接送到 Pyodide Worker）、🔄 切换到代码视图（显示生成的 Python 只读）、💾 保存 XML
- [ ] 布局与代码模式复用同一套 SimulationKernel 和控制台

**持久化**
- [ ] `POST /api/submissions`（保存代码 + blockly_xml）
- [ ] `GET /api/submissions?student_id=`
- [ ] 版本：简单追加行，新建一条记录即可（不做 git）

#### 验收标准
1. 学生打开代码页，粘贴示例"让灯变红色"，点▶️ 运行，2 秒内仿真小人外骨骼 LED 变红
2. 学生写 `while True: pass`，运行 60s 后自动被终止，错误提示友好："小外外跑得太久啦，帮它停下来 ⏰"
3. 学生打开 Blockly，拖两个积木："当走路时" + "让灯变绿"，点运行，走路时 LED 跟着变
4. 点"切换到代码视图"能看到生成的 Python 代码格式正确
5. 代码保存后，刷新页面能加载回来

---

### Phase 3 · 班级管理 + 实验记录 + 导出

**目标**：教师能建班、发任务、收作业、看数据；学生每次运行都有完整记录；数据可下载。

#### 任务清单

**教师端**
- [ ] 班级页面：建班、拉学生进班、移除
- [ ] 任务页面：新建任务（标题、说明、起始代码、截止时间）、下发到某班
- [ ] 提交列表：看每个学生的每次提交，能预览代码、预览 Blockly、回放最近一次实验
- [ ] 点"一键评审"进入逐人查看界面

**学生端**
- [ ] 任务列表（我的任务）
- [ ] 任务详情：题目说明 + 起始代码直接载入编辑器
- [ ] 提交按钮：保存当前代码为一次提交

**实验记录（核心）**
- [ ] 每次点▶️运行代码都产生一条 `experiments` 记录
- [ ] 前端在运行期间把 telemetry 帧批量（每 1s 一批）上传后端
- [ ] 后端接收后写入 TimescaleDB `telemetry` 超表
- [ ] 运行结束后计算摘要（峰值关节角、平均步频、步数等），写入 `experiments.summary`
- [ ] 记录列表页：按时间倒序，点击展开看曲线回放

**导出**
- [ ] `POST /api/experiments/{id}/export?format=csv|json`
  - 异步生成文件，推到 MinIO
  - 返回一个可下载 URL
- [ ] CSV 列：ts, source, left_hip, right_hip, ax, ay, az, gx, gy, gz, left_hip_torque, ..., assist_mode
- [ ] JSON 结构：包含 meta（user, assignment, code_snapshot, strategy_params）+ frames
- [ ] 教师侧还可批量导出整班

#### 验收标准
1. 教师创建任务"让外外走 10 步"，下发到班，5 个学生都能看到
2. 学生做任务、运行、提交；教师能看到 5 条提交和对应 5 段 telemetry 回放
3. 导出某次实验 CSV，用 Excel 打开曲线合理
4. 关闭浏览器重开，实验记录不丢

---

### Phase 4 · 真机接入 + 树莓派部署（**Codex 动工前必读 `reference/`**）

**目标**：教师审批后的代码能自动推到对应外骨骼的树莓派上运行；Dashboard 切换到"真机模式"后显示真实数据。

#### ⚠️ Codex 开工前强制动作

**不阅读参考资料直接开写 Phase 4 的 PR 一律拒绝合并。**

1. 完整阅读 `reference/rpi-legacy/claude3.py`、`control1.py`、`control2.py` 三份源代码
2. 完整阅读 `reference/motor-docs/`（电机+编码器合并手册）和 `reference/imu-docs/`（IMU 手册）
3. 在 `docs/real-device-notes.md` 中产出以下内容：
   - **可复用函数清单**：列出三份脚本中可直接封装到 `pi-agent` 的函数，给出文件路径 + 函数签名 + 用途
   - **USB-CAN 模块接入方式**：打开/读/写/关闭的调用序列，对应代码位置
   - **特殊 CAN 编解码规范**：发送帧格式、接收帧格式、字节序、校验方式、各字段的缩放/偏移系数（这是本硬件体系的关键，不是通用 CAN 协议）
   - **电机控制指令对照表**：使能、失能、模式切换、目标扭矩、目标位置、急停 —— 各自对应的 CAN 帧
   - **编码器读取方式**：帧格式、单位、零点处理
   - **IMU 接入**：接口类型、采样率、量程、坐标系
   - **步态相位识别算法摘录**：从 `control1.py` / `control2.py` 中提炼出的状态机或判据
   - **`control1.py` vs `control2.py` diff 摘要**：两者差异点，确认哪一份作为 Phase 4 的基线
4. 在 `docs/real-device-notes.md` 中确认"可直接复用模块清单"后，再开始动 `pi-agent/` 和 `RealExoDevice` 的代码

#### 任务清单

**真机设备抽象**
- [ ] `RealExoDevice` 实现 `IExoDevice`：
  - 不在后端主进程直接操作 CAN；后端通过 WebSocket 与 Pi agent 通信
  - 后端这层只是代理、转换 schema
- [ ] Pi agent（`pi-agent/`）是实际操作 CAN 的进程，运行在树莓派上
- [ ] Pi agent 启动时连接后端 `/ws/agent?device_id=xxx`，维持长连接
- [ ] 心跳 5s 一次，后端据此更新 `devices.online`

**Pi agent**
- [ ] Python 3.11，`pyproject.toml`
- [ ] `runner.py`：加载学生代码作为 Python 模块，给它注入 `exo` 模块（真机版，直接读写 CAN，而不是 postMessage）
- [ ] `main.py`：与后端 WebSocket 通信；指令接收 & 转发 & 上报 telemetry
- [ ] 安装脚本 `install.sh`：装 systemd user service `exokids-agent.service`
- [ ] 真机 `exo` SDK 的控制后端必须直接封装 `reference/rpi-legacy/` 下三份脚本中已跑通的函数，**不得重新实现 USB-CAN 通信和那套特殊 CAN 编解码**
- [ ] 步态相位识别模块默认直接移植 `control1.py`（或你在 diff 摘要中确定的基线版本）的算法，作为 `exo.set_assist_mode("walk_assist")` 的底层实现
- [ ] IMU 读取模块遵循 `reference/imu-docs/` 手册 + `control1.py`/`control2.py` 中的实际调用方式（暂时不实现 当前只处理encoder信号）
- [ ] `RealExoDevice` 在初始化时读取上述 CAN ID 映射表，并将左右髋以 `"L_hip"` / `"R_hip"` 作为键对外暴露；底层 CAN 帧的收发按 ID 自动路由到对应关节，**上层绝对不允许出现裸 CAN ID**

**部署流程**
1. 学生在代码页面点"申请部署到真机"
2. 后端建 `deployments` 记录，状态 `pending`，通知对应教师
3. 教师在部署审批页面看到申请，能预览代码和学生最近一次仿真实验结果
4. 教师点"批准并部署"：
   - 后端选择在线的目标设备
   - 后端通过 agent 的 WebSocket 下发代码（或通过 SCP 推送到 Pi `~/exokids/deployments/<version>/`）
   - agent 收到后 `systemctl --user restart exokids-runner@<version>`
5. 运行期间 agent 实时推 telemetry 和日志回后端，落入 `experiments` + `deployment.log_blob_url`
6. 失败/异常可一键回滚到上一版本（`current -> previous`）

**Dashboard 真机模式**
- [ ] 顶部增加"仿真 / 真机"切换（教师/管理员可用，学生不可用）
- [ ] 真机模式下订阅 `/ws/telemetry?device_id=xxx`
- [ ] 真机急停按钮直接下发 `emergency_stop` 到 agent，最优先级

**权限**
- [ ] 学生**不可**直接部署，只能申请
- [ ] 只有教师和管理员能点"批准部署"
- [ ] 所有部署/回滚/急停操作写 `audit_logs`

#### 验收标准
1. Pi 上装好 agent 后，后端 `/api/devices` 能看到其在线
2. 学生申请部署 → 教师审批 → Pi 上学生代码真实运行
3. 真机模式 Dashboard 实时显示真人穿戴时的关节角度
4. 运行失败自动回滚到上一版本，教师收到提醒
5. 教师误操作触发急停，真机立即停止电机输出

---

### Phase 5 · Classifier + LLM 辅助

**目标**：学生能"教"电脑识别动作，AI 助手能用小学生能听懂的话回答问题。

#### 任务清单

**Classifier**（`apps/web/src/features/classifier/` + `apps/api/app/services/classifier/`）
- [ ] 采集页面：选仿真或真机源，开始录制→做动作→打标签（Walk/Squat/Stand/Sit-to-Stand/Step）→保存为一条样本
- [ ] 每条样本存储：标签 + 2s 窗口的原始帧 + 抽取的特征
- [ ] 特征工程（后端 Python）：
  - 每个关节：均值、方差、范围、峰峰值
  - 周期估计
- [ ] 训练页面：选算法（KNN / 决策树 / SVM / 逻辑回归），点"开始学习"
- [ ] 后端使用 `scikit-learn`，训练完输出准确率 + 混淆矩阵
- [ ] UI 上用大色块显示混淆矩阵，小学生友好："小外外分辨走路和深蹲的正确率：95%！🎉"
- [ ] 推理：把当前 telemetry 按 2s 窗口扔给模型，实时显示预测结果（大字显示"现在是：走路 🚶"）
- [ ] 模型保存到 MinIO，记录到 `classifier_models`

**LLM 助手**（`apps/web/src/features/llm/` + `apps/api/app/services/llm/`）
- [ ] 后端：`POST /api/llm/chat`
  - 使用 DeepSeek API（OpenAI 兼容）
  - 环境变量：`LLM_BASE_URL=https://api.deepseek.com`, `LLM_API_KEY=...`, `LLM_MODEL=deepseek-chat`
  - 系统提示词固定：角色是"小外外的朋友"，要用小学生能懂的话，不要专业术语，多用 emoji
- [ ] 上下文注入（自动拼到 user prompt 之前）：
  - 当前打开的代码
  - 最近一条报错（如有）
  - 当前仿真状态摘要（源、动作、主要关节角）
  - `docs/exo-sdk.md` 的精简版
- [ ] 前端聊天面板：在代码页/Blockly 页侧边抽屉
  - 聊天气泡风格，学生消息 + Exobot 头像
  - 快捷按钮："这行代码是什么意思？"、"帮我写一个让灯闪烁的程序"、"为什么报错？"
- [ ] **LLM 不能直接执行控制命令**。如果模型生成了代码，前端只做展示+"插入到编辑器"按钮，由学生再点▶️运行
- [ ] 会话保存到 `llm_sessions`

#### 验收标准
1. 学生采集 3 次走路 + 3 次深蹲，训练 KNN，得到准确率数字
2. 训练完后做新动作，屏幕大字实时提示"现在是：走路"
3. 代码报错时，LLM 用友好话术解释错误原因，并给出修改建议代码
4. 问"怎么让灯变绿？"，LLM 返回包含 `exo.set_led('green')` 的示例代码

---

## 6. Codex 执行约定

### 6.1 提交与分支
- 每个 Phase 一个主分支：`phase-0`, `phase-1`, ..., `phase-5`
- 每个 Phase 内每个"任务清单子项"一个 PR，标题格式：`[P2] Pyodide Worker 运行时`
- PR 描述必须包含：
  - 变更摘要
  - 对应 SPEC.md 的段落锚点
  - 自测通过的截图或 gif（UI 变更必须）
  - 引入的新依赖清单（如有）

### 6.2 代码规范
- Python：`black` + `ruff` + `mypy`（strict 可选）
- TS：`eslint` + `prettier`
- 所有公共函数/类必须有 docstring 或 JSDoc
- **禁止 `any`**（TS）和 `# type: ignore`（Python）除非给出理由注释

### 6.3 测试要求
- **每个 service 模块至少 1 个单元测试**
- **每个 API route 至少 1 个集成测试**（用 FastAPI `TestClient`）
- 仿真内核必须有确定性测试：给定同一随机种子，同一策略参数，输出 10s telemetry 必须字节一致
- 前端关键组件用 Vitest 做渲染测试（至少覆盖登录、仿真按钮、运行按钮）

### 6.4 文案与 UI 检查（小学生友好）
**每个 UI PR 必须自检以下**：
- [ ] 无英文专业术语直接暴露（除非有中文旁注）
- [ ] 所有错误提示不少于一个 emoji
- [ ] 主要操作按钮 ≥ 48px 高
- [ ] 字号 ≥ 16px
- [ ] 颜色对比度满足 WCAG AA
- [ ] 吉祥物 Exobot 至少在空状态/加载/报错 3 个场景出现

### 6.5 禁止事项
- ❌ 引入本 SPEC 未列出的主流框架（Next.js / NestJS / Django 等）
- ❌ 学生代码能直接访问 `window` / `document` / `js` 对象
- ❌ 把真机控制代码写到后端 main 进程（必须通过 pi-agent）
- ❌ 把不同 Phase 的任务混在一个 PR 里
- ❌ 在不读 `reference/` 的情况下动 Phase 4
- ❌ 在 Phase 4 中按"通用 CAN 协议"或手册想当然地重写 USB-CAN 通信和电机编解码（本硬件有特殊编码方式，必须复用 `reference/rpi-legacy/` 中已跑通的实现）
- ❌ 在 V1 代码、仿真模型、UI 中出现膝关节、踝关节相关的任何实现（本外骨骼只有左右髋 2 个主动关节）
- ❌ 在 V1 中采集、处理、展示 IMU / 足底压力 / 肌电等非 encoder 信号（V1 范围仅限 encoder 的角度、角速度，以及下发的目标扭矩）
- ❌ 在未经人类确认的情况下，擅自把 §3.5 的简化交互模型替换为真实物理引擎（MuJoCo / PyBullet / Gazebo 等）。V1 明确采用简化模型，替换需走 MAJOR 版本升级流程并更新本 SPEC
- ❌ 在未经人类确认的情况下，擅自调整 §3.5.4 五档策略的默认参数或评分权重，导致"评分单调性"测试失效

### 6.6 不确定时的处理
Codex 遇到 SPEC 没写清楚的地方时，**不要自己猜**。具体做法：
1. 在 PR 描述里开 `## Open Questions` 小节列出问题
2. 给出你倾向的方案和理由
3. 暂时用占位实现让流程跑通
4. 等用户在 PR 里回复后再改

---

## 7. 环境变量清单（`.env.example`）

```bash
# 基础
ENV=dev
SECRET_KEY=change-me-please

# 数据库
DATABASE_URL=postgresql+psycopg://exokids:exokids@db:5432/exokids

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=exokids

# LLM (DeepSeek 兼容)
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-xxx
LLM_MODEL=deepseek-chat

# Pi 部署
PI_SSH_KEY_PATH=/app/keys/id_ed25519

# 前端
VITE_API_BASE=http://localhost:8000
VITE_WS_BASE=ws://localhost:8000
```

---

## 8. 开放问题（等用户确认）

以下事项 SPEC 中已给出默认方案，但用户后续如需调整请直接修改本节并通知 Codex：

- [ ] Exobot 吉祥物的最终视觉设计（目前用 emoji + SVG 占位）
- [ ] 是否需要声音效果（按钮点击、走路脚步声等）
- [ ] 教师端是否需要大屏投影模式（整个班级同时观摩一个学生的仿真）
- [ ] Pi agent 分发代码用 SCP 还是通过 WebSocket 传字节流（默认 SCP，更稳）
- [ ] 是否需要多语言（当前默认只做中文）

---

## 9. 里程碑与时间盒建议（供 Codex 参考，非强制）

| Phase | 建议工期 | 关键产出 |
|---|---|---|
| P0 | 2-3 天 | 骨架跑起来 |
| P1 | 5-7 天 | 能看能玩的仿真 Dashboard |
| P2 | 5-7 天 | 能写代码、能拖积木 |
| P3 | 3-5 天 | 教学管理闭环 |
| P4 | 7-10 天 | 真机打通（依赖用户提供资料） |
| P5 | 5-7 天 | Classifier + LLM |

---
---

## 10 · 版本管理与 GitHub 协作规范

### 10.1 远程仓库

- **仓库地址**：https://github.com/mengchade-create/AI-eduaction-exoskeleton.git
- **默认分支**：`main`（受保护，禁止直接 push）
- **开发分支命名**：`feat/<phase>-<短描述>`、`fix/<短描述>`、`docs/<短描述>`、`refactor/<短描述>`
- **合并方式**：Codex 以 Pull Request 方式提交，人工 review 后 squash merge

### 10.2 Codex 必须遵循的提交规范

1. **每个有意义的改动对应一个独立 PR**，不允许把 Phase 2 和 Phase 3 的改动混在一个 PR 里。
2. **Commit message 使用 Conventional Commits 格式**：
   - `feat(sim): 增加左右髋 encoder 数据流`
   - `fix(pi-agent): 修正 CAN ID 路由错误`
   - `docs(spec): 调整信号范围为 encoder-only`
   - `refactor(ui): 抽出曲线面板组件`
3. **每个 PR 描述必须包含以下四段**（缺一不可）：

```markdown
## 修改点（做了什么）
- 文件级别的改动清单
- 新增 / 删除的模块

## 动机（为什么改）
- 对应 SPEC 的第几节、第几条任务
- 或修复了哪个 issue

## 效果（改完之后是什么样）
- 截图 / 录屏 / 日志片段
- 关键指标（如延迟、CPU 占用、控制环频率）前后对比
- 单元测试 / 集成测试通过情况

## 回滚指引
- 如需回滚，执行 `git revert <merge_commit_sha>`
- 回滚后需同步回退的外部资源（数据集、模型权重、配置文件）
### 9.3 分支策略与工作流

采用简化版 GitHub Flow，适配 Codex 逐 Phase 推进的节奏。

- **main**：受保护分支，任何时刻都应处于可部署状态；禁止直接 push，只接受通过 PR 的 squash merge
- **phase-<N>**（可选）：较大的 Phase 开工前可建一个 Phase 集成分支，所有该 Phase 的 feature 分支合入此分支，Phase 收尾时再整体合入 main
- **feat / fix / docs / refactor / chore 分支**：从 main（或对应 phase-<N>）切出，单一职责，生命周期不超过 3 天，合并后立即删除

**分支命名示例**：

| 类型 | 示例 |
|---|---|
| 新功能 | `feat/p1-sim-kernel-interaction-model` |
| 修复 | `fix/p4-can-id-routing` |
| 文档 | `docs/spec-add-interaction-model` |
| 重构 | `refactor/web-curve-panel-extract` |
| 杂项 | `chore/bump-pyodide-version` |

**强制规则**：
- 分支名全小写，单词间用 `-` 分隔
- 分支名必须包含 Phase 前缀（`p0` ~ `p5`）或 `spec` / `chore`，便于在 GitHub UI 中筛选
- 一个分支只做一件事，超出范围需新建分支

### 9.4 代码评审与合并规则

**Review 前置条件**（PR 作者自查，未全部打勾的 PR 不进入 review 队列）：

- [ ] CI 全绿（lint / type check / test / build）
- [ ] PR 描述四段齐全（修改点 / 动机 / 效果 / 回滚指引）
- [ ] 涉及 UI 的改动附带截图或 gif
- [ ] 涉及 SPEC 的改动同步更新 `SPEC.md`，并在 PR 描述中引用对应段落锚点
- [ ] 新增依赖已在 PR 描述中列出，且说明引入理由
- [ ] 无 `console.log` / `print` 调试残留（除非是产品功能）
- [ ] 无被注释掉的"死代码"

**Review 要求**：

- 每个 PR 至少 1 位人类 reviewer 批准
- 涉及 Phase 4（真机 / Pi agent / CAN 通信）的 PR 必须由熟悉硬件的 reviewer 批准
- 涉及 §3 接口契约、§4 数据库 Schema、§6.5 禁止事项的 PR 必须在描述中显式标注"本 PR 修改核心约定"，并由项目维护者批准
- Reviewer 有义务在 24 小时内给出 review 意见（approve / request changes / comment）

**合并方式**：

- 统一使用 **Squash and merge**，保持 main 历史线性干净
- Squash commit message 必须采用 Conventional Commits 格式（见 §9.2），并在正文中保留 PR 描述中的"修改点"段
- 合并后立即删除源分支

**冲突处理**：

- 作者负责 rebase 到最新 main，解决冲突后强推到自己的分支
- 不使用 merge commit 解冲突（即禁止 `git merge main` 在 feature 分支上产生 merge commit）

### 9.5 发布、Tag 与版本号

采用语义化版本（SemVer）：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的接口变更（§3 接口契约、§4 Schema、学生 SDK 方法签名变动）
- **MINOR**：新增 Phase、新增功能、新增积木类别等向后兼容改动
- **PATCH**：bug 修复、文案修正、参数微调

**Phase 完成即打 Tag**，Tag 命名：

- `v0.1.0` —— Phase 0 完成
- `v0.2.0` —— Phase 1 完成
- `v0.3.0` —— Phase 2 完成
- `v0.4.0` —— Phase 3 完成
- `v0.5.0` —— Phase 4 完成（真机打通）
- `v1.0.0` —— Phase 5 完成（首个面向用户的完整版本）

**Release Notes 必须包含**：

1. 本版本对应的 Phase 与关键交付物
2. 新增 / 修改 / 废弃 的公共接口清单
3. 已知问题（known issues）
4. 升级指引（若有数据库迁移或配置变动）
5. 相对上一版本的 SPEC 变更摘要（对应 §11 变更记录）

### 9.6 Issue 与项目管理

**Issue 分类标签**（在仓库 Settings → Labels 中预建）：

| 标签 | 颜色含义 | 用途 |
|---|---|---|
| `phase-0` ~ `phase-5` | 蓝色系 | 所属 Phase |
| `type:feat` | 绿 | 新功能 |
| `type:bug` | 红 | bug |
| `type:docs` | 灰 | 文档 |
| `type:refactor` | 紫 | 重构 |
| `type:spec` | 橙 | SPEC.md 变更 |
| `priority:p0` | 深红 | 阻塞性，立即处理 |
| `priority:p1` | 橙 | 当前 Phase 内必须完成 |
| `priority:p2` | 黄 | 可排到下一 Phase |
| `good-first-issue` | 浅绿 | 适合新 contributor |
| `needs-human-decision` | 品红 | Codex 等待人类决策 |
| `hardware` | 棕 | 涉及真机 / CAN / 电机 |
| `kid-ux` | 粉 | 涉及小学生 UI 体验 |

**Issue 模板**（放入 `.github/ISSUE_TEMPLATE/`）至少包含：

- `bug_report.md`：重现步骤、期望行为、实际行为、环境信息、截图
- `feature_request.md`：用户故事、对应 SPEC 段落、验收标准
- `spec_change.md`：改动点、动机、影响面、迁移方案

**Codex 特殊规则**：

- Codex 在 PR 描述中遇到无法自行决定的问题时（参考 §6.6），必须同步在对应 issue 上打 `needs-human-decision` 标签并 @ 项目维护者
- Codex 不得自行关闭带有 `needs-human-decision` 标签的 issue

### 9.7 敏感信息与安全

**严禁 commit 的内容**：

- `.env` 文件及任何包含真实凭据的配置
- SSH 私钥、API Key、数据库密码
- `reference/` 下如涉及未公开的硬件手册 PDF（如供应商有保密要求），需在仓库根目录建 `.gitignore` 规则排除
- 学生真实姓名、联系方式、人脸照片等个人信息（测试数据必须用假名）

**强制措施**：

- 仓库根目录必须存在 `.gitignore`，至少包含：`.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`, `__pycache__/`, `node_modules/`, `.DS_Store`, `dist/`, `build/`, `data/`
- 启用 GitHub 的 **Secret scanning** 与 **Push protection**
- 若不慎推送了敏感信息，必须立即：
  1. 吊销该凭据（rotate key / reset password）
  2. 用 `git filter-repo` 清理历史
  3. 强推并通知所有 collaborator 重新 clone

**CI 中使用密钥**：

- 一律通过 GitHub Actions 的 **Secrets** 注入，绝不硬编码
- `LLM_API_KEY`、`PI_SSH_KEY` 等生产凭据仅在 Release workflow 中可见，feature 分支 CI 不得访问

### 9.8 Codex 与人类协作的边界（GitHub 侧）

明确哪些操作 Codex 可以自动做，哪些必须人类介入，避免误操作。

**Codex 可自动执行**：

- 在 feature 分支上 commit / push
- 创建 PR，填写 PR 描述
- 回应 review 意见（修改代码后补充 commit）
- 在 PR / Issue 中使用 comment 澄清问题
- 更新 `SPEC.md` 并在 PR 描述中标注改动

**Codex 必须等待人类确认的操作**：

- 合并 PR 到 main（即使 CI 全绿）
- 删除分支（除非是合并后的自动清理）
- 打 Tag、发布 Release
- 关闭 / 重开 Issue（带 `needs-human-decision` 的一律不碰）
- 修改仓库 Settings（分支保护规则、Secrets、Collaborator 权限）
- 力推（force push）到任何分支（包括自己的 feature 分支，除非是解冲突 rebase 后的必要 force push，且需在 PR 中说明）
- 修改 `.github/` 下的 workflow、issue template、CODEOWNERS

**Codex 不得执行的操作**：

- 直接 push 到 main
- 在未经人类批准的情况下引入 §1 未列出的新框架或新依赖
- 在未经人类批准的情况下改动 §3 接口契约、§4 Schema、§6.5 禁止事项
- 删除历史 commit、改写 main 的历史
- 绕过 CI（如 `[skip ci]`）提交

**违反约定时的处置**：

- 人类 reviewer 发现 Codex 越界行为时，直接 `request changes` 并在 PR 中要求回退
- 若已误合并，人类负责 revert 并在 §11 变更记录中标注事故与改进措施

## 11. 变更记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-05-11 | 0.1 | 初版，用户确认目标用户=小学生、编程=Python、LLM=DeepSeek、部署流程=教师审批后至 Pi |
- 2026-05-17  §3.5    Add hip flexion ROM hard-limit clause (target 75° + margin 5° = 80°). Source: chore/p1-spec-reconcile.
- 2026-05-17  §3.5.3  Walk amplitude fixed at 25°, locked by decision 0001-walk-amplitude-25deg. Source: chore/p1-spec-reconcile.
- 2026-05-17  §3.5.4  Rewrite strategy space as two-axis model (intensity L1..L5 + quality bad_phase/reverse), total 7. See decision 0002-strategy-space-two-axes. Source: chore/p1-spec-reconcile.
