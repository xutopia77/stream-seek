#!/usr/bin/env python3
"""
Directory tree viewer with depth limit and ignore patterns.
Usage: python tree.py [path] [depth] [-o OUTPUT]
       python tree.py                    # Show current directory, all depth
       python tree.py src 2              # Show src directory, depth=2
       python tree.py . -o tree.txt      # Output to file
"""

# ==================== Configuration ====================
IGNORE_DIRS = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    "__pycache__",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "coverage",
    ".cache",
    "vendor",
}

IGNORE_FILES = {
    ".gitignore",
    ".gitattributes",
    ".DS_Store",
    "Thumbs.db",
    ".env",
    ".env.local",
    ".env.*.local",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".package-lock.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}

IGNORE_PATTERNS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".so",
    ".dll",
    ".exe",
    ".log",
}

TREE_CHARS = {
    "branch": "├── ",
    "last": "└── ",
    "vertical": "│   ",
    "space": "    ",
}
# =======================================================

import os
import sys


def should_ignore_dir(name: str) -> bool:
    return name in IGNORE_DIRS


def should_ignore_file(name: str) -> bool:
    if name in IGNORE_FILES:
        return True
    for pattern in IGNORE_PATTERNS:
        if name.endswith(pattern):
            return True
    return False


def print_tree(
    path: str,
    depth: int = -1,
    prefix: str = "",
    current_depth: int = 0,
    show_files: bool = True,
    output_file=None,
):
    """Print directory tree with depth limit."""
    if depth >= 0 and current_depth > depth:
        return

    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        _print(f"{prefix}[Permission Denied]", output_file)
        return

    dirs = [e for e in entries if os.path.isdir(os.path.join(path, e)) and not should_ignore_dir(e)]
    files = [e for e in entries if os.path.isfile(os.path.join(path, e)) and not should_ignore_file(e)]

    for i, d in enumerate(dirs):
        is_last_dir = (i == len(dirs) - 1) and (len(files) == 0 or not show_files)
        connector = TREE_CHARS["last"] if is_last_dir else TREE_CHARS["branch"]
        _print(f"{prefix}{connector}{d}/", output_file)

        new_prefix = prefix + (TREE_CHARS["space"] if is_last_dir else TREE_CHARS["vertical"])
        print_tree(os.path.join(path, d), depth, new_prefix, current_depth + 1, show_files, output_file)

    if show_files:
        for i, f in enumerate(files):
            is_last = i == len(files) - 1
            connector = TREE_CHARS["last"] if is_last else TREE_CHARS["branch"]
            _print(f"{prefix}{connector}{f}", output_file)


def _print(text: str, output_file=None):
    """Print to stdout or file."""
    if output_file:
        output_file.write(text + "\n")
    else:
        print(text)


def print_help():
    print(__doc__)
    print("Options:")
    print("  path        Directory path to display (default: current directory)")
    print("  depth       Maximum depth to display (default: -1 for unlimited)")
    print("  -o, --output FILE   Write output to file (UTF-8 encoding)")
    print("  -h, --help  Show this help message")
    print()
    print("Examples:")
    print("  python tree.py                    # Show current directory, all depth")
    print("  python tree.py src 2              # Show src directory, depth=2")
    print("  python tree.py . -o tree.txt      # Write output to tree.txt")
    print("  python tree.py . -o ./output/tree.txt  # Write to nested path")


def main():
    args = sys.argv[1:]

    if args and args[0] in ["-h", "--help", "help"]:
        print_help()
        sys.exit(0)

    # Parse arguments
    output_path = None
    if "-o" in args:
        idx = args.index("-o")
        if idx + 1 < len(args):
            output_path = args[idx + 1]
            args = args[:idx] + args[idx + 2:]
    elif "--output" in args:
        idx = args.index("--output")
        if idx + 1 < len(args):
            output_path = args[idx + 1]
            args = args[:idx] + args[idx + 2:]

    path = args[0] if len(args) > 0 else "."
    depth = int(args[1]) if len(args) > 1 else -1

    path = os.path.abspath(path)

    if not os.path.exists(path):
        print(f"Error: Path '{path}' does not exist")
        sys.exit(1)

    if not os.path.isdir(path):
        print(f"Error: '{path}' is not a directory")
        sys.exit(1)

    depth_str = "all" if depth < 0 else str(depth)

    # Output to file or stdout
    if output_path:
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"{path} (depth={depth_str})\n\n")
            print_tree(path, depth, output_file=f)
        print(f"Output written to: {os.path.abspath(output_path)}")
    else:
        print(f"{path} (depth={depth_str})")
        print()
        print_tree(path, depth)


if __name__ == "__main__":
    main()
