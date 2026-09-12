import { GoogleTasks, LocalGoogleTasks, authorize, createAuthorizationRequest, googleTasksSecrets, TasksView, renderTasks, runTasksTui, visibleTasks, renderMarkdown, viewMarkdown, parseTaskInput, parseDue, formatDue, formatId, readTaskInput } from "../src/gtasks.js";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { main as importSecrets } from "../scripts/ev-secrets.js";
import { createHash } from "node:crypto";
import { PassThrough } from "node:stream";
import { gopassToEnv } from "../src/lib/secrets.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import { main as runCommand, matchTask } from "../src/gtasks.js";

describe("Agent commands", () => {
    const tasks = [
        { id: "p", title: "Project", notes: "Context\nMore context", status: "completed" },
        { id: "c", parent: "p", title: "Child", status: "needsAction" },
        { id: "g", parent: "c", title: "Grandchild", status: "completed" },
        { id: "other", title: "Project two", status: "needsAction" },
    ];
    async function run(args, replies) {
        const { api, calls } = mockClient(replies);
        let text = "";
        const output = { write: chunk => { text += chunk; } };
        await runCommand(args, {
            output, createApi: async options => {
                expect(options.interactive).toBe(false);
                return api;
            }
        });
        expect(api.abortController.signal.aborted).toBe(true);
        return { text, calls };
    }

    test("lists fetches every page and emits id/name JSON", async () => {
        const { text, calls } = await run(["lists", "--json"], [token(), json({ items: [{ id: "a", title: "Work" }], nextPageToken: "next" }), json({ items: [{ id: "b", title: "Home" }] })]);
        expect(JSON.parse(text)).toEqual([{ id: "a", name: "Work" }, { id: "b", name: "Home" }]);
        expect(calls[1].url.pathname).toBe("/tasks/v1/users/@me/lists");
        expect(calls[2].url.searchParams.get("pageToken")).toBe("next");
        const plain = await run(["lists"], [token(), json({ items: [{ id: "a", title: "Work" }] })]);
        expect(plain.text).toBe("- Work (a)\n");
    });

    test("list cd renders a heading, description and complete child hierarchy", async () => {
        const { text } = await run(["list", "--cd", "project"], [token(), json({ items: tasks })]);
        expect(text).toBe("# Project\n\nContext\nMore context\n\n- [ ] Child\n  - [x] Grandchild\n");
        const leaf = await run(["list", "--cd", "g"], [token(), json({ items: tasks })]);
        expect(leaf.text).toBe("# Grandchild\n");
    });

    test("list JSON preserves IDs and parent relationships in the selected subtree", async () => {
        const { text, calls } = await run(["list", "work/id", "--cd", "p", "--json"], [token(), json({ items: tasks })]);
        expect(JSON.parse(text)).toEqual({ listId: "work/id", parent: tasks[0], tasks: [tasks[1], tasks[2]] });
        expect(calls[1].url.pathname).toBe("/tasks/v1/lists/work%2Fid/tasks");
        const root = await run(["list", "--json"], [token(), json({ items: tasks })]);
        expect(JSON.parse(root.text)).toEqual({ listId: "@default", parent: null, tasks });
    });

    test("list uses glow on a TTY and --raw prints Markdown instead", async () => {
        let paged = "";
        let text = "";
        const output = { isTTY: true, write: chunk => { text += chunk; } };
        const createApi = async () => mockClient([token(), json({ items: [{ id: "a", title: "Work" }] })]).api;
        await runCommand(["list"], { output, createApi, runGlow: async md => { paged = md; } });
        expect(paged).toContain("- [ ] Work");
        expect(text).toBe("");
        paged = "";
        await runCommand(["list", "--raw"], { output, createApi, runGlow: async md => { paged = md; } });
        expect(paged).toBe("");
        expect(text).toContain("- [ ] Work");
    });

    test("title resolution rejects ambiguity and missing matches, with IDs for disambiguation", () => {
        expect(matchTask(tasks, "PROJECT").id).toBe("p");
        expect(matchTask(tasks, "two").id).toBe("other");
        expect(() => matchTask(tasks, "pro")).toThrow("(other)");
        expect(() => matchTask([...tasks, { id: "duplicate", title: "Project" }], "Project")).toThrow("(duplicate)");
        expect(() => matchTask(tasks, "missing")).toThrow("No task matches");
    });

    test("add, partial edit, done and undone return server-confirmed JSON", async () => {
        const created = { id: "new", title: "Title", notes: "Details", parent: "p", status: "needsAction" };
        const added = await run(["add", "--list", "work", "--title", "Title", "--notes", "Details", "--parent", "p", "--json"], [token(), json(created)]);
        expect(JSON.parse(added.text)).toEqual(created);
        expect(JSON.parse(added.calls[1].body)).toEqual({ title: "Title", notes: "Details" });
        expect(added.calls[1].url.searchParams.get("parent")).toBe("p");
        const edited = await run(["edit", "new", "--notes", "", "--json"], [token(), json({ ...created, notes: "" })]);
        expect(JSON.parse(edited.calls[1].body)).toEqual({ notes: "" });
        for (const command of ["done", "undone"]) {
            const result = await run([command, "new", "--json"], [token(), json(created)]);
            expect(JSON.parse(result.calls[1].body)).toEqual(command === "done" ? { status: "completed" } : { status: "needsAction", completed: null });
        }
        const dated = await run(["add", "--title", "Dated", "--due", "2026-09-14", "--json"], [token(), json({ ...created, due: "2026-09-14T00:00:00.000Z" })]);
        expect(JSON.parse(dated.calls[1].body)).toEqual({ title: "Dated", notes: "", due: "2026-09-14T00:00:00.000Z" });
        const cleared = await run(["edit", "new", "--due", "", "--json"], [token(), json({ ...created, due: null })]);
        expect(JSON.parse(cleared.calls[1].body)).toEqual({ due: null });
    });

    test("invalid arguments fail before credentials or network access", async () => {
        for (const args of [["edit"], ["edit", "id"], ["done"], ["add"], ["add", "--title", " "], ["lists", "--cd", "x"], ["lists", "--raw"], ["list", "--cd", ""], ["done", "id", "--title", "oops"], ["list", "a", "--list", "b"], ["add", "--title", "x", "--due", "nope"], ["edit", "id", "--due", "2026-02-31"]]) {
            let accessed = false;
            await expect(runCommand(args, { createApi: async () => { accessed = true; } })).rejects.toThrow();
            expect(accessed).toBe(false);
        }
    });

    test("failed writes emit no success output and release the client", async () => {
        const { api } = mockClient([token(), json({ error: { message: "Denied" } }, 403)]);
        let text = "";
        await expect(runCommand(["edit", "id", "--title", "New", "--json"], { createApi: async () => api, output: { write: chunk => { text += chunk; } } })).rejects.toThrow("Denied");
        expect(text).toBe("");
        expect(api.abortController.signal.aborted).toBe(true);
    });
});

