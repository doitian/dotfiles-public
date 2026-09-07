using System.Diagnostics;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using Windows.Security.Authorization.AppCapabilityAccess;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

namespace DnPushover;

internal sealed record Invocation(string Executable, string[] Arguments);

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length != 4 || args[0] != "--config" || args[2] != "--ready") return 2;
        string ready = args[3];
        string root = Path.GetDirectoryName(args[1])!;
        string name = @"Global\dn-pushover-" + WindowsIdentity.GetCurrent().User!.Value;
        using var mutex = new Mutex(false, name + "-running");
        string running = Path.Combine(root, "running.json");
        bool owned = false;
        try
        {
            try { owned = mutex.WaitOne(0); }
            catch (AbandonedMutexException) { owned = true; }
            if (!owned) throw new InvalidOperationException("A notification listener is already running.");
            using var stop = new EventWaitHandle(false, EventResetMode.ManualReset, name + "-stop");
            stop.Reset();
            File.WriteAllText(running, JsonSerializer.Serialize(new { Pid = Environment.ProcessId }));
            if (Windows.ApplicationModel.Package.Current.Id.Name != "DnPushover.NotificationListener")
                throw new InvalidOperationException("The helper has an unexpected package identity. Run teardown --cleanup and setup again.");
            var invocation = JsonSerializer.Deserialize<Invocation>(File.ReadAllText(args[1]))
                ?? throw new InvalidOperationException("Missing invocation configuration.");
            if (!Path.IsPathFullyQualified(invocation.Executable) || invocation.Arguments is null)
                throw new InvalidOperationException("Invalid invocation configuration.");
            ApplicationConfiguration.Initialize();
            using var form = new ListenerForm(invocation, ready, root);
            // Create the HWND before registering the stop callback, including during consent.
            _ = form.Handle;
            var registration = ThreadPool.RegisterWaitForSingleObject(stop, (_, _) =>
            {
                try { form.BeginInvoke((Action)(() => form.Close())); }
                catch (InvalidOperationException) { }
            }, null, Timeout.Infinite, true);
            try { Application.Run(form); }
            finally { registration.Unregister(null); }
            return form.Failed ? 1 : 0;
        }
        catch (Exception error)
        {
            Report(ready, new { Error = error.Message });
            return 1;
        }
        finally
        {
            if (owned)
            {
                try { File.Delete(running); }
                finally { mutex.ReleaseMutex(); }
            }
        }
    }

    internal static void Report(string path, object status)
    {
        File.WriteAllText(path + ".tmp", JsonSerializer.Serialize(status));
        File.Move(path + ".tmp", path, true);
    }
}

