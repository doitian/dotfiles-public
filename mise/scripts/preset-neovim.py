#!/usr/bin/env python3
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


def get_mise_env() -> dict:
    """Get mise env variables as JSON."""
    import json

    try:
        result = subprocess.run(
            ["mise", "env", "-J"],
            capture_output=True,
            text=True,
        )
        return json.loads(result.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, FileNotFoundError):
        return {}


def escape_lua_string(s: str) -> str:
    """Escape a string for use in Lua."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def generate_mise_section(shims_path: str, mise_env: dict) -> str:
    """Generate the Lua code for mise environment setup."""
    lines = ["--- mise"]
    lines.append(
        f'vim.env.PATH = "{escape_lua_string(shims_path)}" .. ":" .. vim.env.PATH'
    )

    # Add other env vars from mise env (excluding PATH and Path)
    for key, value in sorted(mise_env.items()):
        if key not in ("PATH", "Path"):
            lines.append(f'vim.env.{key} = "{escape_lua_string(value)}"')

    lines.append("---")
    return "\n".join(lines)


def main():
    mise_shims_path = get_mise_shims_path()
    if mise_shims_path is None:
        print("Error: Could not find mise shims path", file=sys.stderr)
        sys.exit(1)

    mise_env = get_mise_env()
    mise_section = generate_mise_section(mise_shims_path, mise_env)

    # Target file
    lazy_file = Path(".lazy.lua")

    if lazy_file.exists():
        content = lazy_file.read_text()

        # Check if there's an existing mise section to replace
        pattern = r"--- mise\n.*?\n---"
        if re.search(pattern, content, re.DOTALL):
            # Replace existing section
            new_content = re.sub(pattern, mise_section, content, flags=re.DOTALL)
        else:
            # Insert before return {} or at the beginning
            return_match = re.search(r"^return\s*\{\s*\}\s*$", content, re.MULTILINE)
            if return_match:
                new_content = (
                    content[: return_match.start()]
                    + mise_section
                    + "\n\n"
                    + content[return_match.start() :]
                )
            else:
                # Prepend if no return {} found
                new_content = mise_section + "\n\n" + content
    else:
        # Create new file
        new_content = mise_section + "\n\nreturn {}\n"

    lazy_file.write_text(new_content)

    print(
        f"Updated {lazy_file} with mise shims path and environment variables: {mise_shims_path}"
    )


if __name__ == "__main__":
    main()
