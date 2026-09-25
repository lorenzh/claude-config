#!/usr/bin/env bash
# PreToolUse orchestration gate.
#
# The main session is a team lead: before the first write-shaped tool call of a
# task it must load the orchestrating-agent-teams skill and decide
# dispatch-vs-inline. This hook makes that mechanical -- no skill loaded, no
# write.
#
# Fails open on every unexpected condition, deliberately: a missing or
# unreadable transcript, absent jq, malformed input. A hook that blocks when it
# cannot read its own inputs would wedge every session on this machine.
# Escape hatch: CLAUDE_ORCH_GATE=off
#
# stdin: PreToolUse JSON (cwd, hook_event_name, tool_name, tool_input,
#        transcript_path, ... plus agent_id/agent_type inside a subagent)
# stdout: nothing (allow) or a permissionDecision:deny object
# exit:  always 0

set -o pipefail

SKILL_NAME='orchestrating-agent-teams'
# Cap the transcript scan so a huge JSONL can never stall a session.
MAX_SCAN_BYTES=$((64 * 1024 * 1024))
# Candidate transcript lines handed to the JSON parser.
MAX_CANDIDATES=50
# Cap the inspected command. A write-shape shows up early; anything longer is
# pathological and not worth the seconds it would cost to scan.
MAX_CMD_CHARS=8192

allow() { exit 0; }

deny() {
  local reason
  reason='Orchestration gate (not a permission problem): this session has not yet loaded the orchestrating-agent-teams skill for this task. Load it now, then emit the route line ("Dispatch: ..." or "Inline: ...") and continue -- this same call will go through afterwards.'
  # Emit with jq when available so the reason is escaped correctly; the literal
  # below is pre-escaped and kept in sync by hand.
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg r "$reason" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}' \
      2>/dev/null && exit 0
  fi
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Orchestration gate (not a permission problem): this session has not yet loaded the orchestrating-agent-teams skill for this task. Load it now, then emit the route line (\"Dispatch: ...\" or \"Inline: ...\") and continue -- this same call will go through afterwards."}}'
  exit 0
}

[ "${CLAUDE_ORCH_GATE:-}" = "off" ] && allow

# Buffer stdin to a file rather than a shell variable: a pathological command
# can be tens of megabytes, and every variable copy and here-string of that
# costs seconds.
tmp_in=$(mktemp 2>/dev/null) || tmp_in=""
tmp_out=$(mktemp 2>/dev/null) || tmp_out=""
cleanup() { [ -n "$tmp_in" ] && rm -f -- "$tmp_in"; [ -n "$tmp_out" ] && rm -f -- "$tmp_out"; }
trap cleanup EXIT
[ -n "$tmp_in" ] && [ -n "$tmp_out" ] || allow
cat > "$tmp_in" 2>/dev/null || allow
[ -s "$tmp_in" ] || allow

have_jq=0
command -v jq >/dev/null 2>&1 && have_jq=1