internal sealed class ListenerForm : Form
{
    private readonly Invocation invocation;
    private readonly string ready;
    private readonly string log;
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 1000 };
    private readonly CancellationTokenSource stopping = new();
    private readonly HashSet<string> seen = [];
    private readonly Queue<string> history = [];
    private readonly Label status;
    private readonly Button allow;
    private UserNotificationListener? listener;
    private bool polling;
    private bool initialized;
    private Process? forwarder;
    internal bool Failed { get; private set; }

    internal ListenerForm(Invocation invocation, string ready, string root)
    {
        this.invocation = invocation;
        this.ready = ready;
        log = Path.Combine(root, "listener.log");
        Text = "dn-pushover";
        ClientSize = new System.Drawing.Size(520, 220);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        TopMost = true;
        status = new Label
        {
            Bounds = new System.Drawing.Rectangle(16, 16, 488, 140),
            Text = "dn-pushover needs access to other apps' notifications to forward them to Pushover.\n\nClick Allow Access and accept the Windows permission prompt. If no prompt appears, enable dn-pushover under Settings > Privacy > Notifications.",
        };
        allow = new Button
        {
            Text = "Allow Access",
            Bounds = new System.Drawing.Rectangle(360, 170, 144, 32),
        };
        allow.Click += async (_, _) =>
        {
            if (allow.Text == "Open Settings")
            {
                Process.Start(new ProcessStartInfo("ms-settings:privacy-notifications") { UseShellExecute = true });
                allow.Text = "Allow Access";
                return;
            }
            await RequestAccessAsync();
        };
        Controls.Add(status);
        Controls.Add(allow);
        allow.Enabled = false;
        Shown += (_, _) =>
        {
            var delay = new System.Windows.Forms.Timer { Interval = 600 };
            delay.Tick += (_, _) =>
            {
                delay.Stop();
                delay.Dispose();
                if (!IsDisposed && !initialized) allow.Enabled = true;
            };
            delay.Start();
        };
        timer.Tick += (_, _) => _ = PollAsync();
        FormClosing += (_, _) =>
        {
            timer.Stop();
            stopping.Cancel();
            if (!initialized && !Failed)
            {
                Failed = true;
                Program.Report(ready, new { Error = "Notification access was not granted." });
            }
            if (forwarder is { HasExited: false })
            {
                try { forwarder.Kill(true); forwarder.WaitForExit(5000); }
                catch (InvalidOperationException) { }
            }
        };
    }

    private async Task RequestAccessAsync()
    {
        allow.Enabled = false;
        try
        {
            listener = UserNotificationListener.Current;
            try
            {
                var capability = AppCapability.Create("userNotificationListener");
                try { WinRT.Interop.InitializeWithWindow.Initialize(capability, Handle); } catch (Exception) { }
                await capability.RequestAccessAsync();
            }
            catch (Exception error) { Log("AppCapability request: " + error.GetType().Name); }
            var access = listener.GetAccessStatus();
            if (access != UserNotificationListenerAccessStatus.Allowed)
                access = await listener.RequestAccessAsync();
            if (stopping.IsCancellationRequested) return;
            if (access == UserNotificationListenerAccessStatus.Denied)
            {
                status.Text = "Windows denied notification access. Enable dn-pushover under Settings > Privacy > Notifications, then click Allow Access again.";
                allow.Text = "Open Settings";
                allow.Enabled = true;
                return;
            }
            if (access != UserNotificationListenerAccessStatus.Allowed)
            {
                status.Text = "The Windows permission prompt was dismissed. Click Allow Access again and choose Allow.";
                allow.Enabled = true;
                return;
            }
            var baseline = await listener.GetNotificationsAsync(NotificationKinds.Toast);
            if (stopping.IsCancellationRequested) return;
            foreach (var notification in baseline) Remember(Key(notification));
            listener.NotificationChanged += (_, _) =>
            {
                try { BeginInvoke(new Action(() => _ = PollAsync())); }
                catch (InvalidOperationException) { }
            };
            initialized = true;
            Program.Report(ready, new { Ready = true });
            TopMost = false;
            ShowInTaskbar = false;
            Opacity = 0;
            timer.Start();
            Log($"Listener ready; {baseline.Count} existing toast(s) will not be forwarded.");
        }
        catch (Exception error) { Fail(error); }
        finally { if (!initialized && !Failed) allow.Enabled = true; }
    }

    private static string[] TextOf(UserNotification notification)
    {
        var visual = notification.Notification?.Visual;
        if (visual is null) return [];
        var binding = visual.GetBinding(KnownNotificationBindings.ToastGeneric)
            ?? visual.Bindings.FirstOrDefault();
        if (binding is null) return [];
        return binding.GetTextElements()
            .Select(item => item.Text?.Trim() ?? "")
            .Where(item => item.Length > 0)
            .ToArray();
    }

    private static string Key(UserNotification notification) =>
        $"{notification.Id}:{notification.CreationTime.UtcTicks}";

    private bool Remember(string key)
    {
        if (!seen.Add(key)) return false;
        history.Enqueue(key);
        // Keep a session history so dismissal/reappearance cannot immediately replay a toast.
        while (history.Count > 16384) seen.Remove(history.Dequeue());
        return true;
    }

    private async Task PollAsync()
    {
        if (polling || stopping.IsCancellationRequested) return;
        polling = true;
        try
        {
            if (listener!.GetAccessStatus() != UserNotificationListenerAccessStatus.Allowed)
            {
                Log("Notification access is not allowed; waiting.");
                return;
            }
            var notifications = await listener.GetNotificationsAsync(NotificationKinds.Toast);
            foreach (var notification in notifications.OrderBy(item => item.CreationTime))
            {
                if (stopping.IsCancellationRequested) return;
                try
                {
                    if (!Remember(Key(notification))) continue;
                    var text = TextOf(notification);
                    if (text.Length == 0)
                    {
                        Log("Skipped a notification with no toast text.");
                        continue;
                    }
                    string app = "";
                    string appId = "";
                    try
                    {
                        app = notification.AppInfo?.DisplayInfo?.DisplayName ?? "";
                        appId = notification.AppInfo?.AppUserModelId ?? "";
                    }
                    catch (Exception) { }
                    await ForwardAsync(JsonSerializer.Serialize(new
                    {
                        title = text[0],
                        message = string.Join("\n", text.Skip(1)),
                        app,
                        appId,
                    }));
                }
                catch (OperationCanceledException) when (stopping.IsCancellationRequested) { return; }
                catch (Exception error) { Log("Forward failed: " + error.GetType().Name); }
            }
        }
        catch (Exception error)
        {
            Log("Poll failed: " + error.GetType().Name + ": " + error.Message);
        }
        finally { polling = false; }
    }

    private async Task ForwardAsync(string json)
    {
        var start = new ProcessStartInfo(invocation.Executable)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = new UTF8Encoding(false),
            WorkingDirectory = Path.GetDirectoryName(invocation.Executable)!,
        };
        foreach (string argument in invocation.Arguments) start.ArgumentList.Add(argument);
        start.ArgumentList.Add("--forward");
        using var process = Process.Start(start) ?? throw new InvalidOperationException("Could not start dn-pushover.");
        forwarder = process;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stopping.Token);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));
        try
        {
            // Drain without logging notification text, credentials, or child diagnostics.
            var stdout = process.StandardOutput.BaseStream.CopyToAsync(Stream.Null, timeout.Token);
            var stderr = process.StandardError.BaseStream.CopyToAsync(Stream.Null, timeout.Token);
            await process.StandardInput.WriteAsync(json.AsMemory(), timeout.Token);
            process.StandardInput.Close();
            await process.WaitForExitAsync(timeout.Token);
            await Task.WhenAll(stdout, stderr);
            if (process.ExitCode != 0) Log($"Forward exited with code {process.ExitCode}.");
        }
        finally
        {
            if (!process.HasExited)
            {
                process.Kill(true);
                await process.WaitForExitAsync();
            }
            forwarder = null;
        }
    }

    private void Fail(Exception error)
    {
        if (stopping.IsCancellationRequested) return;
        Failed = true;
        if (!initialized) Program.Report(ready, new { Error = error.Message });
        Log("Listener stopped: " + error.GetType().Name + ": " + error.Message);
        Close();
    }

    private void Log(string message)
    {
        try
        {
            if (File.Exists(log) && new FileInfo(log).Length > 65536) File.WriteAllText(log, "");
            File.AppendAllText(log, $"{DateTimeOffset.UtcNow:O} {message}\n");
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { timer.Dispose(); stopping.Dispose(); }
        base.Dispose(disposing);
    }
}
