# 0003 Post-freeze Kernel / Session Changes

## Status

Accepted

## Context

Phase 1 freeze documentation treats `JointDynamics`, `HumanTorqueModel`,
`FatigueModel`, and `HumanIntentModel` as the frozen physical model layer.

After the freeze, PR #20, PR #23, and PR #24 modified
`SimulationKernel.ts` and `SimulationSession.ts`:

- PR #20 exposed `q_ref` and `dq_ref` on `TelemetryFrame`.
- PR #23 added runtime strategy switching.
- PR #24 registered the `bad_phase` adversarial demo strategy.

These changes affected the session/kernel API surface and strategy selection
plumbing, but did not modify the four frozen physical model files.

## Decision

`SimulationKernel.ts` and `SimulationSession.ts` are API-layer orchestration
code, not part of the four frozen physical model files.

Post-freeze changes to kernel/session are allowed when they satisfy all of the
following:

- They are additive to `TelemetryFrame` or session control surfaces.
- They do not change physics step semantics.
- They do not modify `JointDynamics`, `HumanTorqueModel`, `FatigueModel`, or
  `HumanIntentModel`.
- They are referenced by an ADR retroactively if the ADR was not written before
  implementation.

## Consequences

Future planners must check whether a proposed change touches API-layer
orchestration or the frozen physical model layer.

Any future change to `JointDynamics`, `HumanTorqueModel`, `FatigueModel`, or
`HumanIntentModel` requires a new ADR before implementation.
