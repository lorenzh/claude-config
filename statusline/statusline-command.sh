#!/bin/bash
#
# Claude Code statusline.
#
# Reads the statusline JSON on stdin and prints one line:
#   time | CPU/MEM/SWAP | account | project | git | tokens | context | cost | model
#
# It never calls the network and never takes .git/index.lock.

# Never take .git/index.lock for status polling — this statusline runs on a
# timer and would otherwise race with the user's real git commands, causing
# "Unable to create '.git/index.lock': File exists" errors.
export GIT_OPTIONAL_LOCKS=0

# Force a C decimal point. Under a comma-decimal locale (de_DE), printf "%.2f"
# rejects the JSON's "1.23" outright — and still emits "1,00" before failing, so
# the || fallback appends to it and the cost renders as "1,000.00".
export LC_NUMERIC=C

# The CPU gauge needs one small state file between invocations.
cache_dir="${CLAUDE_STATUSLINE_CACHE_DIR:-$HOME/.cache/claude-statusline}"
mkdir -p "$cache_dir" 2>/dev/null

# Read JSON input from stdin
input=$(cat)

# Extract values using grep/sed (no jq dependency on the hot path)
extract_json_string() {
    echo "$input" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed 's/.*":"\([^"]*\)"/\1/'
}

extract_json_number() {
    echo "$input" | grep -o "\"$1\":[0-9]*" | head -1 | sed 's/.*://'
}

# Extract nested workspace.project_dir first
workspace_project_dir=$(echo "$input" | grep -o '"workspace"[^}]*"project_dir":"[^"]*"' | grep -o '"project_dir":"[^"]*"' | sed 's/.*":"\([^"]*\)"/\1/')
workspace_current_dir=$(echo "$input" | grep -o '"workspace"[^}]*"current_dir":"[^"]*"' | grep -o '"current_dir":"[^"]*"' | sed 's/.*":"\([^"]*\)"/\1/')

# Use workspace values if available, fallback to old extraction
full_path="$workspace_project_dir"
[ -z "$full_path" ] && full_path="$workspace_current_dir"
[ -z "$full_path" ] && full_path=$(extract_json_string "project_dir")
[ -z "$full_path" ] && full_path=$(extract_json_string "current_dir")

project_dir=$(basename "$full_path")

# Claude Code subscription account email — extract ONLY the emailAddress field
# from ~/.claude.json (never tokens or other session data).
logged_in_user=$(grep -o '"emailAddress"[[:space:]]*:[[:space:]]*"[^"]*"' "$HOME/.claude.json" 2>/dev/null | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)"/\1/')
[ -z "$logged_in_user" ] && logged_in_user="unknown"

model_name=$(extract_json_string "display_name")
effort=$(echo "$input" | grep -o '"effort":{"level":"[^"]*"' | sed 's/.*:"\([^"]*\)"/\1/')
input_tokens=$(extract_json_number "total_input_tokens")
output_tokens=$(extract_json_number "total_output_tokens")
used_percentage=$(extract_json_number "used_percentage")

# Extract cost (handle decimal)
cost_raw=$(echo "$input" | grep -o '"total_cost_usd":[0-9.]*' | head -1 | sed 's/.*://')
current_time=$(date +%H:%M)

# Default values if extraction failed
[ -z "$project_dir" ] && project_dir="unknown"
[ -z "$model_name" ] && model_name="unknown"
[ -z "$input_tokens" ] && input_tokens=0
[ -z "$output_tokens" ] && output_tokens=0
[ -z "$used_percentage" ] && used_percentage=0
[ -z "$cost_raw" ] && cost_raw="0"

# Format cost to 2 decimal places
cost_fmt=$(printf "%.2f" "$cost_raw" 2>/dev/null || echo "0.00")

# Format large numbers with k suffix
format_tokens() {
    local num=$1
    if [ "$num" -ge 1000 ] 2>/dev/null; then
        echo "$((num / 1000))k"
    else
        echo "$num"
    fi
}

input_tokens_fmt=$(format_tokens "$input_tokens")
output_tokens_fmt=$(format_tokens "$output_tokens")

# Color codes. Real escape characters, not backslash sequences: the finished
# line is printed with a constant format string and "%s", so a "%" in a branch
# or directory name cannot be read as a conversion specifier.
CYAN=$'\033[0;36m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
BLUE=$'\033[0;34m'
MAGENTA=$'\033[0;35m'
GRAY=$'\033[0;90m'
ORANGE=$'\033[38;5;208m'
RESET=$'\033[0m'

# --- System resource gauges: CPU / Memory / Swap usage, color-coded ---
# CPU: delta against the previous invocation's /proc/stat snapshot (cached in
# a dotfile) — no sleep, the interval between statusline renders IS the
# sample window.
cpu_cache="$cache_dir/cpu-cache"
cpu_pct=0
if [ -r /proc/stat ]; then
    read -r _ c_user c_nice c_sys c_idle c_iowait c_irq c_softirq c_steal _ < /proc/stat
    cur_idle=$((c_idle + c_iowait))
    cur_total=$((c_user + c_nice + c_sys + c_idle + c_iowait + c_irq + c_softirq + c_steal))
    if [ -f "$cpu_cache" ]; then
        read -r prev_idle prev_total < "$cpu_cache" 2>/dev/null
        diff_idle=$((cur_idle - prev_idle))
        diff_total=$((cur_total - prev_total))
        if [ "$diff_total" -gt 0 ] 2>/dev/null; then
            cpu_pct=$(( (diff_total - diff_idle) * 100 / diff_total ))
        fi
    fi
    echo "$cur_idle $cur_total" > "$cpu_cache" 2>/dev/null
