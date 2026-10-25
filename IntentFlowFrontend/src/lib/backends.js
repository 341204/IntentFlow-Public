const ENV = import.meta.env || {};
const DEFAULT_BACKENDS = {
  python: {
    id: "python",
    label: "Python",
    baseUrl:
      runtimeConfig().pythonApiUrl || ENV.VITE_PYTHON_API_URL || "/api/python",
    port: "8000",
  },
  java: {
    id: "java",
    label: "Java",
    baseUrl: runtimeConfig().javaApiUrl || ENV.VITE_JAVA_API_URL || "/api/java",
    port: "8080",
  },
};

export function createInitialSettings() {
  const saved = readSettings();
  return {
    backend: ["python", "java"].includes(
      saved.backend || ENV.VITE_DEFAULT_BACKEND,
    )
      ? saved.backend || ENV.VITE_DEFAULT_BACKEND
      : "python",
    userId: saved.userId || "u1001",
    conversationId: saved.conversationId || "",
    endpoints: {
      python: saved.endpoints?.python || DEFAULT_BACKENDS.python.baseUrl,
      java: saved.endpoints?.java || DEFAULT_BACKENDS.java.baseUrl,
    },
  };
}

export function saveSettings(settings) {
  localStorage.setItem(
    "intentflow.frontend.settings",
    JSON.stringify(settings),
  );
}

export function backendMeta(type, settings) {
  const meta = DEFAULT_BACKENDS[type] || DEFAULT_BACKENDS.java;
  return {
    ...meta,
    baseUrl: normalizeBaseUrl(settings.endpoints?.[meta.id] || meta.baseUrl),
  };
}

export async function requestHealth(type, settings) {
  return requestJson(backendMeta(type, settings).baseUrl, "/health");
}

export async function requestMonitor(type, settings) {
  return requestJson(backendMeta(type, settings).baseUrl, "/monitor");
}

export async function requestSkills(type, settings) {
  return requestJson(backendMeta(type, settings).baseUrl, "/skills");
}

export async function reloadSkills(type, settings) {
  return requestJson(backendMeta(type, settings).baseUrl, "/skills/reload", {
    method: "POST",
  });
}

export async function requestKnowledgeStats(type, settings) {
  return requestJson(backendMeta(type, settings).baseUrl, "/knowledge/stats");
}

export async function runEvaluation(type, settings, body = null) {
  return requestJson(backendMeta(type, settings).baseUrl, "/eval/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function requestSearch(type, settings, query, topK = 5) {
  const params = new URLSearchParams({
    query,
    top_k: String(topK),
    topK: String(topK),
  });
  return requestJson(backendMeta(type, settings).baseUrl, `/search?${params}`, {
    method: "POST",
  });
}

export async function requestChat(type, settings, message) {
  const meta = backendMeta(type, settings);
  const payload = buildChatPayload(type, settings, message);
  const raw = await requestJson(meta.baseUrl, "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!raw || typeof raw.response !== "string")
    throw new Error("后端未返回有效的客服回复，请检查服务状态。");
  return normalizeChatResponse(type, raw);
}

export async function requestToolTrace(type, settings, requestId) {
  if (!requestId) return null;
  const raw = await requestJson(
    backendMeta(type, settings).baseUrl,
    `/trace/tool/${encodeURIComponent(requestId)}`,
    {
      signal: AbortSignal.timeout(10000),
    },
  );
  return normalizeToolTraceResponse(raw);
}

export async function addKnowledge(type, settings, documents) {
  return requestJson(backendMeta(type, settings).baseUrl, "/knowledge/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents }),
  });
}

export async function uploadKnowledge(type, settings, file) {
  const form = new FormData();
  form.append("file", file);
  return requestJson(backendMeta(type, settings).baseUrl, "/knowledge/upload", {
    method: "POST",
    body: form,
  });
}

function buildChatPayload(type, settings, message) {
  return {
    message,
    user_id: settings.userId || "anonymous",
    conv_id: settings.conversationId || undefined,
  };
}

export function normalizeChatResponse(type, raw) {
  return {
    backend: type,
    conversationId:
      raw.conversation_id || raw.conversationId || raw.conv_id || "",
    requestId: raw.request_id || raw.requestId || "",
    response: raw.response || "",
    intent: raw.intent || "other",
    intentGroup: raw.intent_group || raw.intentGroup || "other",
    agentType: raw.agent_type || raw.agentType || "",
    agentTypes: raw.agent_types || raw.agentTypes || [],
    primaryAgent: raw.primary_agent || raw.primaryAgent || "",
    supportingAgents: raw.supporting_agents || raw.supportingAgents || [],
    routingReason: raw.routing_reason || raw.routingReason || "",
    routingConfidence: optionalNumber(
      raw.routing_confidence ?? raw.routingConfidence,
    ),
    entities: raw.entities || {},
    intentConfidence: optionalNumber(
      raw.intent_confidence ?? raw.intentConfidence,
    ),
    intentSourceScores:
      raw.intent_source_scores || raw.intentSourceScores || {},
    escalated: Boolean(raw.escalated),
    latencyMs: optionalNumber(raw.latency_ms ?? raw.latencyMs),
    knowledgeUsed: Boolean(raw.knowledge_used ?? raw.knowledgeUsed),
    verified: raw.verified,
    grounded: raw.grounded,
    raw,
  };
}

export function normalizeToolTraceResponse(raw) {
  const trace = raw?.trace || {};
  return {
    requestId: raw?.request_id || raw?.requestId || "",
    found: Boolean(raw?.found),
    trace: {
      ...trace,
      toolsUsed: trace.tools_used || trace.toolsUsed || [],
      toolCalls: trace.tool_calls || trace.toolCalls || [],
    },
    raw,
  };
}

async function requestJson(baseUrl, path, options = {}) {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }
  return data;
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function readSettings() {
  try {
    const data = JSON.parse(
      localStorage.getItem("intentflow.frontend.settings") || "{}",
    );
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function optionalNumber(value) {
  return value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
    ? Number(value)
    : null;
}

function runtimeConfig() {
  if (typeof window === "undefined") return {};
  return window.__INTENTFLOW_CONFIG__ || {};
}
