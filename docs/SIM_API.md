# SIM_API

Status: living document. First established by `chore/p1-spec-reconcile`
to anchor Phase 1 closure decisions. PR #10 adds the Phase 1 handoff API
details needed by Phase 2 consumers.

Phase 1 freezes the browser-side simulation module as a library for
Phase 2.

## 1. Scope and quick start

This document specifies the simulation kernel's external API surface and
the contracts that consumers (Dashboard, replay, tests) rely on.

```ts
import { SimulationSession } from "../simulation/SimulationSession";
const s = new SimulationSession({ seed: 0, initialAction: "squat", initialStrategyLevel: 3 });
s.onTelemetry((f) => console.log(f.t, f.fatigue));
s.start();
// ... s.stop() returns ScoreBreakdown
```

## 2. SimulationSession API

```ts
import { SimulationSession } from "../simulation/SimulationSession";
import type { ActionType, ScoreBreakdown, SessionState, TelemetryFrame, Unsubscribe } from "../simulation/types";
```

| Method | Signature | Callable states | Return |
|---|---|---|---|
| `start` | `start(): void` | `idle` | `void` |
| `pause` | `pause(): void` | `running` | `void` |
| `resume` | `resume(): void` | `paused` | `void` |
| `stop` | `stop(): ScoreBreakdown` | `running`, `paused` | final score |
| `reset` | `reset(): void` | any | `void` |
| `step` | `step(dtMs?: number): TelemetryFrame` | `running` | one frame |
| `setAction` | `setAction(action: ActionType): void` | `idle`, `running`, `paused` | `void` |
| `setStrategy` | `setStrategy(level: 1 \| 2 \| 3 \| 4 \| 5): void` | `idle`, `running`, `paused` | `void` |
| `onTelemetry` | `onTelemetry(cb): Unsubscribe` | any | unsubscribe |
| `onStateChange` | `onStateChange(cb): Unsubscribe` | any | unsubscribe |
| `getState` | `getState(): SessionState` | any | current state |
| `getCurrentStrategy` | `getCurrentStrategy(): { id: string; level: number }` | any | strategy |
| `getCurrentAction` | `getCurrentAction(): ActionType` | any | action |
| `getElapsedMs` | `getElapsedMs(): number` | any | elapsed ms |
| `exportReplay` | `exportReplay(): SessionReplay` | any | replay contract |
| `SimulationSession.replay` | `static replay(r: SessionReplay)` | static | frames + final score |

State machine legal transition matrix:

| Current state | `start()` | `pause()` | `resume()` | `stop()` | `reset()` |
|---|---|---|---|---|---|
| `idle` | `running` | ERROR | ERROR | ERROR | `idle` |
| `running` | ERROR | `paused` | ERROR | `stopped` | `idle` |
| `paused` | ERROR | ERROR | `running` | `stopped` | `idle` |
| `stopped` | ERROR | ERROR | ERROR | ERROR | `idle` |

## 3. TelemetryFrame fields

```ts
import type { TelemetryFrame } from "../simulation/types";
```

| Field | Type | Unit | Example | Source |
|---|---|---|---|---|
| `timestamp` | `number` | ms | `960` | `SimulationKernel` internal time |
| `t` | `number` | s | `0.96` | `SimulationKernel` internal time |
| `real_t_ms` | `number` | ms | `960` | `SimulationSession.step` |
| `source` | `"simulated"` | none | `"simulated"` | constant |
| `imu` | `IMU` | zero placeholder | `{ ax: 0, ... }` | V1 schema placeholder |
| `joints` | `JointAngles` | deg | `{ left_hip: 74.98, right_hip: 74.98 }` | `JointDynamics` via `rad2deg` |
| `q` | `JointAngles` | deg | same as `joints` | session API alias |
| `q_ref` | `JointAngles` | deg | `{ left_hip: 70, right_hip: 70 }` | hip-only reference signal from active strategy inputs; emitted via `rad2deg` from internal rad values |
| `dq` | `JointVelocities` | deg/s | `{ left_hip: 3.1, right_hip: 3.1 }` | `JointDynamics` via `rad2deg` |
| `dq_ref` | `JointVelocities` | deg/s | `{ left_hip: 12, right_hip: 12 }` | hip-only reference velocity from active strategy inputs; emitted via `rad2deg` from internal rad/s values |
| `tau_human` | `JointTorques` | N*m | `{ left_hip: 12, right_hip: 12 }` | `HumanTorqueModel` |
| `tau_exo` | `JointTorques` | N*m | `{ left_hip: 3, right_hip: 3 }` | active strategy |
| `motors` | `MotorState` | N*m / A | `{ left_hip_torque: 3, ... }` | active strategy + placeholder current |
| `fatigue` | `number` | 0..1 | `0.025` | `FatigueModel` |
| `action` | `ActionType` | none | `"squat"` | `SimulationSession` |
| `phase` | `number` | 0..1 | `0.48` | `SimulationKernel.computePhase` |
| `step_count` | `number` | count | `4` | left hip zero-crossing |
| `battery` | `number` | 0..1 | `1` | constant |
| `assist_mode` | `string` | none | `"off"` | placeholder |
| `strategy_id` | `string` | none | `"level_3_fixed_ff"` | active strategy |
| `session_state` | `SessionState` | none | `"running"` | `SimulationSession` |
| `final` | `boolean | undefined` | none | `true` | `stop()` final frame |

