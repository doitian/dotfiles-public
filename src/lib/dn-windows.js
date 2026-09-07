import { spawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import program from "./dn-windows/Program.cs" with { type: "text" };
import project from "./dn-windows/Listener.csproj" with { type: "text" };
import manifest from "./dn-windows/app.manifest" with { type: "text" };
import packageManifest from "./dn-windows/AppxManifest.xml" with { type: "text" };
import lifecycle from "./dn-windows/lifecycle.ps1" with { type: "text" };

export async function configureWindows(action, cleanup = false) {
  if (process.platform !== "win32") throw new Error("The Windows backend requires Windows");
  if (!["setup", "teardown"].includes(action) || (cleanup && action !== "teardown")) {
    throw new Error("Expected setup or teardown [--cleanup]");
  }
  if (!process.env.LOCALAPPDATA || !isAbsolute(process.env.LOCALAPPDATA)) {
    throw new Error("LOCALAPPDATA must be an absolute path");
  }
  // Bun standalone keeps argv[1] in /$bunfs/ (Unix) or B:/~BUN/ (Windows).
  const entry = process.argv[1];
  const standalone = entry && /^(?:[a-z]:)?\/(?:\$bunfs|~BUN)\//i.test(entry.replaceAll("\\", "/"));
  if (action === "setup" && !entry) throw new Error("Cannot determine the dn-pushover entrypoint");
  const request = {
    Action: action,
    Cleanup: cleanup,
    Root: resolve(process.env.LOCALAPPDATA, "dn-pushover"),
    Architecture: process.arch,
    InvocationJson: JSON.stringify({
      Executable: process.execPath,
      Arguments: standalone || !entry ? [] : [resolve(entry)],
    }),
    Assets: {
      "Program.cs": program,
      "Listener.csproj": project,
      "app.manifest": manifest,
      "AppxManifest.xml": packageManifest,
      "global.json": JSON.stringify({ sdk: { version: "10.0.100", rollForward: "latestFeature" } }),
    },
    Script: lifecycle,
  };
  const bootstrap = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  & ([scriptblock]::Create($request.Script)) $request
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}`;
  const child = spawn("powershell.exe", [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand",
    Buffer.from(bootstrap, "utf16le").toString("base64"),
  ], { windowsHide: true, stdio: ["pipe", "inherit", "inherit"] });
  await new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.stdin.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`Windows ${action} failed (exit ${code}); see the diagnostic above`)));
    child.stdin.end(JSON.stringify(request));
  });
}