# --- field extraction -------------------------------------------------------
# The whole block is stderr-silenced: a command carrying control characters
# makes bash warn about null bytes, and hook stderr is noise the user sees.
{
if [ "$have_jq" -eq 1 ]; then
  # One jq pass. Line 1 is the newline-free metadata; everything after it is
  # the command, which is routinely multiline (heredocs). Truncation and NUL
  # removal happen inside jq so the huge string never reaches bash.
  jq -r --argjson n "$MAX_CMD_CHARS" '
      ([ (if has("agent_id") then "1" else "0" end)
       , (.tool_name       // "" | tostring)
       , (.transcript_path // "" | tostring)
       ] | join("\u0001")),
      ((.tool_input.command // "" | tostring)[0:$n] | split("\u0000") | join(" "))
    ' "$tmp_in" > "$tmp_out" 2>/dev/null || allow
  # Separator is \001, not a tab: bash `read` treats tabs as IFS whitespace and
  # would collapse empty fields.
  IFS=$'\001' read -r has_agent tool_name transcript_path < "$tmp_out"
  command=$(tail -n +2 -- "$tmp_out" 2>/dev/null)
else
  # Fallback: crude but good enough to decide allow-vs-deny. Anything we cannot
  # read confidently ends in allow further down. Only the head and tail of the
  # payload are scanned; key order is not guaranteed, and a huge command sits
  # in the middle.
  edges=$( { head -c 262144 -- "$tmp_in"; printf '\n'; tail -c 262144 -- "$tmp_in"; } 2>/dev/null )
  if grep -q '"agent_id"[[:space:]]*:' <<<"$edges"; then has_agent=1; else has_agent=0; fi
  tool_name=$(sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' <<<"$edges" | head -n1)
  transcript_path=$(sed -n 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' <<<"$edges" | head -n1)
  command=$(sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' <<<"$edges" | head -n1)
  # Un-escape the JSON string enough that the write-shape scan sees real lines.
  command=${command//\\n/$'\n'}
  command=${command//\\t/$'\t'}
  command=${command//\\\"/\"}
  command=${command//\\\\/\\}
  command=${command:0:$MAX_CMD_CHARS}
fi
} 2>/dev/null

# Rule 1 -- subagents are never gated. They are the work. Keyed on the field
# being present, not on its value: an empty agent_id is still a subagent.
[ "$has_agent" = "1" ] && allow

# Rule 2 -- only write-shaped tools are in scope.
case "$tool_name" in
  Edit|Write|NotebookEdit|Bash) ;;
  *) allow ;;
esac

# Rule 3 -- for Bash, only write-shaped commands are in scope.
# Deliberately biased toward false negatives: a missed write is a smaller harm
# than blocking a legitimate read, since Edit/Write are gated regardless.
if [ "$tool_name" = "Bash" ]; then
  [ -n "$command" ] || allow

  if ! printf '%s' "$command" | awk '
    function dequote(s,   out,i,c,q,n,sq,esc) {
      sq = sprintf("%c", 39)
      out = ""; q = ""; n = length(s)
      for (i = 1; i <= n; i++) {
        c = substr(s, i, 1)
        if (q == "") {
          if (c == "\\") { i++; out = out " "; continue }
          if (c == sq || c == "\"") { q = c; out = out " "; continue }
          out = out c
        } else {
          if (c == "\\" && q == "\"") { i++; continue }
          if (c == q) { q = ""; out = out " "; continue }
        }
      }
      return out
    }
    function isbreak(c) { return (c == "" || c == " " || c == "\t" || c == "(" || c == ")" || c == ";" || c == "&" || c == "|" || c == ">") }
    # Redirection into a file. A ">" glued to a word on its left (a>b, x>2) is
    # read as a comparison, not a redirect -- a deliberate false negative.
    function redir(u,   i, n, c, p, pp) {
      gsub(/[0-9]?>&[0-9-]/, " ", u)
      n = length(u)
      for (i = 1; i <= n; i++) {
        c = substr(u, i, 1)
        if (c != ">") continue
        p = (i > 1) ? substr(u, i - 1, 1) : ""
        if (isbreak(p)) return 1
        if (p ~ /^[0-9]$/) {
          pp = (i > 2) ? substr(u, i - 2, 1) : ""
          if (isbreak(pp)) return 1
        }
      }
      return 0
    }
    function segwrite(s,   a, n, i, j, tok, base, wrapped, sc) {
      n = split(s, a, /[ \t]+/)
      i = 1; wrapped = 0
      while (i <= n) {
        tok = a[i]
        if (tok == "") { i++; continue }
        if (tok ~ /^[A-Za-z_][A-Za-z_0-9]*=/) { i++; continue }
        if (tok ~ /^(!|then|do|else|elif|if|while|until|fi|done|esac)$/) { i++; continue }
        if (tok ~ /^(sudo|env|command|nohup|nice|time|builtin|exec|xargs|doas)$/) { i++; wrapped = 1; continue }
        if (wrapped && tok ~ /^-[ugCDRTUprt]$/) { i += 2; continue }   # flag with a value
        if (wrapped && tok ~ /^-/) { i++; continue }
        break
      }
      if (i > n) return 0
      base = a[i]
      sub(/^.*\//, "", base)          # /bin/rm -> rm
      if (base ~ /^(cp|mv|rm|rmdir|unlink|shred|mkdir|touch|install|ln|truncate|dd|patch|chmod|chown|chgrp|tee|rsync)$/) return 1
      if (base == "sed" || base == "perl") {
        for (j = i + 1; j <= n; j++) {
          if (a[j] ~ /^--in-place/) return 1
          if (a[j] ~ /^-[A-Za-z.]*i/) return 1
        }
        return 0
      }
      if (base == "git") {
        sc = ""
        for (j = i + 1; j <= n; j++) { if (a[j] == "" || a[j] ~ /^-/) continue; sc = a[j]; break }
        if (sc ~ /^(apply|am|rm|mv|restore|clean)$/) return 1
        if (sc == "checkout") { for (j = i + 1; j <= n; j++) if (a[j] == "--") return 1 }
        if (sc == "reset")    { for (j = i + 1; j <= n; j++) if (a[j] == "--hard") return 1 }
        if (sc == "stash")    { for (j = i + 1; j <= n; j++) if (a[j] == "pop" || a[j] == "apply") return 1 }
        return 0
      }
      if (base ~ /^(npm|yarn|pnpm|bun|pip|pip3|pipx|apt|apt-get|apk|dnf|yum|brew|cargo|gem|uv|poetry|composer|go)$/) {
        for (j = i + 1; j <= n; j++) {
          if (a[j] == "") continue
          if (a[j] ~ /^-/) continue
          if (a[j] ~ /^(install|add|i|ci|uninstall|remove|upgrade|update)$/) return 1
          break
        }
        return 0
      }
      return 0
    }
    {
      u = dequote($0)
      if (redir(u)) { w = 1; exit }
      t = u
      gsub(/[;&|(){}`]/, "\n", t)
      m = split(t, S, "\n")
      for (k = 1; k <= m; k++) if (segwrite(S[k])) { w = 1; exit }
    }
    END { exit(w ? 0 : 1) }
  ' 2>/dev/null; then
    allow
  fi
fi

# Rule 4 -- the skill is already loaded in this session's transcript.
# Fails open when the transcript is missing or unreadable, on purpose.
[ -n "$transcript_path" ] && [ "$transcript_path" != "null" ] || allow
[ -r "$transcript_path" ] || allow

if [ "$have_jq" -eq 1 ]; then
  # grep only prefilters; the decision is made by actually parsing the line, so
  # prose that merely quotes {"name":"Skill"} cannot satisfy the gate.
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    if printf '%s' "$line" | jq -e --arg s "$SKILL_NAME" '
          [ .. | objects
          | select(.type == "tool_use" and .name == "Skill")
          | .input | objects | .skill ] | index($s) != null' >/dev/null 2>&1; then
      allow
    fi
  done < <(head -c "$MAX_SCAN_BYTES" -- "$transcript_path" 2>/dev/null \
           | grep -F -m "$MAX_CANDIDATES" -- "$SKILL_NAME" 2>/dev/null)
else
  # No jq: require the Skill tool name and the skill argument as JSON keys on
  # the same line. Weaker than parsing, but far tighter than a substring.
  if head -c "$MAX_SCAN_BYTES" -- "$transcript_path" 2>/dev/null \
     | grep -m1 -Eq "\"name\"[[:space:]]*:[[:space:]]*\"Skill\".*\"skill\"[[:space:]]*:[[:space:]]*\"$SKILL_NAME\"" ; then
    allow
  fi
fi

# Rule 5 -- nothing else allowed it.
deny
