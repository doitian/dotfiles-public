import { expect, test } from "bun:test";
import {
  getOpenAICredentials,
  gopassToEnv,
  isOpenCodeEndpoint,
  resolveSecret,
} from "../src/lib/secrets.js";

test("gopassToEnv exports password via export_as", () => {
  expect(
    gopassToEnv({
      password: "sk-secret",
      fields: new Map([["export_as", "KIMI_API_KEY"]]),
    }),
  ).toBe("KIMI_API_KEY='sk-secret'\n");
});

test("gopassToEnv exports uppercase field names and skips others", () => {
  expect(
    gopassToEnv({
      password: "ignored",
      fields: new Map([
        ["username", "ian"],
        ["API_KEY", "abc"],
        ["FOO_BAR_1", "x"],
        ["_TOKEN", "t"],
        ["A", "1"],
        ["url", "https://example.com"],
        ["123", "n"],
        ["_", "n"],
        ["mixed_CASE", "n"],
      ]),
    }),
  ).toBe("API_KEY='abc'\nFOO_BAR_1='x'\n_TOKEN='t'\nA='1'\n");
});

test("gopassToEnv combines export_as with other exportable fields", () => {
  expect(
    gopassToEnv({
      password: "pass",
      fields: new Map([
        ["export_as", "KIMI_API_KEY"],
        ["BASE_URL", "https://api.example.com"],
        ["note", "skip me"],
      ]),
    }),
  ).toBe("KIMI_API_KEY='pass'\nBASE_URL='https://api.example.com'\n");
});

test("gopassToEnv quotes values for eval", () => {
  expect(
    gopassToEnv({
      password: "it's secret",
      fields: new Map([["export_as", "KEY"]]),
    }),
  ).toBe("KEY='it'\\''s secret'\n");
});

test("gopassToEnv returns empty when nothing is exportable", () => {
  expect(
    gopassToEnv({
      password: "pass",
      fields: new Map([["username", "ian"]]),
    }),
  ).toBe("");
});

test("gopassToEnv emits PowerShell assignments when requested", () => {
  expect(
    gopassToEnv(
      {
        password: "it's secret",
        fields: new Map([
          ["export_as", "KIMI_API_KEY"],
          ["BASE_URL", "https://api.example.com"],
        ]),
      },
      "powershell",
    ),
  ).toBe("$env:KIMI_API_KEY='it''s secret'\n$env:BASE_URL='https://api.example.com'\n");
});

test("gopassToEnv returns empty for PowerShell when nothing is exportable", () => {
  expect(
    gopassToEnv(
      {
        password: "pass",
        fields: new Map([["username", "ian"]]),
      },
      "powershell",
    ),
  ).toBe("");
});

test("gopassToEnv rejects an export_as name that is not a shell variable", () => {
  expect(() =>
    gopassToEnv({
      password: "pw",
      fields: new Map([["export_as", "X=1; echo pwned #"]]),
    }),
  ).toThrow("Invalid export_as name");
});

test("gopassToEnv accepts a lowercase export_as name", () => {
  expect(
    gopassToEnv({ password: "pw", fields: new Map([["export_as", "api_key"]]) }),
  ).toBe("api_key='pw'\n");
});

function memoryStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get: async ({ name }) => values.get(name) ?? null,
    set: async ({ name, value }) => { values.set(name, value); },
  };
}

test("resolveSecret prefers env vars in order", async () => {
  const store = memoryStore({ token: "stored" });
  const env = { SECOND: "from-second", FIRST: "" };
  expect(await resolveSecret("token", ["FIRST", "SECOND"], { env, store, isTTY: false })).toBe("from-second");
});

test("resolveSecret ignores env vars when NO_SECRET_ENV_VAR is set", async () => {
  const store = memoryStore({ token: "stored" });
  const env = { TOKEN: "from-env", NO_SECRET_ENV_VAR: "1" };
  expect(await resolveSecret("token", ["TOKEN"], { env, store, isTTY: false })).toBe("stored");
});

