#!/usr/bin/env python3
"""
Install compound-engineering workflow into the current project folder.

Usage:
    python install.py [--target /path/to/project]

This script copies:
    - skills/* to .claude/skills/
    - commands/* to .cursor/commands/ and .config/opencode/commands/
    - agents/* to .cursor/agents/ and .config/opencode/agents/
"""

import argparse
import shutil
import sys
from pathlib import Path


def get_script_dir() -> Path:
    """Get the directory where this script is located."""
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


def install_workflow(target_dir: Path, dry_run: bool = False) -> None:
    """Install the compound-engineering workflow to the target directory."""
    script_dir = get_script_dir()

    print(f"Installing compound-engineering workflow")
    print(f"  Source: {script_dir}")
    print(f"  Target: {target_dir}")
    if dry_run:
        print("  Mode: DRY RUN (no files will be copied)")
    print()

    # Define source directories
    skills_src = script_dir / "skills"
    commands_src = script_dir / "commands"
    agents_src = script_dir / "agents"

    # Define target directories
    targets = {
        "skills": [
            target_dir / ".claude" / "skills",
        ],
        "commands": [
            target_dir / ".cursor" / "commands",
            target_dir / ".config" / "opencode" / "commands",
        ],
        "agents": [
            target_dir / ".cursor" / "agents",
            target_dir / ".config" / "opencode" / "agents",
        ],
    }

    total_copied = 0

    # Copy skills
    print("Installing skills to .claude/skills/...")
    for dst in targets["skills"]:
        copied = copy_recursive(skills_src, dst, dry_run)
        total_copied += len(copied)
    print()

    # Copy commands
    print("Installing commands to .cursor/commands/ and .config/opencode/commands/...")
    for dst in targets["commands"]:
        copied = copy_recursive(commands_src, dst, dry_run)
        total_copied += len(copied)
    print()

    # Copy agents
    print("Installing agents to .cursor/agents/ and .config/opencode/agents/...")
    for dst in targets["agents"]:
        copied = copy_recursive(agents_src, dst, dry_run)
        total_copied += len(copied)
    print()

    if dry_run:
        print(f"Dry run complete. Would copy {total_copied} files.")
    else:
        print(f"Installation complete. Copied {total_copied} files.")

    print()
    print("Available commands:")
    print("  /compound-brainstorm  - Explore requirements through dialogue")
    print("  /compound-plan        - Create structured implementation plans")
    print("  /compound-work        - Execute work plans efficiently")
    print("  /compound-review      - Multi-agent code review")
    print("  /compound-docs        - Document solved problems")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Install compound-engineering workflow into a project folder."
    )
    parser.add_argument(
        "--target", "-t",
        type=Path,
        default=Path.cwd(),
        help="Target project directory (default: current directory)"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Show what would be copied without actually copying"
    )

    args = parser.parse_args()

    target = args.target.resolve()

    if not target.exists():
        print(f"Error: Target directory does not exist: {target}")
        return 1

    if not target.is_dir():
        print(f"Error: Target is not a directory: {target}")
        return 1

    install_workflow(target, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
