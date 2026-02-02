#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from pathlib import Path


def get_mise_shims_path() -> str | None:
    """Get mise shims path using mise activate fish --shims."""
    try:
        result = subprocess.run(
            ["mise", "activate", "fish", "--shims"],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.splitlines():
            # Match both quoted and unquoted paths
            match = re.match(r"^fish_add_path .* (?:'([^']+)'|(\S+))$", line)
            if match:
                path = match.group(1) or match.group(2)
                if "shims" in path:
                    return path
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    return None


def detect_platform() -> str:
    """Detect the current platform."""
    if sys.platform == "darwin":
        return "osx"
    elif sys.platform == "win32" or sys.platform == "cygwin":
        return "windows"
    return "linux"


def get_mise_env() -> dict:
    """Get mise env variables as JSON."""
    try:
        result = subprocess.run(
            ["mise", "env", "-J"],
            capture_output=True,
            text=True,
        )
        return json.loads(result.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, FileNotFoundError):
        return {}


def main():
    mise_shims_path = get_mise_shims_path()
    if mise_shims_path is None:
        print("Error: Could not find mise shims path", file=sys.stderr)
        sys.exit(1)
    platform = detect_platform()

    # Create .vscode directory if it doesn't exist
    vscode_dir = Path(".vscode")
    vscode_dir.mkdir(exist_ok=True)

    settings_file = vscode_dir / "settings.json"

    # Read current settings
    try:
        settings = json.loads(settings_file.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        settings = {}

    # Determine the key based on platform
    env_key = f"terminal.integrated.env.{platform}"

    # Get mise env variables
    mise_env = get_mise_env()

    # Update settings
    if env_key not in settings:
        settings[env_key] = {}

    settings[env_key]["PATH"] = f"{mise_shims_path}:${{env:PATH}}"

    # Merge other env vars from mise env (excluding PATH and Path)
    for key, value in mise_env.items():
        if key not in ("PATH", "Path"):
            settings[env_key][key] = value

    # If Cargo.toml exists, configure rust-analyzer with the same environment
    if Path("Cargo.toml").exists():
        settings["rust-analyzer.cargo.extraEnv"] = settings[env_key].copy()
        del settings["rust-analyzer.cargo.extraEnv"]["PATH"]

    # Write back
    settings_file.write_text(json.dumps(settings, indent=2) + "\n")

    print(
        f"Updated {settings_file} with mise shims path and environment variables "
        f"for {platform}: {mise_shims_path}"
    )


if __name__ == "__main__":
    main()
