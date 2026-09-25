#!/usr/bin/env bun

import { parseArgs, stripVTControlCharacters } from "node:util";
import { randomBytes, createHash } from "node:crypto";
import { createInterface, emitKeypressEvents } from "node:readline";
import { secrets, $ } from "bun";
import { PassThrough } from "node:stream";
import { Database } from "bun:sqlite";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { homedir, hostname, tmpdir } from "node:os";
import { SERVICE_NAME, getSecret } from "./lib/secrets.js";
import { writeClipboard } from "./lib/io.js";

const API = "https://tasks.googleapis.com/tasks/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export async function exchangeToken(params, fetchImpl = fetch, signal = AbortSignal.timeout(30_000)) {
    const response = await fetchImpl(TOKEN_URL, {
        method: "POST",
        body: new URLSearchParams(params),
        signal,
    });
    const data = await response.json();
    if (!response.ok) {
        const hint = data.error === "invalid_grant" ? " Run gtasks auth to sign in again." : "";
        throw new Error(`Google OAuth failed (${response.status}: ${data.error ?? "unknown error"}).${hint}`);
    }
    if (!data.access_token) throw new Error("Google OAuth returned no access token.");
    return data;
}

export class GoogleTasks {
    constructor({ clientId, clientSecret, refreshToken, saveRefreshToken, fetchImpl = fetch }) {
        Object.assign(this, { clientId, clientSecret, refreshToken, saveRefreshToken, fetchImpl });
        this.expiresAt = 0;
        this.abortController = new AbortController();
    }

    cancel() { this.abortController.abort(); }

    signal() { return AbortSignal.any([this.abortController.signal, AbortSignal.timeout(30_000)]); }

    async token() {
        if (this.accessToken && Date.now() < this.expiresAt) return this.accessToken;
        const data = await exchangeToken({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: "refresh_token",
        }, this.fetchImpl, this.signal());
        if (data.refresh_token) {
            await this.saveRefreshToken?.(data.refresh_token);
            this.refreshToken = data.refresh_token;
        }
        this.accessToken = data.access_token;
        this.expiresAt = Date.now() + Math.max(0, (data.expires_in ?? 3600) - 60) * 1000;
        return this.accessToken;
    }

    async request(path, { method = "GET", body, query = {} } = {}) {
        const url = new URL(`${API}${path}`);
        for (const [key, value] of Object.entries(query)) {
            if (value != null) url.searchParams.set(key, value);
        }
        for (let attempt = 0; attempt < 2; attempt++) {
            const response = await this.fetchImpl(url, {
                method,
                headers: { Authorization: `Bearer ${await this.token()}`, "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: this.signal(),
            });
            if (response.status === 401 && attempt === 0) {
                this.expiresAt = 0;
                continue;
            }
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw Object.assign(new Error(`Google Tasks (${response.status}): ${data.error?.message ?? response.statusText}`), { status: response.status });
            }
            return response.status === 204 ? null : response.json();
        }
    }

    getList(list = "@default") {
        return this.request(`/users/@me/lists/${encodeURIComponent(list)}`);
    }

    async lists() {
        const lists = [];
        let pageToken;
        do {
            const data = await this.request("/users/@me/lists", { query: { maxResults: 1000, pageToken } });
            lists.push(...(data.items ?? []));
            pageToken = data.nextPageToken;
        } while (pageToken);
        return lists;
    }

    async list(list = "@default") {
        const tasks = [];
        let pageToken;
        do {
            const data = await this.request(`/lists/${encodeURIComponent(list)}/tasks`, {
                query: { maxResults: 100, showCompleted: true, showHidden: true, showDeleted: false, showAssigned: true, pageToken },
            });
            tasks.push(...(data.items ?? []).filter(task => !task.deleted));
            pageToken = data.nextPageToken;
        } while (pageToken);
        return tasks;
    }

    add(list, title, parent = null, notes = "", previous, due) {
        return this.request(`/lists/${encodeURIComponent(list)}/tasks`, {
            method: "POST", body: { title, notes, ...(due != null && { due }) }, query: { parent, previous },
        });
    }

    edit(list, task, fields) {
        return this.request(`/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}`, {
            method: "PATCH", body: fields,
        });
    }

    setDone(list, task, done) {
        return this.request(`/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}`, {
            method: "PATCH", body: done ? { status: "completed" } : { status: "needsAction", completed: null },
        });
    }

    delete(list, task) {
        return this.request(`/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}`, { method: "DELETE" });
    }

    move(list, task, { parent = null, previous = null } = {}) {
        return this.request(`/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}/move`, {
            method: "POST", query: { parent, previous },
        });
    }
}

function siblingTasks(tasks, parent) {
    return tasks.filter(task => !task.deleted && (task.parent ?? null) === (parent ?? null))
        .sort((a, b) => (a.position ?? "").localeCompare(b.position ?? ""));
}

function subtreeIds(tasks, roots) {
    const ids = new Set(roots);
    let size;
    do {
        size = ids.size;
        for (const task of tasks) if (ids.has(task.parent)) ids.add(task.id);
    } while (size !== ids.size);
    return ids;
}

function flattenTasks(items, roots) {
    const childrenOf = id => items.filter(task => (task.parent ?? null) === id)
        .sort((a, b) => (a.position ?? "").localeCompare(b.position ?? ""));
    const byId = new Map(items.map(task => [task.id, task]));
    const out = [];
    const walk = id => {
        const task = byId.get(id);
        if (task) out.push(task);
        for (const child of childrenOf(id)) walk(child.id);
    };
    for (const root of roots) walk(root);
    return out;
}

function positionBetween(prev, next) {
    if (next == null) return `${prev ?? ""}n`;
    if (!prev) {
        const code = next.charCodeAt(0);
        return code > 1 ? `${String.fromCharCode(code - 1)}n` : "\x01";
    }
    if (prev.localeCompare(next) >= 0) return `${prev}n`;
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
    const pc = prev.charCodeAt(i);
    const nc = next.charCodeAt(i);
    if (pc === pc && nc === nc && nc - pc > 1) return prev.slice(0, i) + String.fromCharCode((pc + nc) >> 1);
    return `${prev}n`;
}

function positionAfter(tasks, parent, previousId, exclude) {
    const siblings = siblingTasks(tasks, parent).filter(task => task.id !== exclude);
    if (!previousId) return positionBetween(null, siblings[0]?.position);
    const index = siblings.findIndex(task => task.id === previousId);
    return positionBetween(siblings[index]?.position, siblings[index + 1]?.position);
}

function applyLocalChange(tasks, operation) {
    if (operation.kind === "add") {
        const parent = operation.parent ?? undefined;
        const position = operation.previous !== undefined ? positionAfter(tasks, parent, operation.previous) : "";
        return [{ id: operation.task, parent, ...operation.fields, status: "needsAction", position }, ...tasks];
    }
    if (operation.kind === "delete") {
        const removed = new Set([operation.task]);
        let size;
        do {
            size = removed.size;
            for (const task of tasks) if (removed.has(task.parent)) removed.add(task.id);
        } while (size !== removed.size);
        return tasks.filter(task => !removed.has(task.id));
    }
    if (operation.kind === "move") {
        const parent = operation.parent ?? undefined;
        const position = positionAfter(tasks, parent, operation.previous, operation.task);
        return tasks.map(task => task.id === operation.task ? { ...task, parent, position } : task);
    }
    return tasks.map(task => task.id === operation.task ? { ...task, ...operation.fields } : task);
}

function emptyLocalState() {
    return { version: 1, initialized: false, title: "Default list", tasks: [], queue: [], ids: {}, failures: 0, nextRetryAt: 0, paused: false, askReset: false, error: "" };
}

