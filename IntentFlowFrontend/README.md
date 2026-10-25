# IntentFlow Frontend

独立 Vue 前端项目，可同时连接 IntentFlow Python 版本和 IntentFlow Java 版本。

项目目录：

```text
./IntentFlowFrontend
```

## 功能

- 在页面中切换 Java / Python 后端。
- 统一适配 `/chat` 响应字段：
  - Python：`conv_id`、`agent_type`、`latency_ms`
  - Java：`conversation_id`、`agent_type`、`latency_ms`
- 支持聊天调试、健康检查、监控摘要、知识库检索、知识库文档导入、文件上传。
- 支持 Docker + Nginx 部署。
- 三栏客服工作台：左侧会话列表、中间对话、右侧请求处理结果。
- 会话新建、重命名、切换和浏览器本地恢复；记录按后端、地址和用户标识隔离。
- Markdown 回复（经过 HTML 过滤）、复制、失败重试及重新生成。
- 连接配置设置抽屉、系统浅色/深色外观和窄屏布局。
- 意图与路由置信度、Agent 分工、知识库使用标记和工具详情来自真实接口。

会话历史仅保存在当前浏览器，最近最多保留 50 个会话、每个会话 200 条消息，不会跨设备同步。切换连接不会自动将请求转发到另一套后端。重新生成会向同一后端提交一次新的对话请求。

知识库页面提供检索、文本导入、文件上传和 Skills 重载。由于后端没有文档列表接口，页面不会显示虚构的文档目录。处理面板展示已返回的请求结果，不模拟实时执行进度。

## 验证

```bash
npm test
npm run build
```

## 默认后端地址

| 后端 | 默认地址 |
|------|----------|
| Python | `http://localhost:8000` |
| Java | `http://localhost:8080` |

开发模式下，Vite 会代理：

| 前端路径 | 代理到 |
|----------|--------|
| `/api/python` | `http://localhost:8000` |
| `/api/java` | `http://localhost:8080` |

Docker 模式下，Nginx 会通过运行时注入的地址访问后端。默认仍指向宿主机上的 Python / Java 服务。

## 本地运行

安装依赖：

```bash
npm install
```

启动：

```bash
npm run dev
```

访问：

```text
http://localhost:5173
```

如果后端端口不是默认值，可以启动时覆盖：

```bash
VITE_PYTHON_API_URL=http://localhost:8000 \
VITE_JAVA_API_URL=http://localhost:8080 \
npm run dev
```

## Docker 部署

复制 `.env.example` 为 `.env` 并填写模型配置，然后构建并启动全栈服务：

```bash
docker compose up -d --build
```

前提是 `IntentFlowFrontend` 的父目录下有这三个目录：

```text
../IntentFlow
../IntentFlowJava
./
```

访问前端：

```text
http://localhost
```

如果只想暴露前端端口，可改 `FRONTEND_PORT`，默认仍可通过 `80` 统一入口访问。

停止：

```bash
docker compose down
```

## 后端启动参考

Python 版默认：

```text
http://localhost:8000
```

Java 版默认：

```text
http://localhost:8080
```

两个后端不需要同时启动。前端页面里选择当前要调试的后端即可。
