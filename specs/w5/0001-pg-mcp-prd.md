# PostgreSQL MCP Server - 产品需求文档 (PRD)

## 文档信息

| 项目     | 内容          |
|----------|---------------|
| 文档版本 | v1.0          |
| 创建日期 | 2025-12-20    |
| 状态     | 草稿 - 待评审 |
| 项目代号 | pg-mcp        |

---

## 1. 概述

### 1.1 项目背景

随着数据驱动决策的普及，非技术人员也需要能够查询数据库获取信息。传统的SQL查询对于非技术用户来说存在较高的学习门槛。本项目旨在构建一个基于 Model Context Protocol (MCP) 的 PostgreSQL 查询服务，允许用户通过自然语言描述查询需求，系统自动生成并执行 SQL 查询。

### 1.2 产品愿景

构建一个安全、智能、易用的 PostgreSQL MCP 服务器，让用户能够使用自然语言与数据库交互，同时确保数据安全性和查询结果的准确性。

### 1.3 目标用户

- 数据分析师：需要快速查询数据但不想手写复杂 SQL
- 产品经理：需要获取业务数据支持决策
- 开发人员：通过 MCP 协议集成数据库查询能力到 AI 应用中

---

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 自然语言转 SQL 查询

**功能描述**：用户提供自然语言描述的查询需求，系统返回对应的 SQL 语句或查询结果。

**用户输入**：

- 自然语言查询描述（必需）
- 目标数据库名称（可选，若只有一个数据库则自动选择）
- 返回类型偏好：`sql` | `result`（可选，默认为 `result`）

**输出类型**：

1. **SQL 模式**：返回生成的 SQL 语句，用户可以审查或在其他工具中执行
2. **Result 模式**：直接执行查询并返回结果数据

**示例**：

```
输入: "查询过去7天内订单金额最高的10个客户"
输出 (SQL模式):
  SELECT customer_id, customer_name, SUM(order_amount) as total_amount
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY customer_id, customer_name
  ORDER BY total_amount DESC
  LIMIT 10;

输出 (Result模式):
  | customer_id | customer_name | total_amount |
  |-------------|---------------|--------------|
  | 1001        | 张三          | 50000.00     |
  | 1002        | 李四          | 45000.00     |
  | ...         | ...           | ...          |
```

#### 2.1.2 数据库 Schema 缓存

**功能描述**：MCP 服务器启动时自动扫描并缓存所有可访问数据库的 Schema 信息。

**需要缓存的元数据**：

- **数据库列表**：所有可访问的数据库名称
- **表 (Tables)**：表名、列信息（名称、类型、约束）、主键、外键关系
- **视图 (Views)**：视图名称、视图定义、依赖的表
- **自定义类型 (Types)**：枚举类型、复合类型等
- **索引 (Indexes)**：索引名称、索引列、索引类型
- **注释 (Comments)**：表和列的注释（用于增强语义理解）

**缓存策略**：

- 启动时进行全量缓存
- 提供手动刷新缓存的接口
- 可选：定时增量刷新（可配置刷新间隔）

#### 2.1.3 SQL 生成（基于 LLM）

**功能描述**：使用 OpenAI 大模型将自然语言转换为 SQL 语句。

**模型选择**：OpenAI `gpt-5.2-mini`

**生成策略**：

- 将数据库 Schema 信息作为上下文提供给 LLM
- 构建清晰的 System Prompt，指导 LLM 生成符合 PostgreSQL 语法的 SQL
- 支持复杂查询：JOIN、子查询、聚合、窗口函数等

**输入到 LLM 的信息**：

1. 数据库 Schema（表结构、关系、注释）
2. 用户的自然语言查询描述
3. 可选的查询约束（如时间范围、数据限制等）

#### 2.1.4 SQL 安全验证

**功能描述**：确保生成的 SQL 只包含安全的查询操作，不允许数据修改或危险操作。

**安全规则**：

- **允许的语句类型**：
  - `SELECT` 查询语句
  - `WITH ... SELECT` (CTE 查询)
  - `EXPLAIN` 和 `EXPLAIN ANALYZE`（可配置是否允许）

- **禁止的语句类型**：
  - `INSERT`、`UPDATE`、`DELETE`、`TRUNCATE`
  - `DROP`、`CREATE`、`ALTER`
  - `GRANT`、`REVOKE`
  - `COPY`、`VACUUM`
  - 任何 DDL 或 DCL 语句

- **额外安全措施**：
  - 禁止使用 `pg_sleep()` 等可能导致资源耗尽的函数
  - 可配置查询超时时间
  - 可配置结果集大小限制

**验证方式**：

