# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0-phase1] - 2026-05-17

### Added

- PR #3: Added SimulationKernel core skeleton and model wiring.
- PR #4: Added action templates for walk, squat, sit-to-stand, and step.
- PR #5: Added five-tier strategy factory and StrategyScorer score breakdown.
- PR #6: Added SimulationSession lifecycle, telemetry subscription, replay, and calibrated baseline table.
- PR #7: Added Phase 1 API docs, handoff summary, and baseline lock smoke test.
- PR #8: Added ADR-0001 for walk amplitude and strategy scoring follow-up.
- PR #9: Added session API stabilization and replay determinism coverage.

### Notes

- Simulation physical model layer is frozen; future changes need an ADR.
- See `docs/PHASE1_SUMMARY.md` and `docs/SIM_API.md`.
