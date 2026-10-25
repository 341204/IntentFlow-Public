<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" @click.prevent="view = 'chat'"
        ><span class="brand-logo"><Icon name="workflow" :size="21" /></span
        >IntentFlow</a
      >
      <nav class="main-nav" aria-label="主导航">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :aria-current="view === tab.id ? 'page' : undefined"
          @click="view = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="topbar-actions">
        <span class="connection-status" :class="{ online: health === 'ok' }"
          ><i></i>{{ healthLabel }}</span
        ><button class="secondary-button" @click="openSettings">
          <Icon name="settings" />设置
        </button>
      </div>
    </header>
    <div
      class="workspace"
      :class="{ 'full-view': view !== 'chat', 'history-open': historyOpen }"
    >
      <aside class="history-panel" aria-label="会话列表">
        <div class="history-top">
          <button class="new-session" @click="newConversation">
            <Icon name="plus" />新建会话</button
          ><button
            class="icon-button history-close"
            aria-label="关闭会话列表"
            @click="historyOpen = false"
          >
            <Icon name="x" />
          </button>
        </div>
        <div class="section-label">
          最近会话 <span>{{ sessions.length }}</span>
        </div>
        <div class="session-list">
          <button
            v-for="session in orderedSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: activeId === session.id }"
            @click="selectSession(session.id)"
          >
            <Icon name="message" /><span
              ><strong>{{ session.title }}</strong
              ><small
                >{{
                  session.messages.length
                    ? sessionAgent(session)
                    : "等待第一条消息"
                }}
                · {{ dateLabel(session.updatedAt) }}</small
              ></span
            ><span
              v-if="pendingId === session.id"
              class="session-pending"
              aria-label="正在处理"
            ></span>
          </button>
        </div>
        <div class="history-footer">
          <span class="backend-dot"></span>{{ backend.label }} /
          IntentFlow<small>会话仅保存在当前浏览器</small>
        </div>
      </aside>
      <main v-if="view === 'chat'" class="chat-main">
        <header class="chat-header">
          <button
            class="icon-button history-toggle"
            aria-label="打开会话列表"
            @click="historyOpen = !historyOpen"
          >
            <Icon name="sidebar" />
          </button>
          <div>
            <h1>{{ activeSession?.title }}</h1>
            <p>
              客服工作台 <span>/</span>
              {{ activeSession?.conversationId || "新会话 · 自动生成会话编号" }}
            </p>
          </div>
          <button
            class="icon-button"
            aria-label="重命名会话"
            @click="openRename"
          >
            <Icon name="pencil" /></button
          ><button
            class="icon-button"
            aria-label="新建会话"
            @click="newConversation"
          >
            <Icon name="edit" />
          </button>
        </header>
        <div
          ref="messageList"
          class="messages"
          aria-live="polite"
          :aria-busy="currentPending"
        >
          <div v-if="!messages.length" class="chat-empty">
            <span class="empty-logo"><Icon name="workflow" :size="30" /></span>
            <h2>从一个客户问题开始</h2>
            <p>描述你的问题，让合适的 Agent 帮你处理。</p>
            <div class="starter-prompts">
              <button
                v-for="prompt in prompts"
                :key="prompt.label"
                @click="usePrompt(prompt.text)"
              >
                <Icon :name="prompt.icon" />{{ prompt.label
                }}<Icon name="chevron" />
              </button>
            </div>
          </div>
          <article
            v-for="item in messages"
            :key="item.id"
            class="message"
            :class="item.role"
          >
            <div v-if="item.role === 'user'" class="user-bubble">
              {{ item.content }}
            </div>
            <template v-else
              ><div class="agent-heading">
                <span class="agent-avatar"
                  ><Icon :name="item.failed ? 'error' : 'workflow'" /></span
                ><strong>{{
                  item.failed
                    ? "请求未完成"
                    : agentLabel(
                        item.response?.primaryAgent || item.response?.agentType,
                      )
                }}</strong
                ><span v-if="item.response?.knowledgeUsed" class="tag"
                  >知识增强</span
                ><span v-if="item.response?.escalated" class="tag warning"
                  >建议转人工</span
                >
              </div>
              <div v-if="item.failed" class="answer error-text">
                {{ item.content }}
              </div>
              <div
                v-else
                class="answer markdown"
                v-html="renderMarkdown(item.content)"
              ></div>
              <div
                v-if="item.response?.knowledgeUsed"
                class="knowledge-citation"
              >
                <Icon name="book" />已结合知识库回答
              </div>
              <div class="message-actions">
                <button v-if="!item.failed" @click="copyMessage(item)">
                  <Icon name="copy" />复制</button
                ><button
                  :disabled="Boolean(pendingId)"
                  @click="retryMessage(item)"
                >
                  <Icon name="retry" />{{
                    item.failed ? "重试" : "重新生成"
                  }}</button
                ><button v-if="item.response" @click="selectedId = item.id">
                  <Icon name="route" />处理详情
                </button>
              </div></template
            >
          </article>
          <div v-if="currentPending" class="pending-reply" role="status">
            <Icon name="loading" class="spin" />正在处理请求<span
              >等待后端返回结果</span
            >
          </div>
        </div>
        <div class="composer-area">
          <div v-if="messages.length" class="suggestions">
            <button @click="usePrompt('退款一般需要多久到账？')">
              退款多久到账？</button
            ><button @click="usePrompt('我可以申请人工处理吗？')">
              申请人工处理
            </button>
          </div>
          <form class="composer" @submit.prevent="sendMessage">
            <textarea
              ref="composerInput"
              v-model="draft"
              rows="2"
              aria-label="消息"
              placeholder="描述客户的问题，或继续当前对话…"
              @keydown="composerKeydown"
            ></textarea>
            <div class="composer-bottom">
              <span>Ctrl / ⌘ + Enter 发送</span
              ><button
                class="send-button"
                aria-label="发送消息"
                :disabled="Boolean(pendingId) || !draft.trim()"
              >
                <Icon
                  :name="currentPending ? 'loading' : 'send'"
                  :class="{ spin: currentPending }"
                />
              </button>
            </div>
          </form>
          <p class="composer-note">
            {{ backend.label }} 后端 · 回复由 AI 生成，请核实关键信息
          </p>
        </div>
      </main>
      <aside v-if="view === 'chat'" class="inspector" aria-label="本次处理过程">
        <div class="inspector-title">
          <Icon name="route" />
          <h2>{{ selectedId ? "所选请求详情" : "本次处理过程" }}</h2>
        </div>
        <div class="request-id">
          REQUEST <span>{{ response?.requestId || "—" }}</span>
        </div>
        <template v-if="response"
          ><div class="request-status">
            <span><Icon name="complete" />回复已返回</span
            ><span>{{ latency(response.latencyMs) }}</span>
          </div>
          <div class="process-steps">
            <section class="process-step">
              <span class="step-dot"><Icon name="check" :size="12" /></span>
              <h3>识别用户意图</h3>
              <p>{{ intentLabel(response.intent) }}</p>
              <span v-if="response.intentConfidence != null" class="step-tag"
                >置信度 {{ percent(response.intentConfidence) }}</span
              >
            </section>
            <section class="process-step">
              <span class="step-dot"><Icon name="check" :size="12" /></span>
              <h3>分配处理 Agent</h3>
              <p>
                {{ agentLabel(response.primaryAgent || response.agentType) }}
              </p>
              <p v-if="response.supportingAgents?.length">
                协作：{{ response.supportingAgents.map(agentLabel).join("、") }}
              </p>
              <span v-if="response.routingConfidence != null" class="step-tag"
                >路由置信度 {{ percent(response.routingConfidence) }}</span
              >
            </section>
            <section class="process-step">
              <span class="step-dot"
                ><Icon
                  :name="response.knowledgeUsed ? 'check' : 'book'"
                  :size="12"
              /></span>
              <h3>检索相关知识</h3>
              <p>
                {{
                  response.knowledgeUsed
                    ? "已结合知识库检索结果"
                    : "本次回复未标记使用知识库"
                }}
              </p>
            </section>
            <section class="process-step">
              <span class="step-dot"><Icon name="check" :size="12" /></span>
              <h3>生成客服回复</h3>
              <p>
                {{ response.escalated ? "建议转交人工继续处理" : "回复已生成" }}
              </p>
              <p v-if="typeof response.verified === 'boolean'">
                回答校验：{{ response.verified ? "通过" : "未通过" }}
              </p>
              <p v-if="typeof response.grounded === 'boolean'">
                上下文依据：{{ response.grounded ? "有" : "未确认" }}
              </p>
            </section>
          </div>
          <details v-if="response.routingReason">
            <summary>查看路由说明</summary>
            <p class="detail-copy">{{ response.routingReason }}</p>
          </details>
          <details>
            <summary>查看工具调用详情</summary>
            <div
              v-for="(call, index) in selectedItem.trace?.toolCalls || []"
              :key="index"
              class="tool-call"
            >
              <strong>{{
                call.tool_name || call.toolName || "工具调用"
              }}</strong>
              <pre>{{ json(call) }}</pre>
            </div>
            <p
              v-if="!selectedItem.trace?.toolCalls?.length"
              class="detail-copy"
            >
              {{
                selectedItem.traceUnavailable
                  ? "工具轨迹暂不可用，客服回复不受影响。"
                  : "本次请求没有返回工具调用记录。"
              }}
            </p>
          </details></template
        >
        <div v-else class="inspector-empty">
          <Icon
            :name="currentPending ? 'loading' : 'route'"
            :size="24"
            :class="{ spin: currentPending }"
          />
          <p>
            {{
              currentPending
                ? "正在等待处理结果"
                : selectedItem?.failed
                  ? "最近请求未完成，可在对话中重试"
                  : "发送消息后，在这里查看处理结果"
            }}
          </p>
          <small>展示意图、Agent 分工与工具调用</small>
        </div>
        <details class="runtime-details">
          <summary><Icon name="activity" />运行状态</summary>
          <p v-if="!monitor" class="detail-copy">运行数据暂不可用。</p>
          <template v-else
            ><dl>
              <div>
                <dt>累计请求</dt>
                <dd>{{ totalRequests }}</dd>
              </div>
              <div>
                <dt>Agent 数量</dt>
                <dd>{{ Object.keys(monitor.agent_stats || {}).length }}</dd>
              </div>
              <div>
                <dt>活跃告警</dt>
                <dd>{{ monitor.active_alerts?.length || 0 }}</dd>
              </div>
            </dl>
            <p
              v-for="(alert, index) in monitor.active_alerts || []"
              :key="index"
              class="error-text detail-copy"
            >
              {{ alert.detail || alert.title || json(alert) }}
            </p></template
          ><button class="text-button" @click="loadMonitor">刷新状态</button>
        </details>
      </aside>
      <main v-if="view === 'knowledge'" class="content-page">
        <header class="page-heading">
          <div>
            <h1>让回答有据可依</h1>
            <p>检索与补充客服知识，管理 Agent 使用的业务规范。</p>
          </div>
          <span class="count-pill">{{ knowledgeCount ?? "—" }} 个知识片段</span>
        </header>
        <div v-if="knowledgeError" class="error-banner" role="alert">
          {{ knowledgeError }}
        </div>
        <section class="surface">
          <div class="surface-heading">
            <Icon name="book" />
            <h2>检索知识</h2>
          </div>
          <form class="search-form" @submit.prevent="searchKnowledge">
            <input
              v-model="searchQuery"
              aria-label="知识库检索关键词"
              placeholder="输入客户问题，例如：退款多久到账"
            /><button
              class="primary-button"
              :disabled="Boolean(knowledgeBusy) || !searchQuery.trim()"
            >
              {{ knowledgeBusy === "search" ? "检索中…" : "检索" }}
            </button>
          </form>
          <div v-if="results.length" class="search-results">
            <article v-for="(item, index) in results" :key="item.id || index">
              <span class="result-index">{{
                String(index + 1).padStart(2, "0")
              }}</span>
              <div>
                <h3>{{ item.title || "未命名知识片段" }}</h3>
                <p>{{ item.content }}</p>
                <small v-if="item.score != null"
                  >检索分数 {{ item.score }}</small
                >
              </div>
            </article>
          </div>
          <p v-else class="empty-copy">
            {{
              searchPerformed
                ? "未找到匹配的知识片段，请尝试其他关键词。"
                : "输入一个客户问题，查看能够支撑回答的知识片段。"
            }}
          </p>
        </section>
        <section class="surface">
          <div class="surface-heading">
            <Icon name="file" />
            <h2>补充知识</h2>
            <label class="secondary-button upload-control"
              ><Icon name="upload" />上传文件<input
                type="file"
                accept=".txt,.md,.json"
                :disabled="Boolean(knowledgeBusy)"
                @change="handleUpload"
            /></label>
          </div>
          <form @submit.prevent="submitKnowledge">
            <div class="field">
              <label for="doc-title">文档标题</label
              ><input
                id="doc-title"
                v-model="docTitle"
                placeholder="例如：退款与售后政策"
              />
            </div>
            <div class="field">
              <label for="doc-content">知识内容</label
              ><textarea
                id="doc-content"
                v-model="docContent"
                rows="5"
                placeholder="填写业务规范、产品说明或排障流程"
              ></textarea>
            </div>
            <div class="form-footer">
              <span>UTF-8 的 .txt、.md、.json，最大 10 MB</span
              ><button
                class="primary-button"
                :disabled="
                  Boolean(knowledgeBusy) ||
                  !docTitle.trim() ||
                  !docContent.trim()
                "
              >
                {{ knowledgeBusy === "add" ? "导入中…" : "添加文档" }}
              </button>
            </div>
          </form>
          <div v-if="lastImport" class="import-result" role="status">
            <Icon name="complete" />{{ lastImport }}
          </div>
        </section>
        <section class="surface">
          <div class="surface-heading">
            <Icon name="workflow" />
            <h2>已加载业务能力</h2>
            <button
              class="text-button"
              :disabled="Boolean(knowledgeBusy)"
              @click="reloadSkillSet"
            >
              重新加载
            </button>
          </div>
          <div
            v-for="skill in skills?.skills || []"
            :key="skill.name"
            class="skill-row"
          >
            <strong>{{ skill.name }}</strong>
            <p>{{ skill.description || "业务规则与操作规范" }}</p>
          </div>
          <p v-if="!skills?.skills?.length" class="empty-copy">
            {{ skillsError || "暂无已加载的业务能力。" }}
          </p>
          <p
            v-for="(error, index) in skills?.errors || []"
            :key="index"
            class="error-text"
          >
            {{ typeof error === "string" ? error : json(error) }}
          </p>
        </section>
      </main>
      <main v-if="view === 'evaluation'" class="content-page">
        <header class="page-heading">
          <div>
            <h1>每一次改进，都有依据</h1>
            <p>运行 {{ backend.label }} 后端评测，查看回答质量与回归结果。</p>
          </div>
          <button
            class="primary-button"
            :disabled="evalBusy"
            @click="runEvaluation"
          >
            <Icon v-if="evalBusy" name="loading" class="spin" />{{
              evalBusy ? "评测运行中…" : "运行评测"
            }}
          </button>
        </header>
        <div v-if="evalError" class="error-banner" role="alert">
          {{ evalError }}
        </div>
        <template v-if="evaluation"
          ><div class="evaluation-stats">
            <div>
              <span>样例通过率</span
              ><strong>{{ percent(evaluation.pass_rate) }}</strong
              ><small
                >{{ evaluation.passed ?? "—" }} /
                {{ evaluation.total ?? "—" }} 个样例</small
              >
            </div>
            <div>
              <span>意图识别准确率</span
              ><strong>{{
                percent(evaluation.avg_scores?.intent_accuracy)
              }}</strong
              ><small>后端未返回时显示 —</small>
            </div>
            <div>
              <span>回归项</span
              ><strong
                :class="evaluation.regressions?.length ? 'error-text' : ''"
                >{{ evaluation.regressions?.length ?? 0 }}</strong
              ><small>与评测基线比较</small>
            </div>
          </div>
          <section class="surface">
            <div class="surface-heading">
              <Icon name="activity" />
              <h2>平均评分</h2>
            </div>
            <dl class="score-list">
              <div
                v-for="(value, key) in evaluation.avg_scores || {}"
                :key="key"
              >
                <dt>{{ scoreLabel(key) }}</dt>
                <dd>
                  {{
                    key === "intent_accuracy" ? percent(value) : number(value)
                  }}
                </dd>
              </div>
            </dl>
          </section>
          <section class="surface">
            <h2>优化建议</h2>
            <p
              v-for="(item, index) in evaluation.recommendations || []"
              :key="index"
              class="detail-copy"
            >
              {{ item }}
            </p>
            <p v-if="!evaluation.recommendations?.length" class="empty-copy">
              本次评测没有返回额外建议。
            </p>
            <details>
              <summary>查看完整评测结果</summary>
              <pre>{{ json(evaluation) }}</pre>
            </details>
          </section></template
        >
        <div v-else class="page-empty">
          <Icon name="activity" :size="35" />
          <h2>用真实结果验证改进</h2>
          <p>运行评测后展示通过率、评分和回归信息。</p>
        </div>
      </main>
    </div>
    <dialog
      ref="settingsDialog"
      class="settings-dialog"
      @click="closeOnBackdrop"
    >
      <form @submit.prevent="applySettings">
        <div class="drawer-heading">
          <h2>连接设置</h2>
          <button
            type="button"
            class="icon-button"
            aria-label="关闭设置"
            @click="settingsDialog.close()"
          >
            <Icon name="x" />
          </button>
        </div>
        <p class="drawer-description">连接信息收在这里，让对话更专注。</p>
        <div class="field">
          <label for="backend">后端服务</label
          ><select id="backend" v-model="settingsDraft.backend">
            <option value="python">Python · FastAPI</option>
            <option value="java">Java · Spring Boot</option>
          </select>
        </div>
        <div class="field">
          <label for="endpoint">服务地址</label
          ><input
            id="endpoint"
            v-model="settingsDraft.endpoints[settingsDraft.backend]"
            placeholder="/api/python"
            required
          /><small>支持 /api/… 相对路径或 HTTP(S) 地址</small>
        </div>
        <div class="field">
          <label for="user-id">用户标识</label
          ><input
            id="user-id"
            v-model="settingsDraft.userId"
            placeholder="anonymous"
          />
        </div>
        <p v-if="settingsError" class="error-text" role="alert">
          {{ settingsError }}
        </p>
        <button
          class="primary-button full-width"
          :disabled="Boolean(pendingId || knowledgeBusy || evalBusy)"
        >
          保存并检查连接
        </button>
        <p v-if="pendingId || knowledgeBusy || evalBusy" class="muted">
          请等待当前请求完成后再切换连接。
        </p>
        <div class="connection-detail">
          <span>{{ healthLabel }}</span>
          <p v-if="connectionError" class="error-text">{{ connectionError }}</p>
          <a :href="docsUrl" target="_blank" rel="noopener noreferrer"
            >打开 API 文档 <Icon name="external" :size="13"
          /></a>
        </div>
        <p class="privacy-note">
          会话和设置保存在当前浏览器，不会跨设备同步；切换后端、地址或用户将显示各自的会话记录。
        </p>
      </form>
    </dialog>
    <dialog ref="renameDialog" class="rename-dialog">
      <form @submit.prevent="renameConversation">
        <div class="drawer-heading">
          <h2>重命名会话</h2>
          <button
            type="button"
            class="icon-button"
            aria-label="关闭重命名"
            @click="renameDialog.close()"
          >
            <Icon name="x" />
          </button>
        </div>
        <label class="field"
          >会话名称<input
            v-model="renameTitle"
            maxlength="60"
            required
            autofocus /></label
        ><button class="primary-button full-width">保存名称</button>
      </form>
    </dialog>
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import Icon from "./components/Icon.vue";
import { renderMarkdown } from "./lib/markdown";
import {
  createSession,
  readWorkspace,
  saveWorkspace,
  workspaceKey,
} from "./lib/sessions";
import {
  addKnowledge,
  backendMeta,
  createInitialSettings,
  reloadSkills,
  requestChat,
  requestHealth,
  requestKnowledgeStats,
  requestMonitor,
  requestSearch,
  requestToolTrace,
  requestSkills,
  runEvaluation as requestEvaluation,
  saveSettings,
  uploadKnowledge,
} from "./lib/backends";
const settings = reactive(createInitialSettings()),
  settingsDraft = reactive(clone(settings));
