/**
 * Minimal MCP client for Streamable HTTP servers: initialize with a resumable
 * session, then tools/list and tools/call over JSON-RPC POSTs with SSE or
 * JSON responses.
 */

export const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

export function parseSseMessages(text) {
  const messages = [];
  let data = [];
  const flush = () => {
    if (!data.length) return;
    messages.push(JSON.parse(data.join("\n")));
    data = [];
  };
  for (const line of String(text).split(/\r?\n/)) {
    if (line === "") {
      flush();
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  flush();
  return messages;
}

/** Prefer structuredContent; fall back to JSON-parsed (or raw) text content. */
export function toolData(result) {
  if (result?.structuredContent !== undefined) return result.structuredContent;
  const text = (result?.content ?? [])
    .filter(item => item.type === "text")
    .map(item => item.text)
    .join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class McpHttpClient {
  constructor({
    url,
    token,
    fetchImpl = fetch,
    protocolVersion = DEFAULT_PROTOCOL_VERSION,
    clientInfo = { name: "flomo-cli", version: "0.1.0" },
    timeout = 30_000,
  }) {
    Object.assign(this, { url, token, fetchImpl, protocolVersion, clientInfo, timeout });
    this.sessionId = null;
    this.serverInfo = null;
    this.nextId = 1;
  }

  headers() {
    const headers = {
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };
    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
      headers["mcp-protocol-version"] = this.protocolVersion;
    }
    return headers;
  }

  post(payload) {
    return this.fetchImpl(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });
  }

  async readResponse(response, id) {
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300).trim();
      throw new Error(`MCP request failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
    }
    if (type.includes("text/event-stream")) {
      const messages = parseSseMessages(await response.text());
      const message = messages.find(item => item.id === id) ?? messages.at(-1);
      if (!message) throw new Error("MCP server returned an empty event stream");
      return message;
    }
    return await response.json();
  }

  async rpc(method, params, { retry = true } = {}) {
    const id = this.nextId++;
    const response = await this.post({ jsonrpc: "2.0", id, method, params });
    if (response.status === 404 && this.sessionId && retry) {
      await this.connect();
      return await this.rpc(method, params, { retry: false });
    }
    const message = await this.readResponse(response, id);
    if (message.error) {
      throw new Error(`MCP ${method} failed (${message.error.code}): ${message.error.message}`);
    }
    return message.result;
  }

  async connect() {
    this.sessionId = null;
    const id = this.nextId++;
    const response = await this.post({
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: {
        protocolVersion: this.protocolVersion,
        capabilities: {},
        clientInfo: this.clientInfo,
      },
    });
    const message = await this.readResponse(response, id);
    if (message.error) {
      throw new Error(`MCP initialize failed (${message.error.code}): ${message.error.message}`);
    }
    this.sessionId = response.headers.get("mcp-session-id");
    this.serverInfo = message.result?.serverInfo ?? null;
    const notice = await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });
    if (!notice.ok) await notice.body?.cancel();
    return message.result;
  }

  async listTools() {
    return (await this.rpc("tools/list", {}))?.tools ?? [];
  }

  /** Calls a tool and returns its structured data; throws on tool-level errors. */
  async callTool(name, args = {}) {
    const result = await this.rpc("tools/call", { name, arguments: args });
    if (result?.isError) {
      const text = toolData(result);
      throw new Error(typeof text === "string" && text ? text : `MCP tool ${name} failed`);
    }
    return toolData(result);
  }
}