export class LocalGoogleTasks {
    static async open(remote, listId, directory) {
        const root = directory ?? (process.platform === "win32"
            ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "gtasks")
            : join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "gtasks"));
        await mkdir(root, { recursive: true });
        const key = createHash("sha256").update(JSON.stringify([remote.clientId, remote.refreshToken, listId])).digest("hex");
        return new LocalGoogleTasks(remote, listId, join(root, `${key}.sqlite`));
    }

    constructor(remote, listId = "@default", path = ":memory:", { retryLimit = 5, retryDelay = 1000, pollDelay = 30_000, now = Date.now } = {}) {
        Object.assign(this, { remote, listId, path, retryLimit, retryDelay, pollDelay, now, localFirst: true, listeners: new Set(), stopped: false, running: false });
        this.db = new Database(path, { create: true });
        try {
            this.db.run("PRAGMA busy_timeout = 0; PRAGMA locking_mode = EXCLUSIVE; PRAGMA synchronous = FULL;");
            this.db.run("CREATE TABLE IF NOT EXISTS local_state (id INTEGER PRIMARY KEY CHECK(id = 1), data TEXT NOT NULL)");
            this.db.run("INSERT OR IGNORE INTO local_state (id, data) VALUES (1, ?)", JSON.stringify(emptyLocalState()));
            this.state = JSON.parse(this.db.query("SELECT data FROM local_state WHERE id = 1").get().data);
            if (this.state.version !== 1 || !Array.isArray(this.state.tasks) || !Array.isArray(this.state.queue)) throw new Error("Unsupported local task storage format.");
        } catch (error) {
            this.db.close();
            if (error.code === "SQLITE_BUSY") throw new Error("This task cache is open in another gtasks process. Close it before opening the same list again.");
            throw error;
        }
    }

    change(update) {
        const next = structuredClone(this.state);
        update(next);
        this.db.run("UPDATE local_state SET data = ? WHERE id = 1", JSON.stringify(next));
        this.state = next;
        for (const listener of this.listeners) listener();
    }

    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    getList() { return Promise.resolve({ title: this.state.title }); }
    list() { return Promise.resolve(this.state.queue.reduce(applyLocalChange, structuredClone(this.state.tasks))); }

    get syncStatus() {
        const pending = `${this.state.queue.length} queued`;
        if (this.state.paused) return `Sync paused | ${pending} | ${this.state.error} | r retry`;
        if (this.state.error) return `${pending} | Retry ${this.state.failures}/${this.retryLimit}: ${this.state.error}`;
        if (!this.state.initialized) return `Loading from Google | ${pending}`;
        return this.running ? `Syncing | ${pending}` : this.state.queue.length ? pending : "Synced";
    }

    enqueue(operation) {
        if (this.resetting) throw new Error("Wait for the local cache to reload.");
        this.change(state => state.queue.push({ id: crypto.randomUUID(), ...operation }));
        this.wake();
        return Promise.resolve({ id: operation.task, ...operation.fields });
    }

    add(list, title, parent = null, notes = "", previous, due) {
        return this.enqueue({ kind: "add", task: `local:${crypto.randomUUID()}`, parent, previous, fields: { title, notes, ...(due != null && { due }) } });
    }
    edit(list, task, fields) {
        const next = {};
        for (const key of ["title", "notes", "due"]) if (fields[key] !== undefined) next[key] = fields[key];
        return this.enqueue({ kind: "edit", task, fields: next });
    }
    setDone(list, task, done) { return this.enqueue({ kind: "done", task, fields: { status: done ? "completed" : "needsAction", completed: done ? new Date(this.now()).toISOString() : null } }); }
    delete(list, task) { return this.enqueue({ kind: "delete", task }); }
    move(list, task, { parent = null, previous = null } = {}) { return this.enqueue({ kind: "move", task, parent, previous, fields: {} }); }

    start() { this.started = true; this.wake(); }
    wake() {
        if (!this.started || this.stopped || this.running || this.state.paused || this.resetting) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { void this.syncOnce(); }, Math.max(0, this.state.nextRetryAt - this.now()));
    }

    remoteId(id) {
        if (!id) return null;
        const resolved = this.state.ids[id] ?? id;
        if (resolved.startsWith("local:")) throw new Error("A queued parent has not synced yet.");
        return resolved;
    }

    async fetchSnapshot() {
        const metadata = await this.remote.getList(this.listId);
        const tasks = await this.remote.list(this.listId);
        return { title: metadata.title, tasks };
    }

    async pull() {
        const snapshot = await this.fetchSnapshot();
        if (this.stopped) return;
        this.change(state => {
            const aliases = new Map(Object.entries(state.ids).map(([local, remote]) => [remote, local]));
            state.tasks = snapshot.tasks.map(task => ({ ...task, id: aliases.get(task.id) ?? task.id, parent: aliases.get(task.parent) ?? task.parent }));
            state.title = snapshot.title || "Default list";
            state.initialized = true;
        });
    }

    async push(operation) {
        let result;
        if (operation.kind === "add") {
            // Google assigns task IDs, so a lost insert response cannot be safely replayed.
            if (operation.started) throw new Error("A queued addition may already exist on Google. Reset and reload to resolve it.");
            const parent = this.remoteId(operation.parent);
            const previous = operation.previous != null ? this.remoteId(operation.previous) : null;
            await this.remote.token?.();
            if (this.stopped) return;
            this.change(state => { state.queue[0].started = true; });
            try {
                result = await this.remote.add(this.listId, operation.fields.title, parent, operation.fields.notes, previous, operation.fields.due);
            } catch (error) {
                if (!this.stopped && error.status >= 400 && error.status < 500) this.change(state => { state.queue[0].started = false; });
                throw error;
            }
            if (!result?.id) throw new Error("Google did not confirm the new task ID. Reset and reload to resolve it.");
        } else {
            const id = this.remoteId(operation.task);
            if (operation.kind === "edit") result = await this.remote.edit(this.listId, id, operation.fields);
            if (operation.kind === "done") result = await this.remote.setDone(this.listId, id, operation.fields.status === "completed");
            if (operation.kind === "move") {
                result = await this.remote.move(this.listId, id, {
                    parent: this.remoteId(operation.parent),
                    previous: operation.previous != null ? this.remoteId(operation.previous) : null,
                });
            }
            if (operation.kind === "delete") {
                try { await this.remote.delete(this.listId, id); }
                catch (error) { if (error.status !== 404 && error.status !== 410) throw error; }
            }
        }
        if (this.stopped) return;
        this.change(state => {
            state.tasks = applyLocalChange(state.tasks, operation);
            if (operation.kind === "add") state.ids[operation.task] = result.id;
            state.queue.shift();
            state.failures = 0;
            state.nextRetryAt = 0;
            state.error = "";
        });
    }

    async syncOnce({ force = false } = {}) {
        if (this.stopped || this.running || this.resetting || this.state.paused || (!force && this.state.nextRetryAt > this.now())) return;
        this.running = true;
        try {
            if (!this.state.initialized) await this.pull();
            while (!this.stopped && this.state.queue.length) await this.push(structuredClone(this.state.queue[0]));
            if (!this.stopped) {
                await this.pull();
                this.change(state => { state.failures = 0; state.nextRetryAt = 0; state.error = ""; });
            }
        } catch (error) {
            if (!this.stopped) {
                try {
                    this.change(state => {
                        state.failures++;
                        state.error = error.message ?? String(error);
                        state.nextRetryAt = this.now() + Math.min(60_000, this.retryDelay * 2 ** (state.failures - 1));
                        state.paused = state.failures >= this.retryLimit;
                        state.askReset = state.paused;
                    });
                } catch (storageError) {
                    this.storageError = storageError.message;
                    this.started = false;
                }
            }
        } finally {
            this.running = false;
            if (!this.stopped) {
                for (const listener of this.listeners) listener();
                if (this.started && !this.state.paused) {
                    clearTimeout(this.timer);
                    const delay = this.state.error ? Math.max(0, this.state.nextRetryAt - this.now()) : this.state.queue.length ? 0 : this.pollDelay;
                    this.timer = setTimeout(() => { void this.syncOnce(); }, delay);
                }
            }
        }
    }

    retry() {
        this.change(state => { state.paused = false; state.askReset = false; state.failures = 0; state.nextRetryAt = 0; state.error = ""; });
        if (this.storageError) {
            this.storageError = null;
            this.started = true;
        }
        this.wake();
    }
    declineReset() { this.change(state => { state.askReset = false; }); }

    async resetFromServer() {
        if (this.running || this.resetting) throw new Error("Wait for the current sync to finish.");
        this.resetting = true;
        clearTimeout(this.timer);
        try {
            const snapshot = await this.fetchSnapshot();
            if (this.stopped) return;
            this.change(state => Object.assign(state, emptyLocalState(), { initialized: true, title: snapshot.title || "Default list", tasks: snapshot.tasks }));
        } catch (error) {
            if (!this.stopped) this.change(state => { state.paused = true; state.askReset = false; state.error = `Reload failed; local changes kept: ${error.message}`; });
            throw error;
        } finally {
            this.resetting = false;
            this.wake();
        }
    }

    cancel() {
        this.stopped = true;
        clearTimeout(this.timer);
        this.remote.cancel?.();
        this.listeners.clear();
        this.db.close();
    }
}

export const GOOGLE_TASKS_SECRETS = ["google-tasks-client-id", "google-tasks-client-secret", "google-tasks-refresh-token"];

export function saveRefreshToken(value) {
    return secrets.set({ service: SERVICE_NAME, name: GOOGLE_TASKS_SECRETS[2], value });
}

export function createAuthorizationRequest(clientId, redirectUri) {
    const verifier = randomBytes(32).toString("base64url");
    const state = randomBytes(32).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: "code",
        scope: TASKS_SCOPE, access_type: "offline", prompt: "consent", state,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
    }).toString();
    return { url, verifier, state };
}

export async function authorize(credentials, { port = 0, onUrl = url => console.log(`Open this URL in your browser to sign in:\n\n${url}\n\nWaiting for Google (Ctrl+C to cancel)...`), timeoutMs = 300_000 } = {}) {
    let resolveCode;
    let rejectCode;
    const codePromise = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
    let authorization;
    let settled = false;
    const server = Bun.serve({
        hostname: "127.0.0.1", port,
        fetch(request) {
            const url = new URL(request.url);
            if (url.pathname !== "/") return new Response("Not found", { status: 404 });
            if (url.searchParams.get("state") !== authorization?.state) return new Response("Invalid state", { status: 400 });
            if (settled) return new Response("Sign-in already received.", { status: 409 });
            if (url.searchParams.has("error")) {
                settled = true;
                rejectCode(new Error("Google sign-in was declined. Run gtasks auth to retry."));
                return new Response("Sign-in declined. You can close this tab.");
            }
            const code = url.searchParams.get("code");
            if (!code) return new Response("Missing authorization code", { status: 400 });
            settled = true;
            resolveCode(code);
            return new Response("Sign-in received. Return to your terminal to finish.");
        },
    });
    const redirectUri = `http://127.0.0.1:${server.port}/`;
    authorization = createAuthorizationRequest(credentials.clientId, redirectUri);
    const cancel = () => rejectCode(new Error("Google sign-in cancelled."));
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    const timer = setTimeout(() => rejectCode(new Error("Google sign-in timed out. Run gtasks auth to retry.")), timeoutMs);
    try {
        onUrl(authorization.url.toString());
        const code = await codePromise;
        const tokens = await exchangeToken({
            client_id: credentials.clientId, client_secret: credentials.clientSecret,
            grant_type: "authorization_code", code, code_verifier: authorization.verifier, redirect_uri: redirectUri,
        });
        if (!tokens.refresh_token) throw new Error("Google returned no refresh token. Run gtasks auth and grant access again.");
        await saveRefreshToken(tokens.refresh_token);
        return tokens.refresh_token;
    } finally {
        clearTimeout(timer);
        process.off("SIGINT", cancel);
        process.off("SIGTERM", cancel);
        await server.stop();
    }
}

