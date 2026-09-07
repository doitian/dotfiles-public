import { afterEach, beforeEach, expect, test } from "bun:test";
import { home } from "../src/lib/env.js";

let original;

beforeEach(() => {
  original = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };
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
