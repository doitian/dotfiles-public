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
      nodes {
        nameWithOwner
        defaultBranchRef { target { oid } }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
}`;

/** @returns {{ repo: string, sha: string }[]} */
async function getReposFromGh() {
  const jq = ".data.viewer.repositories.nodes[]";
  const r =
    await $`gh api graphql --paginate -f ${`query=${GH_QUERY}`} --jq ${jq}`
      .quiet()
      .nothrow();
  if (r.exitCode !== 0)
    throw new Error(`gh api failed: ${r.stderr?.toString() ?? ""}`);
  const lines = (r.stdout?.toString() ?? "").trim().split("\n").filter(Boolean);
  if (lines.length === 0) throw new Error("No repos returned from gh api");
  return lines.map((line) => {
    const node = JSON.parse(line);
    return {
      repo: node.nameWithOwner,
      sha: node.defaultBranchRef?.target?.oid ?? "",
    };
  });
}

/** @param {Map<string, string>} remaining */
async function dumpRemaining(remaining) {
  if (remaining.size > 0) {
    console.warn(`Dumping ${remaining.size} remaining repos to ${DUMP_FILE}`);
    const lines = [...remaining].map(([repo, sha]) => `${repo}\t${sha}`);
    await writeFile(DUMP_FILE, lines.join("\n") + "\n");
  }
}

async function main() {
  /** @type {{ repo: string, sha: string }[]} */
  let repos;
  if (await exists(DUMP_FILE)) {
    console.log("Resuming from previous run...");
    repos = (await readFile(DUMP_FILE, "utf8"))
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [repo, sha = ""] = line.split("\t");
        return { repo, sha };
      });
    await unlink(DUMP_FILE);
  } else {
    repos = await getReposFromGh();
  }

  const remaining = new Map(repos.map(({ repo, sha }) => [repo, sha]));
  let hasError = false;

  process.on("SIGINT", async () => {
    console.warn("\nInterrupted.");
    await dumpRemaining(remaining);
    process.exit(1);
  });

  try {
    for (const { repo, sha: remoteSha } of repos) {
      const repoUrl = `git@github.com:${repo}.git`;
      const repoDir = `${repo}.git`;
      if (await exists(`${repo}.ignore`)) {
        console.log(`Skipping ${repo}`);
        remaining.delete(repo);
        continue;
      }
      if (!remoteSha) {
        console.log(`Skipping ${repo} (empty repo)`);
        remaining.delete(repo);
        continue;
      }
      if (!(await exists(repoDir))) {
        console.log(`Cloning ${repo}...`);
        await $`git clone --bare --depth 1 ${repoUrl} ${repoDir}`;
      } else {
        const localSha = (
          await $`git -C ${repoDir} -c "safe.directory=*" rev-parse HEAD`
            .quiet()
            .nothrow()
        ).stdout
          ?.toString()
          .trim();
        if (localSha && remoteSha && localSha === remoteSha) {
          console.log(`Skipping ${repo} (up to date)`);
          remaining.delete(repo);
          continue;
        }
        console.log(`Fetching ${repo}...`);
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