export async function createGoogleTasks({ login = false, port = 0, interactive = true } = {}) {
    const credential = async (name, env) => {
        if (interactive) return getSecret(name, env);
        const value = (!process.env.NO_SECRET_ENV_VAR && process.env[env]) || await secrets.get({ service: SERVICE_NAME, name });
        if (!value) throw new Error(`Missing ${env}. Run bun run ev-secrets and gtasks auth first.`);
        return value;
    };
    const clientId = await credential(GOOGLE_TASKS_SECRETS[0], "GWS_CLIENT_ID");
    const clientSecret = await credential(GOOGLE_TASKS_SECRETS[1], "GWS_CLIENT_SECRET");
    let refreshToken = !process.env.NO_SECRET_ENV_VAR ? process.env.GOOGLE_TASKS_REFRESH_TOKEN : null;
    refreshToken ||= await secrets.get({ service: SERVICE_NAME, name: GOOGLE_TASKS_SECRETS[2] });
    if (login || !refreshToken) {
        if (!interactive || !process.stdin.isTTY) throw new Error("Run gtasks auth in a terminal to sign in to Google first.");
        refreshToken = await authorize({ clientId, clientSecret }, { port });
    }
    return new GoogleTasks({ clientId, clientSecret, refreshToken, saveRefreshToken });
}

export function googleTasksSecrets({ password, fields }) {
    const clientId = fields.get("GWS_CLIENT_ID");
    const clientSecret = fields.get("GWS_CLIENT_SECRET") ??
        (fields.get("export_as") === "GWS_CLIENT_SECRET" ? password : undefined);
    if (!clientId || !clientSecret) {
        throw new Error("Google Tasks entry needs GWS_CLIENT_ID and a client secret (first line with export_as: GWS_CLIENT_SECRET, or a GWS_CLIENT_SECRET field). See docs/gtasks.md.");
    }
    const entries = [
        ["google-tasks-client-id", clientId],
        ["google-tasks-client-secret", clientSecret],
    ];
    const refreshToken = fields.get("GOOGLE_TASKS_REFRESH_TOKEN");
    if (refreshToken) entries.push(["google-tasks-refresh-token", refreshToken]);
    return entries;
}

export function visibleTasks(tasks, parent = null, search = "", showCompleted = false, ids, maxDepth = Infinity, folds) {
    const query = search.trim().toLocaleLowerCase();
    if (parent && !query && folds?.has(parent)) return [];
    const children = new Map();
    for (const task of tasks.filter(task => !task.deleted)
        .sort((a, b) => (a.position ?? "").localeCompare(b.position ?? ""))) {
        const id = task.parent ?? null;
        if (!children.has(id)) children.set(id, []);
        children.get(id).push(task);
    }
    const rows = [];
    const seen = new Set(parent ? [parent] : []);
    const pending = (children.get(parent) ?? []).map(task => ({ ...task, depth: 0 })).reverse();
    while (pending.length) {
        const task = pending.pop();
        if (seen.has(task.id)) continue;
        seen.add(task.id);
        rows.push(task);
        if (!query && folds?.has(task.id)) continue;
        for (const child of [...(children.get(task.id) ?? [])].reverse()) {
            pending.push({ ...child, depth: task.depth + 1 });
        }
    }
    const depths = new Map();
    const visible = rows.filter(task => {
        const depth = (depths.get(task.parent) ?? -1) + 1;
        const shown = showCompleted || task.status !== "completed";
        depths.set(task.id, shown ? depth : depth - 1);
        task.depth = depth;
        return shown;
    });
    if (!query) return maxDepth === Infinity ? visible : visible.filter(task => task.depth <= maxDepth);
    const byId = new Map(rows.map(task => [task.id, task]));
    const included = new Set();
    for (const row of visible) {
        if (!`${row.title ?? ""}\n${row.notes ?? ""}\n${formatDue(row.due)}\n${row.id}\n${formatId(row.id, ids)}`.toLocaleLowerCase().includes(query)) continue;
        let task = row;
        while (task && !included.has(task.id)) {
            included.add(task.id);
            task = byId.get(task.parent);
        }
    }
    return visible.filter(task => included.has(task.id));
}

export function parseTaskInput(input) {
    const [first, ...lines] = input.replace(/\r\n?/g, "\n").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return { title: first.trim(), notes: lines.join("\n") };
}

export function formatDue(due) {
    const day = String(due ?? "").match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    return day ? `[[${day}]]` : "";
}

export function formatId(id, ids) {
    if (!id) return "";
    return `^${ids?.[id] ?? id}`;
}

export function openInBrowser(url) {
    const command = process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : process.platform === "darwin"
            ? ["open", url]
            : ["xdg-open", url];
    Bun.spawn(command, { stdin: "ignore", stdout: "ignore", stderr: "ignore", detached: true }).unref();
}

export function taskLinks(task) {
    const found = [];
    const seen = new Set();
    const add = (label, url) => {
        const href = String(url ?? "").trim().replace(/[.,;:!?]+$/, "");
        if (!/^https?:\/\//.test(href) || seen.has(href)) return;
        seen.add(href);
        found.push({ label: String(label || href).trim() || href, url: href });
    };
    const fromText = text => {
        const value = String(text ?? "");
        const taken = [];
        for (const match of value.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
            add(match[1], match[2]);
            taken.push([match.index, match.index + match[0].length]);
        }
        for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/g)) {
            if (taken.some(([start, end]) => match.index >= start && match.index < end)) continue;
            add("", match[0]);
        }
    };
    for (const item of [...(task?.links ?? [])].sort((a, b) => Number(b.type === "keep_note") - Number(a.type === "keep_note"))) {
        add(item.description || (item.type === "keep_note" ? "Keep Note" : item.type), item.link);
    }
    fromText(task?.title);
    fromText(task?.notes);
    return found;
}

export function parseDue(input, now = () => new Date()) {
    if (input == null) return undefined;
    const text = String(input).trim().replace(/^\[\[|\]\]$/g, "").trim();
    if (!text) return null;
    const localDay = date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };
    const dueTimestamp = day => {
        const [y, m, d] = day.split("-").map(Number);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== day) {
            throw new Error(`Invalid due date ${JSON.stringify(input)}. Use YYYY-MM-DD, today, or tomorrow.`);
        }
        return `${day}T00:00:00.000Z`;
    };
    if (/^today$/i.test(text)) return dueTimestamp(localDay(new Date(now())));
    if (/^tomorrow$/i.test(text)) {
        const date = new Date(now());
        date.setDate(date.getDate() + 1);
        return dueTimestamp(localDay(date));
    }
    const day = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/)?.[1];
    if (day) return dueTimestamp(day);
    throw new Error(`Invalid due date ${JSON.stringify(input)}. Use YYYY-MM-DD, today, or tomorrow.`);
}

export class TasksView {
    constructor(api, list = "@default") {
        Object.assign(this, { api, list, tasks: [], path: [], search: "", selected: 0, mode: "browse", input: "", showCompleted: false, showIds: false, showHelp: false, prefix: null, openUrl: openInBrowser, writeClipboard, message: "", listTitle: "Default list", clipboard: null, visual: null, folds: new Set(), unfolds: new Set(), foldLevel: 0 });
    }

    get parent() { return this.path.at(-1)?.id ?? null; }
    get ids() { return this.api.state?.ids; }
    get rows() {
        const kids = visibleTasks(this.tasks, this.parent, this.search, this.showCompleted, this.ids, this.parent ? 0 : 1, this.foldedIds);
        const focused = this.parent ? this.tasks.find(task => task.id === this.parent && !task.deleted) : null;
        if (!focused) return kids;
        return [{ ...focused, depth: 0 }, ...kids.map(task => ({ ...task, depth: task.depth + 1 }))];
    }
    get task() { return this.rows[this.selected]; }
    markdown() { return viewMarkdown(this.tasks, this.parent, this.search, this.showCompleted); }

    displayDepths() {
        const byId = new Map(this.tasks.map(task => [task.id, task]));
        const depths = new Map();
        const depth = id => {
            if (depths.has(id)) return depths.get(id);
            depths.set(id, 0);
            if (id === this.parent) return 0;
            const parent = byId.get(id)?.parent ?? null;
            const value = parent && byId.has(parent) ? depth(parent) + 1 : 0;
            depths.set(id, value);
            return value;
        };
        for (const task of this.tasks) depth(task.id);
        return depths;
    }

    get foldedIds() {
        if (!this.foldLevel) return this.folds;
        const folded = new Set(this.folds);
        const parents = new Set();
        for (const task of this.tasks) if (!task.deleted && task.parent) parents.add(task.parent);
        const depths = this.displayDepths();
        for (const task of this.tasks) {
            if (task.deleted || this.unfolds.has(task.id) || (!task.notes && !parents.has(task.id))) continue;
            const depth = depths.get(task.id) ?? 0;
            if (this.foldLevel >= (depth === 0 ? 2 : 1)) folded.add(task.id);
        }
        return folded;
    }

    hasFoldContent(task) {
        return Boolean(task && (task.notes || this.tasks.some(child => !child.deleted && (child.parent ?? null) === task.id)));
    }

    setFold(close, recursive) {
        const task = this.task;
        if (!task) return;
        if (close && !this.hasFoldContent(task)) {
            this.message = "Nothing to fold.";
            return;
        }
        const parents = new Set();
        if (recursive) for (const item of this.tasks) if (!item.deleted && item.parent) parents.add(item.parent);
        const ids = recursive ? subtreeIds(this.tasks, [task.id]) : [task.id];
        for (const id of ids) {
            if (close && id !== task.id) {
                const target = this.tasks.find(item => item.id === id);
                if (!target?.notes && !parents.has(id)) continue;
            }
            if (close) { this.folds.add(id); this.unfolds.delete(id); }
            else { this.folds.delete(id); this.unfolds.add(id); }
        }
    }

    toggleFold(recursive) {
        if (!this.task) return;
        this.setFold(!this.foldedIds.has(this.task.id), recursive);
    }

