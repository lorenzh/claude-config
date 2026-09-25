---
name: recap
description: Recap a finished piece of work and route what it surfaced into the project's docs (instruction files like AGENTS.md/CLAUDE.md, docs, skills, memory). Use when a non-trivial task wraps up, before a commit, when context is about to be cleared or compacted, when a docs gap noticed mid-task was deferred, or when the user says "recap" or asks what this session changed.
---

# Recap

A recap closes the loop on a finished piece of work: it routes session knowledge — what changed, and why decisions fell the way they did — into the project's docs (instruction files, docs folder, skills), the source of truth for future agents and teammates, instead of letting it evaporate when the context ends.

## Process

### 1. Gather the material

Reconstruct what happened from two sources, because conversation context may have been compacted and git is the ground truth for what actually changed:

- **Conversation** — the tasks tackled this session, the decisions made, the alternatives rejected, and any corrections the user gave. When the context is gone (cleared, or a cold start), reconstruct rationale from the artifacts instead and mark it as inferred, not confirmed.
- **Repo** — the bundled script prints the git change surface *and* discovers the project's doc layout (instruction files and how they relate, docs folders, skills dirs, lockfiles) in one shot:
  ```bash
  node <path-to-this-skill>/scripts/recap-context.mjs    # <path-to-this-skill> = the directory containing this SKILL.md
  ```
  If Node is unavailable, gather the same by hand: `git status --short --untracked-files=all`, `git diff --stat HEAD`, `git log --oneline -15`, plus a look at the repo root for instruction files (shared and `*.local.md`), docs folders, and skills dirs, and at the harness config dir for a global instruction file (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`).

If a specific change needs detail, `git diff <path>` or `git show <sha>`. On a large change surface (more than ~15 files or several distinct areas), fan the per-area diff reading out to subagents, if the harness supports them — and match the model to the task: summarizing a diff is mechanical extraction, so a fast, cheap model does it well; judging what mattered stays with you in the main loop.

Done when every file in the git output is accounted for in your notes — a change you can't explain becomes an open question in the recap, stated as uncertain rather than smoothed into a clean narrative.

### 2. Write the recap

Print it in chat using this structure. Keep each bullet to one line where possible — density beats prose here.

```markdown
## Recap

### What was done
- <area/scope>: <what changed, in concrete terms> (`path/to/file`)
- ...

### Decisions made
- <decision> — <why; what was rejected and why, if relevant>
- ...

### Open threads (only if any)
- <unfinished work, known follow-ups, things deferred>
```

Group "What was done" by area (component, lib, config) when there are several changes. Done when every change and decision from step 1 appears in exactly one section.

### 3. Identify documentation updates

This is the point of the recap. Walk every target below — using the layout step 1 discovered — and ask: *did this session surface something a future agent or teammate would need that the docs (or skills) don't currently capture?* Four triggers: **missing, outdated, incomplete, undiscoverable**. A task you had to reason out step-by-step, with no skill to lean on, is a **missing skill** — surface it like any other gap. A target the repo doesn't have (no docs folder, no instruction file) gets an explicit "no change — target absent"; propose creating it only when a note would otherwise have no home.

| Target | Update it when the work revealed… |
| --- | --- |
| Instruction file(s) — which one, per the routing rule below | A reusable pattern, preference, constraint, or gotcha an agent needs in every session — shared or personal, per the scope rule |
| Docs folder — wherever step 1 found it (`docs/`, `doc/`, wiki, …), plus its indexes if the project keeps any | A documented convention was wrong/incomplete, or a topic had no doc at all |
| Skills (including their bundled scripts) | A recurring, multi-step task you had to figure out from scratch, or a locally-authored skill gave wrong/outdated/incomplete guidance — propose a new skill or an edit |
| Memory — only if the harness provides a dedicated memory system; otherwise skip this row | A durable, session-spanning fact (user preference, project constraint, decision rationale) |

**Routing (canonical-home rule):** every note has exactly one home.

- **Instruction files:** when `CLAUDE.md` defers to `AGENTS.md` (the script flags an `@AGENTS.md` import outright; a bare mention it asks you to confirm), `AGENTS.md` is the only instruction home — write nothing to `CLAUDE.md`. When both exist independently: harness-neutral notes → `AGENTS.md`, Claude-Code-specific → `CLAUDE.md`. Only one instruction file → that file is the home.
- **Scope (shared vs personal):** before picking *which* instruction file, decide *whose*. The test is whether the note holds for a teammate on a different machine.

  | Holds for | This project only | Every project |
  | --- | --- | --- |
  | Everyone | checked-in `AGENTS.md`/`CLAUDE.md` | — (nothing shared spans projects) |
  | This user only | project-local personal file (`CLAUDE.local.md`, `AGENTS.local.md`) | harness global (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`) |

  Machine paths, ports and tunnels, local installs, personal model or workflow preferences are personal by default — a checked-in file is the wrong home even when they are what made the session work. Project conventions run the other way: parking one in a personal file hides it from teammates and CI. Before writing to a project-local personal file, confirm it is gitignored — untracked but unignored is one `git add -A` from leaking.
- **Skill-owned topics:** the **project-authored skill** that owns the topic. Installed/synced skills (listed in a lockfile) get overwritten on update — route their notes to the instruction file instead, or override with a project-authored skill.
- **Durable invariants** (a `CONSTITUTION.md` at the repo root, or an equivalent ground-rules file): a note that changes a project-wide invariant routes through a constitution-amendment workflow when the project has one, not a raw edit — the constitution is the home, not the instruction file.

Before proposing a note, verify it isn't already captured; on a large docs surface (dozens of docs), delegate that lookup to a read-only search subagent (fast model again — it's a search, not a judgment).

Be selective: propose only edits that prevent a future wrong turn, about facts the repo doesn't already capture — code structure, the diff itself, git history, and existing instruction-file content are already captured. Done when each target has either a concrete proposed edit or an explicit "no change". "No doc updates warranted" is a valid and common outcome — say it explicitly.

### 4. Propose, then apply on confirmation

List the proposed updates as concrete edits — name the target file and section, and quote (or near-quote) the line(s) you'd add or change:

```markdown
### Proposed doc updates
1. **AGENTS.md** — add: "- <the exact note>"
2. **docs/testing/README.md** — the X section omits Y; add a paragraph on …
3. **~/.claude/CLAUDE.md** (personal, every project) — add: "- <the exact note>"
4. **New skill** — the <task> workflow recurred and no skill covered it; scaffold `<name>`.
5. No change needed elsewhere.
```

Mark personal targets and name what they reach — a global instruction file applies to every project on this machine, so its blast radius is wider than a repo edit even though the file is easier to change.

Then stop and ask which to apply (e.g. "Apply all, some, or none?"). A recap is read-only until the user approves edits; apply only what they confirm.

## Notes

- Keep it honest: report failures, skipped steps, and unfinished work as plainly as completed work.
- Recap first, then commit — capturing decisions while they're fresh also sharpens the commit message.
