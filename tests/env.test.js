import { afterEach, beforeEach, expect, test } from "bun:test";
import { home, isPowerShell } from "../src/lib/env.js";

let original;

beforeEach(() => {
  original = {
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
    PSModulePath: process.env.PSModulePath,
  };
});

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("home prefers USERPROFILE when both variables are set", () => {
  process.env.USERPROFILE = "C:/Users/test";
  process.env.HOME = "/home/test";
  expect(home()).toBe("C:/Users/test");
});

test("home falls back to HOME when USERPROFILE is absent", () => {
  delete process.env.USERPROFILE;
  process.env.HOME = "/home/test";
  expect(home()).toBe("/home/test");
});

test("home falls back to HOME when USERPROFILE is empty", () => {
  process.env.USERPROFILE = "";
  process.env.HOME = "/home/test";
  expect(home()).toBe("/home/test");
});

test("home returns an empty string when neither variable is available", () => {
  delete process.env.USERPROFILE;
  delete process.env.HOME;
  expect(home()).toBe("");
});

test("isPowerShell detects a populated PSModulePath", () => {
  const sep = process.platform === "win32" ? ";" : ":";
  process.env.PSModulePath = ["a", "b", "c"].join(sep);
  expect(isPowerShell()).toBe(true);
});

test("isPowerShell ignores a bare or missing PSModulePath", () => {
  delete process.env.PSModulePath;
  expect(isPowerShell()).toBe(false);
  process.env.PSModulePath = "";
  expect(isPowerShell()).toBe(false);
  const sep = process.platform === "win32" ? ";" : ":";
  process.env.PSModulePath = ["a", "b"].join(sep);
  expect(isPowerShell()).toBe(false);
});
