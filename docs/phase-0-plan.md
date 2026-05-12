# Phase 0 计划

## PR1: Monorepo 骨架与 docker compose
**状态**: done
**分支**: feat/p0-monorepo-skeleton
**说明**: PR1 通过直推方式落地于 main（历史原因），自 PR2 起走标准 PR 流程
**目标**: 建立 ExoKids 单仓库骨架、基础 compose 和共享类型包。
**交付物**:
- README.md — 项目入口说明
- docker-compose.yml — 基础四服务 compose
- docker-compose.dev.yml — 开发覆写 compose
- packages/shared/src/index.ts — 共享 UserRole 与 JwtPayload 类型
**实现要点**:
1. 按 SPEC §2 建立 monorepo 目录。
2. 按服务职责隔离 compose 环境变量。
3. 保留后续 Phase 的接入点。
**验收**:
- [ ] docker compose config 可解析
- [ ] packages/shared 导出 UserRole 与 JwtPayload
- [ ] 不触碰 Phase 1 业务实现
**边界**:
- 不实现 API、DB 迁移或 UI 页面

## PR2: 数据库迁移与 seed
**状态**: pending
**分支**: feat/p0-db-migrations-seed
**目标**: 建立 SPEC §4 全部数据库表，并提供安全的默认 seed 数据。
**交付物**:
- apps/api/alembic/ — Alembic 配置与初始迁移
- apps/api/app/models/ — SQLModel 数据模型
- apps/api/app/db/ — 数据库连接与会话
- scripts/seed_db.py — 默认管理员、教师、班级、5 个假名学生账号
**实现要点**:
1. 直接连接真实 PostgreSQL，不写内存 stub。
2. 严格保持 SPEC §4 Schema，不擅自改字段。
3. Timescale hypertable 仅对 training_samples 表执行，downgrade 对应清理。
**验收**:
- [ ] Alembic upgrade head 成功
- [ ] Alembic downgrade -1 成功
- [ ] seed 后账号数量与角色正确
**边界**:
- 不实现认证 API 路由
- 不使用真实儿童姓名

## PR3: FastAPI 骨架与认证接口
**状态**: pending
**分支**: feat/p0-api-auth-skeleton
**目标**: 提供 FastAPI 骨架、健康检查和基于真实数据库的登录接口。
**交付物**:
- apps/api/app/main.py — FastAPI 应用入口
- apps/api/app/routers/auth.py — /api/auth/login 与 /api/auth/me
- apps/api/tests/ — health 与 auth 测试
**实现要点**:
1. 复用 PR2 的数据库模型和 seed 账号。
2. JWT 使用 SECRET_KEY，并按角色返回当前用户信息。
3. 每个 route 至少 1 个集成测试。
**验收**:
- [ ] /health 返回 ok
- [ ] seed 账号可登录
- [ ] /api/auth/me 可返回当前用户
**边界**:
- 不实现前端登录页
- 不引入 SPEC 未列框架

## PR4: Web 登录页与空 Dashboard
**状态**: pending
**分支**: feat/p0-web-login-dashboard
**目标**: 建立 Vite React Tailwind 骨架、Exobot 形象、登录页与空 Dashboard。
**交付物**:
- apps/web/package.json — 前端项目配置
- apps/web/src/components/Exobot.tsx — SVG 或 CSS 绘制的 Exobot
- apps/web/src/pages/ — 登录页与 Dashboard
- apps/web/src/theme/ — Tailwind 小学生主题
**实现要点**:
1. 小学生 UI 文案去专业术语，按钮不小于 48px。
2. Exobot 使用 SVG 或 CSS 本地绘制，不从外网拉图。
3. 登录后按角色进入空 Dashboard。
**验收**:
- [ ] npm 测试和 build 通过
- [ ] 登录页截图
- [ ] Dashboard 截图
**边界**:
- 不实现仿真内核
- 不接入 Phase 1 Dashboard 功能

## PR5: Compose 端到端 smoke
**状态**: pending
**分支**: feat/p0-compose-smoke
**目标**: 串联 API、Web、DB、MinIO，完成 Phase 0 端到端 smoke 验收。
**交付物**:
- docker-compose.yml — 可运行的服务编排
- docker-compose.dev.yml — 开发覆写
- Makefile — lint/test/build 串联命令
- README.md — 启动说明
**实现要点**:
1. cp .env.example .env 后 docker compose up 可启动。
2. 统一 Makefile smoke 命令。
3. PR 效果段补充 compose 日志、登录页与 Dashboard 截图。
**验收**:
- [ ] docker compose up -d 成功
- [ ] http://localhost:5173 可见登录页
- [ ] seed 账号可进入空 Dashboard
- [ ] make test 通过
**边界**:
- 不进入 Phase 1 仿真功能