- SQL 语法解析（使用 SQL parser 库）
- 语句类型白名单检查
- 危险函数黑名单检查

#### 2.1.5 SQL 执行与结果验证

**功能描述**：执行生成的 SQL 并验证结果的有效性和相关性。

**执行流程**：

1. 在只读事务中执行 SQL（`SET TRANSACTION READ ONLY`）
2. 设置语句超时（防止长时间运行的查询）
3. 限制返回结果行数（防止内存溢出）

**结果验证（基于 LLM）**：

- 将用户原始问题、生成的 SQL、查询结果（部分样本）发送给 LLM
- LLM 评估结果是否符合用户意图
- 如果结果不符合预期，可尝试重新生成 SQL（可配置重试次数）

**验证输出**：

- 置信度评分（0-100）
- 结果解释说明
- 如有问题，提供修正建议

### 2.2 MCP 接口设计

#### 2.2.1 Tools（工具）

| 工具名称         | 描述               | 参数                                                                       |
|------------------|--------------------|----------------------------------------------------------------------------|
| `query`          | 执行自然语言查询   | `question`: string, `database`: string?, `return_type`: "sql" \| "result"? |
| `list_databases` | 列出所有可用数据库 | 无                                                                         |
| `describe_table` | 获取表结构详情     | `database`: string, `table_name`: string                                   |
| `refresh_schema` | 刷新 Schema 缓存   | `database`: string?                                                        |

#### 2.2.2 Resources（资源）

| 资源 URI                 | 描述                    |
|--------------------------|-------------------------|
| `pg://databases`         | 数据库列表              |
| `pg://{database}/tables` | 指定数据库的表列表      |
| `pg://{database}/schema` | 指定数据库的完整 Schema |

#### 2.2.3 Prompts（提示模板）

| 提示名称          | 描述             | 参数                                      |
|-------------------|------------------|-------------------------------------------|
| `analyze_data`    | 数据分析查询模板 | `topic`: string, `time_range`: string?    |
| `generate_report` | 报表生成查询模板 | `report_type`: string, `filters`: object? |

---

## 3. 非功能需求

### 3.1 性能要求

| 指标                | 要求                            |
|---------------------|---------------------------------|
| Schema 缓存加载时间 | 单个数据库 < 5 秒（100 张表以内） |
| SQL 生成响应时间    | < 5 秒（不含 LLM 调用延迟）       |
| 查询执行超时        | 可配置，默认 30 秒               |
| 最大结果集大小      | 可配置，默认 10000 行            |

### 3.2 安全要求

| 要求         | 描述                                       |
|--------------|--------------------------------------------|
| 只读访问     | 所有查询必须在只读模式下执行               |
| SQL 注入防护 | 使用参数化查询，禁止直接拼接用户输入        |
| 敏感数据保护 | 支持配置敏感表/列黑名单，防止查询敏感数据   |
| 连接安全     | 支持 SSL/TLS 连接到 PostgreSQL             |
| API Key 保护 | OpenAI API Key 必须安全存储，不在日志中暴露 |

### 3.3 可用性要求

| 要求     | 描述                                                     |
|----------|----------------------------------------------------------|
| 错误处理 | 提供清晰的错误信息，包括 SQL 语法错误、连接错误、权限错误等 |
| 日志记录 | 记录所有查询请求（脱敏）、执行时间、错误信息                 |
| 健康检查 | 提供健康检查接口，报告数据库连接状态和缓存状态            |

### 3.4 可配置性

服务器应支持通过配置文件或环境变量进行以下配置：

```yaml
# 示例配置结构
databases:
  - name: production_db
    host: localhost
    port: 5432
    user: readonly_user
    password: ${DB_PASSWORD}
    ssl_mode: require

openai:
  api_key: ${OPENAI_API_KEY}
  model: gpt-4o-mini
  max_tokens: 4096
  temperature: 0

security:
  query_timeout_seconds: 30
  max_result_rows: 10000
  blocked_tables:
    - users.password_hash
    - payment.card_numbers
  allowed_functions: []
  blocked_functions:
    - pg_sleep
    - pg_terminate_backend

cache:
  auto_refresh: true
  refresh_interval_minutes: 60
```

---

## 4. 技术约束

### 4.1 技术栈

| 组件            | 技术选择              |
|-----------------|-----------------------|
| 编程语言        | Python 3.11+          |
| MCP SDK         | mcp (官方 Python SDK) |
| PostgreSQL 驱动 | asyncpg 或 psycopg3   |
| SQL 解析        | sqlparse 或 pglast    |
| OpenAI 集成     | openai Python SDK     |
| 配置管理        | pydantic-settings     |

