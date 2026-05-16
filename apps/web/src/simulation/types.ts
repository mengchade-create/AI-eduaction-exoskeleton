/** Single-joint instantaneous state, using rad / rad*s^-1 / N*m internally. */
export interface JointState {
  /** Joint angle relative to neutral position, in radians. */
  posRad: number;
  /** Joint angular velocity, in radians per second. */
  velRad: number;
  /** Human active torque for the current tick, in N*m. */
  torqueHumanNm: number;
  /** Exoskeleton assistive torque for the current tick, in N*m. */
  torqueExoNm: number;
}

/** Global simulation state emitted to UI on every tick. */
export interface KernelState {
  /** Simulation time, in seconds. */
  t: number;
  /** Left hip joint state. */
  leftHip: JointState;
  /** Right hip joint state. */
  rightHip: JointState;
  /** Normalized fatigue value in the range 0..1. */
  fatigue: number;
  /** Instant score for the current tick, in the range 0..100. */
  instantScore: number;
  /** Rolling average score, in the range 0..100. */
  cumulativeScore: number;
}

/** Action template selected for the simulation. */
export type ActionTemplateId = "stand" | "walk" | "squat" | "sit_to_stand" | "step";

/** Options accepted by SimulationKernel.playAction. */
export interface PlayActionOptions {
  /** Number of steps for the finite step action. */
  stepCount?: number;
}

/** Strategy id aligned with SPEC section 3.5.3 five-level strategy names. */
export type StrategyId =
  | "good_assist"
  | "mid_assist"
  | "zero"
  | "bad_phase"
  | "reverse";

/** Inputs supplied by UI on every tick. */
export interface KernelInputs {
  /** Current action template. */
  actionTemplate: ActionTemplateId;
  /** Current assist strategy id. */
  strategyId: StrategyId;
  /** Whether emergency stop is active for this tick. */
  emergencyStop: boolean;
}

/** Configuration for constructing a simulation kernel. */
export interface KernelConfig {
  /** Fixed physics time step in seconds; defaults to 0.002. */
  dt?: number;
  /** Deterministic seed for future noise sources; defaults to 42. */
  seed?: number;
  /** Initial strategy level; defaults to 1. */
  initialStrategyLevel?: 1 | 2 | 3 | 4 | 5;
}

/** Strategy parameters accepted by SimulationKernel.setStrategy. */
export interface StrategyParams {
  /** Playback speed multiplier. */
  speedScale: number;
  /** Stride multiplier reserved for later strategy work. */
  strideScale: number;
  /** Left-side gain reserved for later strategy work. */
  leftGain: number;
  /** Right-side gain reserved for later strategy work. */
  rightGain: number;
  /** Hip target amplitude override in degrees. */
  hipAmplitudeDeg: number;
  /** Phase offset reserved for later strategy work. */
  phaseOffsetMs: number;
  /** Assist strength reserved for later strategy work. */
  assistStrength: number;
}

/** Pose consumed by the future Three.js scene. */
export interface Pose {
  left_hip_deg: number;
  right_hip_deg: number;
}

/** IMU schema retained for compatibility; V1 simulation fills zeros. */
export interface IMU {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

/** Joint angle payload exposed in degrees. */
export interface JointAngles {
  left_hip: number;
  right_hip: number;
}

/** Motor payload for target torque and current. */
export interface MotorState {
  left_hip_torque: number;
  right_hip_torque: number;
  left_hip_current: number;
  right_hip_current: number;
}

/** Telemetry frame emitted to subscribers at 60 Hz. */
export interface TelemetryFrame {
  /** Deterministic simulation timestamp in milliseconds. */
  timestamp: number;
  /** Telemetry source. */
  source: "simulated";
  /** Zero-filled IMU placeholder for V1 schema compatibility. */
  imu: IMU;
  /** Hip joint angles in degrees. */
  joints: JointAngles;
  /** Motor target torque and current values. */
  motors: MotorState;
  /** Step count from hip zero-crossing detection. */
  step_count: number;
  /** Simulated battery value in the range 0..1. */
  battery: number;
  /** Current assist mode label. */
  assist_mode: string;
  /** Current strategy identifier. */
  strategy_id: string;
  /** Whether this is the final frame emitted from stop(). */
  final?: boolean;
}

/** Final score breakdown produced when the kernel stops. */
export interface ScoreBreakdown {
  total: number;
  breakdown: {
    energy_human: number;
    energy_exo: number;
    rom_violation: number;
    smoothness: number;
    fatigue_final: number;
  };
  strategy_id: string;
  duration_s: number;
}
