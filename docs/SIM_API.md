# SIM_API

Status: living document. First established by `chore/p1-spec-reconcile`
to anchor Phase 1 closure decisions. Sections marked _placeholder_ will
be filled in by subsequent PRs.

## 1. Scope

This document specifies the simulation kernel's external API surface and
the contracts that consumers (Dashboard, replay, tests) rely on.

## 2. Types _(placeholder — to be backfilled from kernel source)_

## 3. Lifecycle _(placeholder)_

## 4. Frame stream _(placeholder)_

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

### 5.2 Quality axis (Phase 2 implementation pending)

| Key         | Definition                                                  | Status                                          |
|-------------|-------------------------------------------------------------|-------------------------------------------------|
| bad_phase   | good_assist with reference torque phase shifted by +π/2     | Spec'd; kernel registration deferred to Phase 2 |
| reverse     | good_assist with assistance gain α negated (α → −α)         | Spec'd; kernel registration deferred to Phase 2 |

These keys are reserved by SPEC §3.5.4 and decision
0002-strategy-space-two-axes. Phase 1 kernel registers only the 5
intensity-axis strategies; calling these keys via `StrategyFactory` in
Phase 1 builds will throw `UnknownStrategyError`.

## 6. Determinism _(placeholder, see also §8 item 3)_

## 7. Replay _(placeholder, see also §8 item 2)_

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

## 9. Errors _(placeholder)_

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
