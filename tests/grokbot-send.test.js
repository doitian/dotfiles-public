import { expect, test } from "bun:test";
import {
  CREDENTIALS_ENTRY,
  getCredentials,
  run,
  send,
} from "../src/grokbot-send.js";

const credentials = { endpoint: "https://example.test/webhook", token: "test-key" };

function recordingFetch(response = new Response("{}")) {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return response;
  };
  return { calls, fetchImpl };
}

function gopassEntry(name) {
  expect(name).toBe(CREDENTIALS_ENTRY);
  return {
    password: "gopass-key",
    fields: new Map([["GROK_BOT_WEBHOOK_ENDPOINT", "https://example.test/gopass"]]),
  };
}

test("send posts the webhook payload with bearer authentication", async () => {
  const { calls, fetchImpl } = recordingFetch();
  const payload = { from: "someone", to: ["Scout", "Harbor"], message: "Hello 世界" };
  await send(payload, credentials, fetchImpl);
  expect(calls).toHaveLength(1);
  const [url, options] = calls[0];
  expect(url).toBe(credentials.endpoint);
  expect(options.method).toBe("POST");
  expect(options.headers).toEqual({
    Authorization: "Bearer test-key",
    "Content-Type": "application/json",
  });
  expect(JSON.parse(options.body)).toEqual(payload);
});

test("send includes HTTP errors without exposing the sender key", async () => {
  const { fetchImpl } = recordingFetch(new Response("bad payload", { status: 400 }));
  await expect(send({ from: "a", to: ["Scout"], message: "hi" }, credentials, fetchImpl))
    .rejects.toThrow("Grok Bot webhook error: 400 bad payload");
});

test("getCredentials prefers the environment and otherwise reads gopass once", async () => {
  let reads = 0;
  const readEntry = async name => {
    reads++;
    return gopassEntry(name);
  };
  expect(await getCredentials({}, readEntry)).toEqual({
    endpoint: "https://example.test/gopass",
    token: "gopass-key",
  });
  expect(reads).toBe(1);
  expect(await getCredentials({
    GROK_BOT_WEBHOOK_ENDPOINT: "https://example.test/env",
    GROK_BOT_WEBHOOK_TOKEN: "env-key",
  }, readEntry)).toEqual({ endpoint: "https://example.test/env", token: "env-key" });
  expect(reads).toBe(1);
});

test("run supports comma-separated recipients and gopass credentials", async () => {
  const { calls, fetchImpl } = recordingFetch();
  await run(["--from", "someone", "--to", "Scout, Harbor", "hello", "world"], {
    env: {},
    fetchImpl,
    readEntry: gopassEntry,
    readInput: async () => { throw new Error("stdin should not be read"); },
  });
  expect(JSON.parse(calls[0][1].body)).toEqual({
    from: "someone",
    to: ["Scout", "Harbor"],
    message: "hello world",
  });
});

test("run supports repeated recipients, stdin, and the default sender", async () => {
  const { calls, fetchImpl } = recordingFetch();
  await run(["-t", "Scout", "--to", "Harbor"], {
    env: {
      GROK_BOT_FROM: "queue",
      GROK_BOT_WEBHOOK_ENDPOINT: credentials.endpoint,
      GROK_BOT_WEBHOOK_TOKEN: credentials.token,
    },
    fetchImpl,
    readEntry: async () => { throw new Error("gopass should not be read"); },
    readInput: async () => "line one\nline two\n",
  });
  expect(JSON.parse(calls[0][1].body)).toEqual({
    from: "queue",
    to: ["Scout", "Harbor"],
    message: "line one\nline two",
  });
});

test("run allows the recipient to be omitted", async () => {
  const { calls, fetchImpl } = recordingFetch();
  await run(["hello", "world"], {
    env: {
      GROK_BOT_FROM: "queue",
      GROK_BOT_WEBHOOK_ENDPOINT: credentials.endpoint,
      GROK_BOT_WEBHOOK_TOKEN: credentials.token,
    },
    fetchImpl,
    readEntry: async () => { throw new Error("gopass should not be read"); },
    readInput: async () => { throw new Error("stdin should not be read"); },
  });
  expect(JSON.parse(calls[0][1].body)).toEqual({
    from: "queue",
    to: [],
    message: "hello world",
  });
});

test("run rejects an empty message before resolving credentials", async () => {
  await expect(run([], {
    env: {},
    readEntry: async () => { throw new Error("gopass should not be read"); },
    readInput: async () => " \n",
  })).rejects.toThrow("Message is empty");
});
