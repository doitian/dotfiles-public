import { basename, delimiter, dirname, isAbsolute } from "node:path";

export async function unwrapShim(executable) {
  if (!executable.toLowerCase().endsWith(".exe")) return executable;
  try {
    const shim = await Bun.file(executable.replace(/\.exe$/i, ".shim")).text();
    const target = /^\s*path\s*=\s*"([^"\r\n]+)"\s*$/.exec(shim)?.[1];
    if (target && isAbsolute(target) && await Bun.file(target).exists()) return target;
  } catch { }
  return executable;
}

const commands = new Map();

export function resolveCommand(name) {
  if (process.platform !== "win32") return Promise.resolve(name);
  if (!commands.has(name)) commands.set(name, unwrapShim(Bun.which(name) ?? name));
  return commands.get(name);
}

export async function runFzf(args, loadInput, spawn = Bun.spawn) {
  const [fzfCommand, tmuxCommand] = await Promise.all([
    resolveCommand("fzf"), resolveCommand("tmux"),
  ]);
  const env = { ...process.env };
  if (isAbsolute(tmuxCommand) && basename(tmuxCommand).toLowerCase() === "tmux.exe") {
    const pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
    env[pathKey] = `${dirname(tmuxCommand)}${delimiter}${env[pathKey] ?? ""}`;
  }
  const fzf = spawn([fzfCommand, ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env,
  });
  const output = Promise.all([fzf.exited, new Response(fzf.stdout).text()]);
  const input = (async () => {
    try {
      const text = await loadInput();
      if (fzf.exitCode !== null) return;
      fzf.stdin.write(text);
      await fzf.stdin.end();
    } catch (error) {
      if (fzf.exitCode !== null) return;
      throw error;
    }
  })();
  try {
    const [code, stdout] = await Promise.race([output, input.then(() => output)]);
    return { code, stdout };
  } finally {
    if (fzf.exitCode === null) fzf.kill();
  }
}
