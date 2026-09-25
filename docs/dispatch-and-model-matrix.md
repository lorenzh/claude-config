# Dispatch surfaces and the model matrix

The `orchestrating-agent-teams` and `update-claude-agents` skills both assume this section exists
in your global instruction file (`~/.claude/CLAUDE.md`). Copy what you need from here into that
file — the skills read it at runtime, not this repository.

The numbers below come from one public benchmark run (see **Source**). They are an example of how
to write a routing rule down, not a recommendation you have to adopt. Re-measure before you trust
them.

## Session mode — orchestrator or normal

Two modes, chosen by the user when a session starts.

**Orchestrator.** The main session is the **team lead**: it holds the plan and the user's intent,
and the work happens in agents. With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` set, named teammates
exist alongside one-shot subagents. This governs the main session only — a subagent does its own
work, because the roster is flat and teammates cannot spawn teammates.

A `PreToolUse` hook can make it mechanical: the first write-shaped tool call of a task is refused
until the session has loaded the **`orchestrating-agent-teams`** skill. Everything operational lives
in that skill — how to decide dispatch versus inline, how to brief and verify, when to offer a
workflow, and the team mechanics.

**Normal.** A plain session: no team lead, no gate, no obligation to delegate.

Do not switch mid-session. If the user asks for a switch, say so plainly and offer a restart. A gate
refusal is an instruction to load the skill, never a hint that the mode is wrong.

## Context hygiene — the reason to delegate

The main thread's context is the scarce resource. It holds the thread of the task, the decisions
already made, and the user's intent, and none of that survives being buried under tool output. A
subagent's intermediate output lands in *its* context; only its final report crosses back. That
asymmetry is what delegation buys.

Delegate when the work has a **large middle and a small end** — many files read to answer one
question, a wide grep, a log or test run that prints thousands of lines to confirm one fact, a
dependency audit that ends in a yes or no. Ask for the conclusion and the evidence for it, not the
material it was derived from.

Keep in the main thread the things that *are* the task: the decisions, the brief, the reading of
what comes back, and anything the user is watching happen.

Practical rules:

- Say what you want back. A bounded, structured report ("the three call sites and their
  signatures") returns a paragraph; an open brief returns a transcript.
- A read-only search agent that returns findings instead of file dumps is the right tool for
  read-only fan-out.
- A `fork` inherits the conversation, so use it when re-explaining context would cost more than the
  fork does — but it starts from a full copy, so it is not the cheap option.
- Relay what the user needs from a subagent's report. It is not shown to them, and pasting it whole
  is not relaying either.

## Claude Code built-in subagents (`Agent` tool)

- `Explore` — read-only fan-out search across many files or naming conventions when only the
  conclusion is needed.
- `Plan` — implementation strategy and architectural trade-offs, no edits.
- `general-purpose` — multi-step research or execution that does not fit a narrower agent.
- `fork` — inherits the current conversation context.
- Continue an existing agent with `SendMessage` instead of spawning a fresh one when its context
  still applies.

The `Agent` tool's own `model` parameter takes an alias (`opus`, `sonnet`, `haiku`, `fable`) and has
no effort parameter, so a matrix cell cannot be dispatched through it directly. Pinned agent files
exist for that: one file per cell in `~/.claude/agents/`, each the general-purpose agent with
`model` and `effort` fixed in its frontmatter. You write them yourself — this repository ships none,
because the right set depends on which models your Claude Code build actually offers. The
`update-claude-agents` skill generates and maintains them against the installed model catalog.

One file, `~/.claude/agents/gp-opus-5-medium.md`:

```markdown
---
name: gp-opus-5-medium
description: General-purpose agent pinned to claude-opus-5 at medium effort. The Claude cell for the matrix `standard` tier — implement-medium, verify, review a medium branch, the opening move on a bug hunt.
model: claude-opus-5
effort: medium
---

