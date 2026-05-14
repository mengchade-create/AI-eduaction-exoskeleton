export interface DynamicsConfig {
  inertia: number;
  damping: number;
}

export class JointDynamics {
  constructor(private cfg: DynamicsConfig = { inertia: 0.5, damping: 2.0 }) {}

  /**
   * Semi-implicit Euler integration:
   * acc = (tauTotal - b * vel) / I
   * velNext = vel + acc * dt
   * posNext = pos + velNext * dt
   */
  step(
    posRad: number,
    velRad: number,
    tauTotalNm: number,
    dt: number,
  ): { posRad: number; velRad: number } {
    const acc = (tauTotalNm - this.cfg.damping * velRad) / this.cfg.inertia;
    const velNext = velRad + acc * dt;
    const posNext = posRad + velNext * dt;

    return { posRad: posNext, velRad: velNext };
  }
}