function localFixture(path = ":memory:") {
    const data = { tasks: [{ id: "existing", title: "Existing", status: "needsAction" }], writes: [], offline: false };
    const remote = {
        token: async () => {
            if (data.offline) throw new Error("Offline");
        },
        getList: async () => {
            if (data.offline) throw new Error("Offline");
            return { title: "My tasks" };
        },
        list: async () => structuredClone(data.tasks),
        add: async (list, title, parent, notes, previous, due) => {
            const task = { id: `server-${data.writes.length}`, title, notes, parent: parent ?? undefined, status: "needsAction", ...(due != null && { due }) };
            data.writes.push(["add", title, parent, notes, previous, due]);
            data.tasks.push(task);
            return structuredClone(task);
        },
        edit: async (list, id, fields) => {
            data.writes.push(["edit", id, fields]);
            Object.assign(data.tasks.find(task => task.id === id), fields);
            return data.tasks.find(task => task.id === id);
        },
        setDone: async (list, id, done) => {
            data.writes.push(["done", id, done]);
            const task = data.tasks.find(task => task.id === id);
            task.status = done ? "completed" : "needsAction";
            return task;
        },
        delete: async (list, id) => {
            data.writes.push(["delete", id]);
            data.tasks = data.tasks.filter(task => task.id !== id && task.parent !== id);
        },
        move: async (list, id, { parent, previous } = {}) => {
            data.writes.push(["move", id, parent, previous]);
            const task = data.tasks.find(item => item.id === id);
            task.parent = parent ?? undefined;
            return task;
        },
    };
    const local = new LocalGoogleTasks(remote, "@default", path);
    return { local, remote, data };
}

