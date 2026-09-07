import { afterEach, expect, spyOn, test } from "bun:test";
import { send } from "../src/lib/pushover.js";

const credentials = { userKey: "test-user", appToken: "test-token" };
let fetchSpy;

afterEach(() => {
  fetchSpy?.mockRestore();
});

test("send posts credentials and correctly encodes message fields", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  const fields = { message: "Hello & 世界 + friends", title: "Test", priority: "1" };
  await send(fields, credentials);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [url, options] = fetchSpy.mock.calls[0];
  expect(url).toBe("https://api.pushover.net/1/messages.json");
  expect(options.method).toBe("POST");
  expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  expect(Object.fromEntries(new URLSearchParams(options.body))).toEqual({
    user: "test-user",
    token: "test-token",
    ...fields,
  });
});

test("send includes the status and response body in API errors", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("invalid token", { status: 400 }),
  );
  await expect(send({ message: "test" }, credentials)).rejects.toThrow(
    "Pushover API error: 400 invalid token",
  );
});

test("send propagates network failures", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection failed"));
  await expect(send({ message: "test" }, credentials)).rejects.toThrow("connection failed");
});
