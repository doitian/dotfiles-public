import { describe, expect, test } from "bun:test";
import { hostname } from "node:os";
import { GoogleTasks, githubRepoName, gitRepoName, main } from "../src/gtasks.js";

const tasks = [
  { id: "p", title: "Project", status: "completed" },
  { id: "c", parent: "p", title: "Write #next", notes: "Use @computer", status: "needsAction" },
  { id: "g", parent: "c", title: "Review #next", status: "completed" },
  { id: "o", title: "Other #nextish", notes: "mail@computer #next-step", status: "needsAction" },
  { id: "s", parent: "p", title: "Call (#waiting), @calls.", status: "needsAction" },
];

function fixture({ failRead = false, failMove = false } = {}) {
  const calls = [];
  let output = "";
  const api = new GoogleTasks({ fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    const moving = url.pathname.endsWith("/move");
    if (moving ? failMove : failRead) return Response.json({ error: { message: "Denied" } }, { status: 403 });
    return Response.json(moving ? { ...tasks[1], parent: url.searchParams.get("parent") ?? undefined } : { items: tasks });
  } });
  api.accessToken = "mock";
  api.expiresAt = Infinity;
  return {
    calls, api, text: () => output,
    run: args => main(args, {
      createApi: async options => { expect(options.interactive).toBe(false); return api; },
      output: { write: chunk => { output += chunk; } },
    }),
  };
}

describe("CLI moves", () => {
  test("moves the existing ID to a parent after a sibling with server JSON", async () => {
    const f = fixture();
    await f.run(["move", "c", "--parent", "p", "--previous", "s", "--list", "list/id", "--json"]);
    expect(JSON.parse(f.text())).toEqual(tasks[1]);
    expect(f.calls.map(call => call.method)).toEqual(["GET", "POST"]);
    expect(f.calls[1].url.pathname).toBe("/tasks/v1/lists/list%2Fid/tasks/c/move");
    expect(Object.fromEntries(f.calls[1].url.searchParams)).toEqual({ parent: "p", previous: "s" });
    expect(f.calls[1].body).toBeUndefined();
    expect(f.api.abortController.signal.aborted).toBe(true);
  });

  test("root destination omits parent and optional previous; plain output includes ID", async () => {
    const f = fixture();
    await f.run(["move", "c", "--root"]);
    expect(f.calls[1].url.search).toBe("");
    expect(f.text()).toContain("ID: c");
    const after = fixture();
    await after.run(["move", "c", "--root", "--previous", "o", "--json"]);
    expect(Object.fromEntries(after.calls[1].url.searchParams)).toEqual({ previous: "o" });
    expect(JSON.parse(after.text()).id).toBe("c");
  });

  test("invalid task relationships fail before any write", async () => {
    for (const args of [
      ["missing", "--root"], ["c", "--parent", "missing"],
      ["c", "--parent", "c"], ["p", "--parent", "g"],
      ["c", "--root", "--previous", "c"], ["c", "--root", "--previous", "missing"],
      ["c", "--root", "--previous", "g"], ["c", "--parent", "p", "--previous", "o"],
    ]) {
      const f = fixture();
      await expect(f.run(["move", ...args, "--json"])).rejects.toThrow();
      expect(f.calls.map(call => call.method)).toEqual(["GET"]);
      expect(f.text()).toBe("");
      expect(f.api.abortController.signal.aborted).toBe(true);
    }
  });

  test("read and move errors propagate without success output", async () => {
    for (const options of [{ failRead: true }, { failMove: true }]) {
      const f = fixture(options);
      await expect(f.run(["move", "c", "--root", "--json"])).rejects.toThrow("Denied");
      expect(f.calls).toHaveLength(options.failRead ? 1 : 2);
      expect(f.text()).toBe("");
      expect(f.api.abortController.signal.aborted).toBe(true);
    }
  });
});

