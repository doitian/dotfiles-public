import { describe, expect, test } from "bun:test";

const snippets = await Bun.file(
  new URL("../nvim/snippets/markdown.json", import.meta.url),
).json();
const docklet = snippets["Obsidian ➤ Docklet"];

describe("Obsidian Docklet snippet", () => {
  test("retains its trigger and editor variables", () => {
    expect(docklet.prefix).toBe("docklet");
    expect([...new Set(docklet.body.join("\n").match(/\$[A-Z_]+/g))].sort()).toEqual(
      ["$CURRENT_DATE", "$CURRENT_MONTH", "$CURRENT_YEAR", "$TM_FILENAME_BASE"],
    );
    expect(docklet.body.slice(-3)).toEqual([
      "# $TM_FILENAME_BASE",
      "",
      "## Synopsis",
    ]);
  });

  for (const date of ["2020-12-31", "2021-01-01", "2024-02-29", "2026-09-25"]) {
    test(`emits canonical note properties for ${date}`, () => {
      const [year, month, day] = date.split("-");
      const text = docklet.body
        .join("\n")
        .replaceAll("$CURRENT_YEAR", year)
        .replaceAll("$CURRENT_MONTH", month)
        .replaceAll("$CURRENT_DATE", day)
        .replaceAll("$TM_FILENAME_BASE", "中文 Docklet");
      expect(text.startsWith("---\n")).toBe(true);
      expect(Bun.YAML.parse(text.split("---\n")[1])).toEqual({
        tags: ["i", "zettel/fleeting"],
        created: `[[${date}]]`,
      });
      expect(text).toEndWith("# 中文 Docklet\n\n## Synopsis");
      expect(text).not.toContain("**Status**::");
      expect(text).not.toContain("#zettel/");
    });
  }
});
