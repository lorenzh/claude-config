# claude-config

My personal Claude Code setup, with everything company- and project-specific taken out:
a statusline, five output styles, seven skills, the pinned `gp-*` subagents, and the
orchestration gate hook.

Nothing here needs the others. Take the parts you want.

```
statusline/     statusline script, Azure DevOps fetcher, install script
output-styles/  five output styles (German prose, English keywords)
skills/         seven agent skills
agents/         pinned gp-<model>-<effort> subagent definitions
hooks/          PreToolUse orchestration gate
docs/           the dispatch rules and model matrix the orchestration skills expect
```

## Statusline

One line, rendered from the JSON that Claude Code sends on stdin:

```
09:42 | C8% M58% S99% | you@example.com | widgets-web | feature/12345-login #12345 | ⇄ 2  ◈ 3 | ↓2k ↑400 | 12% | $0.50 | Opus 5 (medium)
```

From left to right: the time; CPU, memory and swap usage, colored by load; the account
email of the Claude Code session; the project directory; git (branch, work-item number,
ahead/behind, staged/unstaged/untracked counts, and a warning when `.git/index.lock`
exists); the optional Azure DevOps counts; input and output tokens; context used; cost;
model and reasoning effort.

Without Azure DevOps configured the line is the same, minus the `#12345` link and the
`⇄ 2  ◈ 3` segment:

```
09:42 | C8% M58% S99% | you@example.com | widgets-web | feature/12345-login | ↓2k ↑400 | 12% | $0.50 | Opus 5 (medium)
```

The work-item number, the `⇄` count and the `◈` count are OSC 8 hyperlinks — clickable
in a terminal that supports them.

The statusline never touches the network and never takes `.git/index.lock`: git runs with
`GIT_OPTIONAL_LOCKS=0`, and the Azure DevOps counts come from a cache file that a detached
fetcher refreshes in the background.

### Install

```bash
statusline/install.sh           # copy the scripts to ~/.claude and patch settings.json
statusline/install.sh --print   # only print the settings snippet
statusline/install.sh --force   # replace an existing, different statusLine setting
```

The install script refuses to overwrite a `statusLine` that is already set to something
else, and it backs up `settings.json` before it writes. The snippet it adds:

```json
"statusLine": { "type": "command", "command": "bash \"$HOME/.claude/statusline-command.sh\"" }
```

Caches go to `~/.cache/claude-statusline/` (override with `CLAUDE_STATUSLINE_CACHE_DIR`).
The fetcher is looked up next to the statusline script, so both work from any location.

### Azure DevOps segment (optional)

Off unless `CLAUDE_STATUSLINE_ADO_ORG` **and** `CLAUDE_STATUSLINE_ADO_PROJECT` are set.
With both unset, the segment is never rendered and the fetcher is never started.

| Variable | Required | Meaning |
|---|---|---|
| `CLAUDE_STATUSLINE_ADO_ORG` | yes | Azure DevOps organization |
| `CLAUDE_STATUSLINE_ADO_PROJECT` | yes | project inside that organization |
| `CLAUDE_STATUSLINE_ADO_REPO` | no | repository for the PR count; unset means all repositories of the project |
| `CLAUDE_STATUSLINE_ADO_REMOTE_MATCH` | no | glob the `origin` remote must match; default is the org/project (and repo, when named). `*` shows the segment in every repository |
| `CLAUDE_STATUSLINE_ADO_USER_ID` | no | your identity GUID; resolved from the API and cached when unset |
| `CLAUDE_STATUSLINE_ADO_PAT` | no | personal access token; `AZURE_DEVOPS_EXT_PAT` is read too |
| `CLAUDE_STATUSLINE_ADO_TTL` | no | cache lifetime in seconds, default 300 |
| `CLAUDE_STATUSLINE_CACHE_DIR` | no | cache location, default `~/.cache/claude-statusline` |
| `CLAUDE_STATUSLINE_BRANCH_ID_PATTERN` | no | regex for the work-item number in the branch name, default `[0-9]{3,}` |

The segment is scoped by the git **remote**, not by the directory name, so the counts and
links only appear where they are true.

**Authentication comes from your environment, never from this repository.** The fetcher
uses a PAT from `CLAUDE_STATUSLINE_ADO_PAT` or `AZURE_DEVOPS_EXT_PAT` if one is set,
otherwise an access token from the Azure CLI (`az login`). With neither, it exits without
writing anything and the counts stay at 0. It also needs `curl` and `jq`.

