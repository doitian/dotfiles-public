#!/usr/bin/env bun
import { $ } from "bun";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { recordFocus, lastVisited } from "./history.js";

async function main() {
  const stateDir = process.env.HERDR_PLUGIN_STATE_DIR;
  const socket = process.env.HERDR_SOCKET_PATH;
  if (!stateDir || !socket) {
    throw new Error("Run this helper through the Herdr last-tab plugin.");
  }
  const herdr = process.env.HERDR_BIN_PATH || "herdr";
  const call = async (...args) => JSON.parse(await $`${herdr} ${args}`.text()).result;
  await mkdir(stateDir, { recursive: true });
  const session = createHash("sha256").update(socket).digest("hex");
  const db = new Database(join(stateDir, `${session}.sqlite`));
  db.exec("PRAGMA busy_timeout = 10000");
  db.exec(
    "CREATE TABLE IF NOT EXISTS history (workspace TEXT PRIMARY KEY, tabs TEXT NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS workspace_history (id INTEGER PRIMARY KEY CHECK (id = 1), workspaces TEXT NOT NULL)",
  );
  const read = (workspace) => JSON.parse(
    db.query("SELECT tabs FROM history WHERE workspace = ?").get(workspace)?.tabs || "[]",
  );
  const write = (workspace, tabs) => db.query(
    "INSERT OR REPLACE INTO history VALUES (?, ?)",
  ).run(workspace, JSON.stringify(tabs));
  const readWorkspaces = () => JSON.parse(
    db.query("SELECT workspaces FROM workspace_history WHERE id = 1").get()?.workspaces || "[]",
  );
  const writeWorkspaces = (workspaces) => db.query(
    "INSERT OR REPLACE INTO workspace_history VALUES (1, ?)",
  ).run(JSON.stringify(workspaces));

  db.exec("BEGIN IMMEDIATE");
  try {
    const action = process.argv[2];
    if (action === "initialize") {
      const { snapshot } = await call("api", "snapshot");
      db.exec("DELETE FROM history");
      for (const workspace of snapshot.workspaces) {
        write(workspace.workspace_id, [workspace.active_tab_id]);
      }
      writeWorkspaces(snapshot.focused_workspace_id ? [snapshot.focused_workspace_id] : []);
    } else if (action === "record") {
      const { data } = JSON.parse(process.env.HERDR_PLUGIN_EVENT_JSON || "{}");
      if (data?.type === "tab_focused") {
        write(data.workspace_id, recordFocus(read(data.workspace_id), data.tab_id));
      } else if (data?.type === "tab_closed") {
        write(
          data.workspace_id,
          read(data.workspace_id).filter((id) => id !== data.tab_id),
        );
      } else if (data?.type === "workspace_closed") {
        db.query("DELETE FROM history WHERE workspace = ?").run(data.workspace_id);
        writeWorkspaces(readWorkspaces().filter((id) => id !== data.workspace_id));
      } else if (data?.type === "workspace_focused") {
        writeWorkspaces(recordFocus(readWorkspaces(), data.workspace_id));
      }
    } else if (action === "toggle") {
      const context = JSON.parse(process.env.HERDR_PLUGIN_CONTEXT_JSON || "{}");
      const workspace = context.workspace_id || process.env.HERDR_WORKSPACE_ID;
      if (!workspace) throw new Error("No workspace in the plugin invocation context.");
      const { tabs } = await call("tab", "list", "--workspace", workspace);
      const current = tabs.find((tab) => tab.focused)?.tab_id;
      if (!current) throw new Error("No active tab in this workspace.");
      const history = recordFocus(read(workspace), current);
      const target = lastVisited(history, current, tabs.map((tab) => tab.tab_id));
      if (target) {
        await call("tab", "focus", target);
        write(workspace, recordFocus(history, target));
      } else {
        write(workspace, history);
      }
    } else if (action === "toggle-workspace") {
      const { workspaces } = await call("workspace", "list");
      const current = workspaces.find((workspace) => workspace.focused)?.workspace_id;
      if (!current) throw new Error("No active workspace.");
      const history = recordFocus(readWorkspaces(), current);
      const target = lastVisited(history, current, workspaces.map((workspace) => workspace.workspace_id));
      if (target) {
        await call("workspace", "focus", target);
        writeWorkspaces(recordFocus(history, target));
      } else {
        writeWorkspaces(history);
      }
    } else {
      throw new Error("Usage: herdr-last-tab <initialize|record|toggle|toggle-workspace>");
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