test("resolveSecret prompts on a TTY and stores the answer", async () => {
  const store = memoryStore();
  const asked = [];
  const value = await resolveSecret("token", ["TOKEN"], {
    env: {},
    store,
    isTTY: true,
    ask: async (question) => { asked.push(question); return "typed"; },
  });
  expect(value).toBe("typed");
  expect(asked).toEqual(["Enter value for token: "]);
  expect(store.values.get("token")).toBe("typed");
});

test("resolveSecret rejects an empty answer without storing it", async () => {
  const store = memoryStore();
  await expect(
    resolveSecret("token", [], { env: {}, store, isTTY: true, ask: async () => "" }),
  ).rejects.toThrow("No value provided for token");
  expect(store.values.has("token")).toBe(false);
});

test("resolveSecret names the env vars when it cannot prompt", async () => {
  await expect(
    resolveSecret("token", ["TOKEN", "ALT_TOKEN"], { env: {}, store: memoryStore(), isTTY: false }),
  ).rejects.toThrow('Missing secret "token" (set one of: TOKEN, ALT_TOKEN');
});

test("isOpenCodeEndpoint matches opencode.ai and its subdomains", () => {
  expect(isOpenCodeEndpoint("https://opencode.ai/zen/v1")).toBe(true);
  expect(isOpenCodeEndpoint("https://api.opencode.ai/v1")).toBe(true);
  expect(isOpenCodeEndpoint("https://OPENCODE.AI/zen/v1")).toBe(true);
});

test("isOpenCodeEndpoint rejects other hosts and invalid input", () => {
  expect(isOpenCodeEndpoint("https://api.openai.com/v1")).toBe(false);
  expect(isOpenCodeEndpoint("https://opencode.ai.evil.example/v1")).toBe(false);
  expect(isOpenCodeEndpoint("https://notopencode.ai/v1")).toBe(false);
  expect(isOpenCodeEndpoint("")).toBe(false);
  expect(isOpenCodeEndpoint(undefined)).toBe(false);
  expect(isOpenCodeEndpoint("not a url")).toBe(false);
});

test("getOpenAICredentials picks the OpenAI key for a non-OpenCode endpoint", async () => {
  const env = {
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_API_KEY: "sk-openai",
    OPENAI_DEFAULT_MODEL: "gpt-5",
  };
  const credentials = await getOpenAICredentials({ env, store: memoryStore(), isTTY: false });
  expect(credentials).toEqual({
    apiKey: "sk-openai",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-5",
  });
});

test("getOpenAICredentials picks the OpenCode key for an OpenCode endpoint", async () => {
  const env = {
    OPENAI_BASE_URL: "https://opencode.ai/zen/v1",
    OPENAI_API_KEY: "sk-openai",
    OPENCODE_API_KEY: "sk-opencode",
    OPENAI_DEFAULT_MODEL: "zen-1",
  };
  const credentials = await getOpenAICredentials({ env, store: memoryStore(), isTTY: false });
  expect(credentials.apiKey).toBe("sk-opencode");
});

test("the endpoint decides the key even when both keys are stored", async () => {
  const store = memoryStore({
    "openai-base-url": "https://opencode.ai/zen/v1",
    "openai-model": "zen-1",
    "openai-api-key": "sk-openai",
    "opencode-api-key": "sk-opencode",
  });
  const credentials = await getOpenAICredentials({ env: {}, store, isTTY: false });
  expect(credentials.apiKey).toBe("sk-opencode");
});

test("getOpenAICredentials asks for the OpenCode key only when the endpoint is OpenCode", async () => {
  await expect(
    getOpenAICredentials({
      env: { OPENAI_BASE_URL: "https://opencode.ai/zen/v1", OPENAI_API_KEY: "sk-openai" },
      store: memoryStore(),
      isTTY: false,
    }),
  ).rejects.toThrow("OPENCODE_API_KEY");
});