    setFoldLevel(level) {
        this.foldLevel = Math.max(0, Math.min(2, level));
        this.folds.clear();
        this.unfolds.clear();
    }

    clamp() {
        this.selected = Math.max(0, Math.min(this.selected, this.rows.length - 1));
        if (this.visual != null) this.visual = Math.max(0, Math.min(this.visual, this.rows.length - 1));
    }

    visualRows() {
        if (this.visual == null) return this.task ? [this.task] : [];
        const from = Math.min(this.visual, this.selected);
        const to = Math.max(this.visual, this.selected);
        return this.rows.slice(from, to + 1);
    }

  scrollPage(direction) {
    if (!this.viewport || !this.rows.length) return;
    const { pageSize, totalLines, rowStarts } = this.viewport;
    this.scrollTop = Math.max(0, Math.min(
      (this.scrollTop ?? 0) + direction * pageSize,
      totalLines - pageSize,
    ));
    this.selected = Math.max(0, rowStarts.findLastIndex(start => start <= this.scrollTop));
    this.scrolledTask = this.task?.id;
  }

    operatorRoots() {
        const rows = this.visualRows();
        const ids = new Set(rows.map(task => task.id));
        return rows.filter(task => !ids.has(task.parent));
    }

    openLink(url, missing = "No links.") {
        if (!url) {
            this.message = missing;
            return;
        }
        try {
            const result = this.openUrl(url);
            this.message = "Opened.";
            if (result != null && typeof result.then === "function") {
                void Promise.resolve(result).catch(error => { this.message = error.message ?? String(error); });
            }
        } catch (error) {
            this.message = error.message ?? String(error);
        }
    }

    openWeb() {
        return this.openLink(this.task?.webViewLink, "No web link for this task.");
    }

    openFound() {
        const links = taskLinks(this.task);
        if (links.length <= 1) return this.openLink(links[0]?.url);
        this.visual = null;
        this.mode = "links";
        this.linkChoices = links;
        this.linkSelected = 0;
    }

  async copyTaskId() {
    const task = this.task;
    if (!task) return;
    try {
      await this.writeClipboard(this.ids?.[task.id] ?? task.id);
      this.message = "Task ID copied.";
    } catch (error) {
      this.message = error.message ?? String(error);
    }
  }

  async copyPrompt() {
    const selected = this.visualRows();
    if (!selected.length) return;
    const ids = selected.map(task => this.ids?.[task.id] ?? task.id).join(", ");
    this.visual = null;
    try {
      await this.writeClipboard(`Work on gtasks item ${ids}.`);
      this.message = "Prompt copied.";
    } catch (error) {
      this.message = error.message ?? String(error);
    }
  }

    copyMarkdown() {
        const selected = this.visual != null ? this.visualRows() : this.task ? flattenTasks(this.tasks, [this.task.id]) : [];
        if (!selected.length) return;
        const selectedIds = new Set(selected.map(task => task.id));
        const items = selected.map(task => {
            let parent = task.parent;
            while (parent && !selectedIds.has(parent)) parent = this.tasks.find(item => item.id === parent)?.parent;
            return { ...task, parent: parent ?? undefined };
        });
        const md = renderMarkdown(items, this.ids ?? {});
        const roots = items.filter(task => !task.parent);
        this.visual = null;
        return Promise.resolve(this.writeClipboard(md)).then(
            () => { this.message = roots.length === 1 ? "Copied." : `Copied ${roots.length} tasks.`; },
            error => { this.message = error.message ?? String(error); },
        );
    }

    yank() {
        const roots = this.operatorRoots();
        if (!roots.length) return;
        const ids = subtreeIds(this.tasks, roots.map(task => task.id));
        this.clipboard = { type: "yank", roots: roots.map(task => task.id), tasks: this.tasks.filter(task => ids.has(task.id)).map(task => ({ ...task })) };
        this.visual = null;
        this.message = roots.length === 1 ? "Yanked." : `Yanked ${roots.length} tasks.`;
    }

    cut() {
        const roots = this.operatorRoots();
        if (!roots.length) return;
        this.clipboard = { type: "cut", roots: roots.map(task => task.id) };
        this.visual = null;
        this.message = roots.length === 1 ? "Cut." : `Cut ${roots.length} tasks.`;
    }

    get focused() { return this.task?.id === this.parent; }

    pasteAnchor(before) {
        const selected = this.task;
        if (!selected) return { parent: this.parent, previous: null };
        if (selected.id === this.parent) {
            const siblings = siblingTasks(this.tasks, selected.id);
            return { parent: selected.id, previous: before ? null : siblings.at(-1)?.id ?? null };
        }
        const parent = selected.parent ?? null;
        const siblings = siblingTasks(this.tasks, parent);
        const index = siblings.findIndex(task => task.id === selected.id);
        return { parent, previous: before ? (index > 0 ? siblings[index - 1].id : null) : selected.id };
    }

    paste(before) {
        if (!this.clipboard) {
            this.message = "Nothing to paste.";
            return;
        }
        const { parent } = this.pasteAnchor(before);
        if (parent && this.tasks.find(task => task.id === parent)?.parent) {
            this.message = "Cannot paste into a child task.";
            return;
        }
        return this.clipboard.type === "cut" ? this.pasteCut(before) : this.pasteYank(before);
    }

    pasteCut(before) {
        const roots = (this.clipboard.roots ?? [this.clipboard.root]).filter(id => this.tasks.some(task => task.id === id && !task.deleted));
        if (!roots.length) {
            this.message = "Cut task is gone.";
            return;
        }
        const { parent, previous } = this.pasteAnchor(before);
        if (parent && subtreeIds(this.tasks, roots).has(parent)) {
            this.message = "Cannot move a task into its own subtree.";
            return;
        }
        if (roots.length === 1) {
            const current = this.tasks.find(task => task.id === roots[0]);
            if ((current.parent ?? null) === parent) {
                const siblings = siblingTasks(this.tasks, parent);
                const index = siblings.findIndex(task => task.id === roots[0]);
                const currentPrevious = index > 0 ? siblings[index - 1].id : null;
                if (previous === roots[0] || previous === currentPrevious) return;
            }
        }
        const items = this.tasks.filter(task => subtreeIds(this.tasks, roots).has(task.id));
        return this.mutate(async () => {
            let prev = previous;
            for (const task of flattenTasks(items, roots)) {
                await this.api.move(this.list, task.id, { parent, previous: prev });
                prev = task.id;
            }
        });
    }

    pasteYank(before) {
        const { parent, previous } = this.pasteAnchor(before);
        const items = this.clipboard.tasks;
        const roots = this.clipboard.roots ?? [this.clipboard.root];
        return this.mutate(async () => {
            let prev = previous;
            for (const task of flattenTasks(items, roots)) {
                const created = await this.api.add(this.list, task.title ?? "", parent, task.notes ?? "", prev, ...(task.due != null ? [task.due] : []));
                prev = created.id;
            }
            this.search = "";
        });
    }

    startAt(query) {
        if (!query?.trim()) return;
        this.search = query.trim();
        const matches = this.rows.filter(task => (task.title ?? "").toLocaleLowerCase().includes(this.search.toLocaleLowerCase()));
        if (matches.length === 1) {
            this.selected = this.rows.findIndex(task => task.id === matches[0].id);
            this.enter();
        } else {
            this.selected = 0;
            this.message = matches.length ? `${matches.length} matches. Select a task and press Enter.` : "No matching task. Edit / search or Esc to clear.";
        }
    }

    focusTask(id) {
        const index = this.rows.findIndex(task => task.id === id || this.ids?.[task.id] === id);
        if (index === -1) return false;
        this.selected = index;
        this.enter();
        return true;
    }

    openEditor(mode, insert) {
        this.visual = null;
        this.mode = mode;
        this.editingTask = mode === "edit" ? this.task : null;
        this.insert = insert;
        this.input = this.editingTask ? `${this.editingTask.title ?? ""}${this.editingTask.notes ? `\n${this.editingTask.notes}` : ""}` : "";
        this.message = "";
    }

    saveInput(input) {
        this.input = input;
        const fields = parseTaskInput(input);
        if (!fields.title) throw new Error("The first line must contain a title.");
        return this.mutate(async () => {
            if (this.mode === "edit") await this.api.edit(this.list, this.editingTask.id, fields);
            else await this.api.add(this.list, fields.title, this.insert ? this.insert.parent : this.parent, fields.notes, this.insert?.previous);
            this.search = "";
        });
    }

    async refresh() {
        const selectedId = this.task?.id;
        const tasks = await this.api.list(this.list);
        this.tasks = tasks;
        const missing = this.path.findIndex(entry => !tasks.some(task => task.id === entry.id));
        if (missing !== -1) {
            this.path.splice(missing);
            this.search = "";
        }
        const index = this.rows.findIndex(task => task.id === selectedId);
        if (index !== -1) this.selected = index;
        const alive = new Set(tasks.map(task => task.id));
        for (const id of [...this.folds]) if (!alive.has(id)) this.folds.delete(id);
        for (const id of [...this.unfolds]) if (!alive.has(id)) this.unfolds.delete(id);
        this.clamp();
    }

    enter() {
        this.visual = null;
        if (!this.task) return;
        const byId = new Map(this.tasks.map(task => [task.id, task]));
        const ancestors = [];
        const seen = new Set();
        let task = this.task;
        while (task && task.id !== this.parent && !seen.has(task.id)) {
            seen.add(task.id);
            ancestors.unshift(task);
            task = byId.get(task.parent);
        }
        for (const [index, ancestor] of ancestors.entries()) {
            if (index) this.selected = Math.max(0, this.rows.findIndex(task => task.id === ancestor.id));
            this.folds.delete(ancestor.id);
            this.unfolds.add(ancestor.id);
            this.path.push({ id: ancestor.id, title: ancestor.title, search: this.search, selected: this.selected });
            this.search = "";
            this.selected = 0;
        }
    }

