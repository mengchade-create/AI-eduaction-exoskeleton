# Decision 0002: Strategy space expansion — two orthogonal axes (5 → 7)

- Status: Accepted — Implementation Pending (Phase 2)
- Date: 2026-05-17
- Deciders: Phase 1 team
- Supersedes: none
- Superseded by: none

## Context

Phase 1 shipped 5 intensity-graded strategies (L1..L5) as the primary
teaching progression. A separate need arose for "demonstration /
experimental" strategies that illustrate failure modes (wrong phase,
wrong sign) without polluting the pedagogical line. Conflating the two
into a single 5-slot enum was rejected as it would force a false
either/or between graded intensity and quality demonstrations.

## Decision

Model the strategy space as **two orthogonal axes**:

### Intensity axis (primary)

L1, L2, L3 (= `good_assist`), L4, L5. Already implemented and
registered in Phase 1 kernel. Exposed in the primary teaching UI.

### Quality axis (demonstration / experimental)

Two strategies, each defined as a transformation of L3 `good_assist`:

- **`bad_phase`**
  Definition: `good_assist` with reference torque phase shifted by **+π/2**.
  Frozen parameter — Phase 2 implementation must apply exactly this
  offset, no further parameter discussion required.

- **`reverse`**
  Definition: `good_assist` with assistance gain **α negated** (α → −α).
  Frozen parameter — Phase 2 implementation must negate exactly this
  gain, no further parameter discussion required.

Both surfaced via a secondary UI entry only.

Total registered strategies after Phase 2 implementation: **7**.

## Implementation status

- Phase 1: NOT registered in `StrategyFactory`. Calling these keys throws.
- Phase 2 (B2-impl): dedicated implementation PR will register both, add
  unit tests, and wire the secondary UI entry. This reconciliation PR is
  documentation only and does not modify kernel source.

## Consequences

- SPEC §3.5.4 rewritten to reflect the two-axis model.
- SIM_API §5.2 lists `bad_phase` / `reverse` as reserved keys with
  deferred status.
- PR #10 smoke baselines unaffected (kernel unchanged in Phase 1).
- B2-impl follow-up tracked in `docs/PHASE1_CONTEXT.md` closure section.