describe("CLI filters", () => {
  test("defaults preserve the full Google objects and JSON envelope", async () => {
    const f = fixture();
    await f.run(["list", "--json"]);
    expect(JSON.parse(f.text())).toEqual({ listId: "@default", parent: null, tasks });
  });

  test.each([
    [["--status", "needsAction"], ["c", "o", "s"]],
    [["--status", "completed"], ["p", "g"]],
    [["--search", "USE @COMPUTER"], ["c"]],
    [["--search", "write"], ["c"]],
    [["--token", "#next"], ["c", "g"]],
    [["--token", "@computer"], ["c"]],
    [["--token", "#waiting", "--token", "@calls"], ["s"]],
    [["--token", "#NEXT"], []],
    [["--token", "#next", "--token", "@computer", "--status", "needsAction", "--search", "write"], ["c"]],
    [["--token", "#next", "--status", "completed"], ["g"]],
  ])("filters combine and retain exact original task objects: %j", async (args, ids) => {
    const f = fixture();
    await f.run(["list", ...args, "--json"]);
    expect(JSON.parse(f.text()).tasks).toEqual(tasks.filter(task => ids.includes(task.id)));
    expect(f.calls.map(call => call.method)).toEqual(["GET"]);
  });

  test("cd resolves before filtering; ancestors are excluded from matches", async () => {
    const f = fixture();
    await f.run(["list", "--cd", "Project", "--status", "needsAction", "--token", "#next", "--json"]);
    expect(JSON.parse(f.text())).toEqual({ listId: "@default", parent: tasks[0], tasks: [tasks[1]] });
    const leaf = fixture();
    await leaf.run(["list", "--cd", "g", "--token", "#next", "--json"]);
    expect(JSON.parse(leaf.text())).toEqual({ listId: "@default", parent: tasks[2], tasks: [] });
  });

  test("Markdown promotes matches with missing parents and retains a cd heading", async () => {
    const f = fixture();
    await f.run(["list", "--status", "completed", "--token", "#next", "--raw"]);
    expect(f.text()).toBe("- [x] Review #next\n");
    const cd = fixture();
    await cd.run(["list", "--cd", "p", "--status", "completed", "--token", "#next", "--raw"]);
    expect(cd.text()).toBe("# Project\n\n- [x] Review #next\n");
    const empty = fixture();
    await empty.run(["list", "--token", "#missing", "--raw"]);
    expect(empty.text()).toBe("\n");
  });

  test("invalid syntax never creates a client", async () => {
    for (const args of [
      ["move"], ["move", "c"], ["move", "c", "--root", "--parent", "p"],
      ["move", "c", "--parent", ""], ["move", "c", "--root", "--previous", " "],
      ["list", "--status", "all"], ["list", "--token", "next"],
      ["list", "--token", "#next @calls"], ["list", "--token", "#"],
      ["list", "--search", " "], ["done", "c", "--status", "completed"],
      ["edit", "c", "--root"], ["list", "--previous", "c"],
      ["list", "--git", "--cd", "p"], ["tui", "--git", "--cd", "p"],
      ["add", "--title", "t", "--git"], ["done", "c", "--git"], ["lists", "--git"],
    ]) {
      let accessed = false;
      await expect(main(args, { createApi: async () => { accessed = true; } })).rejects.toThrow();
      expect(accessed).toBe(false);
    }
  });
});

