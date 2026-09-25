# claude-config

My personal Claude Code setup, with everything company- and project-specific taken out:
a statusline, five output styles, seven skills, and the orchestration gate hook.

Nothing here needs the others. Take the parts you want.

```
statusline/     statusline script and its install script
output-styles/  five output styles (German prose, English keywords)
skills/         seven agent skills
hooks/          PreToolUse orchestration gate
docs/           the dispatch rules and model matrix the orchestration skills expect
```

## Statusline

One line, rendered from the JSON that Claude Code sends on stdin:

```
09:42 | C8% M58% S99% | you@example.com | widgets-web | feature/12345-login ↑2 ●3 ?1 | ↓2k ↑400 | 12% | $0.50 | Opus 5 (medium)
```

From left to right: the time; CPU, memory and swap usage, colored by load; the account
email of the Claude Code session; the project directory; git (branch, ahead/behind,
staged/unstaged/untracked counts, and a warning when `.git/index.lock` exists); input and
output tokens; context used; cost; model and reasoning effort.

The statusline never touches the network and never takes `.git/index.lock` — git runs with
`GIT_OPTIONAL_LOCKS=0`, so it cannot race your own git commands. Its only state is one
small file for the CPU gauge, which samples `/proc/stat` against the previous render
instead of sleeping.

### Install

```bash
statusline/install.sh           # copy the script to ~/.claude and patch settings.json
statusline/install.sh --print   # only print the settings snippet
statusline/install.sh --force   # replace an existing, different statusLine setting
```

The install script refuses to overwrite a `statusLine` that is already set to something
else, and it backs up `settings.json` before it writes. The snippet it adds:

```json
"statusLine": { "type": "command", "command": "bash \"$HOME/.claude/statusline-command.sh\"" }
```

`CLAUDE_CONFIG_DIR` is honored: the generated command points at wherever the script was
installed. The CPU gauge's state file goes to `~/.cache/claude-statusline/`, which
`CLAUDE_STATUSLINE_CACHE_DIR` overrides.

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
| `orchestrating-agent-teams` | Dispatch work to subagents instead of doing it in the main session | `docs/dispatch-and-model-matrix.md`, your own pinned `gp-*` agents, optionally `hooks/` |
| `update-claude-agents` | Keep the pinned `gp-*` agent files in `~/.claude/agents` in sync with the installed model catalog | Node.js, a model matrix in `CLAUDE.md` |

The `plain-writing` linter has its own test suite:

```bash
node skills/plain-writing/scripts/ste-lint.test.mjs
```

**Why `update-claude-agents` exists.** The `Agent` tool's `model` parameter takes only an alias
(`opus`, `sonnet`, `haiku`, `fable`) and has no effort parameter, so "this model at this effort" —
one cell of the matrix — cannot be dispatched directly. A pinned `gp-<model>-<effort>.md` agent file
fixes both in frontmatter, which means five files per model, all valid only for the model ids the
installed Claude Code knows. Every release moves that catalog. The skill syncs the set against it:
it lists what is missing, incomplete or retired, verifies each id with a real call, asks which
efforts and which routing a new model gets, and writes only the missing files — instead of you
hand-editing dozens of near-identical ones.

## Orchestrator setup

`orchestrating-agent-teams` and `update-claude-agents` assume three things exist:

1. **A model matrix in your `~/.claude/CLAUDE.md`.** Copy what you need from
   [docs/dispatch-and-model-matrix.md](docs/dispatch-and-model-matrix.md). It holds the
   routing rules, the tier names the skills use (`aux`, `quick`, `standard`, `deep`), and
   an example matrix. The benchmark numbers in it are one public run — re-measure before
   you trust them.

2. **The pinned `gp-*` subagents**, which you create in `~/.claude/agents/`. The `Agent`
   tool's `model` parameter takes only the aliases `opus`, `sonnet`, `haiku`, `fable` and
   has no effort parameter, so a matrix cell cannot be addressed through it. One file per
   cell fixes `model` and `effort` in its frontmatter; the docs page has a complete example
   file. This repository ships none, because the right set depends on which models your
   Claude Code build offers — run `update-claude-agents`, which generates them against the
   installed model catalog and asks you which efforts and which routing each model gets.

3. **Two keys in `~/.claude/settings.json`** — `env` for named teammates, `hooks` for the
   gate. Both are optional and independent; the whole setup works with neither, it is just
   less mechanical.

### settings.json

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
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
}
```

**Merge this into the file you already have — do not replace it.** `hooks.PreToolUse` is a
list, so an existing entry stays next to this one; dropping the block on top of a populated
`hooks` key silently unhooks whatever was there.

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` turns on named, addressable teammates and the team
frames of `SendMessage`. Without it, one-shot subagents still work — only named and resumable
ones do not, and the `name` property disappears from the `Agent` tool schema. Passing
`--agent-teams` on the command line does the same for one launch; it is read straight from
`argv` and does not appear in `claude --help`, so treat it as undocumented. Either way a
server-side feature gate can still keep teams off, so a set variable is necessary, not
sufficient.

### The gate hook (optional)

`hooks/orchestration-gate.sh` is the `hooks` half of the snippet above. It refuses the first
write-shaped tool call of a task until the session has loaded `orchestrating-agent-teams`,
and never gates subagents — they are the work.

```bash
cp hooks/orchestration-gate.sh ~/.claude/hooks/
```

It **fails open** on anything it cannot read confidently: a missing or unreadable transcript,
malformed input, either transcript scan cap reached, and a missing `jq`. It needs `jq` to
decide anything, so on a machine without it the gate is effectively off rather than stuck
denying. To turn it off for one session, launch with `CLAUDE_ORCH_GATE=off`.

## License

MIT, see [LICENSE](LICENSE).
