import type { StrategyId } from "../types";

export class StrategyScorer {
  private rolling = 50;

  /**
   * Placeholder implementation. PR #6 will replace this with torque alignment
   * and fatigue penalty scoring.
   */
  score(
    _strategyId: StrategyId,
    _tauHumanNm: number,
    _tauExoNm: number,
    _fatigue: number,
  ): { instant: number; cumulative: number } {
    void _strategyId;
    void _tauHumanNm;
    void _tauExoNm;
    void _fatigue;

    return { instant: 50, cumulative: this.rolling };
  }

  finalScore(_fatigue: number): { instant: number; cumulative: number } {
    void _fatigue;

    return { instant: 50, cumulative: this.rolling };
  }

  reset(): void {
    this.rolling = 50;
  }
}