fi

# Memory / Swap: instantaneous snapshot from /proc/meminfo
mem_pct=0
swap_pct=0
if [ -r /proc/meminfo ]; then
    mem_total=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
    mem_avail=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
    swap_total=$(awk '/^SwapTotal:/{print $2}' /proc/meminfo)
    swap_free=$(awk '/^SwapFree:/{print $2}' /proc/meminfo)
    if [ -n "$mem_total" ] && [ "$mem_total" -gt 0 ] 2>/dev/null; then
        mem_pct=$(( (mem_total - mem_avail) * 100 / mem_total ))
    fi
    if [ -n "$swap_total" ] && [ "$swap_total" -gt 0 ] 2>/dev/null; then
        swap_pct=$(( (swap_total - swap_free) * 100 / swap_total ))
    fi
fi

# Determine color for context usage
if [ "$used_percentage" -ge 80 ] 2>/dev/null; then
    CONTEXT_COLOR=$RED
elif [ "$used_percentage" -ge 60 ] 2>/dev/null; then
    CONTEXT_COLOR=$YELLOW
else
    CONTEXT_COLOR=$GREEN
fi

# Gauge color: gray (idle) -> green (normal) -> yellow (elevated) -> red (critical)
gauge_color() {
    local pct=$1
    if [ "$pct" -lt 25 ] 2>/dev/null; then printf '%s' "$GRAY"
    elif [ "$pct" -lt 60 ] 2>/dev/null; then printf '%s' "$GREEN"
    elif [ "$pct" -lt 85 ] 2>/dev/null; then printf '%s' "$YELLOW"
    else printf '%s' "$RED"
    fi
}

CPU_COLOR=$(gauge_color "$cpu_pct")
MEM_COLOR=$(gauge_color "$mem_pct")
SWAP_COLOR=$(gauge_color "$swap_pct")
sys_status="${CPU_COLOR}C${cpu_pct}%${RESET} ${MEM_COLOR}M${mem_pct}%${RESET} ${SWAP_COLOR}S${swap_pct}%${RESET}"

# Get git information if in a git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
    git_dir=$(git rev-parse --git-dir 2>/dev/null)
    branch=$(git branch --show-current 2>/dev/null || echo "detached")
    upstream=$(git rev-parse --abbrev-ref @{u} 2>/dev/null)
    ahead=0
    behind=0
    if [ -n "$upstream" ]; then
        ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
        behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)
    fi

    # staged / unstaged / untracked split (plumbing, no index.lock)
    staged=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
    unstaged=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
    untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

    git_status="${GREEN}${branch}${RESET}"
    [ "$ahead" -gt 0 ] && git_status="${git_status} ${CYAN}↑${ahead}${RESET}"
    [ "$behind" -gt 0 ] && git_status="${git_status} ${YELLOW}↓${behind}${RESET}"
    [ "$staged" -gt 0 ] && git_status="${git_status} ${GREEN}●${staged}${RESET}"
    [ "$unstaged" -gt 0 ] && git_status="${git_status} ${YELLOW}+${unstaged}${RESET}"
    [ "$untracked" -gt 0 ] && git_status="${git_status} ${GRAY}?${untracked}${RESET}"

    # Surface a stale/active index.lock instead of discovering it on commit
    [ -n "$git_dir" ] && [ -f "$git_dir/index.lock" ] && git_status="${git_status} ${RED}🔒LOCK${RESET}"
else
    git_status="${GRAY}no git${RESET}"
fi

# Build final output
output="${GRAY}${current_time}${RESET} ${GRAY}|${RESET} ${sys_status} ${GRAY}|${RESET} ${MAGENTA}${logged_in_user}${RESET} ${GRAY}|${RESET} ${BLUE}${project_dir}${RESET} ${GRAY}|${RESET} ${git_status} ${GRAY}|${RESET}"
output="${output} ${CYAN}↓${input_tokens_fmt}${RESET} ${MAGENTA}↑${output_tokens_fmt}${RESET} ${GRAY}|${RESET} ${CONTEXT_COLOR}${used_percentage}%${RESET} ${GRAY}|${RESET} ${GREEN}\$${cost_fmt}${RESET} ${GRAY}|${RESET} ${YELLOW}${model_name}${RESET}"

# Append reasoning effort behind the model name if present, colored by level
if [ -n "$effort" ]; then
    case "$effort" in
        low)    EFFORT_COLOR=$GREEN ;;
        medium) EFFORT_COLOR=$YELLOW ;;
        high)   EFFORT_COLOR=$ORANGE ;;
        *)      EFFORT_COLOR=$RED ;;   # xhigh, max
    esac
    output="${output} ${EFFORT_COLOR}(${effort})${RESET}"
fi

# Constant format string: every field that can carry a "%" goes through %s.
printf '%s\n' "$output"
