import { fileURLToPath } from "node:url";

export async function runBun(source, input = "") {
  const child = Bun.spawn([process.execPath, "--eval", source], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    stdin: new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}