const tabs = [
  { id: "chat", label: "对话工作台" },
  { id: "knowledge", label: "知识库" },
  { id: "evaluation", label: "评测" },
];
const prompts = [
  {
    label: "退款与账单咨询",
    text: "我这笔订单被重复扣款了，应该怎么申请退款？",
    icon: "file",
  },
  {
    label: "登录异常排查",
    text: "登录时提示 401，应该怎么排查？",
    icon: "settings",
  },
  {
    label: "电子发票开具",
    text: "订单完成后，电子发票在哪里申请？",
    icon: "book",
  },
];
const view = ref("chat"),
  sessions = ref([]),
  activeId = ref(""),
  selectedId = ref(""),
  pendingId = ref(""),
  historyOpen = ref(false),
  draft = ref("");
const health = ref("unknown"),
  connectionError = ref(""),
  settingsError = ref(""),
  messageList = ref(null),
  composerInput = ref(null),
  settingsDialog = ref(null),
  renameDialog = ref(null),
  renameTitle = ref("");
const knowledgeCount = ref(null),
  searchQuery = ref(""),
  results = ref([]),
  searchPerformed = ref(false),
  docTitle = ref(""),
  docContent = ref(""),
  knowledgeBusy = ref(""),
  knowledgeError = ref(""),
  lastImport = ref("");
