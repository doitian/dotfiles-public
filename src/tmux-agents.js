#!/usr/bin/env bun
/**
 * List AI agents running in tmux sessions. Uses fzf for filtering with a
 * preview pane showing captured tmux output and process details.
 */
import { $ } from "bun";
import { parseArgs } from "node:util";

const AGENTS = [
    {
        name: "opencode",
        match: /opencode/,
        runningPattern: /esc interrupt/,
    },
    {
        name: "cursor-agent",
        match: /cursor-agent|cursor.*agent/,
        runningPattern: /working|thinking|generating/i,
    },
    {
        name: "copilot",
        match: /gh\s+copilot|copilot.*agent|github-copilot/,
        runningPattern: /working|thinking|generating/i,
    },
];

async function getTmuxPanes() {
    const fmt = [
        "#{session_name}",
        "#{window_index}",
        "#{pane_index}",
        "#{pane_pid}",
        "#{pane_current_path}",
        "#{window_name}",
        "#{pane_title}",
    ].join("\t");
    const r = await $`tmux list-panes -a -F ${fmt}`.nothrow().quiet();
    if (r.exitCode !== 0) return [];
    return r.stdout
        .toString()
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [session, winIdx, paneIdx, pid, cwd, winName, ...titleParts] = line.split("\t");
            return {
                target: `${session}:${winIdx}.${paneIdx}`,
                session,
                winIdx,
                paneIdx,
                pid: parseInt(pid, 10),
                cwd,
                winName,
                title: titleParts.join("\t"),
            };
        });
}

function getForegroundCmdline(panePid) {
    try {
        const stat = readFileSync(`/proc/${panePid}/stat`, "utf8");
        // tpgid is field 8 (1-indexed); skip comm which may contain spaces/parens
        const afterComm = stat.slice(stat.lastIndexOf(")") + 2);
        const fields = afterComm.split(" ");
        // fields[0]=state [1]=ppid [2]=pgrp [3]=session [4]=tty_nr [5]=tpgid
        const tpgid = parseInt(fields[5], 10);
        if (!tpgid || tpgid < 0) return null;
        const raw = readFileSync(`/proc/${tpgid}/cmdline`);
        return { pid: tpgid, cmdline: new TextDecoder().decode(raw).replaceAll("\0", " ").trim() };
    } catch {
        return null;
    }
}

import { readFileSync } from "node:fs";
import { basename } from "node:path";

function getGitBranch(cwd) {
    try {
        const r = Bun.spawnSync(["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], {
            stdout: "pipe",
            stderr: "ignore",
        });
        if (r.success) return r.stdout.toString().trim();
    } catch {}
    return "";
}

function matchAgent(cmdline) {
    if (/tmux-agents/.test(cmdline)) return null;
    for (const agent of AGENTS) {
        if (agent.match.test(cmdline)) return agent;
    }
    return null;
}

function detectStatus(paneTarget, agent) {
    const r = Bun.spawnSync(
        ["tmux", "capture-pane", "-t", paneTarget, "-p", "-S", "-5"],
        { stdout: "pipe", stderr: "ignore" },
    );
    if (!r.success) return "running";
    const tail = r.stdout.toString();
    return agent.runningPattern.test(tail) ? "running" : "waiting";
}

async function discoverAgents() {
    const panes = await getTmuxPanes();
    const entries = [];

    for (const pane of panes) {
        const fg = getForegroundCmdline(pane.pid);
        if (!fg) continue;
        const agent = matchAgent(fg.cmdline);
        if (!agent) continue;
        entries.push({
            agent: agent.name,
            pane,
            pid: fg.pid,
            cmdline: fg.cmdline,
            status: detectStatus(pane.target, agent),
            dir: basename(pane.cwd),
            branch: getGitBranch(pane.cwd),
        });
    }

    return entries;
}

// fzf line: {1}=pane_target {2}=agent {3}=status {4}=dir {5}=branch {6}=title
function formatLine(entry) {
    return [
        entry.pane.target,
        entry.agent,
        entry.status,
        entry.dir,
        entry.branch,
        entry.pane.title,
    ].join("\t");
}

const USAGE = `tmux-agents - List AI agents running in tmux sessions

Usage:
  tmux-agents              Interactive fzf picker with preview
  tmux-agents --list       Plain text list (no fzf)

Detected agents: opencode, cursor-agent, copilot (gh copilot)`;

async function main() {
    const { values } = parseArgs({
        options: {
            list: { type: "boolean", short: "l" },
            help: { type: "boolean", short: "h" },
        },
    });

    if (values.help) {
        console.log(USAGE);
        return;
    }

    const entries = await discoverAgents();

    if (values.list) {
        const nameW = Math.max(5, ...entries.map((a) => a.agent.length));
        const statusW = 7;
        const dirW = Math.max(3, ...entries.map((a) => a.dir.length));
        const branchW = Math.max(6, ...entries.map((a) => a.branch.length));
        const paneW = Math.max(4, ...entries.map((a) => a.pane.target.length));
        for (const a of entries) {
            const title = a.pane.title || "";
            console.log(
                `${a.agent.padEnd(nameW)}  ${a.status.padEnd(statusW)}  ${a.dir.padEnd(dirW)}  ${a.branch.padEnd(branchW)}  ${a.pane.target.padEnd(paneW)}  ${title}`,
            );
        }
        if (!entries.length) {
            console.log("No agents running.");
        }
        return;
    }

    if (!Bun.which("fzf")) {
        console.error("fzf not found");
        process.exit(127);
    }

    if (!entries.length) {
        console.log("No agents running.");
        return;
    }

    const lines = entries.map(formatLine).join("\n");
    const preview = "tmux capture-pane -p -e -t '={1}'";

    const fzf = Bun.spawn(
        [
            "fzf",
            "--delimiter=\t",
            "--with-nth=2,3,4,5,6",
            "--header=AGENT\tSTATUS\tDIR\tBRANCH\tTITLE",
            "--preview", preview,
            "--preview-window=up:80%:wrap",
            "--ansi",
            "--no-mouse",
        ],
        {
            stdin: "pipe",
            stdout: "pipe",
            stderr: "inherit",
            env: process.env,
        },
    );
    fzf.stdin.write(lines);
    fzf.stdin.end();

    const code = await fzf.exited;
    if (code === 0) {
        const selected = (await new Response(fzf.stdout).text()).trim();
        const paneTarget = selected.split("\t")[0];
        await $`tmux switch-client -t ${paneTarget}`.nothrow().quiet();
    }
    process.exit(code === 130 ? 0 : code);
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