### 4.2 依赖服务

| 服务       | 要求                                      |
|------------|-------------------------------------------|
| PostgreSQL | 16.0+                                     |
| OpenAI API | 需要有效的 API Key，支持 gpt-5.2-mini 模型 |

---

## 5. 用户场景

### 5.1 场景一：简单数据查询

**用户**：产品经理
**场景**：查询本月新注册用户数量

```
用户输入: "本月新注册了多少用户？"
系统返回:
{
  "sql": "SELECT COUNT(*) as new_users FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)",
  "result": [{"new_users": 1523}],
  "confidence": 95,
  "explanation": "查询了 users 表中本月创建的记录数量"
}
```

### 5.2 场景二：复杂关联查询

**用户**：数据分析师
**场景**：分析高价值客户的购买行为

```
用户输入: "找出过去3个月消费超过1万元的客户，列出他们最常购买的商品类别"
系统返回:
{
  "sql": "WITH high_value_customers AS (...) SELECT ...",
  "result": [...],
  "confidence": 88,
  "explanation": "通过关联 orders、order_items、products、categories 表，筛选出高价值客户并统计其购买偏好"
}
```

### 5.3 场景三：仅获取 SQL

**用户**：开发人员
**场景**：需要 SQL 语句用于其他系统

```
用户输入: "生成一个查询每日活跃用户数的SQL，我只需要SQL不需要执行"
用户指定: return_type = "sql"
系统返回:
{
  "sql": "SELECT DATE(login_time) as date, COUNT(DISTINCT user_id) as dau FROM user_sessions GROUP BY DATE(login_time) ORDER BY date DESC",
  "executed": false
}
```

### 5.4 场景四：查询被拒绝

**用户**：任意用户
**场景**：尝试修改数据

```
用户输入: "把用户ID为100的用户名改成Admin"
系统返回:
{
  "error": "SECURITY_VIOLATION",
  "message": "该操作被拒绝。本服务仅支持数据查询操作，不支持数据修改。",
  "suggestion": "如需修改数据，请联系数据库管理员或使用其他授权工具。"
}
```

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 服务启动时成功连接并缓存所有配置数据库的 Schema
- [ ] 支持通过 MCP 协议接收自然语言查询请求
- [ ] 能够正确生成符合 PostgreSQL 语法的 SQL 语句
- [ ] SQL 安全验证能够正确拦截所有非 SELECT 语句
- [ ] 查询结果能够正确返回给客户端
- [ ] LLM 结果验证能够识别明显不相关的查询结果
- [ ] 支持返回 SQL 语句或执行结果两种模式

### 6.2 安全验收

- [ ] 无法通过任何方式执行 INSERT/UPDATE/DELETE 操作
- [ ] 无法查询配置的敏感表/列
- [ ] SQL 注入攻击无效
- [ ] 长时间运行的查询会被超时终止
- [ ] API Key 等敏感信息不会出现在日志或错误信息中

### 6.3 性能验收

- [ ] Schema 缓存加载时间满足要求
- [ ] 端到端查询响应时间在可接受范围内
- [ ] 大结果集能够正确处理（分页或限制）

---

## 7. 开放问题

以下问题需要在设计阶段进一步讨论：

1. **多数据库查询**：是否支持跨数据库的联合查询？
2. **查询历史**：是否需要记录用户的查询历史以便后续分析或审计？
3. **缓存更新策略**：Schema 发生变化时如何通知服务刷新缓存？
4. **结果格式**：除了表格形式，是否需要支持其他输出格式（如 JSON、CSV）？
5. **权限模型**：是否需要支持不同用户访问不同数据库/表的权限控制？
6. **多语言支持**：自然语言输入是否需要支持多种语言（中文、英文等）？
7. **LLM 降级策略**：当 OpenAI API 不可用时，是否需要备用方案？

---

## 8. 附录

### 8.1 术语表

| 术语   | 定义                                                        |
|--------|-------------------------------------------------------------|
| MCP    | Model Context Protocol，一种用于 AI 模型与外部工具交互的协议 |
| Schema | 数据库结构定义，包括表、列、类型、索引等元数据                  |
| CTE    | Common Table Expression，SQL 中的 WITH 子句                  |
| DDL    | Data Definition Language，数据定义语言（CREATE、ALTER、DROP）    |
| DCL    | Data Control Language，数据控制语言（GRANT、REVOKE）            |

### 8.2 参考文档

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [OpenAI API 文档](https://platform.openai.com/docs/)

---

## 修订历史

| 版本 | 日期       | 作者 | 修改内容 |
|------|------------|------|----------|
| v1.0 | 2025-12-20 | -    | 初始版本 |
