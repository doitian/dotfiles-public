#!/usr/bin/env bun
/**
 * Backup GitHub repos (shallow bare clones). Resumes from backup-github-remaining.txt on failure.
 * Port of backup-github.ps1
 */
import { readFile, writeFile, unlink } from "node:fs/promises";
import { $ } from "bun";
import { exists } from "./lib/fs.js";

const DUMP_FILE = "backup-github-remaining.txt";

const GH_QUERY = `query($endCursor: String) {
  viewer {
    repositories(first: 100, after: $endCursor, ownerAffiliations: OWNER, isFork: false) {
      nodes { nameWithOwner }
      pageInfo { endCursor hasNextPage }
    }
  }
}`;

async function getReposFromGh() {
  const jq = ".data.viewer.repositories.nodes[].nameWithOwner";
  const r =
    await $`gh api graphql --paginate -f ${`query=${GH_QUERY}`} --jq ${jq}`
      .quiet()
      .nothrow();
  if (r.exitCode !== 0)
    throw new Error(`gh api failed: ${r.stderr?.toString() ?? ""}`);
  const repos = (r.stdout?.toString() ?? "").trim().split("\n").filter(Boolean);
  if (repos.length === 0) throw new Error("No repos returned from gh api");
  return repos;
}

async function dumpRemaining(remaining) {
  if (remaining.size > 0) {
    console.warn(`Dumping ${remaining.size} remaining repos to ${DUMP_FILE}`);
    await writeFile(DUMP_FILE, [...remaining].join("\n") + "\n");
  }
}

async function main() {
  let repos;
  if (await exists(DUMP_FILE)) {
    console.log("Resuming from previous run...");
    repos = (await readFile(DUMP_FILE, "utf8"))
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    await unlink(DUMP_FILE);
  } else {
    repos = await getReposFromGh();
  }

  const remaining = new Set(repos);
  let hasError = false;

  process.on("SIGINT", async () => {
    console.warn("\nInterrupted.");
    await dumpRemaining(remaining);
    process.exit(1);
  });

  try {
    for (const repo of repos) {
      const repoUrl = `git@github.com:${repo}.git`;
      const repoDir = `${repo}.git`;
      if (await exists(`${repo}.ignore`)) {
        console.log(`Skipping ${repo}`);
        remaining.delete(repo);
        continue;
      }
      console.log(`Backing up ${repo}...`);
      if (!(await exists(repoDir))) {
        await $`git clone --bare --depth 1 ${repoUrl} ${repoDir}`;
      } else {
        await $`git -C ${repoDir} -c "safe.directory=*" fetch --depth 1`;
        await $`git -C ${repoDir} -c "safe.directory=*" update-ref HEAD FETCH_HEAD`;
      }
      remaining.delete(repo);
    }
  } catch (err) {
    console.error("Error:", err.message);
    hasError = true;
  } finally {
    await dumpRemaining(remaining);
  }

  if (hasError) process.exit(1);
}

main();