const monitor = ref(null),
  skills = ref(null),
  skillsError = ref(""),
  evaluation = ref(null),
  evalBusy = ref(false),
  evalError = ref(""),
  toast = ref("");
let toastTimer,
  revision = 0,
  storageWarning = false;
const backend = computed(() => backendMeta(settings.backend, settings)),
  docsUrl = computed(() => `${backend.value.baseUrl}/docs`);
const activeSession = computed(() =>
    sessions.value.find((s) => s.id === activeId.value),
  ),
  messages = computed(() => activeSession.value?.messages || []);
const orderedSessions = computed(() =>
  [...sessions.value].sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  ),
);
const currentPending = computed(() => pendingId.value === activeId.value);
const selectedItem = computed(
  () =>
    messages.value.find((m) => m.id === selectedId.value && m.response) ||
    [...messages.value].reverse().find((m) => m.role === "assistant"),
);
const response = computed(() =>
  currentPending.value && !selectedId.value
    ? null
    : selectedItem.value?.response,
);
const healthLabel = computed(
  () =>
    ({
      unknown: "未检查连接",
      checking: "检查连接中",
      ok: `${backend.value.label} 已连接`,
      error: "连接不可用",
    })[health.value],
);
const totalRequests = computed(() =>
  Object.values(monitor.value?.agent_stats || {}).reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  ),
);
restoreWorkspace(settings.conversationId);
watch(sessions, persistWorkspace, { deep: true });
watch(activeId, () => {
  selectedId.value = "";
  persistWorkspace();
  scrollMessages();
});
onMounted(refreshConsole);
onBeforeUnmount(() => clearTimeout(toastTimer));
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function restoreWorkspace(legacyId = "") {
  const saved = readWorkspace(workspaceKey(settings));
  sessions.value = saved?.sessions || [createSession(legacyId)];
  activeId.value = saved?.activeId || sessions.value[0].id;
  selectedId.value = "";
}
function persistWorkspace() {
  try {
    saveWorkspace(workspaceKey(settings), sessions.value, activeId.value);
    saveSettings({
      ...settings,
      conversationId: activeSession.value?.conversationId || "",
    });
  } catch {
    if (!storageWarning) {
      storageWarning = true;
      showToast(
        "浏览器存储不可用或空间不足，本次会话仍可继续，但刷新后可能丢失。",
      );
    }
  }
}
function newConversation() {
  const session = createSession();
  sessions.value.unshift(session);
  activeId.value = session.id;
  draft.value = "";
  historyOpen.value = false;
  view.value = "chat";
}
function selectSession(id) {
  activeId.value = id;
  draft.value = "";
  view.value = "chat";
  historyOpen.value = false;
}
function openRename() {
  renameTitle.value = activeSession.value?.title || "";
  renameDialog.value.showModal();
}
function renameConversation() {
  if (renameTitle.value.trim()) {
    activeSession.value.title = renameTitle.value.trim();
    renameDialog.value.close();
  }
}
function openSettings() {
  Object.assign(settingsDraft, clone(settings));
  settingsError.value = "";
  settingsDialog.value.showModal();
}
function closeOnBackdrop(event) {
  if (event.target === settingsDialog.value) {
    const r = settingsDialog.value.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      settingsDialog.value.close();
  }
}
function applySettings() {
  if (pendingId.value || knowledgeBusy.value || evalBusy.value) return;
  const endpoint = settingsDraft.endpoints[settingsDraft.backend]
    .trim()
    .replace(/\/+$/, "");
  if (
    !endpoint ||
    (!(endpoint.startsWith("/") && !endpoint.startsWith("//")) &&
      !/^https?:\/\/[^\s]+$/i.test(endpoint))
  ) {
    settingsError.value = "请输入有效的 HTTP(S) 地址或以 / 开头的服务路径。";
    return;
  }
  settingsDraft.endpoints[settingsDraft.backend] = endpoint;
  Object.assign(settings, clone(settingsDraft), {
    userId: settingsDraft.userId.trim() || "anonymous",
    conversationId: "",
  });
  restoreWorkspace();
  draft.value = "";
  searchQuery.value = "";
  docTitle.value = "";
  docContent.value = "";
  results.value = [];
  searchPerformed.value = false;
  knowledgeCount.value = null;
  knowledgeError.value = "";
  lastImport.value = "";
  evaluation.value = null;
  evalError.value = "";
  monitor.value = null;
  skills.value = null;
  persistWorkspace();
  settingsDialog.value.close();
  refreshConsole();
}
async function refreshConsole() {
  const current = ++revision,
    captured = clone(settings);
  health.value = "checking";
  connectionError.value = "";
  await Promise.allSettled([
    requestHealth(captured.backend, captured)
      .then((data) => {
        if (current === revision)
          health.value = data?.status === "ok" ? "ok" : "error";
      })
      .catch((error) => {
        if (current === revision) {
          health.value = "error";
          connectionError.value = error.message;
        }
      }),
    requestKnowledgeStats(captured.backend, captured)
      .then((data) => {
        if (current === revision)
          knowledgeCount.value = data.total_chunks ?? data.totalChunks ?? null;
      })
      .catch(() => {}),
    requestMonitor(captured.backend, captured)
      .then((data) => {
        if (current === revision) monitor.value = data;
      })
      .catch(() => {}),
    requestSkills(captured.backend, captured)
      .then((data) => {
        if (current === revision) {
          skills.value = data;
          skillsError.value = "";
        }
      })
      .catch(() => {
        if (current === revision)
          skillsError.value = "业务能力暂不可用，请检查服务连接。";
      }),
  ]);
}
async function loadMonitor() {
  const key = workspaceKey(settings),
    captured = clone(settings);
  try {
    const data = await requestMonitor(captured.backend, captured);
    if (key === workspaceKey(settings)) monitor.value = data;
  } catch {
    if (key === workspaceKey(settings)) monitor.value = null;
  }
}
async function scrollMessages() {
  await nextTick();
  messageList.value?.scrollTo({
    top: messageList.value.scrollHeight,
    behavior: "smooth",
  });
}
function composerKeydown(event) {
  if (
    event.key === "Enter" &&
    !event.isComposing &&
    (event.ctrlKey || event.metaKey)
  ) {
    event.preventDefault();
    sendMessage();
  }
}
function usePrompt(text) {
  draft.value = text;
  composerInput.value?.focus();
}
async function sendMessage() {
  const content = draft.value.trim();
  if (!content || pendingId.value) return;
  const session = activeSession.value,
    user = { id: createSession().id, role: "user", content };
  session.messages.push(user);
  if (session.messages.length === 1) session.title = content.slice(0, 28);
  draft.value = "";
  await executeChat(session, user);
}
async function retryMessage(item) {
  if (pendingId.value) return;
  const session = activeSession.value,
    user = session.messages.find((m) => m.id === item.userMessageId);
  if (user) await executeChat(session, user, item);
}
async function executeChat(session, user, replacement) {
  pendingId.value = session.id;
  selectedId.value = "";
  const captured = clone(settings);
  captured.conversationId = session.conversationId;
  await scrollMessages();
  try {
    const result = await requestChat(captured.backend, captured, user.content);
    session.conversationId = result.conversationId || session.conversationId;
    const { raw, ...metadata } = result;
    const message = {
      id: createSession().id,
      role: "assistant",
      content: result.response,
      response: metadata,
      userMessageId: user.id,
      trace: null,
    };
    if (replacement)
      session.messages.splice(
        session.messages.indexOf(replacement),
        1,
        message,
      );
    else session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    await scrollMessages();
    try {
      const trace = await requestToolTrace(
        captured.backend,
        captured,
        result.requestId,
      );
      message.trace = trace?.found ? trace.trace : null;
      message.traceUnavailable = Boolean(result.requestId && !trace?.found);
    } catch {
      message.traceUnavailable = true;
    }
    persistWorkspace();
    loadMonitor();
  } catch (error) {
    const failed = {
      id: createSession().id,
      role: "assistant",
      content: error.message,
      failed: true,
      userMessageId: user.id,
    };
    if (replacement?.failed)
      session.messages.splice(session.messages.indexOf(replacement), 1, failed);
    else session.messages.push(failed);
    session.updatedAt = new Date().toISOString();
  } finally {
    pendingId.value = "";
    persistWorkspace();
    await scrollMessages();
  }
}
async function copyMessage(item) {
  try {
    await navigator.clipboard.writeText(item.content);
    showToast("回复已复制");
  } catch {
    showToast("无法访问剪贴板，请选择回复文字复制。");
  }
}
async function searchKnowledge() {
  if (knowledgeBusy.value || !searchQuery.value.trim()) return;
  knowledgeBusy.value = "search";
  knowledgeError.value = "";
  const key = workspaceKey(settings),
    captured = clone(settings);
  try {
    const data = await requestSearch(
      captured.backend,
      captured,
      searchQuery.value.trim(),
      5,
    );
    if (key === workspaceKey(settings)) {
      results.value = data.results || [];
      searchPerformed.value = true;
    }
  } catch (error) {
    if (key === workspaceKey(settings)) knowledgeError.value = error.message;
  } finally {
    knowledgeBusy.value = "";
  }
}
async function importKnowledge(action, operation, title) {
  if (knowledgeBusy.value) return;
  knowledgeBusy.value = action;
  knowledgeError.value = "";
  const key = workspaceKey(settings),
    captured = clone(settings);
  try {
    const data = await operation(captured);
    if (key === workspaceKey(settings)) {
      lastImport.value = `${title}：导入成功${data.added_chunks !== undefined ? `，写入 ${data.added_chunks} 个知识片段` : ""}`;
      if (data.total_chunks != null) knowledgeCount.value = data.total_chunks;
      else {
        const stats = await requestKnowledgeStats(
          captured.backend,
          captured,
        ).catch(() => null);
        if (key === workspaceKey(settings))
          knowledgeCount.value =
            stats?.total_chunks ?? stats?.totalChunks ?? null;
      }
      showToast("知识已导入");
    }
  } catch (error) {
    if (key === workspaceKey(settings)) knowledgeError.value = error.message;
  } finally {
    knowledgeBusy.value = "";
  }
}
async function submitKnowledge() {
  if (!docTitle.value.trim() || !docContent.value.trim()) return;
  const title = docTitle.value.trim(),
    content = docContent.value.trim();
  await importKnowledge(
    "add",
    (s) => addKnowledge(s.backend, s, [{ title, content }]),
    title,
  );
}
async function handleUpload(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!/\.(txt|md|json)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
    knowledgeError.value = "请选择不超过 10 MB 的 .txt、.md 或 .json 文件。";
    return;
  }
  await importKnowledge(
    "upload",
    (s) => uploadKnowledge(s.backend, s, file),
    file.name,
  );
}
async function reloadSkillSet() {
  if (knowledgeBusy.value) return;
  knowledgeBusy.value = "skills";
  knowledgeError.value = "";
  const key = workspaceKey(settings),
    captured = clone(settings);
  try {
    const data = await reloadSkills(captured.backend, captured);
    if (key === workspaceKey(settings)) {
      skills.value = data;
      skillsError.value = "";
      showToast("业务能力已重新加载");
    }
  } catch (error) {
    if (key === workspaceKey(settings)) knowledgeError.value = error.message;
  } finally {
    knowledgeBusy.value = "";
  }
}
async function runEvaluation() {
  if (evalBusy.value) return;
  evalBusy.value = true;
  evalError.value = "";
  const key = workspaceKey(settings),
    captured = clone(settings);
  try {
    const data = await requestEvaluation(captured.backend, captured);
    if (key === workspaceKey(settings)) {
      evaluation.value = data;
      showToast("评测已完成");
    }
  } catch (error) {
    if (key === workspaceKey(settings)) evalError.value = error.message;
  } finally {
    evalBusy.value = false;
  }
}
function intentLabel(type) {
  return (
    {
      query: "信息咨询",
      complaint: "客户投诉",
      request: "操作请求",
      greeting: "问候",
      escalation: "人工升级",
      technical: "技术支持",
      billing: "账单咨询",
      account: "账号问题",
      feedback: "客户反馈",
      order_status: "订单状态",
      logistics: "物流配送",
      refund: "退款退货",
      invoice: "发票咨询",
      payment_issue: "支付异常",
      account_security: "账号安全",
      technical_login: "登录故障",
      technical_crash: "系统报错",
      human_handoff: "转接人工",
      other: "其他问题",
    }[type] || type
  );
}
function agentLabel(type) {
  return (
    {
      general: "通用 Agent",
      technical: "技术 Agent",
      billing: "账单 Agent",
      escalation: "人工升级 Agent",
    }[type] ||
    type ||
    "客服 Agent"
  );
}
function sessionAgent(session) {
  const r = [...session.messages].reverse().find((m) => m.response)?.response;
  return agentLabel(r?.primaryAgent || r?.agentType);
}
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
function percent(value) {
  return value != null && Number.isFinite(Number(value))
    ? `${(Number(value) * 100).toFixed(1)}%`
    : "—";
}
function latency(value) {
  return value != null
    ? value >= 1000
      ? `${(value / 1000).toFixed(2)} s`
      : `${value} ms`
    : "—";
}
function number(value) {
  return value != null && Number.isFinite(Number(value))
    ? Number(value).toFixed(2)
    : "—";
}
function json(value) {
  return JSON.stringify(value ?? {}, null, 2);
}
function scoreLabel(key) {
  return (
    {
      intent_accuracy: "意图识别准确率",
      relevance: "相关性",
      accuracy: "准确性",
      helpfulness: "帮助程度",
      tone: "服务语气",
      completeness: "完整性",
      coherence: "连贯性",
    }[key] || key
  );
}
function showToast(text) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 3500);
}
</script>
