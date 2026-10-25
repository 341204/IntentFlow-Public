import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  readWorkspace,
  saveWorkspace,
  workspaceKey,
} from "../src/lib/sessions.js";
import {
  normalizeChatResponse,
  normalizeToolTraceResponse,
} from "../src/lib/backends.js";
const settings = {
  backend: "python",
  userId: "alice",
  endpoints: { python: "/api/python", java: "/api/java" },
};
const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
test("history is isolated by user, backend and service address", () => {
  const key = workspaceKey(settings);
  assert.notEqual(key, workspaceKey({ ...settings, userId: "bob" }));
  assert.notEqual(key, workspaceKey({ ...settings, backend: "java" }));
  assert.notEqual(
    key,
    workspaceKey({
      ...settings,
      endpoints: { ...settings.endpoints, python: "https://other.example/api" },
    }),
  );
  assert.equal(
    key,
    workspaceKey({
      ...settings,
      endpoints: { ...settings.endpoints, python: "/api/python/" },
    }),
  );
});
test("conversation identifier, messages and selection survive reload", () => {
  const storage = memoryStorage(),
    first = createSession("server-conversation"),
    second = createSession();
  first.messages.push({ id: "u1", role: "user", content: "退款流程" });
  saveWorkspace(workspaceKey(settings), [second, first], first.id, storage);
  const restored = readWorkspace(workspaceKey(settings), storage);
  assert.equal(restored.activeId, first.id);
  const conversation = restored.sessions.find((s) => s.id === first.id);
  assert.equal(conversation.conversationId, "server-conversation");
  assert.equal(conversation.messages[0].content, "退款流程");
  assert.equal(
    readWorkspace(workspaceKey({ ...settings, userId: "bob" }), storage),
    null,
  );
});
test("corrupt or unavailable storage does not prevent starting a conversation", () => {
  assert.equal(readWorkspace("key", { getItem: () => "{broken" }), null);
  assert.equal(
    readWorkspace("key", {
      getItem: () => {
        throw Error("denied");
      },
    }),
    null,
  );
  assert.equal(
    readWorkspace("key", { getItem: () => '{"sessions":[null,{}]}' }),
    null,
  );
  const restored = readWorkspace("key", {
    getItem: () =>
      JSON.stringify({
        activeId: "missing",
        sessions: [
          {
            id: "ok",
            messages: [
              null,
              { role: "script", content: "x" },
              { role: "user", content: "safe" },
            ],
          },
        ],
      }),
  });
  assert.equal(restored.activeId, "ok");
  assert.deepEqual(restored.sessions[0].messages, [
    { role: "user", content: "safe" },
  ]);
});

test("an older selected conversation remains recoverable when history reaches its limit", () => {
  const storage = memoryStorage();
  const sessions = Array.from({ length: 55 }, (_, i) => ({
    ...createSession(),
    id: `c${i}`,
    updatedAt: new Date(i * 1000).toISOString(),
  }));
  saveWorkspace("limit", sessions, "c0", storage);
  const restored = readWorkspace("limit", storage);
  assert.equal(restored.sessions.length, 50);
  assert.equal(restored.activeId, "c0");
  assert.ok(restored.sessions.some((s) => s.id === "c54"));
});
test("Python and Java aliases preserve real zeros and distinguish missing values", () => {
  const python = normalizeChatResponse("python", {
    conv_id: "c1",
    response: "hello",
    intent_confidence: 0,
    latency_ms: 0,
  });
  const java = normalizeChatResponse("java", {
    conversationId: "c2",
    response: "hello",
    primaryAgent: "billing",
    routingConfidence: 0.91,
    verified: false,
  });
  assert.equal(python.conversationId, "c1");
  assert.equal(python.intentConfidence, 0);
  assert.equal(python.latencyMs, 0);
  assert.equal(python.routingConfidence, null);
  assert.equal(java.conversationId, "c2");
  assert.equal(java.primaryAgent, "billing");
  assert.equal(java.routingConfidence, 0.91);
  assert.equal(java.verified, false);
  assert.equal(
    normalizeChatResponse("python", { latency_ms: "invalid" }).latencyMs,
    null,
  );
});
test("trace normalization supports both naming conventions and failure status", () => {
  const call = { tool_name: "knowledge_search", success: false };
  const snake = normalizeToolTraceResponse({
    found: true,
    request_id: "r1",
    trace: { tool_calls: [call] },
  });
  const camel = normalizeToolTraceResponse({
    found: true,
    requestId: "r2",
    trace: { toolCalls: [call] },
  });
  assert.deepEqual(snake.trace.toolCalls, camel.trace.toolCalls);
  assert.equal(snake.trace.toolCalls[0].success, false);
  assert.equal(
    normalizeToolTraceResponse({ found: false }).trace.toolCalls.length,
    0,
  );
});
