<!-- 由 ops/daily.py draft-next 从 docs/phase-0-plan.md 生成于 2026-05-12T03:41:26+08:00; PR=PR2 -->

# PR2: 数据库迁移与 seed

**分支**: feat/p0-db-migrations-seed
**计划文档**: docs/phase-0-plan.md

## 目标

建立 SPEC §4 全部数据库表，并提供安全的默认 seed 数据。

## 交付物

- apps/api/alembic/ — Alembic 配置与初始迁移
- apps/api/app/models/ — SQLModel 数据模型
- apps/api/app/db/ — 数据库连接与会话
- scripts/seed_db.py — 默认管理员、教师、班级、5 个假名学生账号

## 实现要点

1. 直接连接真实 PostgreSQL，不写内存 stub。
2. 严格保持 SPEC §4 Schema，不擅自改字段。
3. Timescale hypertable 仅对 training_samples 表执行，downgrade 对应清理。

## 验收

- [ ] Alembic upgrade head 成功
- [ ] Alembic downgrade -1 成功
- [ ] seed 后账号数量与角色正确

## 边界

- 不实现认证 API 路由
- 不使用真实儿童姓名

---

## 自测要求（所有 PR 强制，不允许跳过）

完成后在 PR 描述里贴：
1. `tree <本 PR 涉及目录>` 输出
2. 所有新增/修改的测试命令的完整输出（pytest / vitest / 等）
3. lint 和 type check 输出
4. 沙盒内无法跑 docker 时，用等价方式验证（httpx ASGITransport / 单元测试 mock 等），贴证据
5. 任何"无法验证"的声明必须给出替代验证路径
