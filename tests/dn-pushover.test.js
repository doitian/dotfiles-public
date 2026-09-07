import { describe, expect, test } from "bun:test";
import { makoConfig, notificationPayload } from "../src/dn-pushover.js";

describe("mako configuration", () => {
  test("setup is idempotent and teardown preserves existing configuration", () => {
    for (const original of ["", "font=monospace\n", "font=monospace\r\n[app-name=example]\r\non-notify=exec example"]) {
      const configured = makoConfig(original, "setup");
      expect(configured).toContain('on-notify=exec dn-pushover "$id"');
      expect(makoConfig(configured, "setup")).toBe(configured);
      expect(makoConfig(configured, "teardown")).toBe(original);
      expect(makoConfig(original, "teardown")).toBe(original);
    }
  });

  test("migrates the shipped mako-pushover hook", () => {
    const original = '# BEGIN mako-pushover\non-notify=exec mako-pushover "$id"\n# END mako-pushover\nfont=mono\n';
    expect(makoConfig(original, "setup")).toBe(makoConfig("font=mono\n", "setup"));
    expect(makoConfig(original, "teardown")).toBe("font=mono\n");
  });

  test("rejects malformed, duplicate, and nested managed blocks", () => {
    for (const original of [
      "# BEGIN dn-pushover\n",
      "# END mako-pushover\n",
      "# END dn-pushover\n# BEGIN dn-pushover\n",
      "# BEGIN dn-pushover\n# BEGIN dn-pushover\n# END dn-pushover\n",
      "# BEGIN mako-pushover\n# BEGIN dn-pushover\n# END mako-pushover\n# END dn-pushover\n",
    ]) {
      expect(() => makoConfig(original, "setup")).toThrow("Malformed");
      expect(() => makoConfig(original, "teardown")).toThrow("Malformed");
    }
  });

  test("does not overwrite unmanaged global hooks", () => {
    expect(() => makoConfig("on-notify=exec other\n", "setup")).toThrow("existing global");
    expect(makoConfig("on-notify=exec other\n", "teardown")).toBe("on-notify=exec other\n");
  });
});

describe("notification forwarding", () => {
  test("uses the uniform prefix and trims content", () => {
    expect(notificationPayload({ summary: " Title ", body: " Body " }, "pc")).toEqual({
      title: "[DN][pc] Title", message: "Body",
    });
  });

  test("skips returning and recognizable Pushover notifications", () => {
    for (const notification of [
      { summary: " [DN][pc] Title" },
      { summary: "[mako][pc] Title" },
      { app_name: "Pushover" },
      { desktop_entry: "net.pushover.client" },
      { app_name: "Pushover" },
      { app_icon: "pushover.png" },
      { summary: "Pushover: new notification" },
      { body: "https://pushover.net/" },
    ]) expect(notificationPayload(notification)).toBeUndefined();
    expect(notificationPayload({
      summary: "dn-pushover test",
      app_name: "dn-pushover",
      desktop_entry: "DnPushover.NotificationListener_y4qjhte2cv1t0!Listener",
    }, "pc")).toEqual({ title: "[DN][pc] dn-pushover test", message: "dn-pushover test" });
  });

  test("uses sensible fallbacks", () => {
    expect(notificationPayload({ app_name: "Mail" }, "pc")).toEqual({ title: "[DN][pc] Mail", message: "Mail" });
    expect(notificationPayload({}, "pc")).toEqual({ title: "[DN][pc] Desktop notification", message: "Desktop notification" });
  });

  test("truncates by code point rather than UTF-16 units", () => {
    const character = "\u{1f600}";
    const payload = notificationPayload({ summary: character.repeat(300), body: character.repeat(1100) }, "pc");
    expect(Array.from(payload.title)).toHaveLength(250);
    expect(Array.from(payload.message)).toHaveLength(1024);
    expect(payload.title.endsWith(character)).toBe(true);
    expect(payload.message).toBe(character.repeat(1024));
  });
});