    back() {
        this.visual = null;
        const previous = this.path.pop();
        if (previous) {
            this.search = previous.search;
            this.selected = previous.selected;
            this.clamp();
        }
    }

    async mutate(action) {
        await action();
        this.mode = "browse";
        this.message = this.api.localFirst ? "Saved locally." : "Saved.";
        try {
            await this.refresh();
        } catch (error) {
            this.message = `Saved, but refresh failed: ${error.message}. Press r to reload.`;
        }
    }

    key(text, key = {}) {
        if (this.mode === "add" || this.mode === "edit") return;
        if (this.mode === "reset") {
            if (text?.toLowerCase() === "y") {
                this.mode = "browse";
                return this.api.resetFromServer().then(async () => {
                    this.path = [];
                    this.search = "";
                    this.selected = 0;
                    await this.refresh();
                    this.message = "Local cache reloaded from Google.";
                });
            }
            if (text?.toLowerCase() === "n" || key.name === "escape" || key.name === "return") {
                this.mode = "browse";
                this.api.declineReset();
            }
            return;
        }
        if (this.mode === "delete") {
            this.mode = "browse";
            if (text?.toLowerCase() === "y") {
                const ids = this.deleteTasks.map(task => task.id);
                return this.mutate(async () => {
                    for (const id of ids) await this.api.delete(this.list, id);
                });
            }
            return;
        }
        if (this.mode === "links") {
            if (key.name === "escape") {
                this.mode = "browse";
                this.linkChoices = null;
                return;
            }
            if (key.name === "down" || text === "j") this.linkSelected = Math.min(this.linkChoices.length - 1, this.linkSelected + 1);
            else if (key.name === "up" || text === "k") this.linkSelected = Math.max(0, this.linkSelected - 1);
            else if (key.name === "return" || key.name === "right" || text === "l" || /^[1-9]$/.test(text)) {
                const choice = /^[1-9]$/.test(text) ? this.linkChoices[Number(text) - 1] : this.linkChoices[this.linkSelected];
                if (!choice) return;
                this.mode = "browse";
                this.linkChoices = null;
                return this.openLink(choice.url);
            }
            return;
        }
        if (this.mode === "search" || this.mode === "due") {
            if (key.name === "escape") {
                if (this.mode === "search") {
                    this.search = this.previousSearch;
                    const index = this.rows.findIndex(task => task.id === this.previousSelected);
                    if (index !== -1) this.selected = index;
                    this.clamp();
                }
                this.mode = "browse";
            } else if (key.name === "return") {
                if (this.mode === "due") {
                    try {
                        const due = parseDue(this.input);
                        const id = this.task.id;
                        this.mode = "browse";
                        return this.mutate(() => this.api.edit(this.list, id, { due }));
                    } catch (error) {
                        this.message = error.message;
                    }
                } else this.mode = "browse";
            } else {
                if (key.name === "backspace") this.input = Array.from(this.input).slice(0, -1).join("");
                else if (key.ctrl && key.name === "u") this.input = "";
                else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f-\x9f]/.test(text)) this.input += text;
                this.message = "";
                if (this.mode === "search") { this.search = this.input; this.selected = 0; }
            }
            return;
        }
        this.message = "";
        if (key.ctrl && (key.name === "f" || key.name === "b")) {
            this.prefix = null;
            this.scrollPage(key.name === "f" ? 1 : -1);
            return;
        }
        if (this.prefix === "g") {
            this.prefix = null;
            if (text === "g") { this.selected = 0; this.scrolledTask = null; }
            else if (text === "x") return this.openWeb();
            else if (text === "f") return this.openFound();
            else if (text === "p") return this.copyPrompt();
            else if (text === ",") return this.copyTaskId();
            else if (text === "?") this.showHelp = !this.showHelp;
            this.clamp();
            return;
        }
        if (this.prefix === "z") {
            this.prefix = null;
            if (text === "a") this.toggleFold(false);
            else if (text === "A") this.toggleFold(true);
            else if (text === "c") this.setFold(true, false);
            else if (text === "C") this.setFold(true, true);
            else if (text === "o") this.setFold(false, false);
            else if (text === "O") this.setFold(false, true);
            else if (text === "m") this.setFoldLevel(this.foldLevel + 1);
            else if (text === "M") this.setFoldLevel(2);
            else if (text === "r") this.setFoldLevel(this.foldLevel - 1);
            else if (text === "R") this.setFoldLevel(0);
            this.clamp();
            return;
        }
        if (text !== "g") this.scrolledTask = null;
        if (key.name === "down" || text === "j") this.selected++;
        else if (key.name === "up" || text === "k") this.selected--;
        else if (key.name === "home") this.selected = 0;
        else if (key.name === "end" || text === "G") this.selected = this.rows.length - 1;
        else if (text === "g") {
            this.prefix = "g";
            return;
        }
        else if (text === "z") {
            this.prefix = "z";
            return;
        }
        else if (key.name === "return" || key.name === "right" || text === "l") this.enter();
        else if (key.name === "left" || key.name === "backspace" || text === "h") this.back();
        else if (key.name === "escape") {
            const id = this.task?.id;
            this.search = "";
            this.clipboard = null;
            this.visual = null;
            const index = this.rows.findIndex(task => task.id === id);
            if (index !== -1) this.selected = index;
        } else if (text === "V" && this.task) {
            this.visual = this.visual == null ? this.selected : null;
        } else if (text === "/") {
            this.visual = null;
            this.mode = "search";
            this.previousSearch = this.search;
            this.previousSelected = this.task?.id;
            this.input = this.search;
        } else if (text === "a" || text === "o" || text === "O") {
            this.openEditor("add", this.focused || text !== "a" ? this.pasteAnchor(text === "O") : undefined);
        } else if (text === "e" && this.task) {
            this.openEditor("edit");
        } else if (text === "s" && this.task) {
            this.visual = null;
            this.mode = "due";
            this.input = formatDue(this.task.due).replace(/^\[\[|\]\]$/g, "");
            this.message = "";
        } else if (text === ".") {
            const id = this.task?.id;
            this.showCompleted = !this.showCompleted;
            const index = this.rows.findIndex(task => task.id === id);
            if (index !== -1) this.selected = index;
        } else if (text === ",") {
            this.showIds = !this.showIds;
        } else if (text === "Y") {
            return this.copyMarkdown();
        } else if (text === "y" && this.operatorRoots().length) {
            this.yank();
        } else if (text === "d" && this.operatorRoots().length) {
            this.cut();
        } else if (text === "D" && this.operatorRoots().length) {
            this.mode = "delete";
            this.deleteTasks = this.operatorRoots();
            this.visual = null;
        } else if ((text === "p" || text === "P")) {
            return this.paste(text === "P");
        } else if ([" ", "x", "u"].includes(text) && this.task) {
            const task = this.task;
            const done = text === "x" || (text === " " && task.status !== "completed");
            return this.mutate(() => this.api.setDone(this.list, task.id, done));
        } else if (text === "r") {
            this.api.retry?.();
            return this.refresh();
        }
        this.clamp();
    }
}

export function terminalText(text) {
    return stripVTControlCharacters(String(text)).replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
}

function fit(text, width) {
    let result = "";
    let columns = 0;
    for (const { segment } of new Intl.Segmenter().segment(terminalText(text))) {
        const size = Bun.stringWidth(segment);
        if (columns + size > width) break;
        result += segment;
        columns += size;
    }
    return result;
}

function wrapTaskText(text, width, prefix) {
  prefix = fit(prefix, Math.max(0, width - 2));
  const indent = " ".repeat(Bun.stringWidth(prefix));
  const lines = [];
  let line = prefix;
  let columns = Bun.stringWidth(prefix);
  const segments = new Intl.Segmenter();
  for (let word of terminalText(text).match(/\s*\S+|\s+$/gu) ?? []) {
    if (columns > indent.length && columns + Bun.stringWidth(word) > width) {
      lines.push(line);
      line = indent;
      columns = indent.length;
      word = word.trimStart();
    }
    for (const { segment } of segments.segment(word)) {
      const value = Bun.stringWidth(segment) > width ? "?" : segment;
      const size = Bun.stringWidth(value);
      if (columns + size > width) {
        lines.push(line);
        line = indent;
        columns = indent.length;
      }
      line += value;
      columns += size;
    }
  }
  lines.push(line);
  return lines;
}

