import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ScoreBreakdownCard from "./ScoreBreakdownCard";
import type { ScoreBreakdown } from "../../simulation/types";

const SCORE: ScoreBreakdown = {
  total: 0.69,
  strategy_id: "level_3_fixed_ff",
  duration_s: 12,
  subscores: [
    {
      key: "tracking",
      label: "Tracking Accuracy",
      value: 0.82,
      weight: 0.5,
      contribution: 0.41,
    },
    {
      key: "smoothness",
      label: "Smoothness",
      value: 0.7,
      weight: 0.3,
      contribution: 0.21,
    },
    {
      key: "endurance",
      label: "Endurance Efficiency",
      value: 0.35,
      weight: 0.2,
      contribution: 0.07,
    },
  ],
  breakdown: {
    energy_human: 1,
    energy_exo: 2,
    rom_violation: 0,
    smoothness: 3,
    fatigue_final: 0.65,
  },
};

describe("ScoreBreakdownCard", () => {
  it("renders a placeholder while score breakdown is unavailable", () => {
    const markup = renderToStaticMarkup(<ScoreBreakdownCard score={null} />);

    expect(markup).toContain("Score Breakdown");
    expect(markup).toContain("Run a timed episode");
  });

  it("renders subscore values, weights, contributions, and total", () => {
    const markup = renderToStaticMarkup(<ScoreBreakdownCard score={SCORE} />);

    expect(markup).toContain("Tracking Accuracy");
    expect(markup).toContain("Smoothness");
    expect(markup).toContain("Endurance Efficiency");
    expect(markup).toContain("0.82");
    expect(markup).toContain("0.50");
    expect(markup).toContain("0.41");
    expect(markup).toContain("0.69");
  });
});