describe("git repo names", () => {
  test("githubRepoName parses owner/repo from GitHub remote URLs", () => {
    expect(githubRepoName("https://github.com/owner/repo.git")).toBe("owner/repo");
    expect(githubRepoName("https://github.com/owner/repo")).toBe("owner/repo");
    expect(githubRepoName("https://github.com/owner/repo/")).toBe("owner/repo");
    expect(githubRepoName("git@github.com:owner/repo.git")).toBe("owner/repo");
    expect(githubRepoName("ssh://git@github.com/owner/repo")).toBe("owner/repo");
    expect(githubRepoName("https://user@GitHub.com/Owner/Repo.git")).toBe("Owner/Repo");
    expect(githubRepoName("ssh://git@github.com:22/owner/repo.git")).toBe("owner/repo");
    expect(githubRepoName("https://gitlab.com/owner/repo.git")).toBeNull();
    expect(githubRepoName("https://github.com/owner")).toBeNull();
    expect(githubRepoName("")).toBeNull();
    expect(githubRepoName(undefined)).toBeNull();
  });

  function fakeGit({ top = "/home/ian/repos/repo", remotes = "", urls = {} } = {}) {
    return async args => {
      const command = args.slice(2).join(" ");
      if (command === "rev-parse --show-toplevel") return top;
      if (command === "remote") return remotes;
      const name = command.match(/^remote get-url (.+)$/)?.[1];
      return name ? (urls[name] ?? "") : "";
    };
  }

  test("gitRepoName prefers origin and falls back to another GitHub remote", async () => {
    const urls = { origin: "git@github.com:o/r.git", upstream: "git@github.com:up/r.git" };
    expect(await gitRepoName("/x", fakeGit({ remotes: "upstream\norigin", urls }))).toBe("o/r");
    const fork = { upstream: "git@github.com:up/r.git", origin: "https://gitlab.com/o/r.git" };
    expect(await gitRepoName("/x", fakeGit({ remotes: "origin\nupstream", urls: fork }))).toBe("up/r");
  });

  test("gitRepoName falls back to hostname/directory without a GitHub remote", async () => {
    expect(await gitRepoName("/x", fakeGit({ remotes: "origin", urls: { origin: "git@gitlab.com:o/r.git" } }))).toBe(`${hostname()}/repo`);
    expect(await gitRepoName("/x", fakeGit())).toBe(`${hostname()}/repo`);
  });

  test("gitRepoName requires a git repository", async () => {
    await expect(gitRepoName("/x", fakeGit({ top: "" }))).rejects.toThrow("--git requires a git repository");
  });
});

describe("CLI --git", () => {
  function gitFixture({ repo = "owner/repo", items = tasks } = {}) {
    const calls = [];
    const added = [];
    let output = "";
    const api = new GoogleTasks({ fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      if (options.method === "POST") {
        const created = { id: `new-${added.length + 1}`, ...JSON.parse(options.body), status: "needsAction" };
        added.push(created);
        return Response.json(created);
      }
      return Response.json({ items });
    } });
    api.accessToken = "mock";
    api.expiresAt = Infinity;
    return {
      calls, added, api, text: () => output,
      run: args => main(args, {
        createApi: async () => api,
        output: { write: chunk => { output += chunk; } },
        gitRepo: async () => repo,
      }),
    };
  }

  test("list --git reuses a root task matching the repo name case-insensitively", async () => {
    const f = gitFixture({ items: [...tasks, { id: "r", title: "Owner/Repo", status: "needsAction" }, { id: "rc", parent: "r", title: "Repo child", status: "needsAction" }] });
    await f.run(["list", "--git", "--json"]);
    const data = JSON.parse(f.text());
    expect(data.parent.id).toBe("r");
    expect(data.tasks.map(task => task.id)).toEqual(["rc"]);
    expect(f.added).toEqual([]);
    expect(f.calls.map(call => call.method ?? "GET")).toEqual(["GET"]);
  });

  test("list --git creates a missing root task and scopes output to it", async () => {
    const f = gitFixture();
    await f.run(["list", "--git", "--json"]);
    expect(f.added).toEqual([{ id: "new-1", title: "owner/repo", notes: "", status: "needsAction" }]);
    const data = JSON.parse(f.text());
    expect(data.parent).toEqual(f.added[0]);
    expect(data.tasks).toEqual([]);
    const md = gitFixture();
    await md.run(["list", "--git", "--raw"]);
    expect(md.text()).toBe("# owner/repo\n");
  });

  test("list --git matches root tasks only and combines with filters", async () => {
    const f = gitFixture({ items: [{ id: "c", parent: "p", title: "owner/repo", status: "needsAction" }] });
    await f.run(["list", "--git", "--json"]);
    expect(f.added).toHaveLength(1);
    expect(JSON.parse(f.text()).parent.id).toBe("new-1");
    const filtered = gitFixture({ items: [...tasks, { id: "r", title: "owner/repo", status: "needsAction" }, { id: "rc", parent: "r", title: "Ship it #next", status: "needsAction" }] });
    await filtered.run(["list", "--git", "--token", "#next", "--json"]);
    expect(JSON.parse(filtered.text()).tasks.map(task => task.id)).toEqual(["rc"]);
  });
});
