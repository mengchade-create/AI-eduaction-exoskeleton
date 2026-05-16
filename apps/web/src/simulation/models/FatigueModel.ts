export interface FatigueConfig {
  capacity: number;
}

export class FatigueModel {
  private accum = 0;
  private instantPower = 0;

  constructor(private cfg: FatigueConfig = { capacity: 200 }) {}

  accumulate(tauHumanNm: number, velRad: number, dt: number): number {
    this.instantPower = Math.abs(tauHumanNm * velRad);
    this.accum += Math.abs(tauHumanNm) * dt;
    return Math.min(1, this.accum / this.cfg.capacity);
  }

  reset(): void {
    this.accum = 0;
    this.instantPower = 0;
  }

  get value(): number {
    return Math.min(1, this.accum / this.cfg.capacity);
  }

  get power(): number {
    return this.instantPower;
  }
}