A PAT needs read access to Code (pull requests) and Work Items. Export it from your shell
profile or a secret manager — do not put it in a settings file.

## Output styles

Five styles, each replacing the default answering instructions. Copy the ones you want to
`~/.claude/output-styles/` and pick one with `/output-style`. They are written in German;
identifiers and technical terms stay English.

| File | What it does |
|---|---|
| `tldr.md` | Headings, `## TL;DR` at the end, no preamble |
| `evidence.md` | Every claim about code carries its evidence; unverified is labeled |
| `german.md` | German answers throughout, identifiers untranslated |
| `socratic.md` | Assumptions and alternatives first, a recommendation at the end |
| `teamlead.md` | A route line first, agent reports reduced instead of retold |

`teamlead.md` belongs to the orchestrator setup below; the other four stand alone.

## Skills

Copy a skill folder to `~/.claude/skills/<name>/`, or symlink it:

```bash
ln -s "$PWD/skills/plain-writing" ~/.claude/skills/plain-writing
```

| Skill | What it does | Depends on |
|---|---|---|
| `plain-writing` | Simplified Technical English (ASD-STE100) and plain German, with a linter | Node.js for `scripts/ste-lint.mjs` |
| `writing-docs` | Writing and updating project docs so they stay findable | pairs with `discovering-docs` |
| `discovering-docs` | Finding the docs a project already has | Node.js for `scripts/docs.mjs` |
| `writing-skills` | How to author a skill and a `SKILL.md` | — |
| `recap` | Recap finished work and route what it surfaced into the project's docs | Node.js for `scripts/recap-context.mjs` |
| `orchestrating-agent-teams` | Dispatch work to subagents instead of doing it in the main session | `docs/dispatch-and-model-matrix.md`, the `gp-*` agents, optionally `hooks/` |
| `update-claude-agents` | Keep the pinned `gp-*` agent files in sync with the installed model catalog | Node.js, the `gp-*` agents, a model matrix in `CLAUDE.md` |

The `plain-writing` linter has its own test suite:

```bash
node skills/plain-writing/scripts/ste-lint.test.mjs
```

## Orchestrator setup

`orchestrating-agent-teams` and `update-claude-agents` assume three things exist:

1. **A model matrix in your `~/.claude/CLAUDE.md`.** Copy what you need from
   [docs/dispatch-and-model-matrix.md](docs/dispatch-and-model-matrix.md). It holds the
   routing rules, the tier names the skills use (`aux`, `quick`, `standard`, `deep`), and
   an example matrix. The benchmark numbers in it are one public run — re-measure before
   you trust them.

2. **The pinned `gp-*` subagents.** The `Agent` tool's `model` parameter takes only the
   aliases `opus`, `sonnet`, `haiku`, `fable` and has no effort parameter, so a matrix cell
   cannot be addressed through it. Each file in `agents/` is the general-purpose agent with
   `model` and `effort` fixed in its frontmatter. Copy the ones whose models you actually
   have:

   ```bash
   cp agents/gp-opus-5-*.md ~/.claude/agents/
   ```

   `update-claude-agents` regenerates and extends this set against the model catalog of your
   installed Claude Code.

3. **Named teammates**, for the team parts: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, or the
   `--agent-teams` flag. Without it, plain subagents still work; only named, resumable
   teammates do not.

### The gate hook (optional)

`hooks/orchestration-gate.sh` refuses the first write-shaped tool call of a task until the
session has loaded `orchestrating-agent-teams`. It fails open on everything unexpected — a
missing transcript, no `jq`, malformed input — and never gates subagents. Escape hatch:
start the session with `CLAUDE_ORCH_GATE=off`.

```bash
cp hooks/orchestration-gate.sh ~/.claude/hooks/
```

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash|Write|Edit|NotebookEdit",
      "hooks": [
        {
          "type": "command",
          "command": "bash \"$HOME/.claude/hooks/orchestration-gate.sh\"",
          "timeout": 15,
          "statusMessage": "Orchestration gate"
        }
      ]
    }
  ]
}
```

Add the block to `~/.claude/settings.json` by hand — merge it with the hooks you already
have rather than replacing them.

## License

MIT, see [LICENSE](LICENSE).