You are an agent for Claude Code, Anthropic's official CLI for Claude. Given the user's message,
use the tools available to complete the task. When you complete it, respond with a concise report
covering what was done and any key findings — the caller will relay it, so it only needs the
essentials.
```

`effort` is one of `low`, `medium`, `high`, `xhigh`, `max`, and an unknown value is **silently
ignored** — the agent then runs at the default effort and nothing reports the typo. `model` holds
the full model id, never the alias.

### Why `update-claude-agents` exists

One file per cell means five files per model, and the set is only correct for the model ids the
installed Claude Code actually knows. A dispatch to an id the catalog does not list fails with
"isn't described by this version's model catalog", and every Claude Code release can add ids,
retire others, and leave an effort series half-written. Hand-editing dozens of near-identical files
against a moving catalog is exactly the job to give a script.

`update-claude-agents` does that, and it is deliberately not a blind regenerate:

- it reads the model ids out of the installed `claude` binary and prints three lists — models with
  no pinned files, models whose effort series is incomplete, and pinned files whose model the
  catalog no longer lists;
- it confirms each candidate with one real `claude --model <id> -p` call, because a regex over a
  binary also yields ids that were never real;
- it asks you, per confirmed model, which efforts to write and whether the model goes on a matrix
  row or stays reachable-only — the default is **not routed**, since a model without its own
  measurement has inherited nothing;
- it writes only missing files and **never overwrites an existing one**, so your own wording
  survives;
- it then has you update the matrix in `CLAUDE.md`, table and surrounding prose both, because a
  sentence like "there is no pinned copy for X" turns false the moment the files exist.

| `subagent_type` | Model | Effort | Matrix tier |
|---|---|---|---|
| `gp-opus-5-low` | `claude-opus-5` | low | `aux`, `quick` |
| `gp-opus-5-medium` | `claude-opus-5` | medium | `standard` |
| `gp-opus-5-high` | `claude-opus-5` | high | `deep` |
| `gp-opus-5-xhigh`, `gp-opus-5-max` | `claude-opus-5` | as named | off-matrix — explicit instruction only |
| `gp-<other model>-{low,medium,high,xhigh,max}` | as named | as named | never-route — explicit instruction only |

Keeping a file for a model that is dominated or unmeasured makes it *reachable* on request, not
selectable by default. Do not pick one to save money or time, only when a
human names it, and say that is why when you do.

## A second dispatcher

If a second CLI agent from another model family is installed (for example the Codex CLI, through a
plugin that forwards tasks to it), treat it as an equal surface, not as a fallback. Two rules make
that concrete:

- **Read-only work goes to the cheaper family by default.** Surveys, greps, docs research, context
  gathering, counting, log sweeps, "does this claim hold".
- **A second opinion goes to the other family, always.** Verify on the family that did not
  implement. Review on the family that did not build. A judgement confirmed by the same model that
  produced it is not a second reading.

Three lessons from running such a forwarder:

- **Pass it the raw request, not a brief.** A forwarder that is handed a fully written-out task may
  answer it itself instead of forwarding — which silently removes the cross-family property the
  dispatch was chosen for.
- **Make it say which model is actually answering.** One line at the top of every cross-family
  dispatch. A fallback that does not announce itself is not a second family.
- **Watch the elapsed time against the matrix and kill what overruns it.** A run that has already
  done its work can loop in a verify phase for hours. Check once the row's estimate has passed.

## Model matrix

Cells read pass@1 · cost per task · agent steps · wall-clock minutes. † marks expected launch
pricing, not actual.

| Case | Tier | Claude | GPT | Note |
|---|---|---|---|---|
| Read-only — grep, survey, docs research, context gathering | aux | opus-5 [low] — $1.66 · 36 steps · 5.6 min | the cheap read-only cell of the other family | pass@1 is deliberately not printed here: it does not decide this row, finishing the search does. **Spot-check the output before you build on it** — cited paths exist, quoted text is actually in the file. A failed spot-check, not a feeling, is what escalates it to `quick`. |
| Write a spec | standard · deep | opus-5 [medium] · [high] | the other family at the same tier | Rated on the surface the change touches, not on a task: `deep` where it is broad or contested. Every task below inherits a spec written a tier too low. |
| Implement **low** — one file, existing pattern | quick | opus-5 [low] — 58.1% · $1.66 · 36 steps · 5.6 min | — | Cheapest rungs that land a change. |
| Implement **medium** — several files, or a new pattern | standard | opus-5 [medium] — 68.9% · $3.29 · 52 steps · 9.8 min | — | Workhorse row. Most tasks start here. |
| Implement **high** — public contract, migration, concurrency, a triage disqualifier | deep | opus-5 [high] — 72.8% · $6.08 · 73 steps · 16.8 min | — | Dispatchable without asking. |
| A `deep` task that failed verify | — | — | — | This goes to the human. `opus-5 [max]` (73.6% ±3.9, $11.84, 30 min) sits inside the same confidence interval as `[high]`, so more effort buys nothing measurable. Fix the brief instead. |
| Verify (low task · medium and high) | quick · standard | opus-5 [low] · [medium] | the other family at the same tier | Only a **low** task verifies at `quick`. Always a different subagent than implement, and on the family that did not implement. |
| Review a branch (medium · high) | standard · deep | opus-5 [medium] · [high] | the other family at the same tier | Rated on the branch's highest task complexity. Must not share the implementer's family. |
| Bug hunt, root cause | standard → deep | opus-5 [medium] → [high] | either | Escalate on a second failed hypothesis, not on elapsed time. Usually interactive — turnaround counts. |
| Long autonomous run — sweep, worktree work | deep | opus-5 [high] — ~73 steps | either | Nobody waits, so steps replace wall-clock as the criterion: fewer steps is fewer chances to drift. |

**Source.** DeepSWE v1.1 (113 tasks, every model under the same `mini-swe-agent` harness), data
generated 2026-09-03, retrieved 2026-09-10 from the rendered leaderboard. pass@1, cost and steps are
per-task means; minutes are the median wall-clock from the same data, which depends on host and
provider load — read it as a shape, not a figure.

**Harness effect.** The same tasks run in a vendor CLI instead of the benchmark harness score lower:
opus-5 [max] drops from 73.6% to 62.5% under Claude Code. The Claude cells dispatch through Claude
Code, so their pass@1 is likely optimistic.

**Never route** a model that is dominated at every effort by the model on the row, and do not route
a model that has no measurement of its own. Both stay reachable on explicit human instruction — and
when you route to one, say that a human named it.
