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
export type ActionTemplateId = "idle" | "walk" | "squat";

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
  /** Fixed time step in seconds; defaults to 1/60. */
  dt?: number;
}
