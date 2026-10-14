import { afterEach, beforeEach, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureGpgTty, home, isPowerShell, localAppData } from "../src/lib/env.js";

let original;

beforeEach(() => {
  original = {
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
    PSModulePath: process.env.PSModulePath,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    GPG_TTY: process.env.GPG_TTY,
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

test("localAppData prefers LOCALAPPDATA and falls back to ~/AppData/Local", () => {
  process.env.LOCALAPPDATA = "C:/Users/test/AppData/Local";
  expect(localAppData()).toBe("C:/Users/test/AppData/Local");
  delete process.env.LOCALAPPDATA;
  delete process.env.USERPROFILE;
  process.env.HOME = "/home/test";
  expect(localAppData()).toBe(join("/home/test", "AppData", "Local"));
});

test("ensureGpgTty keeps an existing GPG_TTY", () => {
  process.env.GPG_TTY = "/dev/pts/7";
  ensureGpgTty();
  expect(process.env.GPG_TTY).toBe("/dev/pts/7");
});

test("ensureGpgTty defaults GPG_TTY to the controlling terminal", () => {
  delete process.env.GPG_TTY;
  ensureGpgTty();
  expect(process.env.GPG_TTY).toBe(process.platform === "win32" ? "" : "/dev/tty");
});