export function renderTasks(view, columns = 80, height = 24, busy = false) {
    const width = Math.max(1, columns - 1);
    const rows = view.rows;
    const lines = [
        `Google Tasks / ${view.listTitle}${view.path.map(entry => ` / ${entry.title}`).join("")}`,
    ];
    const focusedTask = view.tasks.find(task => task.id === view.parent);
    lines.push(`  ${[focusedTask?.due && formatDue(focusedTask.due), formatId(focusedTask?.id ?? view.list, view.ids)].filter(Boolean).join("  ")}`);
    lines.push(
        `${view.showCompleted ? "All tasks" : "Undone only"} | Search: ${view.search || "(none)"}   ${rows.length} tasks${rows.length ? `   ${view.selected + 1}/${rows.length}` : ""}`,
        "",
    );
    if (view.api.localFirst) lines.splice(lines.length - 1, 0, `Sync: ${view.api.storageError ?? view.api.syncStatus}`);
    const footerSpace = view.showHelp ? 6 : 3;
    const pageSize = Math.max(1, height - lines.length - footerSpace);
    const childCounts = new Map();
    for (const task of view.tasks) {
        if (task.parent && !task.deleted && (view.showCompleted || task.status !== "completed")) childCounts.set(task.parent, (childCounts.get(task.parent) ?? 0) + 1);
    }
    const clip = view.clipboard;
    const foldedIds = view.foldedIds;
    const clipRoots = clip?.roots ?? (clip?.root ? [clip.root] : []);
    const clipIds = clip?.type === "yank" ? new Set(clip.tasks.map(task => task.id)) : subtreeIds(view.tasks, clipRoots);
    const visualLo = view.visual == null ? -1 : Math.min(view.visual, view.selected);
    const visualHi = view.visual == null ? -1 : Math.max(view.visual, view.selected);
    const body = [];
    const rowStarts = [];
    let selectedStart = 0;
    let selectedEnd = 0;
    for (let index = 0; index < rows.length; index++) {
        const task = rows[index];
        rowStarts.push(body.length);
        const children = childCounts.get(task.id) ?? 0;
        const indent = "  ".repeat(task.depth);
        if (index === view.selected) selectedStart = body.length;
        const marked = clipIds.has(task.id);
        const gutter = index === view.selected && marked ? (clip.type === "cut" ? "D" : "Y") : index === view.selected ? ">" : marked ? (clip.type === "cut" ? "d" : "y") : index >= visualLo && index <= visualHi ? "*" : " ";
        const prefix = `${gutter} ${indent}- [${task.status === "completed" ? "x" : " "}] `;
        const folded = foldedIds.has(task.id);
        body.push(...wrapTaskText(`${task.title || "(untitled)"}${task.due ? `  ${formatDue(task.due)}` : ""}${view.showIds ? `  ${formatId(task.id, view.ids)}` : ""}${children ? `  (${children} children)` : ""}${folded ? "  …" : ""}`, width, prefix));
        if (task.notes) {
            const notes = task.notes.split(/\r?\n/);
            for (const note of folded ? notes.slice(0, 2) : notes) body.push(...wrapTaskText(note, width, `        ${indent}`));
            if (folded && notes.length > 2) body.push(fit(`        ${indent}…`, width));
        }
        if (index === view.selected) selectedEnd = Math.min(body.length, selectedStart + pageSize);
    }
    let start = Math.min(view.scrollTop ?? 0, Math.max(0, body.length - pageSize));
    if (!view.scrolledTask || view.scrolledTask !== view.task?.id) {
        if (selectedStart < start) start = selectedStart;
        else if (selectedEnd > start + pageSize) start = selectedEnd - pageSize;
    }
    view.scrollTop = start;
    view.viewport = { pageSize, totalLines: body.length, rowStarts };
    if (!rows.length) lines.push(view.search ? "  No matching tasks." : "  No tasks here. Press a to add one.");
    else lines.push(...body.slice(start, start + pageSize));
    while (lines.length < height - footerSpace) lines.push("");
    if (view.showHelp) {
        lines.push("g? help  Ctrl+F/B page  j/k move  V visual  Enter/l cd  h/Backspace up  / search  Esc clear  q quit");
        lines.push("a/o/O add  e edit  Ctrl+E $EDITOR  s due  , ids  g, copy ID  gx open  gf links  y yank  Y copy  gp prompt  d cut  D delete  p/P paste  Space/x/u  . all  m print  r refresh");
        lines.push("za toggle fold  zc/zo close/open  zA/zC/zO recursive  zm/zr fold level  zM/zR fold all/none");
    }
    let prompt = view.message || "";
    if (view.mode === "search") prompt = `/ ${view.input}  (Enter apply, Esc cancel)`;
    if (view.mode === "due") prompt = `Due: ${view.input}  (${view.message || "YYYY-MM-DD, today, tomorrow; empty clears; Enter save, Esc cancel"})`;
    if (view.mode === "delete") prompt = view.deleteTasks.length === 1 ? `Delete task + children? [y/N] ${view.deleteTasks[0].title}` : `Delete ${view.deleteTasks.length} tasks + children? [y/N]`;
    if (view.mode === "reset") prompt = `Reset local cache? [y/N] Discard ${view.api.state.queue.length} queued changes and reload Google.`;
    if (view.mode === "links") {
        const choice = view.linkChoices[view.linkSelected];
        prompt = `Open ${view.linkSelected + 1}/${view.linkChoices.length}: ${choice.label}  (j/k, Enter, Esc)`;
    }
    lines.push(busy ? "Working... (Ctrl+C to quit)" : prompt);
    return lines.slice(0, Math.max(1, height - 1)).map(line => fit(line, width)).join("\r\n");
}

export function readTaskInput(initial, { input = process.stdin, output = process.stdout, signal, message = "" } = {}) {
    return new Promise((resolve, reject) => {
        const source = new PassThrough();
        const rl = createInterface({ input: source, output, terminal: true, historySize: 0, prompt: "> " });
        let settled = false;
        let paste = null;
        let preferredColumn = null;
        const finish = (value, error) => {
            if (settled) return;
            settled = true;
            input.off("keypress", onKey);
            input.off("end", cancel);
            signal?.removeEventListener("abort", cancel);
            rl.close();
            source.destroy();
            if (error) reject(error);
            else resolve(value);
        };
        const cancel = () => finish(null);
        const insertMultiline = value => {
            rl.line = rl.line.slice(0, rl.cursor) + value + rl.line.slice(rl.cursor);
            rl.cursor += value.length;
            rl.prompt(true);
        };
        const moveVertical = direction => {
            const start = rl.cursor === 0 ? 0 : rl.line.lastIndexOf("\n", rl.cursor - 1) + 1;
            preferredColumn ??= Array.from(rl.line.slice(start, rl.cursor)).length;
            let targetStart;
            let targetEnd;
            if (direction < 0) {
                if (start === 0) return;
                targetEnd = start - 1;
                targetStart = targetEnd === 0 ? 0 : rl.line.lastIndexOf("\n", targetEnd - 1) + 1;
            } else {
                const end = rl.line.indexOf("\n", rl.cursor);
                if (end === -1) return;
                targetStart = end + 1;
                targetEnd = rl.line.indexOf("\n", targetStart);
                if (targetEnd === -1) targetEnd = rl.line.length;
            }
            rl.cursor = targetStart + Array.from(rl.line.slice(targetStart, targetEnd)).slice(0, preferredColumn).join("").length;
            rl.prompt(true);
        };
        const onKey = (text, key = {}) => {
            try {
                if (paste == null && !key.ctrl && !key.meta && ["up", "down"].includes(key.name)) {
                    moveVertical(key.name === "up" ? -1 : 1);
                    return;
                }
                preferredColumn = null;
                if (key.name === "paste-start") { paste = ""; return; }
                if (paste != null) {
                    if (key.name !== "paste-end") { paste += key.sequence ?? text ?? ""; return; }
                    insertMultiline(paste.replace(/\r\n?/g, "\n").replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, ""));
                    paste = null;
                    return;
                }
                if (key.name === "escape" || (key.ctrl && key.name === "c")) { cancel(); return; }
                if (key.ctrl && key.name === "s") { finish(rl.line); return; }
                if (key.name === "return" || key.name === "enter") { insertMultiline("\n"); return; }
                if (key.ctrl || key.meta || ["left", "right", "up", "down", "home", "end", "backspace", "delete"].includes(key.name)) rl.write(null, key);
                else if (text && !/[\x00-\x1f\x7f-\x9f]/.test(text)) rl.write(text);
            } catch (error) { finish(null, error); }
        };
        rl.on("error", error => finish(null, error));
        rl.on("close", cancel);
        input.on("keypress", onKey);
        input.once("end", cancel);
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted) { cancel(); return; }
        output.write("\x1b[H\x1b[2J\x1b[?25hTitle on first line; description below. Enter newline, Ctrl+S save, Esc/Ctrl+C cancel.\r\n");
        if (message) output.write(`${terminalText(message)}\r\n`);
        rl.line = initial.replace(/\r\n?/g, "\n").split("\n").map(terminalText).join("\n");
        rl.cursor = rl.line.length;
        rl.prompt(true);
    });
}

async function runTaskEditor(path, { editor, signal }) {
  // Full-screen editors need inherited terminal descriptors, not Bun Shell's pipes.
  const child = Bun.spawn([editor, path], { stdin: "inherit", stdout: "inherit", stderr: "inherit", signal });
  const code = await child.exited;
  if (code !== 0) throw new Error(`Editor exited with code ${code}; task unchanged.`);
}