describe("Persistent local task queue", () => {
    const stores = [];
    const files = [];
    const fixture = (path) => {
        const value = localFixture(path);
        stores.push(value.local);
        return value;
    };
    afterEach(async () => {
        for (const store of stores.splice(0)) store.cancel();
        for (const file of files.splice(0)) await unlink(file);
    });

    test("offline edits are durable before sync and replay in order with stable parent IDs", async () => {
        const path = join(tmpdir(), `gtasks-${crypto.randomUUID()}.sqlite`);
        files.push(path);
        const { local, remote, data } = fixture(path);
        const parent = await local.add("@default", "Parent", null, "Context");
        const child = await local.add("@default", "Child", parent.id, "Notes");
        await local.edit("@default", child.id, { title: "Edited child", notes: "Updated" });
        await local.setDone("@default", child.id, true);
        expect(data.writes).toEqual([]);
        expect((await local.list()).find(task => task.id === child.id)).toMatchObject({ title: "Edited child", parent: parent.id, status: "completed" });
        local.cancel();
        const reopened = new LocalGoogleTasks(remote, "@default", path);
        stores.push(reopened);
        expect(reopened.state.queue).toHaveLength(4);
        await reopened.syncOnce();
        expect(data.writes.map(write => write[0])).toEqual(["add", "add", "edit", "done"]);
        expect(data.writes[1][2]).toBe("server-0");
        expect(data.writes[2][1]).toBe("server-1");
        expect(reopened.state.queue).toHaveLength(0);
        expect((await reopened.list()).find(task => task.id === child.id)).toMatchObject({ parent: parent.id, title: "Edited child", status: "completed" });
    });

    test("due dates queue locally and sync without wiping other fields", async () => {
        const { local, data } = fixture();
        await local.syncOnce();
        await local.edit("@default", "existing", { due: "2026-09-14T00:00:00.000Z" });
        expect((await local.list())[0]).toMatchObject({ title: "Existing", due: "2026-09-14T00:00:00.000Z" });
        await local.syncOnce();
        expect(data.writes).toEqual([["edit", "existing", { due: "2026-09-14T00:00:00.000Z" }]]);
        const dated = await local.add("@default", "Dated", null, "", undefined, "2026-09-15T00:00:00.000Z");
        await local.syncOnce();
        expect(data.writes.at(-1)).toEqual(["add", "Dated", null, "", null, "2026-09-15T00:00:00.000Z"]);
        expect((await local.list()).find(task => task.id === dated.id).due).toBe("2026-09-15T00:00:00.000Z");
        expect(dated.id.startsWith("local:")).toBe(true);
        expect(formatId(dated.id, local.state.ids)).toBe("^server-1");
    });

    test("cut paste moves a task locally and syncs with previous sibling", async () => {
        const { local, data } = fixture();
        await local.syncOnce();
        const child = await local.add("@default", "Child", "existing");
        await local.move("@default", child.id, { parent: null, previous: "existing" });
        const listed = await local.list();
        expect(listed.find(task => task.id === child.id)).toMatchObject({ parent: undefined });
        expect(listed.sort((a, b) => (a.position ?? "").localeCompare(b.position ?? "")).map(task => task.id)).toEqual(["existing", child.id]);
        await local.syncOnce();
        expect(data.writes[1]).toEqual(["move", "server-0", null, "existing"]);
    });

    test("a second process cannot overwrite an open cache", () => {
        const path = join(tmpdir(), `gtasks-${crypto.randomUUID()}.sqlite`);
        files.push(path);
        const { remote } = fixture(path);
        expect(() => new LocalGoogleTasks(remote, "@default", path)).toThrow("another gtasks process");
    });

    test("failed durable writes leave the queue unchanged and never send to Google", async () => {
        const { local, data } = fixture();
        local.db.close();
        expect(() => local.add("@default", "Unsaved")).toThrow();
        expect(local.state.queue).toEqual([]);
        expect(data.writes).toEqual([]);
    });

    test("local changes made during a pull overlay the arriving server snapshot", async () => {
        const { local, remote } = fixture();
        await local.syncOnce();
        let release;
        remote.list = () => new Promise(resolve => { release = resolve; });
        const pull = local.pull();
        await Promise.resolve();
        await local.edit("@default", "existing", { title: "Local title", notes: "Local notes" });
        release([{ id: "existing", title: "Server title", status: "needsAction" }]);
        await pull;
        expect((await local.list())[0].title).toBe("Local title");
        expect(local.state.queue).toHaveLength(1);
    });

    test("edits queued during an upload remain pending after its acknowledgement", async () => {
        const { local, remote } = fixture();
        await local.syncOnce();
        const parent = await local.add("@default", "Parent");
        let release;
        remote.add = () => new Promise(resolve => { release = resolve; });
        const upload = local.push(structuredClone(local.state.queue[0]));
        await local.edit("@default", parent.id, { title: "New parent title", notes: "" });
        release({ id: "parent-on-server", title: "Parent" });
        await upload;
        expect(local.state.queue).toHaveLength(1);
        expect((await local.list()).find(task => task.id === parent.id).title).toBe("New parent title");
    });

    test("five consecutive failures pause sync and request reset without deleting local changes", async () => {
        const { local, data } = fixture();
        const task = await local.add("@default", "Offline task");
        data.offline = true;
        for (let index = 0; index < 5; index++) await local.syncOnce({ force: true });
        expect(local.state.failures).toBe(5);
        expect(local.state.paused).toBe(true);
        expect(local.state.askReset).toBe(true);
        expect((await local.list())[0].id).toBe(task.id);
        local.declineReset();
        expect(local.state.askReset).toBe(false);
        expect(local.state.queue).toHaveLength(1);
        await expect(local.resetFromServer()).rejects.toThrow("Offline");
        expect(local.state.queue).toHaveLength(1);
        data.offline = false;
        await local.resetFromServer();
        expect(local.state.queue).toEqual([]);
        expect((await local.list()).map(task => task.id)).toEqual(["existing"]);
    });

    test("retries respect backoff, and r-style retry resumes the preserved queue", async () => {
        const { local, data } = fixture();
        data.offline = true;
        await local.syncOnce();
        const deadline = local.state.nextRetryAt;
        await local.syncOnce();
        expect(local.state.failures).toBe(1);
        expect(local.state.nextRetryAt).toBe(deadline);
        await local.add("@default", "Offline task");
        data.offline = false;
        local.retry();
        await local.syncOnce();
        expect(local.state.queue).toHaveLength(0);
        expect(local.state.error).toBe("");
    });

    test("an uncertain insertion is never posted twice, even after reopening", async () => {
        const path = join(tmpdir(), `gtasks-${crypto.randomUUID()}.sqlite`);
        files.push(path);
        const { local, remote } = fixture(path);
        await local.syncOnce();
        let inserts = 0;
        remote.add = async () => { inserts++; throw new Error("Connection lost after sending"); };
        await local.add("@default", "Possibly saved");
        await local.syncOnce();
        expect(local.state.queue[0].started).toBe(true);
        local.cancel();
        const reopened = new LocalGoogleTasks(remote, "@default", path);
        stores.push(reopened);
        for (let index = 0; index < 4; index++) await reopened.syncOnce({ force: true });
        expect(inserts).toBe(1);
        expect(reopened.state.askReset).toBe(true);
    });

    test("delete is visible locally and a server-side missing task counts as synced", async () => {
        const { local, remote } = fixture();
        await local.syncOnce();
        await local.delete("@default", "existing");
        expect(await local.list()).toEqual([]);
        remote.delete = async () => { throw Object.assign(new Error("Missing"), { status: 404 }); };
        remote.list = async () => [];
        await local.syncOnce();
        expect(local.state.queue).toEqual([]);
        expect(local.state.error).toBe("");
    });

    test("the TUI opens its cache offline, saves locally, and requires confirmation before reset", async () => {
        const { local, data } = fixture();
        await local.syncOnce();
        data.offline = true;
        const input = new PassThrough();
        const output = new PassThrough();
        input.isTTY = output.isTTY = true;
        input.setRawMode = () => { };
        output.columns = 110;
        output.rows = 24;
        let screen = "";
        output.on("data", chunk => { screen += chunk; });
        const pending = runTasksTui(local, "@default", { input, output });
        await new Promise(resolve => setImmediate(resolve));
        expect(screen).toContain("Existing");
        input.write("aOffline title\x13");
        await new Promise(resolve => setImmediate(resolve));
        expect(local.state.queue).toHaveLength(1);
        expect(screen).toContain("Saved locally.");
        local.change(state => { state.paused = true; state.askReset = true; state.failures = 5; });
        await new Promise(resolve => setImmediate(resolve));
        expect(screen).toContain("Reset local cache? [y/N] Discard 1 queued changes");
        input.write("n");
        await new Promise(resolve => setImmediate(resolve));
        expect(local.state.askReset).toBe(false);
        expect(local.state.queue).toHaveLength(1);
        expect(data.writes).toEqual([]);
        input.write("q");
        await pending;
    });

    test("the first background load honors startup cd and a confirmed reset reloads the view", async () => {
        const { local } = fixture();
        const input = new PassThrough();
        const output = new PassThrough();
        input.isTTY = output.isTTY = true;
        input.setRawMode = () => { };
        output.columns = 110;
        output.rows = 24;
        let screen = "";
        output.on("data", chunk => { screen += chunk; });
        const pending = runTasksTui(local, "@default", { input, output, cd: "Existing" });
        await new Promise(resolve => setImmediate(resolve));
        await local.syncOnce({ force: true });
        await new Promise(resolve => setImmediate(resolve));
        expect(screen).toContain("/ Existing");
        await local.add("@default", "Discard me");
        local.change(state => { state.paused = true; state.askReset = true; });
        await new Promise(resolve => setImmediate(resolve));
        input.write("y");
        await new Promise(resolve => setImmediate(resolve));
        expect(local.state.queue).toEqual([]);
        expect(screen).toContain("Local cache reloaded from Google.");
        input.write("q");
        await pending;
    });

    test("TUI m prints raw Markdown", async () => {
        const { local } = fixture();
        await local.syncOnce();
        const input = new PassThrough();
        const output = new PassThrough();
        input.isTTY = output.isTTY = true;
        input.setRawMode = value => { input.isRaw = value; };
        output.columns = 110;
        output.rows = 24;
        let screen = "";
        output.on("data", chunk => { screen += chunk; });
        const pending = runTasksTui(local, "@default", { input, output });
        await new Promise(resolve => setImmediate(resolve));
        screen = "";
        input.write("m");
        await new Promise(resolve => setImmediate(resolve));
        expect(screen).toContain("- [ ] Existing");
        expect(screen).toContain("Press any key to return.");
        input.write("x");
        await new Promise(resolve => setImmediate(resolve));
        input.write("q");
        await pending;
    });
});

function mockClient(replies) {
    const calls = [];
    const api = new GoogleTasks({
        clientId: "client", clientSecret: "secret", refreshToken: "refresh",
        fetchImpl: async (url, options) => {
            calls.push({ url: new URL(url), ...options });
            const reply = replies.shift();
            if (!reply) throw new Error("Unexpected request");
            return reply;
        },
    });
    return { api, calls };
}
const json = (body, status = 200) => Response.json(body, { status });
const token = () => json({ access_token: "access", expires_in: 3600 });

