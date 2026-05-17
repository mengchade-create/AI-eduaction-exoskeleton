# ADR-0001: walk 髋屈曲幅度采用 25°

## 背景
PR #6 内联使用 30°，PR #7 在常量化时改为 WALK_HIP_AMPLITUDE_DEG = 25°，
PR #7 描述未声明此为行为变更。
PR #8（本 PR）的 walk 数值回归测试发现 max_abs_diff = 4.76 deg，
RMS = 3.50 deg，超出 1e-9 deg 门槛。

## 决策
接受 25° 为正式值。
理由：正常步态髋屈曲幅度文献值 20-30°，25° 更接近人体真实行为；
PR #7 测试参考帧已基于 25° 重算，回滚成本大于收益。

## 影响
- 新基线起点为 main（即 PR #7 合并后的状态），WALK_HIP_AMPLITUDE_DEG = 25°
- 后续所有 walk 相关回归基于 25° 进行
- PR #7 描述与实际行为不一致这一流程问题，由后续 PR 模板修复

---

## Status update (appended by chore/p1-spec-reconcile, 2026-05-17)

Status: Accepted. Rationale codified into SPEC section 3.5.3 by
chore/p1-spec-reconcile; the original process gap (value not anchored in
SPEC) is now closed.

Consequences:
- SPEC section 3.5.3 references this decision as the lock source.
- No kernel code change: existing Phase 1 implementation already uses 25 degrees.
- Smoke baselines in PR #10 remain valid.
