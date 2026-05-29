import { BadPhase } from "./BadPhase";
import { Level1Zero } from "./Level1Zero";
import { Level2Passive } from "./Level2Passive";
import { Level3FixedFF } from "./Level3FixedFF";
import { Level4PhaseAdapt } from "./Level4PhaseAdapt";
import { Level5FullAdapt } from "./Level5FullAdapt";
import type { Strategy, StrategyKey } from "./Strategy";

export function createStrategy(key: StrategyKey): Strategy {
  if (key === "bad_phase" || key === 0) {
    return new BadPhase();
  }

  if (key === 1) {
    return new Level1Zero();
  }

  if (key === 2) {
    return new Level2Passive();
  }

  if (key === 3) {
    return new Level3FixedFF();
  }

  if (key === 4) {
    return new Level4PhaseAdapt();
  }

  return new Level5FullAdapt();
}
