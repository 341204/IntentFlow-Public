// Local UI smoke-test server. This is never imported by the production app.
import http from "node:http";
const requests = [],
  failedOnce = new Set();
let sequence = 0;
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://localhost"),
      path = url.pathname.replace(/^\/(python|java)/, "");
    let body = "";
    for await (const chunk of req) body += chunk;
    const data =
      body && req.headers["content-type"]?.includes("application/json")
        ? JSON.parse(body)
        : {};
    requests.push({ method: req.method, path: url.pathname, data });
    const send = (value, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (path === "/_requests") return send(requests);
    if (path === "/health") return send({ status: "ok" });
    if (path === "/monitor")
      return send({
        agent_stats: { billing: { total: 4 } },
        active_alerts: [],
      });
    if (path === "/skills" || path === "/skills/reload")
      return send({
        skills: [{ name: "billing_support", description: "账单服务规则" }],
        errors: [],
      });
    if (path === "/knowledge/stats") return send({ total_chunks: 12 });
    if (path === "/search")
      return send({
        results:
          url.searchParams.get("query") === "没有结果"
            ? []
            : [
                {
                  title: "测试退款政策",
                  content: "退款须先核验支付记录。",
                  score: 0.91,
                },
              ],
      });
    if (path.startsWith("/knowledge/"))
      return send({ added_chunks: 2, total_chunks: 14 });
    if (path === "/eval/run")
      return send({
        pass_rate: 0.9,
        passed: 9,
        total: 10,
        avg_scores: { intent_accuracy: 0.95, relevance: 8.6 },
        regressions: [],
        recommendations: ["继续补充复合问题测试样例"],
      });
    if (path === "/chat") {
      if (data.message.includes("失败重试") && !failedOnce.has(data.message)) {
        failedOnce.add(data.message);
        return send({ detail: "测试服务暂不可用" }, 503);
      }
      if (data.message.includes("延迟"))
        await new Promise((resolve) => setTimeout(resolve, 1800));
      const id = ++sequence;
      return send({
        [url.pathname.startsWith("/java") ? "conversation_id" : "conv_id"]:
          data.conv_id || `test-c-${id}`,
        request_id: data.message.includes("无轨迹")
          ? "trace-unavailable"
          : `test-r-${id}`,
        response:
          '**先核对扣款记录**\n\n1. 核验订单号。\n2. 提交退款申请。\n\n```text\n订单状态：待核验\n```\n<script>window.__unsafe = true</script><img src="x" onerror="window.__unsafe = true">[危险链接](javascript:alert(1))',
        intent: "billing",
        primary_agent: "billing",
        intent_confidence: 0.94,
        routing_confidence: 0.9,
        latency_ms: 1280,
        knowledge_used: true,
        verified: url.pathname.startsWith("/java") ? false : undefined,
      });
    }
    if (path === "/trace/tool/trace-unavailable")
      return send({ detail: "测试轨迹不可用" }, 503);
    if (path.startsWith("/trace/tool/"))
      return send({
        found: true,
        trace: {
          tools_used: ["knowledge_search"],
          tool_calls: [
            {
              tool_name: "knowledge_search",
              success: true,
              input: { query: "退款政策" },
            },
          ],
        },
      });
    send({ detail: "Not found" }, 404);
  })
  .listen(18080, "127.0.0.1", () =>
    console.log("UI test fixture: http://127.0.0.1:18080/python"),
  );