describe("Google Tasks API", () => {
    test("refreshes once and loads every page including completed and hidden tasks", async () => {
        const { api, calls } = mockClient([token(), json({ items: [{ id: "one" }], nextPageToken: "page 2" }), json({ items: [{ id: "two", status: "completed", hidden: true }, { id: "deleted", deleted: true }] })]);
        expect((await api.list()).map(task => task.id)).toEqual(["one", "two"]);
        expect(calls).toHaveLength(3);
        expect(Object.fromEntries(calls[0].body)).toMatchObject({ grant_type: "refresh_token", client_id: "client", refresh_token: "refresh" });
        expect(calls[1].url.pathname).toBe("/tasks/v1/lists/%40default/tasks");
        expect(Object.fromEntries(calls[1].url.searchParams)).toMatchObject({ showCompleted: "true", showHidden: "true", maxResults: "100" });
        expect(calls[2].url.searchParams.get("pageToken")).toBe("page 2");
        expect(calls[1].headers.Authorization).toBe("Bearer access");
    });

    test("adds at root or under the current task, patches completion, and deletes", async () => {
        const { api, calls } = mockClient([token(), json({}), json({}), json({}), json({}), new Response(null, { status: 204 }), json({}), json({})]);
        await api.add("list/id", "Top");
        await api.add("list/id", "Child & 世界", "parent/id");
        await api.setDone("list/id", "task/id", true);
        await api.setDone("list/id", "task/id", false);
        await api.delete("list/id", "task/id");
        await api.add("list/id", "After", "parent/id", "", "prev/id");
        await api.move("list/id", "task/id", { parent: "parent/id", previous: "prev/id" });
        expect(calls[1].url.searchParams.has("parent")).toBe(false);
        expect(calls[2].url.searchParams.get("parent")).toBe("parent/id");
        expect(JSON.parse(calls[2].body)).toEqual({ title: "Child & 世界", notes: "" });
        expect(calls[3].method).toBe("PATCH");
        expect(JSON.parse(calls[3].body)).toEqual({ status: "completed" });
        expect(JSON.parse(calls[4].body)).toEqual({ status: "needsAction", completed: null });
        expect(calls[5].url.pathname).toEndWith("/lists/list%2Fid/tasks/task%2Fid");
        expect(calls[5].method).toBe("DELETE");
        expect(calls[6].url.searchParams.get("previous")).toBe("prev/id");
        expect(calls[7].method).toBe("POST");
        expect(calls[7].url.pathname).toEndWith("/lists/list%2Fid/tasks/task%2Fid/move");
        expect(Object.fromEntries(calls[7].url.searchParams)).toMatchObject({ parent: "parent/id", previous: "prev/id" });
    });

    test("retries an unauthorized request only once with a fresh token", async () => {
        const { api, calls } = mockClient([token(), json({}, 401), token(), json({ error: { message: "Denied" } }, 401)]);
        await expect(api.list()).rejects.toThrow("Denied");
        expect(calls).toHaveLength(4);
    });

    test("adding and editing send title and description without changing other fields", async () => {
        const { api, calls } = mockClient([token(), json({}), json({}), json({}), json({})]);
        await api.add("@default", "Title", "parent", "First\nSecond");
        await api.edit("@default", "task", { title: "Edited", notes: "" });
        await api.add("@default", "Dated", null, "", undefined, "2026-09-14T00:00:00.000Z");
        await api.edit("@default", "task", { due: null });
        expect(JSON.parse(calls[1].body)).toEqual({ title: "Title", notes: "First\nSecond" });
        expect(calls[2].method).toBe("PATCH");
        expect(JSON.parse(calls[2].body)).toEqual({ title: "Edited", notes: "" });
        expect(JSON.parse(calls[3].body)).toEqual({ title: "Dated", notes: "", due: "2026-09-14T00:00:00.000Z" });
        expect(JSON.parse(calls[4].body)).toEqual({ due: null });
    });

    test("does not retry writes on server errors and gives an auth recovery hint", async () => {
        const { api, calls } = mockClient([token(), json({ error: { message: "Unavailable" } }, 503)]);
        await expect(api.add("@default", "Title")).rejects.toThrow("503");
        expect(calls).toHaveLength(2);
        const denied = mockClient([json({ error: "invalid_grant" }, 400)]);
        await expect(denied.api.list()).rejects.toThrow("gtasks auth");
    });
});

const tasks = [
    { id: "b", title: "Other", position: "002", status: "completed" },
    { id: "p", title: "Project", position: "001" },
    { id: "c", title: "Child", parent: "p", notes: "Find ME", position: "001" },
    { id: "g", title: "Grandchild", parent: "c" },
];
function fixture() {
    const calls = [];
    const api = {
        getList: async () => ({ title: "My tasks" }),
        list: async () => tasks.map(task => ({ ...task })),
        add: async (...args) => { calls.push(["add", ...args]); return { id: `new-${calls.length}` }; },
        edit: async (...args) => { calls.push(["edit", ...args]); },
        delete: async (...args) => { calls.push(["delete", ...args]); },
        setDone: async (...args) => { calls.push(["setDone", ...args]); },
        move: async (...args) => { calls.push(["move", ...args]); },
    };
    const view = new TasksView(api);
    view.tasks = tasks.map(task => ({ ...task }));
    return { view, calls, api };
}
const press = (view, text, name = text) => view.key(text, { name });
const save = view => view.saveInput(view.input);