## 4. ScoreBreakdown fields and formula

```ts
import type { ScoreBreakdown } from "../simulation/types";
import { getEnergyBaseline } from "../simulation/scoring/energyBaseline";
```

Formula:

```ts
energy_term = SCORE_WEIGHT_ENERGY * (1 - energy_human / getEnergyBaseline(action, duration_s));
total = energy_term
  - SCORE_WEIGHT_ROM * rom_violation
  - SCORE_WEIGHT_SMOOTHNESS * smoothness
  - SCORE_WEIGHT_FATIGUE * fatigue_final;
```

Current constants:

| Constant | Value | Status |
|---|---:|---|
| `SCORE_WEIGHT_ENERGY` | `100` | placeholder, waits for ergonomics calibration |
| `SCORE_WEIGHT_ROM` | `8` | placeholder |
| `SCORE_WEIGHT_SMOOTHNESS` | `0.00002` | placeholder |
| `SCORE_WEIGHT_FATIGUE` | `10` | placeholder |
| `BASELINE_FLOOR_J_PER_S` | `5` | retained Phase 1 implementation; see §8 |
| `HIP_ROM_LIMIT_RAD` | `80deg` | resolved by SPEC §3.5 hip ROM hard limit |

`ScoreBreakdown.breakdown.energy_human` uses calibrated per-action L1 baselines.
Weights and ROM limit are not final science values.

## 5. Strategy registry

### 5.1 Intensity axis (Phase 1, registered)

| Key   | Description                                         | Status     |
|-------|-----------------------------------------------------|------------|
| L1    | Lowest assistance level                             | Registered |
| L2    | Low assistance                                      | Registered |
| L3    | `good_assist` baseline                              | Registered |
| L4    | High assistance                                     | Registered |
| L5    | Highest assistance level                            | Registered |

(Exact gain / parameter values live in kernel source; this table only
records the registry contract.)

### Strategy id mapping (Phase 1 implementation → SPEC key)

| SPEC key | Phase 1 implementation id |
|----------|---------------------------|
| L1       | `level_1_zero`            |
| L2       | `level_2_passive`         |
| L3       | `level_3_fixed_ff`        |
| L4       | `level_4_phase_adapt`     |
| L5       | `level_5_full_adapt`      |

Phase 1 implementation mapping:

```ts
import { createStrategy } from "../simulation/strategies/StrategyFactory";
```

| level | id | Key parameters | 12s squat score |
|---:|---|---|---:|
| 1 | `level_1_zero` | `ZERO_TORQUE_NM = 0` | `-4.52` |
| 2 | `level_2_passive` | `PASSIVE_STIFFNESS_NM_PER_RAD = 4`, `PASSIVE_TORQUE_LIMIT_NM = 10` | `3.20` |
| 3 | `level_3_fixed_ff` | `FIXED_FEEDFORWARD_ALPHA = 0.3` | `20.83` |
| 4 | `level_4_phase_adapt` | `PHASE_ALPHA_BASE = 0.45`, `PHASE_ALPHA_SWING_BONUS = 0.2` | `34.00` |
| 5 | `level_5_full_adapt` | `FULL_ALPHA_BASE = 0.65`, `FULL_ALPHA_PHASE_BONUS = 0.15`, `FULL_ALPHA_FATIGUE_BONUS = 0.2`, `FULL_ALPHA_MAX = 0.95` | `41.98` |

### 5.2 Quality axis

| Key         | Definition                                                  | Status                                          |
|-------------|-------------------------------------------------------------|-------------------------------------------------|
| bad_phase   | adversarial hip torque shifted a half-cycle out of phase with human intent | implemented; see `apps/web/src/simulation/strategies/BadPhase.ts` |
| reverse     | good_assist with assistance gain negated                    | deferred, not registered |

These keys are reserved by SPEC section 3.5.4 and decision
0002-strategy-space-two-axes.

### 5.3 Strategy selection surface

The primary strategy dropdown lists only the quantitative L1..L5 intensity
progression. `bad_phase` is reachable through a secondary
`Adversarial demo: bad_phase` control, and through the Bad Demo preset
(`bad_phase` + seed 42 + 12s + squat). It is not part of the L1..L5
progression. `reverse` remains deferred and is not registered in
`StrategyFactory`.

## 6. ActionType enum and baselines

```ts
import type { ActionType } from "../simulation/types";
import { getEnergyBaselinePerSecond } from "../simulation/scoring/energyBaseline";
```

