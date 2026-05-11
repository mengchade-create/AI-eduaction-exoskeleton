# {{PR_LABEL}}: {{TITLE}}

**分支**: {{BRANCH}}
**计划文档**: {{PHASE_DOC}}

## 目标

{{TARGET}}

## 交付物

{{DELIVERABLES}}

## 实现要点

{{NOTES}}

## 验收

{{ACCEPTANCE}}

## 边界

{{BOUNDARIES}}

---

## 自测要求（所有 PR 强制，不允许跳过）

完成后在 PR 描述里贴：
1. `tree <本 PR 涉及目录>` 输出
2. 所有新增/修改的测试命令的完整输出（pytest / vitest / 等）
3. lint 和 type check 输出
4. 沙盒内无法跑 docker 时，用等价方式验证（httpx ASGITransport / 单元测试 mock 等），贴证据
5. 任何"无法验证"的声明必须给出替代验证路径
