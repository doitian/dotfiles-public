# Windows Notification Forwarding

## Prerequisites

- Windows 10 build 19041 (version 2004) or newer, in an interactive desktop session.
- Setup creates a per-user code-signing certificate (`CN=dn-pushover` in `CurrentUser\My`) if needed and imports the public cert into `CurrentUser\TrustedPeople`. MSIX deployment also requires that public cert in `LocalMachine\TrustedPeople`. Setup reads that store without elevation and skips the import if the cert is already present. If it is missing, setup tries to import it, then shows a one-time UAC prompt if that needs administrator rights (public cert only). The private key never leaves `CurrentUser\My`. It then packs a sparse identity MSIX with `makeappx`, signs it with `signtool`, and registers it with `Add-AppxPackage -ExternalLocation`. Organization policy can still block certificate trust or MSIX installation.
- Install the **.NET 10 SDK** before the first setup. No SDK is downloaded automatically. `dotnet --list-sdks` must show a stable `10.0.x` SDK. The first build uses NuGet to restore Windows SDK projections and self-contained .NET runtime/build assets, so it needs network access or populated caches. A separate .NET runtime is not needed afterward.
- Setup validates the Pushover user key and desktop-notification app token, prompting to store missing credentials when run interactively. Alternatively set `PUSHOVER_USER_KEY` and `PUSHOVER_DESKTOP_NOTIFICATION_TOKEN`.
- Accept the Windows notification-access consent prompt during setup. If denied, allow dn-pushover under **Settings > Privacy (or Privacy & security) > Notifications**, then retry. Run as the intended user, not as another user or a service.

### Install The SDK With Scoop

If Scoop is not installed, follow [Scoop's installation instructions](https://scoop.sh/). In a normal PowerShell terminal:

```powershell
scoop bucket add versions
scoop install versions/dotnet-sdk-lts
dotnet --list-sdks
```

The `versions/dotnet-sdk-lts` package currently installs .NET 10. Verify that the output includes `10.0.x`; a runtime alone is insufficient. If already installed, use `scoop update dotnet-sdk-lts`. Open a new terminal if `dotnet` is not found or still resolves to another installation.

### Windows SDK Tools

Setup needs `makeappx.exe` and `signtool.exe` from the Windows SDK (already present when Visual Studio or the Windows 10/11 SDK is installed). It does not enable Developer Mode.

## Lifecycle

Forwarded titles use `[DN][hostname]` on both platforms. Returning `[DN]` and legacy `[mako]` notifications are skipped, along with recognizable Pushover notifications.

```text
dn-pushover setup
dn-pushover teardown
dn-pushover teardown --cleanup
```

Setup builds the helper only if `%LOCALAPPDATA%\dn-pushover\app\dn-pushover-listener.exe` is absent, signs and registers the identity package, and launches the helper detached. An existing unsigned development package is replaced. A small WinForms window requests notification permission on the UI thread. Setup waits up to 120 seconds for consent and the initial notification baseline, reporting errors rather than claiming success on process launch alone. Repeated setup stops the previous helper and reuses the existing build. No login task, startup entry, or service is installed. After logout/reboot, run setup again.

Teardown signals a per-user named event and waits up to 30 seconds for the helper to release its mutex. An absent helper is a no-op. Normal teardown retains the build and package registration. `--cleanup` also unregisters the package and deletes the entire managed `%LOCALAPPDATA%\dn-pushover` directory. The next setup rebuilds. Cleanup is also the explicit way to rebuild after upgrading helper code. Do not store unrelated files in that directory.

Concurrent lifecycle commands are serialized by a per-user mutex (up to a ten-minute wait). Only one listener runs per user, including across desktop sessions; setup replaces it with a listener in the current session. Setup failures may leave build/package artifacts for a retry or cleanup, but a failed/timed-out launch is terminated. Teardown failure leaves the package/files intact.

## Forwarding

The helper polls toast notifications once per second. Notifications present when it starts form a baseline and are not forwarded. Notification ID and creation time deduplicate subsequent polls, with a bounded 16,384-entry in-memory history. There is no persistent backlog, retry queue, or exactly-once guarantee: notifications removed between polls can be missed, forwarding failures are not retried, and restarting baselines all currently visible notifications. Slow forwarding can also delay polls. Access revocation or listener API errors stop the helper; rerun setup after fixing the cause.

The helper invokes the configured CLI with `--forward` and sends one UTF-8 JSON object on stdin:

```json
{"title":"Toast title","message":"Remaining toast text","app":"Application display name","appId":"Application user model ID"}
```

The main JS entrypoint owns the `[DN][hostname]` prefix, loop/Pushover filtering, credentials, truncation, and delivery. Empty message text falls back to the title there. Each child has a 30-second forwarding timeout. The helper never calls Pushover directly. `%LOCALAPPDATA%\dn-pushover\config.json` contains only the executable path and argument array, not credentials. In Bun source mode this is `process.execPath` plus the absolute script entrypoint; in a compiled Bun executable the virtual `$bunfs` or `B:/~BUN/` entrypoint is omitted. Keep the CLI (and source tree/Bun in source mode) at that location, or rerun setup after moving it. Child processes inherit the helper's setup-time environment; prefer stored credentials if environment credentials will change.

Runtime failures are recorded in the size-limited `listener.log` in the managed directory. It deliberately excludes notification contents, child output, and secrets. Windows consent gives this app broad access to toast notifications, which may contain sensitive information; enable forwarding only if delivery of that content to Pushover is acceptable.

## Integration

Import `configureWindows` from `src/lib/dn-windows.js` and await `configureWindows(action, cleanup = false)` from the main CLI. Check credentials before calling it for setup, not teardown. The module embeds its C#, project, manifests, and PowerShell via Bun text imports, so it can be included in a standalone Bun build without shipping sidecar source assets. It does not install or run anything on import.
