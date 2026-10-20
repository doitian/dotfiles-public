import { describe, expect, test } from "bun:test";
import { McpHttpClient, parseSseMessages, toolData } from "../src/lib/mcp.js";

test("parseSseMessages parses events and ignores comments", () => {
  const text = ": keep-alive\n\nevent: message\ndata: {\"a\":1}\n\ndata: {\"b\":\ndata: 2}\n\n";
  expect(parseSseMessages(text)).toEqual([{ a: 1 }, { b: 2 }]);
});

test("toolData prefers structuredContent, then JSON text, then raw text", () => {
  expect(toolData({ structuredContent: { x: 1 }, content: [{ type: "text", text: "{}" }] })).toEqual({ x: 1 });
  expect(toolData({ content: [{ type: "text", text: "{\"x\":2}" }] })).toEqual({ x: 2 });
  expect(toolData({ content: [{ type: "text", text: "plain" }] })).toBe("plain");
  expect(toolData({})).toBe("");
});

function sse(payload, { status = 200, session = "SID" } = {}) {
  const headers = { "content-type": "text/event-stream" };
  if (session) headers["mcp-session-id"] = session;
  return new Response(`event: message\ndata: ${JSON.stringify(payload)}\n\n`, { status, headers });
}

function fixture(handlers) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, headers: options.headers, body });
    const handler = handlers[body.method] ?? handlers.default;
    if (!handler) throw new Error(`unexpected method ${body.method}`);
    return handler(body, requests.length);
  };
  return { requests, client: new McpHttpClient({ url: "https://example.test/mcp", token: "tok", fetchImpl }) };
}

describe("McpHttpClient", () => {
  test("connect initializes a session and callTool returns structured data", async () => {
    const { requests, client } = fixture({
      initialize: () => sse({ jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "srv" }, protocolVersion: "2025-03-26" } }),
      "notifications/initialized": () => new Response(null, { status: 202 }),
      "tools/call": body => sse({
        jsonrpc: "2.0", id: body.id,
        result: { content: [{ type: "text", text: "{\"memos\":[]}" }], structuredContent: { memos: [] } },
      }),
    });
    await client.connect();
    expect(client.sessionId).toBe("SID");
    expect(client.serverInfo).toEqual({ name: "srv" });
    const data = await client.callTool("memo_search", { keywords: "x" });
    expect(data).toEqual({ memos: [] });

    expect(requests.map(r => r.body.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(requests[0].headers.authorization).toBe("Bearer tok");
    expect(requests[0].headers["mcp-session-id"]).toBeUndefined();
    expect(requests[1].headers["mcp-session-id"]).toBe("SID");
    expect(requests[2].headers["mcp-protocol-version"]).toBe("2025-03-26");
    expect(requests[2].body.params).toEqual({ name: "memo_search", arguments: { keywords: "x" } });
  });

  test("handles plain JSON responses", async () => {
    const { client } = fixture({
      initialize: () => Response.json({ jsonrpc: "2.0", id: 1, result: {} }, { headers: { "mcp-session-id": "S" } }),
      "notifications/initialized": () => new Response(null, { status: 202 }),
      "tools/list": body => Response.json({ jsonrpc: "2.0", id: body.id, result: { tools: [{ name: "t" }] } }),
    });
    await client.connect();
    expect(await client.listTools()).toEqual([{ name: "t" }]);
  });

  test("reconnects once when the session is gone (404)", async () => {
    let sessions = 0;
    let calls = 0;
    const { requests, client } = fixture({
      initialize: () => sse({ jsonrpc: "2.0", id: 1 + sessions++, result: {} }, { session: `SID${sessions}` }),
      "notifications/initialized": () => new Response(null, { status: 202 }),
      "tools/call": body => ++calls === 1
        ? new Response("session not found", { status: 404 })
        : sse({ jsonrpc: "2.0", id: body.id, result: { structuredContent: { ok: true } } }),
    });
    await client.connect();
    expect(await client.callTool("t")).toEqual({ ok: true });
    expect(requests.map(r => r.body.method)).toEqual([
      "initialize", "notifications/initialized", "tools/call",
      "initialize", "notifications/initialized", "tools/call",
    ]);
    expect(requests.at(-1).headers["mcp-session-id"]).toBe("SID2");
  });

  test("json-rpc errors and tool errors throw", async () => {
    const { client } = fixture({
      initialize: () => sse({ jsonrpc: "2.0", id: 1, result: {} }),
      "notifications/initialized": () => new Response(null, { status: 202 }),
      "tools/call": body => body.params.name === "bad_rpc"
        ? sse({ jsonrpc: "2.0", id: body.id, error: { code: -32602, message: "invalid params" } })
        : sse({ jsonrpc: "2.0", id: body.id, result: { isError: true, content: [{ type: "text", text: "tool broke" }] } }),
    });
    await client.connect();
    await expect(client.callTool("bad_rpc")).rejects.toThrow("invalid params");
    await expect(client.callTool("bad_tool")).rejects.toThrow("tool broke");
  });

  test("http errors include status and detail", async () => {
    const { client } = fixture({
      initialize: () => new Response("unauthorized", { status: 401 }),
    });
    await expect(client.connect()).rejects.toThrow("(HTTP 401): unauthorized");
  });
});