describe("Task navigation and actions", () => {
    test("single input keeps the title on line one and trims only blank description edges", () => {
        expect(parseTaskInput(" Title \r\n \r\n\r\n  Indented\r\n\r\nLast  \r\n\t\r\n")).toEqual({ title: "Title", notes: "  Indented\n\nLast  " });
        expect(parseTaskInput("Title\n\n  \n")).toEqual({ title: "Title", notes: "" });
        expect(parseTaskInput("\nDescription").title).toBe("");
    });

    test("due dates parse to UTC midnight and render as wiki dates", () => {
        const now = () => new Date("2026-09-12T15:04:00");
        expect(parseDue("2026-09-14")).toBe("2026-09-14T00:00:00.000Z");
        expect(parseDue("[[2026-09-14]]")).toBe("2026-09-14T00:00:00.000Z");
        expect(parseDue("2026-09-14T15:30:00")).toBe("2026-09-14T00:00:00.000Z");
        expect(parseDue("today", now)).toBe("2026-09-12T00:00:00.000Z");
        expect(parseDue("tomorrow", now)).toBe("2026-09-13T00:00:00.000Z");
        expect(parseDue("")).toBeNull();
        expect(parseDue(undefined)).toBeUndefined();
        expect(() => parseDue("2026-02-31")).toThrow("Invalid due date");
        expect(() => parseDue("nope")).toThrow("Invalid due date");
        expect(formatDue("2026-09-14T00:00:00.000Z")).toBe("[[2026-09-14]]");
        expect(formatDue(null)).toBe("");
    });

    test("completed tasks are hidden by default and . toggles them without losing unfinished children", async () => {
        const { view, api } = fixture();
        expect(view.rows.some(task => task.status === "completed")).toBe(false);
        press(view, ".");
        expect(view.rows.map(task => task.id)).toContain("b");
        view.selected = view.rows.length - 1;
        press(view, ".");
        expect(view.task.id).toBe("c");
        view.tasks.find(task => task.id === "p").status = "completed";
        expect(view.rows.map(task => [task.id, task.depth])).toEqual([["c", 0], ["g", 1]]);
        api.list = async () => [{ id: "last", title: "Last", status: "completed" }];
        await view.refresh();
        expect(view.rows).toEqual([]);
        expect(view.selected).toBe(0);
        expect(renderTasks(view)).toContain("Undone only");
    });

    test("startup cd enters a single title match and filters at root for multiple or missing matches", () => {
        const { view } = fixture();
        view.startAt("pRoJeCt");
        expect(view.parent).toBe("p");
        expect(view.search).toBe("");
        expect(view.rows.map(task => task.id)).toEqual(["p", "c"]);
        const ambiguous = fixture().view;
        ambiguous.tasks.push({ id: "p2", title: "Project Two" });
        ambiguous.startAt("Project");
        expect(ambiguous.parent).toBeNull();
        expect(ambiguous.search).toBe("Project");
        expect(ambiguous.rows.map(task => task.id)).toEqual(["p2", "p"]);
        const missing = fixture().view;
        missing.startAt("absent");
        expect(missing.parent).toBeNull();
        expect(missing.search).toBe("absent");
        expect(missing.rows).toEqual([]);
    });

    test("shows the subtree and keeps matching tasks' ancestors while searching", () => {
        const { view } = fixture();
        expect(view.rows.map(task => task.id)).toEqual(["p", "c"]);
        expect(view.rows.map(task => task.depth)).toEqual([0, 1]);
        view.search = "project";
        view.enter();
        expect(view.rows.map(task => task.id)).toEqual(["p", "c"]);
        expect(visibleTasks(tasks, "p", "find me").map(task => task.id)).toEqual(["c"]);
        expect(visibleTasks(tasks, "p", "Grandchild").map(task => task.id)).toEqual(["c", "g"]);
        expect(visibleTasks(tasks, "p", "Other")).toEqual([]);
        view.back();
        expect(view.search).toBe("project");
        expect(view.task.id).toBe("p");
    });

    test("focused heading is selectable and a/o/O insert children at the ends", async () => {
        const { view, calls } = fixture();
        view.enter();
        expect(view.focused).toBe(true);
        expect(renderTasks(view)).toContain("> - [ ] Project");
        press(view, "a");
        view.input = "Appended";
        await save(view);
        expect(calls).toEqual([["add", "@default", "Appended", "p", "", "c"]]);
        calls.length = 0;
        press(view, "O");
        view.input = "Prepended";
        await save(view);
        expect(calls).toEqual([["add", "@default", "Prepended", "p", "", null]]);
        view.tasks.find(task => task.id === "c").webViewLink = "https://example";
        press(view, "j");
        press(view, "y");
        press(view, "l");
        expect(view.parent).toBe("c");
        await press(view, "p");
        expect(view.message).toContain("Cannot paste into a child task.");
    });

    test("adds under the current parent and does not treat editing keys as actions", async () => {
        const { view, calls } = fixture();
        view.enter();
        press(view, "a");
        view.input = "a q/d 世界";
        expect(calls).toHaveLength(0);
        await save(view);
        expect(calls).toEqual([["add", "@default", "a q/d 世界", "p", "", "c"]]);
        expect(view.mode).toBe("browse");
    });

    test("o and O add after or before the selected task", async () => {
        const { view, calls } = fixture();
        press(view, "o");
        view.input = "After";
        await save(view);
        expect(calls).toEqual([["add", "@default", "After", null, "", "p"]]);
        calls.length = 0;
        press(view, "O");
        view.input = "Before";
        await save(view);
        expect(calls).toEqual([["add", "@default", "Before", null, "", null]]);
        calls.length = 0;
        press(view, "j");
        press(view, "o");
        view.input = "After child";
        await save(view);
        expect(calls).toEqual([["add", "@default", "After child", "p", "", "c"]]);
    });

    test("search applies live, Escape restores it, and browse Escape clears it", () => {
        const { view } = fixture();
        press(view, ".");
        press(view, "j");
        expect(view.task.id).toBe("c");
        press(view, "/");
        for (const char of "Other") press(view, char);
        expect(view.rows.map(task => task.id)).toEqual(["b"]);
        press(view, "", "escape");
        expect(view.rows).toHaveLength(3);
        expect(view.task.id).toBe("c");
        press(view, "/");
        press(view, "Project");
        press(view, "\r", "return");
        expect(view.rows).toHaveLength(1);
        expect(view.task.id).toBe("p");
        press(view, "", "escape");
        expect(view.search).toBe("");
        expect(view.task.id).toBe("p");
    });

    test("confirms deletion and sends explicit done and undone statuses", async () => {
        const { view, calls } = fixture();
        press(view, "D");
        press(view, "n");
        expect(calls).toHaveLength(0);
        press(view, "D");
        await press(view, "y");
        await press(view, "x");
        await press(view, "u");
        expect(calls).toEqual([["delete", "@default", "p"], ["setDone", "@default", "p", true], ["setDone", "@default", "p", false]]);
    });

    test("yanks a subtree, pastes after or before, and cut moves without deleting", async () => {
        const { view, calls } = fixture();
        press(view, "y");
        expect(renderTasks(view)).toContain("Y - [ ] Project");
        expect(renderTasks(view)).toContain("y   - [ ] Child");
        await press(view, "p");
        expect(calls).toEqual([
            ["add", "@default", "Project", null, "", "p"],
            ["add", "@default", "Child", null, "Find ME", "new-1"],
            ["add", "@default", "Grandchild", null, "", "new-2"],
        ]);
        calls.length = 0;
        await press(view, "P");
        expect(calls[0]).toEqual(["add", "@default", "Project", null, "", null]);
        calls.length = 0;
        press(view, "j");
        press(view, "d");
        expect(renderTasks(view)).toContain("D   - [ ] Child");
        expect(view.tasks.some(task => task.id === "c")).toBe(true);
        expect(calls).toEqual([]);
        press(view, "k");
        await press(view, "p");
        expect(calls).toEqual([
            ["move", "@default", "c", { parent: null, previous: "p" }],
            ["move", "@default", "g", { parent: null, previous: "c" }],
        ]);
        calls.length = 0;
        press(view, "d");
        press(view, "j");
        await press(view, "p");
        expect(view.message).toContain("subtree");
        expect(calls).toEqual([]);
        const empty = fixture().view;
        press(empty, "p");
        expect(empty.message).toContain("Nothing to paste");
        press(view, "y");
        press(view, "", "escape");
        expect(view.clipboard).toBeNull();
        expect(renderTasks(view)).not.toContain("Y - [ ] Project");
    });

    test("yank paste copies due dates", async () => {
        const { view, calls } = fixture();
        view.tasks.find(task => task.id === "p").due = "2026-09-14T00:00:00.000Z";
        press(view, "y");
        await press(view, "p");
        expect(calls[0]).toEqual(["add", "@default", "Project", null, "", "p", "2026-09-14T00:00:00.000Z"]);
    });

    test("s sets or clears due dates and lists render wiki dates", async () => {
        const { view, calls } = fixture();
        view.tasks.find(task => task.id === "p").due = "2026-09-14T00:00:00.000Z";
        expect(renderTasks(view)).toContain("Project  [[2026-09-14]]");
        press(view, ",");
        expect(renderTasks(view)).toContain("Project  [[2026-09-14]]  ^p");
        press(view, ",");
        view.enter();
        expect(renderTasks(view)).toContain("> - [ ] Project  [[2026-09-14]]");
        expect(renderTasks(view)).toContain("  [[2026-09-14]]  ^p");
        view.back();
        press(view, "s");
        expect(view.mode).toBe("due");
        expect(view.input).toBe("2026-09-14");
        view.input = "2026-09-15";
        await press(view, "\r", "return");
        expect(calls).toEqual([["edit", "@default", "p", { due: "2026-09-15T00:00:00.000Z" }]]);
        calls.length = 0;
        view.tasks.find(task => task.id === "p").due = "2026-09-15T00:00:00.000Z";
        press(view, "s");
        view.input = "";
        await press(view, "\r", "return");
        expect(calls).toEqual([["edit", "@default", "p", { due: null }]]);
        press(view, "s");
        view.input = "nope";
        press(view, "\r", "return");
        expect(view.mode).toBe("due");
        expect(view.message).toContain("Invalid due date");
        press(view, "", "escape");
        expect(view.mode).toBe("browse");
    });

    test(", toggles ^id on task rows and prefers synced Google IDs", () => {
        const { view } = fixture();
        expect(renderTasks(view)).toContain("  ^@default");
        expect(renderTasks(view)).not.toContain("^p");
        press(view, ",");
        expect(renderTasks(view)).toContain("- [ ] Project  ^p");
        view.api.state = { ids: { p: "google-p" } };
        expect(renderTasks(view)).toContain("- [ ] Project  ^google-p");
        press(view, ",");
        expect(renderTasks(view)).not.toContain("- [ ] Project  ^google-p");
    });

    test("gx opens the selected task in the browser", async () => {
        const { view } = fixture();
        const opened = [];
        view.openUrl = async url => { opened.push(url); };
        press(view, "g");
        await press(view, "x");
        expect(view.message).toContain("No web link");
        expect(opened).toEqual([]);
        view.tasks.find(task => task.id === "p").webViewLink = "https://tasks.google.com/task/p";
        press(view, "g");
        await press(view, "x");
        expect(opened).toEqual(["https://tasks.google.com/task/p"]);
        expect(view.message).toBe("Opened.");
        press(view, "g");
        press(view, "g");
        expect(view.selected).toBe(0);
    });

    test("V selects a range so yank, cut, and delete apply to all selected roots", async () => {
        const { view, calls } = fixture();
        view.tasks.push({ id: "c2", title: "Second child", parent: "p", position: "002" });
        press(view, "j");
        press(view, "V");
        press(view, "j");
        expect(renderTasks(view)).toContain("*   - [ ] Child");
        expect(renderTasks(view)).toContain(">   - [ ] Second child");
        press(view, "y");
        expect(view.visual).toBeNull();
        expect(view.clipboard.roots).toEqual(["c", "c2"]);
        press(view, "", "escape");
        expect(view.clipboard).toBeNull();
        press(view, "k");
        press(view, "V");
        press(view, "j");
        press(view, "d");
        expect(view.clipboard.roots).toEqual(["c", "c2"]);
        press(view, "", "escape");
        expect(view.visual).toBeNull();
        expect(view.clipboard).toBeNull();
        press(view, "k");
        press(view, "V");
        press(view, "G");
        press(view, "D");
        expect(view.deleteTasks.map(task => task.id)).toEqual(["c", "c2"]);
        await press(view, "y");
        expect(calls.filter(call => call[0] === "delete")).toEqual([["delete", "@default", "c"], ["delete", "@default", "c2"]]);
    });

    test("renders indented Markdown tasks and applies actions to a selected nested task", async () => {
        const { view, calls } = fixture();
        view.tasks.push({ id: "c2", title: "Second child", parent: "p", position: "002" });
        const screen = renderTasks(view);
        expect(screen).toContain("    - [ ] Child");
        expect(screen).not.toContain("Grandchild");
        expect(screen).toContain("    - [ ] Second child");
        press(view, "j");
        expect(view.task.id).toBe("c");
        await press(view, "x");
        expect(calls).toEqual([["setDone", "@default", "c", true]]);
        view.enter();
        expect(view.path.map(task => task.id)).toEqual(["p", "c"]);
        expect(view.rows.map(task => task.id)).toEqual(["c", "g"]);
        expect(renderTasks(view)).toContain("[ ] Grandchild");
        view.back();
        expect(view.parent).toBe("p");
        view.back();
        expect(view.task.id).toBe("c");
    });

    test("failed writes keep the add input and refresh failures report that the write succeeded", async () => {
        const { view, api } = fixture();
        press(view, "a");
        view.input = "New";
        api.add = async () => { throw new Error("Offline"); };
        await expect(save(view)).rejects.toThrow("Offline");
        expect(view.mode).toBe("add");
        expect(view.input).toBe("New");
        api.add = async () => ({});
        api.list = async () => { throw new Error("Offline"); };
        await save(view);
        expect(view.mode).toBe("browse");
        expect(view.message).toContain("Saved, but refresh failed");
    });

    test("refresh recovers when the open parent disappears", async () => {
        const { view, api } = fixture();
        view.enter();
        api.list = async () => [];
        await view.refresh();
        expect(view.parent).toBeNull();
        expect(view.selected).toBe(0);
    });

    test("rendering strips terminal controls, respects width, and scrolls to selection", () => {
        const { view } = fixture();
        view.tasks = Array.from({ length: 40 }, (_, i) => ({ id: `${i}`, title: `Task ${i} 世界\x1b[2J\nBAD`, position: `${i}`.padStart(3, "0") }));
        view.selected = 39;
        const screen = renderTasks(view, 40, 16);
        expect(screen).toContain("> - [ ] Task 39");
        expect(screen).not.toContain("\x1b");
        expect(screen.split("\r\n").every(line => Bun.stringWidth(line) <= 39)).toBe(true);
        expect(screen.split("\r\n").length).toBeLessThanOrEqual(15);
    });

    test("descriptions sit beneath titles and scrolling keeps the selected task and footer visible", () => {
        const { view } = fixture();
        view.tasks.find(task => task.id === "p").notes = "Project details\nSecond line";
        const screen = renderTasks(view, 100, 24);
        expect(screen).toContain("Project  (1 children)\r\n        Project details\r\n        Second line");
        expect(screen).toContain("    - [ ] Child  (1 children)\r\n          Find ME");
        view.tasks[1].notes = "Long description\n".repeat(30);
        press(view, ".");
        view.selected = view.rows.length - 1;
        const scrolled = renderTasks(view, 100, 16);
        expect(scrolled).toContain("> - [x] Other");
        expect(scrolled).toContain("q quit");
        expect(scrolled.split("\r\n").length).toBeLessThanOrEqual(15);
    });

    test("entering a task shows its current description above its children, including empty parents", () => {
        const { view } = fixture();
        expect(renderTasks(view)).toContain("/ Default list\r\n  ^@default");
        view.tasks.find(task => task.id === "p").notes = "Project context\nSecond line";
        view.enter();
        expect(renderTasks(view)).toContain("/ Project\r\n  ^p");
        expect(renderTasks(view)).toContain("> - [ ] Project");
        expect(renderTasks(view)).toContain("Project context");
        expect(renderTasks(view)).toContain("[ ] Child");
        view.tasks.find(task => task.id === "p").notes = "Updated context";
        expect(renderTasks(view)).toContain("Updated context");
        view.tasks = view.tasks.filter(task => !task.parent);
        expect(renderTasks(view)).toContain("Updated context");
        expect(renderTasks(view)).toContain("[ ] Project");
        view.back();
        expect(renderTasks(view)).toContain("/ Default list\r\n  ^@default");
        expect(renderTasks(view)).not.toContain("/ Project\r\n  ^p");
    });

    test("long focused descriptions leave room for selected children and controls", () => {
        const { view } = fixture();
        view.tasks.find(task => task.id === "p").notes = "Context\n".repeat(40);
        view.enter();
        const screen = renderTasks(view, 100, 16);
        expect(screen).toContain("> - [ ] Project");
        expect(screen).toContain("q quit");
        expect(screen.split("\r\n").length).toBeLessThanOrEqual(15);
    });

    test("markdown dump uses the focused parent, search filter, and completed toggle", () => {
        const { view } = fixture();
        expect(view.markdown()).toContain("- [ ] Project\n  - [ ] Child");
        expect(view.markdown()).not.toContain("Other");
        view.tasks.find(task => task.id === "p").notes = "Project details";
        view.tasks.find(task => task.id === "c").notes = "";
        view.enter();
        expect(view.markdown()).toBe("# Project\n\nProject details\n\n- [ ] Child\n  - [ ] Grandchild");
        view.search = "grand";
        expect(viewMarkdown(view.tasks, view.parent, view.search, view.showCompleted)).toContain("- [ ] Child\n  - [ ] Grandchild");
        expect(view.markdown()).not.toContain("Other");
        press(view, ".");
        view.back();
        expect(view.markdown()).toContain("- [x] Other");
    });

    test("Markdown listing preserves nesting and completion", () => {
        expect(renderMarkdown(tasks)).toContain("- [ ] Project\n  - [ ] Child");
        expect(renderMarkdown(tasks)).toContain("- [x] Other");
        expect(renderMarkdown([{ id: "a", title: "Work", due: "2026-09-14T00:00:00.000Z" }])).toContain("- [ ] Work [[2026-09-14]]");
        expect(viewMarkdown([{ id: "p", title: "Project", due: "2026-09-14T00:00:00.000Z", notes: "Context" }], "p")).toBe("# Project [[2026-09-14]]\n\nContext");
    });

    test("Markdown listing keeps title and description markup", () => {
        const md = renderMarkdown([
            { id: "p", title: "Use **bold** and [link](https://ex)", notes: "A **note**\n\n- nested" },
            { id: "c", parent: "p", title: "*child*" },
        ]);
        expect(md).toContain("- [ ] Use **bold** and [link](https://ex)");
        expect(md).toContain("A **note**");
        expect(md).toContain("- nested");
        expect(md).toContain("- [ ] *child*");
        const html = Bun.markdown.html(md);
        expect(html).toContain("<strong>bold</strong>");
        expect(html).toContain("<em>child</em>");
    });
});

