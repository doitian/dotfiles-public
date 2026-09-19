# Last active tab and workspace

`prefix+l` toggles between the two most recently focused tabs in the current
workspace. Tab focus events update the history, so pane changes do not replace
the previous tab. Closed tabs are skipped. Each session and workspace has its
own history.

`prefix+tab` toggles between the two most recently focused workspaces.
Changing tabs or panes within a workspace does not replace the previous
workspace. Closed workspaces are skipped.

`prefix+shift+j` / `prefix+shift+k` cycle to the next / previous workspace.
The tmux config uses the same shortcuts for last / next / previous session.

Both actions can also be invoked from the command line:

```sh
herdr plugin action invoke dotfiles.last-tab.toggle
herdr plugin action invoke dotfiles.last-tab.toggle-workspace
```

Requires Herdr 0.9.1 or later, Bun, and mise. Build separately on each platform;
the Windows executable cannot run on Linux.

## Build and install

From the public dotfiles repository root:

```sh
mise run build
herdr plugin link ./dist/herdr-plugins/last-tab
```

Windows `setup.ps1` and Linux `manage.sh install` build and link all plugins
automatically when mise, Bun, and Herdr are available. The build packages the
manifest and executable together; the Herdr server does not need the repo's
`dist` directory on PATH to run this plugin.

For a plugin-only rebuild, run `bun scripts/build-herdr-plugins.js`. Link the
built directory again after changing the manifest. The source directory is
not an installable package until its executable has been built.

## Activate and verify

With Herdr running, execute these commands in each existing session where you
want to use the plugin:

```sh
herdr plugin action invoke dotfiles.last-tab.initialize
herdr config check
herdr server reload-config
herdr plugin log list --plugin dotfiles.last-tab --limit 5
```

Registration is shared by all local sessions. New servers initialize history
automatically; linking a plugin does not run its startup hook in an existing
server. Initialization resets that session's history, so it is a setup command,
not something to run before each toggle.

The active Herdr config needs these bindings:

```toml
[[keys.command]]
key = "prefix+l"
type = "plugin_action"
command = "dotfiles.last-tab.toggle"
description = "last active tab"

[[keys.command]]
key = "prefix+tab"
type = "plugin_action"
command = "dotfiles.last-tab.toggle-workspace"
description = "last active workspace"
```

With the repo's `prefix = "ctrl+q"`, select another tab and press Ctrl-Q, then
`l` to return. Press it again to switch back.
Use Ctrl-Q, then Tab for the corresponding workspace toggle.

## History

History begins when the plugin is enabled and initialized; earlier visits cannot
be recovered. Startup resets history to each workspace's active tab and the
active workspace. State lives in Herdr's plugin state directory, in a separate SQLite file for each session
socket. Focus history is shared by clients attached to the same session.

Herdr invokes event hooks asynchronously, so allow a focus change to settle
before toggling; rapid overlapping focus changes can be recorded out of order.

To upgrade an existing installation, rebuild the helper, run `herdr plugin link`
again using the built directory above, and reload the config. Existing
tab history is preserved; workspace history starts with newly observed focus
events. Running `initialize` instead seeds both histories from the current
session and clears earlier visits.
