# ExoKids API

## 概述

这是 ExoKids 的后端 API，基于 FastAPI + SQLModel 构建，当前提供健康检查与 JWT 鉴权的最小 P0 能力。

## 环境要求

- Python >=3.11
- PostgreSQL >=14
- 开发与测试阶段可使用 SQLite

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | 无 | 数据库连接，例如 `postgresql+psycopg://user:pass@localhost:5432/exokids` 或 `sqlite:///./dev.db` |
| `SECRET_KEY` | 是 | 无 | JWT 签名密钥，生产环境务必使用强随机值 |
| `JWT_ALGORITHM` | 否 | `HS256` | JWT 签名算法 |
| `JWT_EXPIRE_MINUTES` | 否 | `10080` | JWT 过期时间，默认 7 天 |
| `CORS_ORIGINS` | 否 | `*` | CORS 来源，多个值用逗号分隔 |
| `EXOKIDS_SEED_PASSWORD` | 否 | 开发占位符 | seed 默认用户密码；不设置时仅适用于 dev |

生成生产用 `SECRET_KEY` 示例：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 安装

```bash
cd apps/api
pip install -e ".[dev]"
```

## 初始化数据库

当前 P0 阶段可用 `create_all` 初始化数据库：

```bash
python -c "from app.models.tables import *; from sqlmodel import SQLModel, create_engine; import os; SQLModel.metadata.create_all(create_engine(os.environ['DATABASE_URL']))"
```

然后写入默认 seed 数据：

```bash
python -m app.seeds.default_seed
```

TODO：后续会引入 Alembic 管理迁移，当前 `create_all` 仅适用于 P0 阶段。

## 启动开发服务

```bash
python -m uvicorn app.main:app --reload --port 8000
```

## 健康检查

```bash
curl http://localhost:8000/health
```

示例返回：

```json
{"status":"ok","version":"0.0.0"}
```

```bash
curl http://localhost:8000/health/db
```

示例返回：

```json
{"db":"ok"}
```

## 鉴权使用

登录获取 token。下面的 `admin` / `pw123` 仅为 seed 默认用户示例，以实际 seed 配置为准：

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pw123"}'
```

示例返回：

```json
{
  "access_token": "<token>",
  "token_type": "bearer",
  "user": {
    "id": "00000000-0000-0000-0000-000000000000",
    "username": "admin",
    "role": "admin",
    "display_name": "管理员",
    "avatar": "robot"
  }
}
```

带 token 访问当前用户信息：

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

示例返回：

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "username": "admin",
  "role": "admin",
  "display_name": "管理员",
  "avatar": "robot"
}
```

token 类型是 Bearer，header 格式为：

```bash
Authorization: Bearer <token>
```

常见 401 错误：

- `invalid_credentials`：用户名或密码错误
- `invalid_token`：token 无效或过期
- `Not authenticated`：未携带 token，来自 FastAPI OAuth2 默认响应

## 运行测试

```bash
python -m pytest -v apps/api/tests
```

## 项目结构

```text
app/
  config.py         # pydantic-settings 配置
  main.py           # FastAPI app 入口
  security.py       # JWT / 密码 hash 工具
  deps.py           # get_db / get_current_user
  db/
    session.py      # engine
    types.py        # 跨方言 GUID / JSONB
  models/tables.py  # SQLModel 表定义
  routers/
    health.py
    auth.py
  schemas/auth.py
  seeds/default_seed.py
tests/
```