describe("Credentials and terminal lifecycle", () => {
    let previousTerm;
    beforeEach(() => {
        previousTerm = process.env.TERM;
        process.env.TERM = "xterm-256color";
    });
    afterEach(() => {
        if (previousTerm === undefined) delete process.env.TERM;
        else process.env.TERM = previousTerm;
    });
    test("readline edits a prefilled multiline draft using native cursor and word deletion keys", async () => {
        const input = new PassThrough();
        const output = new PassThrough();
        output.columns = 80;
        output.isTTY = true;
        output.on("data", () => { });
        const pending = readTaskInput("Title\nDescription words", { input, output });
        input.emit("keypress", "", { ctrl: true, name: "a" });
        input.emit("keypress", "New ", {});
        input.emit("keypress", "", { ctrl: true, name: "e" });
        input.emit("keypress", "", { ctrl: true, name: "w" });
        input.emit("keypress", "text", {});
        input.emit("keypress", "\r", { name: "return" });
        input.emit("keypress", "世界", {});
        input.emit("keypress", "", { ctrl: true, name: "s" });
        expect(await pending).toBe("New Title\nDescription text\n世界");
        expect(input.listenerCount("keypress")).toBe(0);
    });

    test.each([
        ["Title\nNotes", ["up"], "Title!\nNotes"],
        ["Long title\nx\n\nNotes", ["up", "up", "up"], "Long !title\nx\n\nNotes"],
        ["Title\nx\nNotes", ["up", "up", "down", "down"], "Title\nx\nNotes!"],
        ["Title\nNotes", ["down"], "Title\nNotes!"],
        ["Title", ["up", "down"], "Title!"],
        ["A😀BC\n123", ["up"], "A😀B!C\n123"],
        ["\nNotes", ["up", "up"], "!\nNotes"],
    ])("readline Up/Down moves within a multiline draft: %s", async (initial, keys, expected) => {
        const input = new PassThrough();
        const output = new PassThrough();
        output.columns = 80;
        output.isTTY = true;
        output.on("data", () => { });
        const pending = readTaskInput(initial, { input, output });
        for (const name of keys) input.emit("keypress", "", { name });
        input.emit("keypress", "!", {});
        input.emit("keypress", "", { ctrl: true, name: "s" });
        expect(await pending).toBe(expected);
        expect(input.listenerCount("keypress")).toBe(0);
    });

    test("readline cancellation and abort leave no input listeners", async () => {
        for (const cancel of ["escape", "ctrl-c", "abort"]) {
            const input = new PassThrough();
            const output = new PassThrough();
            output.on("data", () => { });
            const controller = new AbortController();
            const pending = readTaskInput("Title\nNotes", { input, output, signal: controller.signal });
            if (cancel === "abort") controller.abort();
            else input.emit("keypress", "", cancel === "escape" ? { name: "escape" } : { name: "c", ctrl: true });
            expect(await pending).toBeNull();
            expect(input.listenerCount("keypress")).toBe(0);
        }
    });

    test("editing saves both fields and keeps failed drafts for retry", async () => {
        const { view, api, calls } = fixture();
        view.selected = 1;
        press(view, "e");
        expect(view.input).toBe("Child\nFind ME");
        await view.saveInput("Edited\n\nDescription\n\n");
        expect(calls).toEqual([["edit", "@default", "c", { title: "Edited", notes: "Description" }]]);
        press(view, "e");
        expect(() => view.saveInput("\nOnly notes")).toThrow("first line");
        api.edit = async () => { throw new Error("Offline"); };
        await expect(view.saveInput("Retry title\nNotes")).rejects.toThrow("Offline");
        expect(view.input).toBe("Retry title\nNotes");
        expect(view.mode).toBe("edit");
    });

    test.each([[], ["--google-tasks"]])("credential importer seeds Google credentials with args %j", async (...args) => {
        const requested = [];
        const values = new Map([["google-tasks-client-id", "client"], ["google-tasks-refresh-token", "saved-refresh"]]);
        await importSecrets(args, {
            readEntry: async name => {
                requested.push(name);
                return {
                    password: "secret", fields: new Map([
                        ["export_as", "GWS_CLIENT_SECRET"], ["GWS_CLIENT_ID", "client"],
                        ["OPENAI_BASE_URL", "https://example.com"], ["OPENAI_DEFAULT_MODEL", "model"],
                        ["key", "user"], ["agent", "agent"], ["personal", "personal"], ["desktop-notification", "desktop"],
                    ])
                };
            },
            store: {
                get: async ({ name }) => values.get(name),
                set: async ({ name, value }) => { values.set(name, value); },
                delete: async ({ name }) => values.delete(name),
            },
        });
        expect(requested).toContain("key/cloud.google.com/gwscli");
        expect(requested).toHaveLength(args.length ? 1 : 4);
        expect(values.get("google-tasks-client-id")).toBe("client");
        expect(values.get("google-tasks-client-secret")).toBe("secret");
        expect(values.get("google-tasks-refresh-token")).toBe("saved-refresh");
    });

    test("the suggested gopass entry works with fpdotenv and key store import", () => {
        const entry = { password: "secret", fields: new Map([["export_as", "GWS_CLIENT_SECRET"], ["GWS_CLIENT_ID", "client"]]) };
        expect(googleTasksSecrets(entry)).toEqual([["google-tasks-client-id", "client"], ["google-tasks-client-secret", "secret"]]);
        expect(gopassToEnv(entry)).toBe("GWS_CLIENT_SECRET='secret'\nGWS_CLIENT_ID='client'\n");
        expect(() => googleTasksSecrets({ password: "secret", fields: new Map() })).toThrow("GWS_CLIENT_ID");
    });

    test("OAuth request uses random state and PKCE", () => {
        const request = createAuthorizationRequest("client", "http://127.0.0.1:1234/");
        expect(request.url.searchParams.get("state")).toBe(request.state);
        expect(request.url.searchParams.get("code_challenge")).toBe(createHash("sha256").update(request.verifier).digest("base64url"));
        expect(request.url.searchParams.get("access_type")).toBe("offline");
        expect(createAuthorizationRequest("client", "http://127.0.0.1:1234/").state).not.toBe(request.state);
    });

    test("loopback callback rejects wrong state and handles denied consent", async () => {
        let callback;
        let ready;
        const urlReady = new Promise(resolve => { ready = resolve; });
        const pending = authorize({ clientId: "test", clientSecret: "test" }, { timeoutMs: 3000, onUrl: url => { callback = new URL(url); ready(); } });
        const rejection = pending.catch(error => error);
        await urlReady;
        const redirect = new URL(callback.searchParams.get("redirect_uri"));
        redirect.search = new URLSearchParams({ state: "wrong", error: "access_denied" });
        expect((await fetch(redirect, { signal: AbortSignal.timeout(2000) })).status).toBe(400);
        redirect.searchParams.set("state", callback.searchParams.get("state"));
        expect((await fetch(redirect, { signal: AbortSignal.timeout(2000) })).status).toBe(200);
        expect((await rejection).message).toContain("declined");
        await expect(fetch(redirect, { signal: AbortSignal.timeout(2000) })).rejects.toThrow();
    });

    test("TUI handles a chunk of typed text and restores terminal state on quit", async () => {
        const { api, calls } = fixture();
        const input = new PassThrough();
        const output = new PassThrough();
        input.isTTY = output.isTTY = true;
        input.isRaw = false;
        const modes = [];
        input.setRawMode = value => { input.isRaw = value; modes.push(value); };
        output.columns = 100;
        output.rows = 24;
        let screen = "";
        output.on("data", chunk => { screen += chunk; });
        const pending = runTasksTui(api, "@default", { input, output });
        await new Promise(resolve => setImmediate(resolve));
        input.write("a\x1b[200~Hello world\r\n\r\nNotes\r\n\x1b[201~\x13");
        await new Promise(resolve => setImmediate(resolve));
        input.write("q");
        await pending;
        expect(calls).toEqual([["add", "@default", "Hello world", null, "Notes"]]);
        expect(modes).toEqual([true, false]);
        expect(input.listenerCount("keypress")).toBe(0);
        expect(screen).toContain("\x1b[?1049h");
        expect(screen).toEndWith("\x1b[?25h\x1b[?1049l");
    });
});
