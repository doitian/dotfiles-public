#!/usr/bin/env node
/**
 * Backup GitHub repos (shallow bare clones). Resumes from backup-github-remaining.txt on failure.
 * Port of backup-github.ps1
 */
import { readFile, writeFile, unlink } from "node:fs/promises";
import { exists } from "./lib/fs.js";
import { run } from "./lib/run.js";

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
  const r = await run("gh", ["api", "graphql", "--paginate", "-f", `query=${GH_QUERY}`], { capture: true });
  if (r.status !== 0) throw new Error(`gh api failed: ${r.stderr}`);
  const chunks = r.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const repos = [];
  for (const chunk of chunks) {
    const nodes = chunk?.data?.viewer?.repositories?.nodes;
    if (nodes) for (const n of nodes) repos.push(n.nameWithOwner);
  }
  return repos;
}

async function main() {
  let repos;
  if (await exists(DUMP_FILE)) {
    console.log("Resuming from previous run...");
    repos = (await readFile(DUMP_FILE, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    await unlink(DUMP_FILE);
  } else {
    repos = await getReposFromGh();
  }

  const remaining = new Set(repos);
  let hasError = false;

  try {
    for (const repo of repos) {
      const repoUrl = `git@github.com:${repo}.git`;
      if (await exists(`${repo}.ignore`)) {
        console.log(`Skipping ${repo}`);
        remaining.delete(repo);
        continue;
      }
      console.log(`Backing up ${repo}...`);
      if (!(await exists(`${repo}.git`))) {
        const r = await run("git", ["clone", "--bare", "--depth", "1", repoUrl, `${repo}.git`]);
        if (r.status !== 0) throw new Error(`git clone failed with exit code ${r.status}`);
      } else {
        let r = await run("git", ["-C", `${repo}.git`, "-c", "safe.directory=*", "fetch", "--depth", "1"]);
        if (r.status !== 0) throw new Error(`git fetch failed with exit code ${r.status}`);
        r = await run("git", ["-C", `${repo}.git`, "-c", "safe.directory=*", "update-ref", "HEAD", "FETCH_HEAD"]);
        if (r.status !== 0) throw new Error(`git update-ref failed with exit code ${r.status}`);
      }
      remaining.delete(repo);
    }
  } catch (err) {
    console.error("Error:", err.message);
    hasError = true;
  } finally {
    if (remaining.size > 0) {
      console.warn(`Dumping ${remaining.size} remaining repos to ${DUMP_FILE}`);
      await writeFile(DUMP_FILE, [...remaining].join("\n") + "\n");
    }
  }

  if (hasError) process.exit(1);
}

main();
