const PREFIX = "intentflow.workspace.v1:";

export function workspaceKey(settings) {
  return (
    PREFIX +
    JSON.stringify([
      settings.backend,
      settings.endpoints[settings.backend].replace(/\/+$/, ""),
      settings.userId || "anonymous",
    ])
  );
}

export function createSession(conversationId = "") {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conversationId,
    title: "新会话",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

export function readWorkspace(key, storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(key));
    if (!data || !Array.isArray(data.sessions)) return null;
    const sessions = data.sessions
      .filter((s) => s && typeof s.id === "string" && Array.isArray(s.messages))
      .map((s) => ({
        ...s,
        title: String(s.title || "新会话"),
        conversationId: String(s.conversationId || ""),
        messages: s.messages.filter(
          (m) =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string",
        ),
      }));
    return sessions.length
      ? {
          sessions,
          activeId: sessions.some((s) => s.id === data.activeId)
            ? data.activeId
            : sessions[0].id,
        }
      : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(
  key,
  sessions,
  activeId,
  storage = globalThis.localStorage,
) {
  const recent = [...sessions]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 50);
  const active = sessions.find((s) => s.id === activeId);
  if (active && !recent.some((s) => s.id === activeId))
    recent.splice(-1, 1, active);
  storage.setItem(
    key,
    JSON.stringify({
      activeId,
      sessions: recent.map((s) => ({ ...s, messages: s.messages.slice(-200) })),
    }),
  );
}
