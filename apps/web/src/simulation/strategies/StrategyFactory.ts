import { Level1Zero } from "./Level1Zero";
import { Level2Passive } from "./Level2Passive";
import { Level3FixedFF } from "./Level3FixedFF";
import { Level4PhaseAdapt } from "./Level4PhaseAdapt";
import { Level5FullAdapt } from "./Level5FullAdapt";
import type { Strategy, StrategyLevel } from "./Strategy";

export function createStrategy(level: StrategyLevel): Strategy {
  if (level === 1) {
    return new Level1Zero();
  }

  if (level === 2) {
    return new Level2Passive();
  }

  if (level === 3) {
    return new Level3FixedFF();
  }

  if (level === 4) {
    return new Level4PhaseAdapt();
  }

  return new Level5FullAdapt();
}
