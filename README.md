# IntentFlow

**面向智能客服与运营场景的意图驱动多 Agent 协作系统。**

IntentFlow 将意图识别、知识检索、Agent 路由、分层记忆、动态 Skills、监控和评测串成完整的服务流程，提供 Python、Java 两套后端以及统一的 Vue 管理前端。

```text
用户请求 → 读取记忆 → 意图识别 → 知识检索 → Agent 协作 → 生成与校验回答 → 写回记忆
```

## 主要能力

- **意图驱动协作**：识别问题类型、紧急程度与实体，将请求分发给通用、技术、账单等 Agent，支持复合问题处理与降级。
- **知识增强回答**：结合 RAG 检索、查询改写、重排和工具调用，为回复提供业务知识。
- **分层对话记忆**：管理工作记忆、历史会话和用户画像，保持多轮交互上下文。
- **动态业务 Skills**：通过 Markdown 维护业务规则，支持运行时加载与重载。
- **质量与运行观测**：提供回答校验、端到端评测、监控指标和路由状态。
- **统一操作界面**：支持切换后端、聊天调试、知识库导入与检索、监控和评测操作。

两套后端的功能实现和存储方式有所不同，详见 [Java 版本对照](IntentFlowJava/README.md)。

## 项目结构

| 目录 | 内容 | 技术栈 |
| --- | --- | --- |
| [IntentFlow/](IntentFlow/) | Python 后端、测试、技术文档和架构图 | FastAPI、Redis、ChromaDB |
| [IntentFlowJava/](IntentFlowJava/) | Java 后端、回答校验和持久化服务 | Java 21、Spring Boot、Spring AI |
| [IntentFlowFrontend/](IntentFlowFrontend/) | 统一前端及全栈 Docker Compose | Vue 3、Vite、Nginx |

项目目录、Java 包名、环境变量、容器和镜像名称均统一使用 **IntentFlow** 命名。

## 快速开始

安装 Docker 和 Docker Compose，准备模型服务的 API Key，然后运行：

```bash
git clone https://github.com/341204/IntentFlow-Public.git
cd IntentFlow-Public/IntentFlowFrontend
cp .env.example .env
# 编辑 .env，填写 ANTHROPIC_API_KEY 或兼容服务配置
docker compose up -d --build
```

Windows PowerShell 可使用 `Copy-Item .env.example .env` 复制示例配置。

默认入口：

| 服务 | 地址 |
| --- | --- |
| 统一网关 | http://localhost |
| 前端 | http://localhost:5174 |
| Python API / 文档 | http://localhost:8000/docs |
| Java API / 文档 | http://localhost:8080/docs |

配置 DeepSeek 等兼容服务、单独启动某个后端或本地开发，请阅读对应目录的 README。全栈启动包含两套后端和共享基础设施。

## 文档

- [技术亮点](IntentFlow/wiki/技术亮点.md)
- [业务流程](IntentFlow/wiki/业务流程说明.md)
- [架构图](IntentFlow/wiki/架构图.md)
- [完整使用指南](IntentFlow/wiki/完整使用指南.md)
- [重点代码](IntentFlow/wiki/重点代码.md)
- [Python 部署说明](IntentFlow/README.md)
- [Java 部署说明](IntentFlowJava/README.md)
- [前端开发与部署](IntentFlowFrontend/README.md)

## 配置与数据

仓库只包含环境变量示例，不包含实际 API Key、本地会话数据库、运行日志、虚拟环境或构建产物。请从 `.env.example` 创建自己的 `.env`，并根据部署环境修改示例 Redis 密码。

已有部署升级时，请按新的 `.env.example` 同步配置；项目专用环境变量使用 `INTENTFLOW_` 前缀，Java 配置前缀为 `intentflow`。Docker 服务、网络、数据卷及前端本地设置键也已更名，已有持久化数据和浏览器设置需按需迁移。
