# 0004 Bad Phase UI Separation

## Status

Proposed

## Context

`bad_phase` is currently exposed in the same strategy dropdown as L1..L5. This
is convenient for demos, but it blurs the distinction between the quantitative
L1..L5 intensity progression and the adversarial quality-axis strategy.

SPEC section 3.5.4 and decision 0002 describe `bad_phase` as a separate
quality-axis strategy rather than a normal level in the L1..L5 progression.

## Decision

`bad_phase` will move to a secondary UI surface, such as a separate
"Adversarial demo" control, or remain available only through the Bad Demo
preset.

The L1..L5 dropdown will list only quantitative intensity levels.

## Consequences

PR #29 will implement this UI separation.

Existing tests that assert the dropdown contents or strategy selection flow will
need updates.