export async function editTaskInEditor(initial, { editor = process.env.EDITOR || "nvim", signal, runEditor = runTaskEditor } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "gtasks-edit-"));
  const path = join(directory, "task.md");
  try {
    await writeFile(path, `${initial}\n`, { mode: 0o600 });
    await runEditor(path, { editor, signal });
    const draft = await readFile(path, "utf8");
    return draft === `${initial}\n` ? null : draft;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runTasksTui(api, list = "@default", { input = process.stdin, output = process.stdout, cd, focusId, editExternal = editTaskInEditor } = {}) {
    if (!input.isTTY || !output.isTTY) throw new Error("gtasks needs an interactive terminal. Use gtasks list for Markdown output.");
    const view = new TasksView(api, list);
    output.write("Loading Google Tasks...\n");
    const metadata = await api.getList(list);
    view.listTitle = metadata.title || "Default list";
    await view.refresh();
    view.startAt(cd);
    let focusPending = Boolean(focusId) && !view.focusTask(focusId);
    let busy = false;
    let closed = false;
    let editing = false;
    let externalEditing = false;
    let refreshPending = false;
    let refreshing = false;
    let startupCdPending = Boolean(cd && api.localFirst && !api.state.initialized);
    const editorAbort = new AbortController();
    let finish;
    const done = new Promise(resolve => { finish = resolve; });
    const onInterrupt = () => { if (!externalEditing) finish(); };
    const draw = () => {
        if (!busy && !editing && view.mode === "browse" && api.state?.askReset) view.mode = "reset";
        if (!closed && !editing) output.write(`\x1b[H\x1b[2J${renderTasks(view, output.columns, output.rows, busy)}`);
    };
    const refreshLocal = async () => {
        refreshPending = true;
        if (closed || busy || editing || refreshing) return;
        refreshing = true;
        try {
            while (refreshPending && !closed && !busy && !editing) {
                refreshPending = false;
                await view.refresh();
                view.listTitle = (await api.getList(list)).title || "Default list";
                if (startupCdPending && api.state.initialized) {
                    startupCdPending = false;
                    view.startAt(cd);
                }
                if (focusPending && view.focusTask(focusId)) focusPending = false;
            }
        } catch (error) { view.message = error.message ?? String(error); }
        finally { refreshing = false; draw(); }
    };
    const unsubscribe = api.subscribe?.(() => { void refreshLocal(); });
    const onKey = async (text, key = {}) => {
        if (editing) return;
        startupCdPending = false;
        focusPending = false;
        if ((key.ctrl && key.name === "c") || (view.mode === "browse" && text === "q")) { finish(); return; }
        if (busy || closed) return;
        try {
            if (view.mode === "browse" && text === "m") {
                busy = true;
                input.off("keypress", onKey);
                try {
                    await presentMarkdown(view.markdown(), { input, output });
                } finally {
                    if (!closed) input.on("keypress", onKey);
                }
                return;
            }
            const external = view.mode === "browse" && key.ctrl && key.name === "e" && view.task;
            let action;
            if (external) {
                view.prefix = null;
                view.openEditor("edit");
                busy = editing = externalEditing = true;
                input.pause();
                input.setRawMode(false);
                output.write("\x1b[?2004l\x1b[?25h\x1b[?1049l");
                let draft;
                try {
                    draft = await editExternal(view.input, { signal: editorAbort.signal });
                } finally {
                    externalEditing = false;
                    if (!closed) {
                        input.setRawMode(true);
                        input.resume();
                        output.write("\x1b[?1049h\x1b[?25l\x1b[?2004h");
                    }
                }
                if (draft === null || closed) view.mode = "browse";
                else {
                    try { await view.saveInput(draft); }
                    catch (error) { view.message = error.message ?? String(error); }
                }
            } else action = view.key(text, key);
            if (view.mode === "add" || view.mode === "edit") {
                busy = editing = true;
                while (!closed && (view.mode === "add" || view.mode === "edit")) {
                    const draft = await readTaskInput(view.input, { input, output, signal: editorAbort.signal, message: view.message });
                    if (draft === null || closed) { view.mode = "browse"; break; }
                    try { await view.saveInput(draft); }
                    catch (error) { view.message = error.message ?? String(error); }
                }
                editing = false;
                if (!closed) output.write("\x1b[?25l");
            }
            if (action?.then) {
                busy = true;
                draw();
                await action;
            }
        } catch (error) {
            if (editing) view.mode = "browse";
            view.message = error.message ?? String(error);
        } finally {
            if (editing) {
                editing = false;
                if (!closed) output.write("\x1b[?25l");
            }
            busy = false;
            if (refreshPending) void refreshLocal();
            draw();
        }
    };
    const wasRaw = input.isRaw ?? false;
    try {
        emitKeypressEvents(input);
        input.setRawMode(true);
        input.resume();
        output.write("\x1b[?1049h\x1b[?25l\x1b[?2004h");
        input.on("keypress", onKey);
        input.once("end", finish);
        output.on("resize", draw);
        process.on("SIGINT", onInterrupt);
        process.once("SIGTERM", finish);
        draw();
        api.start?.();
        await done;
    } finally {
        closed = true;
        editorAbort.abort();
        unsubscribe?.();
        api.cancel?.();
        input.off("keypress", onKey);
        input.off("end", finish);
        output.off("resize", draw);
        process.off("SIGINT", onInterrupt);
        process.off("SIGTERM", finish);
        input.setRawMode(wasRaw);
        input.pause();
        output.write("\x1b[?2004l\x1b[?25h\x1b[?1049l");
    }
}

function markdownNotes(value) {
    return String(value).replace(/\r\n?/g, "\n").split("\n").map(line => terminalText(line)).join("\n");
}

export function renderMarkdown(items, ids) {
    const children = new Map();
    for (const t of [...items].sort((a, b) => (a.position ?? "").localeCompare(b.position ?? ""))) {
        const pid = t.parent ?? null;
        if (!children.has(pid)) children.set(pid, []);
        children.get(pid).push(t);
    }

    const lines = [];

    function render(task, depth) {
        const indent = "  ".repeat(depth);
        const checked = task.status === "completed" ? "x" : " ";
        let line = `${indent}- [${checked}] ${terminalText(task.title || "(untitled)")}`;
        if (task.due) line += ` ${formatDue(task.due)}`;
        if (ids) line += `  ${formatId(task.id, ids)}`;
        if (task.notes) {
            line += `\n\n${markdownNotes(task.notes).split("\n").map(note => note ? `${indent}  ${note}` : "").join("\n")}\n`;
        }
        lines.push(line);
        for (const child of children.get(task.id) ?? []) {
            render(child, depth + 1);
        }
    }

    for (const task of children.get(null) ?? []) {
        render(task, 0);
    }

    return lines.join("\n");
}

export function viewMarkdown(tasks, parent = null, search = "", showCompleted = true) {
    const focused = parent ? tasks.find(task => task.id === parent) : null;
    const items = visibleTasks(tasks, parent, search, showCompleted).map(task => {
        const { depth, ...rest } = task;
        return rest.parent === parent ? { ...rest, parent: undefined } : rest;
    });
    return [
        focused ? `# ${terminalText(focused.title || "(untitled)")}${focused.due ? ` ${formatDue(focused.due)}` : ""}` : "",
        focused?.notes ? markdownNotes(focused.notes) : "",
        renderMarkdown(items),
    ].filter(Boolean).join("\n\n");
}

async function glowMarkdown(md) {
    await $`glow - < ${new Response(md)}`;
}

export async function writeMarkdown(md, output, { raw = false, runGlow } = {}) {
    if (!raw && (runGlow || (output === process.stdout && output.isTTY && Bun.which("glow")))) {
        await (runGlow ?? glowMarkdown)(md);
        return;
    }
    output.write(`${md}\n`);
}

async function presentMarkdown(md, { input, output } = {}) {
    const wasRaw = input.isRaw ?? true;
    output.write("\x1b[?2004l\x1b[?25h\x1b[?1049l");
    input.setRawMode(false);
    try {
        output.write(`${md}${md.endsWith("\n") ? "" : "\n"}\nPress any key to return.\n`);
        input.setRawMode(true);
        await new Promise(resolve => input.once("keypress", resolve));
    } finally {
        input.setRawMode(wasRaw);
        output.write("\x1b[?1049h\x1b[?25l\x1b[?2004h");
    }
}

// CLI filters return matches only; parent links stay intact in JSON.
function filterListTasks(tasks, { status, search, token = [] }) {
  const query = search?.toLowerCase();
  return tasks.filter(task => {
    const text = `${task.title ?? ""}\n${task.notes ?? ""}`;
    const tokens = new Set(text.match(/(?<![\p{L}\p{N}_#@-])[#@][\p{L}\p{N}_-]+/gu) ?? []);
    return (status === undefined || task.status === status)
      && (query === undefined || text.toLowerCase().includes(query))
      && token.every(value => tokens.has(value));
  });
}

async function moveTask(api, list, id, { parent = null, previous = null }) {
  const tasks = await api.list(list);
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (!byId.has(id)) throw new Error(`No task with ID ${JSON.stringify(id)} in this list.`);
  if (parent !== null && !byId.has(parent)) throw new Error(`No parent with ID ${JSON.stringify(parent)} in this list.`);
  if (subtreeIds(tasks, [id]).has(parent)) throw new Error("Cannot move a task under itself or its descendants.");
  if (previous !== null) {
    const sibling = byId.get(previous);
    if (previous === id || !sibling || (sibling.parent ?? null) !== parent) {
      throw new Error("--previous must be another task in the destination's siblings.");
    }
  }
  return api.move(list, id, { parent, previous });
}

const USAGE = `Usage: gtasks <command> [options]

  gtasks              Manage your default Google Tasks list
  gtasks lists [--json]                    List all task lists (id and name)
  gtasks list [list-id] [--cd NAME | --git] [--json] [--raw] Read tasks or a parent's subtree
  gtasks add --title TEXT [--notes TEXT] [--due DATE] [--parent TASK-ID] [--list LIST-ID] [--json]
  gtasks edit TASK-ID [--title TEXT] [--notes TEXT] [--due DATE] [--list LIST-ID] [--json]
  gtasks move TASK-ID (--parent PARENT-ID | --root) [--previous TASK-ID] [--list LIST-ID] [--json]
  gtasks done TASK-ID [--list LIST-ID] [--json]
  gtasks undone TASK-ID [--list LIST-ID] [--json]
  gtasks tui [list-id] [--cd NAME | --git]  Open the TUI
  gtasks auth         Sign in and save a refresh token in the OS key store
  --cd <search>       Enter a unique matching task title; otherwise filter at root
  --git               Focus the current git repo's root task (tui creates it if missing)
  --status STATUS     list: needsAction or completed (default: both)
  --search TEXT       list: case-insensitive substring in title or notes
  --token TOKEN       list: exact, case-sensitive #tag or @context; repeatable
  --raw               Print Markdown without glow
  --port <port>       OAuth callback port (default: random, for Desktop clients)
  -h, --help          Show help

Lists default to @default. --list also works with list and tui.
list --cd accepts a task ID or a unique title match, including completed tasks.
--git names the root task owner/repo for a GitHub remote (origin preferred), else hostname/directory; it cannot combine with --cd.
list --git reports nothing when that root task is missing; only tui creates it.
List filters combine with AND after --cd resolution; only matches are returned, without ancestors.
JSON retains IDs/parent links; Markdown promotes matches with omitted parents to the top level.
Tokens contain Unicode letters, numbers, underscores or hyphens, bounded by punctuation/space.
move preserves the task ID; omit --previous to place first among destination siblings.
An exact title match takes precedence over substring matches; ambiguous names fail.
--notes "" clears the description; --due "" clears the due date; omitted edit fields stay unchanged.
--due accepts YYYY-MM-DD, today, or tomorrow. Google Tasks stores dates only.
Agent commands use Google directly and wait for confirmation. The TUI uses its local queue.
JSON goes to stdout without Markdown rendering. list uses glow on a TTY unless --raw.
Errors go to stderr with exit code 1.

TUI: j/k or arrows move; V starts visual selection; Enter/l enters a task; h/Backspace goes up.
Ctrl+F / Ctrl+B scroll down / up one page. g? toggles help (hidden by default).
/ searches the current subtree, keeping ancestors visible; Esc clears the filter, visual, and yank/cut.
gg / G select first / last; gx opens the selected task in the default browser; gf opens found links, including a Keep note.
a adds here; o after; O before; e edits; Ctrl+E edits in $EDITOR; s sets due date; Enter inserts a newline; Ctrl+S saves; Esc cancels.
y yanks; Y copies Markdown with IDs; d cuts; D deletes with confirmation; y/d/D/Y apply to the visual selection; p pastes after; P pastes before.
gp copies a prompt for the current task or visual selection: Work on gtasks item ID1, ID2.
Space toggles; x done; u undone.
za toggles a fold; zc/zo close/open; zA/zC/zO apply recursively. A folded task shows two description lines and hides its children.
zm/zM fold by level (0 none, 1 child tasks, 2 all); zr/zR fold less/open all; level changes reset per-task folds.
. toggles completed tasks (hidden by default). , toggles task IDs (^id). g, copies the selected task ID.
m prints the focused, filtered list as raw Markdown.
r refreshes; q or Ctrl+C quits.

Seed credentials: bun run ev-secrets --google-tasks
See docs/gtasks.md for the gopass entry format and OAuth setup.`;

export async function main(args = process.argv.slice(2), { createApi = createGoogleTasks, output = process.stdout, runGlow, gitRepo = gitRepoName } = {}) {
    const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: {
            root: { type: "boolean" }, previous: { type: "string" },
            status: { type: "string" }, search: { type: "string" }, token: { type: "string", multiple: true },
            help: { type: "boolean", short: "h" }, port: { type: "string" }, cd: { type: "string" }, git: { type: "boolean" },
            json: { type: "boolean" }, raw: { type: "boolean" }, list: { type: "string" }, title: { type: "string" }, notes: { type: "string" }, parent: { type: "string" }, due: { type: "string" },
        },
    });
    const print = value => output.write(`${value}\n`);
    if (values.help) { print(USAGE); return; }
    const [command = "tui", target] = positionals;
    const allowed = {
        tui: ["list", "cd", "port", "git"], auth: ["port"], lists: ["json"], list: ["list", "cd", "git", "json", "raw", "status", "search", "token"],
        add: ["list", "title", "notes", "due", "parent", "json"], edit: ["list", "title", "notes", "due", "json"],
        move: ["list", "parent", "root", "previous", "json"],
        done: ["list", "json"], undone: ["list", "json"],
    };
    if (!allowed[command] || positionals.length > 2 || (["auth", "lists", "add"].includes(command) && target !== undefined)) throw new Error(USAGE);
    for (const key of Object.keys(values)) if (!allowed[command].includes(key)) throw new Error(`--${key} is not supported by ${command}.`);
    if (["edit", "done", "undone", "move"].includes(command) && !target?.trim()) throw new Error(`${command} requires a task ID.`);
    if (command === "add" && values.title === undefined) throw new Error("add requires --title TEXT.");
    if (values.title !== undefined && !values.title.trim()) throw new Error("Task title cannot be empty.");
    if (command === "edit" && values.title === undefined && values.notes === undefined && values.due === undefined) throw new Error("edit requires --title, --notes, or --due.");
    if (command === "move" && (values.parent !== undefined) === (values.root === true)) throw new Error("move requires exactly one of --parent PARENT-ID or --root.");
    if (values.status !== undefined && !["needsAction", "completed"].includes(values.status)) throw new Error("--status must be needsAction or completed.");
    for (const token of values.token ?? []) if (!/^[#@][\p{L}\p{N}_-]+$/u.test(token)) throw new Error("--token requires a #tag or @context containing letters, numbers, underscores or hyphens.");
    const due = values.due !== undefined ? parseDue(values.due) : undefined;
    for (const key of ["list", "parent", "cd", "previous", "search"]) if (values[key] !== undefined && !values[key].trim()) throw new Error(`--${key} cannot be empty.`);
    if (["list", "tui"].includes(command) && target !== undefined && values.list !== undefined) throw new Error("Use either a positional list ID or --list, not both.");
    if (values.git && values.cd !== undefined) throw new Error("Use either --git or --cd, not both.");
    const tasklist = values.list ?? (["list", "tui"].includes(command) ? target : undefined) ?? "@default";
    const port = values.port === undefined ? 0 : Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer from 0 to 65535.");
    if (command === "tui" && (!process.stdin.isTTY || !process.stdout.isTTY)) throw new Error("gtasks needs an interactive terminal. Use gtasks list for Markdown output.");
    const gitName = values.git ? await gitRepo(process.cwd()) : undefined;
    const api = await createApi({ login: command === "auth", port, interactive: ["auth", "tui"].includes(command) });
    try {
        if (command === "auth") { print("Google Tasks sign-in saved in the OS key store."); return; }
        if (command === "tui") {
            const local = await LocalGoogleTasks.open(api, tasklist);
            try {
                let focusId;
                if (values.git) focusId = (await ensureGitTask(api, local, tasklist, gitName)).id;
                await runTasksTui(local, tasklist, { cd: values.cd, focusId });
            }
            finally { local.cancel(); }
            return;
        }
        let data;
        let md;
        if (command === "lists") {
            data = (await api.lists()).map(list => ({ id: list.id, name: list.title }));
            md = data.map(list => `- ${terminalText(list.name)} (${list.id})`).join("\n");
        } else if (command === "list") {
            let items = await api.list(tasklist);
            let parent;
            if (values.git) {
                parent = findRootTask(items, gitName) ?? null;
                if (!parent) items = [];
            } else parent = values.cd === undefined ? null : matchTask(items, values.cd);
            const scoped = parent ? visibleTasks(items, parent.id, "", true).map(({ depth, ...task }) => task) : items;
            const tasks = filterListTasks(scoped, values);
            data = { listId: tasklist, parent, tasks };
            const filtered = values.status !== undefined || values.search !== undefined || values.token !== undefined;
            if (filtered) {
              const ids = new Set(tasks.map(task => task.id));
              const display = tasks.map(task => ids.has(task.parent) ? task : { ...task, parent: parent?.id });
              md = viewMarkdown(parent ? [parent, ...display] : display, parent?.id ?? null, "", true);
            } else md = viewMarkdown(items, parent?.id ?? null, "", true);
        } else {
            if (command === "move") data = await moveTask(api, tasklist, target, values);
            if (command === "add") data = await api.add(tasklist, values.title, values.parent ?? null, values.notes ?? "", undefined, due);
            if (command === "edit") data = await api.edit(tasklist, target, { title: values.title, notes: values.notes, due });
            if (command === "done" || command === "undone") data = await api.setDone(tasklist, target, command === "done");
            md = `ID: ${data.id}\n\n${renderMarkdown([{ ...data, parent: undefined }])}`;
        }
        if (values.json) { print(JSON.stringify(data, null, 2)); return; }
        if (command === "list") await writeMarkdown(md, output, { raw: values.raw, runGlow });
        else print(md);
    } finally {
        api.cancel?.();
    }
}

export function githubRepoName(url) {
    const text = String(url ?? "").trim();
    const match = text.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@\s/]+@)?github\.com(?::\d+)?[/:]([^/\s]+)\/([^/\s]+?)\/?$/i);
    if (!match) return null;
    const repo = match[2].replace(/\.git$/i, "");
    return repo ? `${match[1]}/${repo}` : null;
}

async function gitStdout(args) {
    const result = await $`git ${args}`.quiet().nothrow();
    return result.exitCode === 0 ? result.stdout.toString().trim() : "";
}

export async function gitRepoName(cwd = process.cwd(), run = gitStdout) {
    const top = await run(["-C", cwd, "rev-parse", "--show-toplevel"]);
    if (!top) throw new Error("--git requires a git repository. Run gtasks inside one.");
    const remotes = (await run(["-C", top, "remote"])).split("\n").map(name => name.trim()).filter(Boolean)
        .sort((a, b) => Number(b === "origin") - Number(a === "origin"));
    for (const remote of remotes) {
        const name = githubRepoName(await run(["-C", top, "remote", "get-url", remote]));
        if (name) return name;
    }
    return `${hostname()}/${basename(top)}`;
}

function findRootTask(tasks, title) {
    const query = title.trim().toLowerCase();
    return tasks.find(task => !task.parent && !task.deleted && (task.title ?? "").trim().toLowerCase() === query);
}

export async function ensureGitTask(remote, local, list, title) {
    // local.list() overlays queued unsynced additions, so checking it first avoids creating a duplicate.
    const localMatch = local ? findRootTask(await local.list(), title) : null;
    return localMatch ?? findRootTask(await remote.list(list), title) ?? remote.add(list, title, null, "");
}

export function matchTask(tasks, name) {
    const idMatch = tasks.find(task => task.id === name);
    if (idMatch) return idMatch;
    const query = name.trim().toLowerCase();
    const exact = tasks.filter(task => (task.title ?? "").toLowerCase() === query);
    const matches = exact.length ? exact : tasks.filter(task => (task.title ?? "").toLowerCase().includes(query));
    if (matches.length === 1) return matches[0];
    if (!matches.length) throw new Error(`No task matches ${JSON.stringify(name)}.`);
    throw new Error(`Multiple tasks match ${JSON.stringify(name)}. Use a task ID: ${matches.map(task => `${JSON.stringify(task.title)} (${task.id})`).join(", ")}`);
}

if (import.meta.main || Bun.isStandaloneExecutable) main().catch(error => {
    console.error(error.message ?? error);
    process.exitCode = 1;
});
