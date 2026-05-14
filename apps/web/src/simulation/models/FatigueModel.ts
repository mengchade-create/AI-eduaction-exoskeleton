export interface FatigueConfig {
  capacity: number;
}

export class FatigueModel {
  private accum = 0;

  constructor(private cfg: FatigueConfig = { capacity: 200 }) {}

  update(tauHumanAbs: number, dt: number): number {
    this.accum += tauHumanAbs * dt;
    return Math.min(1, this.accum / this.cfg.capacity);
  }

  reset(): void {
    this.accum = 0;
  }

  get value(): number {
    return Math.min(1, this.accum / this.cfg.capacity);
  }
}