| action | Meaning | L1 baseline J/s |
|---|---|---:|
| `idle` | session-level idle, maps to stand internally | `0.000000` |
| `stand` | neutral standing pose | `0.000000` |
| `walk` | opposing hip sine wave, 25deg amplitude | `24.550234` |
| `squat` | synchronized squat cycle, -5deg..75deg | `11.217149` |
| `sit_to_stand` | one-shot minimum-jerk sit to stand | `0.655891` |
| `step` | finite step action using walk-like shape | `14.962103` |

## 7. Replay contract

```ts
import { SimulationSession, type SessionReplay } from "../simulation/SimulationSession";
```

Replay guarantees byte-identical numeric frames for the same `seed`,
`initialAction`, `initialStrategyLevel`, and event sequence in the
Vitest Node environment.

Not guaranteed yet:
- Replay across future intentionally changed baselines.

Browser vs Node byte equality and partial replay semantics are governed
by §8.

## 8. SPEC-uncovered behaviors retained from Phase 1

These four behaviors are not covered by SPEC. Phase 1 implementation is
retained as-is; SPEC will not be expanded to cover them.

- **`reset()` retains active subscriptions** — Status: SPEC does not cover; retain Phase 1 implementation.
  Rationale: idempotent reset semantics; subscription lifecycle is owned by the consumer (Dashboard / replay), not by the simulator state machine.

- **`replay(partial)` semantics** — Status: SPEC does not cover; retain Phase 1 implementation.
  Rationale: partial replay is defined as "deterministic re-execution of frames[0..n)", reusing the same RNG seed and initial conditions; n=frames.length collapses to full replay.

- **Byte-equality determinism guarantee scope** — Status: SPEC does not cover; retain Phase 1 implementation.
  Rationale: byte-equal frame outputs are guaranteed only on Node ≥ 20 with the project-pinned V8; browser runtimes guarantee numerical equivalence (within ULP), not byte equality.

- **`BASELINE_FLOOR_J_PER_S = 5`** — Status: SPEC does not cover; retain Phase 1 implementation.
  Rationale: empirical floor preventing energy-save score from saturating at 100 in near-zero baseline windows; value validated against Phase 1 smoke session traces.

## 9. Invariants

- Same seed + same event sequence gives deterministic numeric frames.
- `pause` state emits no telemetry.
- `stop()` returns an immutable `ScoreBreakdown` snapshot for the stopped run.
- Strategy switching takes effect on the next telemetry frame boundary.
- For the same action, seed, and 12s run: `L1 <= L2 <= L3 <= L4 <= L5`.
- No V1 telemetry field depends on IMU, pressure, muscle, or vision signals.

## 10. Display layer

### 10.1 Display-layer scoring contract

The kernel `StrategyScorer` output is treated as an internal numeric
stream and is NOT shown to end users directly. The display layer derives
a user-facing score via `computeDisplayScore`:

```ts
computeDisplayScore(
  frames: SimulationFrame[],
  baselineEnergyJPerS: number
): {
  total_0_100: number;
  energy_save: number;       // 0..100
  gait_stability: number;    // 0..100
  tracking_accuracy: number; // 0..100
  medal: "gold" | "silver" | "bronze" | "none";
}
```

**Input rationale.** Takes `frames` (not a session handle) so that both
live-tick incremental computation and offline replay paths can call it
with identical signature; `baselineEnergyJPerS` is passed explicitly
because per-action baseline energy is not present on `SimulationFrame`.

**Sub-score derivation (positive-direction, all in 0..100):**

- `energy_save`
  Definition: `100 * exp( -E_human_avg / max(baselineEnergyJPerS, BASELINE_FLOOR_J_PER_S) )`
  where `E_human_avg = mean over frames of frame.humanPowerW`.
  Higher is better.

- `gait_stability`
  Definition: `100 * exp( -k_stab * std(dq_hip) )` where `dq_hip` is
  per-frame hip angular velocity and `k_stab` is a normalization
  constant to be calibrated in Phase 2 dashboard integration.
  Higher is better.

- `tracking_accuracy`
  Definition: `100 * exp( -k_track * RMSE(q_ref - q_hip) )` over frames.
  `k_track` calibrated in Phase 2. Higher is better.

- `total_0_100`
  Definition: weighted average of the three sub-scores. Weights TBD in
  Phase 2 dashboard integration; provisional equal weights (1/3 each)
  acceptable for initial implementation.

- `medal` thresholds: **TBD in Phase 2 dashboard integration.** Do not
  hard-code thresholds in Phase 1.

**Non-goals.** This contract does NOT modify the kernel `StrategyScorer`.
PR #10 smoke baselines are computed against `StrategyScorer` output and
are unaffected by this contract.

## 11. Change log

- 2026-05-17  Initial document. Established §5 (registry incl. quality-axis reservation), §8 (four SPEC-uncovered retained behaviors), §10 (display-layer scoring contract). Source: chore/p1-spec-reconcile.
- 2026-05-17  Merged PR #10 Phase 1 handoff details into sections §1..§7 and §9 while preserving PR #11 contracts in §5.2, §8, and §10.1.
