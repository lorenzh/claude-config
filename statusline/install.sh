#!/bin/bash
# Installs the statusline for Claude Code: copies the two scripts into
# ~/.claude, makes them executable, and adds the "statusLine" key to
# ~/.claude/settings.json. Safe to re-run.
#
# It never carries credentials. The Azure DevOps segment is optional and reads
# its configuration from the environment on the host where it runs.
#
# Usage:
#   ./install.sh            install and patch settings.json
#   ./install.sh --print    only print the settings.json snippet, change nothing
#   ./install.sh --force    replace an existing, different statusLine setting
set -eu

SRC=$(cd -- "$(dirname -- "$0")" && pwd)
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"

# The command points at the directory the scripts are actually installed in.
# For the default location that is written as $HOME/.claude, which stays valid
# when the settings file is copied to another machine or another user.
case "$CLAUDE_DIR" in
    "$HOME/.claude") TARGET='$HOME/.claude' ;;
    "$HOME/"*)       TARGET='$HOME/'${CLAUDE_DIR#"$HOME/"} ;;
    *)               TARGET="$CLAUDE_DIR" ;;
esac
CMD="bash \"$TARGET/statusline-command.sh\""
SNIPPET="\"statusLine\": { \"type\": \"command\", \"command\": $(printf '%s' "$CMD" | sed 's/\\/\\\\/g; s/"/\\"/g; s/^/"/; s/$/"/') }"

MODE=install
case "${1:-}" in
    --print) MODE=print ;;
    --force) MODE=force ;;
    "") ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
esac

if [ "$MODE" = "print" ]; then
    echo "Add this to $SETTINGS:"
    echo "  $SNIPPET"
    exit 0
fi

mkdir -p "$CLAUDE_DIR"
cp "$SRC/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
cp "$SRC/azure-devops-fetch.sh" "$CLAUDE_DIR/azure-devops-fetch.sh"
chmod +x "$CLAUDE_DIR/statusline-command.sh" "$CLAUDE_DIR/azure-devops-fetch.sh"
echo "scripts installed -> $CLAUDE_DIR"

[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"

if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 not found — settings.json was NOT changed. Add this key by hand:" >&2
    echo "  $SNIPPET" >&2
    exit 1
fi

python3 - "$SETTINGS" "$CMD" "$MODE" <<'PY'
import json, shutil, sys

path, cmd, mode = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(path) as f:
        data = json.load(f)
except ValueError:
    print(f"{path} is not valid JSON — nothing was changed.", file=sys.stderr)
    sys.exit(1)
except OSError as err:
    print(f"cannot read {path}: {err}", file=sys.stderr)
    sys.exit(1)
if not isinstance(data, dict):
    print(f"{path} does not hold a JSON object — nothing was changed.", file=sys.stderr)
    sys.exit(1)

wanted = {"type": "command", "command": cmd}
current = data.get("statusLine")
if current == wanted:
    print(f"statusLine already set in {path} — nothing to do.")
    sys.exit(0)
if current is not None and mode != "force":
    print(f"{path} already has a different statusLine:", file=sys.stderr)
    print("  " + json.dumps(current), file=sys.stderr)
    print("Run with --force to replace it, or set it by hand to:", file=sys.stderr)
    print("  " + json.dumps(wanted), file=sys.stderr)
    sys.exit(1)

shutil.copyfile(path, path + ".bak")
data["statusLine"] = wanted
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"statusLine written -> {path} (backup: {path}.bak)")
PY

# Report anything the statusline or its fetcher needs but cannot find.
for tool in git bash; do
    command -v "$tool" >/dev/null 2>&1 || echo "WARNING: '$tool' not on PATH — statusline will degrade" >&2
done
if ! stat -c %Y "$SETTINGS" >/dev/null 2>&1 && ! stat -f %m "$SETTINGS" >/dev/null 2>&1; then
    echo "WARNING: neither 'stat -c %Y' nor 'stat -f %m' works here — cache-age checks will misbehave" >&2
fi
if [ -n "${CLAUDE_STATUSLINE_ADO_ORG:-}" ] && [ -n "${CLAUDE_STATUSLINE_ADO_PROJECT:-}" ]; then
    for tool in curl jq; do
        command -v "$tool" >/dev/null 2>&1 || \
            echo "NOTE: '$tool' missing — Azure DevOps counts stay at 0" >&2
    done
    if [ -z "${CLAUDE_STATUSLINE_ADO_PAT:-${AZURE_DEVOPS_EXT_PAT:-}}" ] && ! command -v az >/dev/null 2>&1; then
        echo "NOTE: no PAT in the environment and no 'az' CLI — Azure DevOps counts stay at 0" >&2
    fi
else
    echo "NOTE: CLAUDE_STATUSLINE_ADO_ORG / _PROJECT unset — the Azure DevOps segment stays off." >&2
fi
