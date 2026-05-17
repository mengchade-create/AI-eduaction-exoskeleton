# Phase 1 Summary

> Cross-reference: see also the closure section appended to `docs/PHASE1_CONTEXT.md` (added in PR #11).

Phase 1 delivered a deterministic browser-side simulation library for hip-only exoskeleton teaching demos.

## PR List

- PR #3: SimulationKernel core and model skeleton.
- PR #4: Action templates for stand, walk, squat, sit-to-stand, and step.
- PR #5: Five-tier strategy factory and StrategyScorer scoring.
- PR #6: SimulationSession lifecycle, telemetry subscription, replay, and baseline calibration.
- PR #7: Phase 1 handoff docs and baseline lock.
- PR #8: Walk amplitude decision and scorer follow-up.
- PR #9: Session API and replay contract stabilization.

## Implemented vs Placeholder

Implemented:
- `HumanIntentModel`
- `HumanTorqueModel`
- `JointDynamics`
- `FatigueModel`
- five strategies
- `StrategyScorer`
- `SimulationSession`
- deterministic replay

Still placeholder or awaiting calibration:
- score weights
- ROM limit
- baseline acquisition process
- official strategy names
- browser/Node cross-environment replay guarantee

## Test Coverage

Current simulation tests: 5 files / 24 tests.

- `kernel.spec.ts`: kernel telemetry cadence, deterministic walk, stand stability.
- `actions.spec.ts`: action templates, completion callbacks, blend smoothness.
- `strategy.spec.ts`: strategy factory, switching, monotonic scoring, ROM penalty.
- `scorer.spec.ts`: scorer determinism, duration, action baseline table.
- `session.spec.ts`: lifecycle, subscriptions, replay determinism, reset behavior.

## Phase 2 接手者必读

1. Strategy switching is not immediate; it takes effect at the next telemetry frame boundary.
2. Baseline scoring is action-specific. New actions need calibration before scoring is trusted.
3. `TelemetryFrame.real_t_ms` starts at `start()` and only advances through `step()` while running.

## Do Not Touch Without ADR

`JointDynamics`, `HumanTorqueModel`, `FatigueModel`, and `HumanIntentModel` are treated as the Phase 1 physical model layer.
Phase 2 visual and Dashboard work should consume them through `SimulationSession`; model changes need an ADR.
