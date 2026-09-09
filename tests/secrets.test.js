import { expect, test } from "bun:test";
import { gopassToEnv } from "../src/lib/secrets.js";

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
