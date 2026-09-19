# Herdr plugins

Each plugin has its own directory containing `herdr-plugin.toml`, `index.js`,
and any local modules. Manifest commands use `"./plugin"` as their executable.

`mise run build` compiles each entrypoint into
`dist/herdr-plugins/<name>/plugin` (`plugin.exe` on Windows), copies its README,
and writes a manifest with the platform's executable name. Changes anywhere in
the plugin directory invalidate its build. Keep runtime code in that directory
so the package is self-contained.

Windows `setup.ps1` and Linux `manage.sh install` link these built directories
with `herdr plugin link`. To build and register one manually:

```sh
bun scripts/build-herdr-plugins.js
herdr plugin link ./dist/herdr-plugins/last-tab
```

Build on each target platform. Re-run setup or link the package again after
changing its manifest. New Herdr servers run plugin startup hooks; see the
plugin's README for initializing an already-running session.
