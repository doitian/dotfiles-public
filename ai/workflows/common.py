"""
Shared utilities for workflow install scripts.

Used by superpowers/install.py and compound-engineering/install.py.
"""

import json
import shutil
from pathlib import Path


def get_workflows_dir() -> Path:
    """Return the ai/workflows directory (parent of this module)."""
    return Path(__file__).parent.resolve()


def copy_recursive(src: Path, dst: Path, dry_run: bool = False) -> list[Path]:
    """
    Recursively copy contents from src to dst.

    Returns list of copied files.
    """
    copied = []

    if not src.exists():
        print(f"  Warning: Source does not exist: {src}")
        return copied

    for item in src.rglob("*"):
        rel_path = item.relative_to(src)
        dst_path = dst / rel_path

        if item.is_dir():
            if dry_run:
                print(f"  Would create dir: {rel_path}/")
            else:
                dst_path.mkdir(parents=True, exist_ok=True)
        elif item.is_file():
            if dry_run:
                print(f"  Would copy: {rel_path}")
            else:
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dst_path)
                print(f"  Copied: {rel_path}")

            copied.append(dst_path)

    return copied


def copy_file(src: Path, dst: Path, dry_run: bool = False) -> bool:
    """Copy a single file. Returns True if copied (or would be copied)."""
    if not src.exists() or not src.is_file():
        print(f"  Warning: Source file does not exist: {src}")
        return False
    if dry_run:
        print(f"  Would copy: {src.name} -> {dst}")
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  Copied: {src.name} -> {dst}")
    return True


# Tool mapping source filenames (relative to workflows dir)
OPENCODE_TOOL_MAPPING = "claude-to-opencode-tool-mapping.md"
CURSOR_TOOL_MAPPING = "cluade-to-cursor-tool-mapping.md"
OPENCODE_INSTRUCTIONS_GLOB = ".opencode/rules/*"


def install_tool_mappings(target_dir: Path, dry_run: bool = False) -> int:
    """
    Install Claude→OpenCode and Claude→Cursor tool mapping rules.

    - Copies claude-to-opencode-tool-mapping.md to target/.opencode/rules/
    - Copies cluade-to-cursor-tool-mapping.md to target/.cursor/rules/
    - Ensures opencode.json exists with instructions including ".opencode/rules/*"

    Returns number of files written/copied.
    """
    workflows_dir = get_workflows_dir()
    count = 0

    # OpenCode rule -> .opencode/rules/
    opencode_src = workflows_dir / OPENCODE_TOOL_MAPPING
    opencode_rules_dir = target_dir / ".opencode" / "rules"
    opencode_dst = opencode_rules_dir / OPENCODE_TOOL_MAPPING
    print("Installing OpenCode tool mapping to .opencode/rules/...")
    if copy_file(opencode_src, opencode_dst, dry_run):
        count += 1
    print()

    # Cursor rule -> .cursor/rules/
    cursor_src = workflows_dir / CURSOR_TOOL_MAPPING
    cursor_rules_dir = target_dir / ".cursor" / "rules"
    cursor_dst = cursor_rules_dir / CURSOR_TOOL_MAPPING
    print("Installing Cursor tool mapping to .cursor/rules/...")
    if copy_file(cursor_src, cursor_dst, dry_run):
        count += 1
    print()

    # opencode.json with instructions: [".opencode/rules/*"]
    opencode_json = target_dir / "opencode.json"
    print("Ensuring opencode.json instructions include .opencode/rules/*...")
    if dry_run:
        print("  Would create or update opencode.json")
        count += 1
    else:
        if opencode_json.exists():
            try:
                data = json.loads(opencode_json.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                data = {}
        else:
            data = {}
        instructions = list(data.get("instructions", []))
        if OPENCODE_INSTRUCTIONS_GLOB not in instructions:
            instructions.append(OPENCODE_INSTRUCTIONS_GLOB)
            data["instructions"] = instructions
            if "$schema" not in data:
                data["$schema"] = "https://opencode.ai/config.json"
            opencode_json.write_text(
                json.dumps(data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print("  Updated opencode.json")
        else:
            print("  opencode.json already includes .opencode/rules/*")
        count += 1
    print()

    return count
