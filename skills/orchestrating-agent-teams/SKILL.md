---
name: orchestrating-agent-teams
description: Dispatching work to teammates instead of doing it in the main session. Use when the main session is about to implement, refactor, migrate, investigate, or sweep a codebase; when splitting a task across several agents; when the user asks to orchestrate, delegate, fan out, or run a team; or when deciding which model and effort tier a task belongs to.
---

# Orchestrating agent teams

The main session is the team lead. It holds the plan, the user's intent, and the decisions. The work happens in agents.

**Violating the letter of this rule is violating the spirit of it.** A task done inline because it felt contained is a task not delegated, whatever it was called at the time.

This skill governs the main session only. A subagent that reads it does its own work — the roster is flat, teammates cannot spawn teammates.

Loading it puts the session in orchestrator mode and satisfies the gate. If the user wanted a normal, plain or solo session instead, that is their call and it is made when the session starts, as `CLAUDE.md` describes — never by working around a refused call, and never by deciding that this particular task is the exception.

## The gate

**Before the first `Edit`, `Write`, or file-writing `Bash` call of a task, emit one line naming the route.** No line, no edit.

```
Dispatch: add --json and --top to the CLI → gp-opus-5-medium [standard] · verify: codex [medium]
```

or

```
Inline: user named src/args.js:9, the cause and the fix — nothing left to locate.
```

The line goes in the visible response, not in thinking. It is the evidence the step ran; a run without it has skipped this skill.

## Which route

Ask one question: **who located the change?**

- **The user handed you the site and the cause** — file, symbol, or line, plus what is wrong and what it should do — and nothing is left but the mechanical edit. Route inline.
- **You still have to find where the change goes, or design its shape** — which files, which new modules, which pattern. Route to an agent, however small the diff turns out to be.

Three routes are inline regardless: a read that informs the brief you are about to write, a single command whose output is a line or two, and a fact already established in this conversation.

Creating a file that does not exist yet is always a dispatch. So is any task with a `deep`-tier disqualifier — public contract, migration, concurrency.

Size is not a criterion, and neither is your estimate of it. A change that ends up touching four files was not small at the moment you judged it.

**There is no urgency exception.** Time pressure, a deadline, "just do it" — none of it moves the route. If you go inline because the dispatch does not fit in the time left, say so to the user in one sentence before you touch the first file, and let them object. Deciding the route silently is the failure; the user cannot overrule what you never said.

## Steps

1. **Cut the work into tasks.** One task is one brief with one deliverable. Name for each: the tier from your model matrix (it lives in `CLAUDE.md`; this repository ships an example in `docs/dispatch-and-model-matrix.md`), the family, and what the report must contain. Ask for the conclusion and its evidence, never the material it was derived from.

   Done when every task has a tier, a family, and a named deliverable.

   **Then look at the shape of the cut and offer a workflow when it earns one** — see below. Offer before dispatching anything; an offer made after three agents are running is not a choice.

2. **Emit the gate line, then dispatch.** Give each agent a name that says what it owns (`impl-cli-json`, `verify-cli-json`). Send independent dispatches in one message so they run in parallel.

   Done when the gate line is in the response and every dispatched agent has a name.

3. **Read what comes back, and check it before you build on it.** A report is a claim: cited paths exist, quoted text is in the file, a green test run is one you can reproduce. A report that ends mid-sentence or says it was truncated is incomplete — ask for the rest with `SendMessage` before using it.

   Done when every claim you are about to act on has been spot-checked or is marked in your answer as unverified.

4. **Verify with a different agent, on the family that did not implement.** Your own reading of a report is not verification.

   Done when the verifying agent is named and belongs to the other family.

5. **Report to the user.** Relay what they need — a subagent's report is never shown to them, and pasting it whole is not relaying.

   Done when the answer states the outcome, what was skipped, and anything left unverified.

## Offering a workflow

A workflow runs the dispatching itself — fan-out, phases, per-item verification — deterministically, instead of you shepherding each agent by hand. It also spends real money, so it is the user's call, never yours. Running one without their say-so is the failure this section exists to prevent.

**Offer when the cut from step 1 shows all three:**

- three or more tasks of the same shape, differing only in their input (per file, per module, per dimension, per finding), or a fan-out whose results each need their own verify pass;
- the tasks are independent — none needs another's output to start;
- the work runs unattended: the goal is fixed, and no decision mid-run needs the user.

**Do not offer** when the task is interactive or exploratory, when the shape is still being discovered, when two or three named agents cover it, or when you already offered this session and they declined.

**How to offer:** one line, before the first dispatch, naming what the workflow would fan out over and roughly how many agents it would take. Not a pitch, and not a question that stalls the work — say what you will do if they say nothing, then do that.

> 14 changed files, one review pass each plus a verify per finding — that's a workflow, roughly 20 agents. Want it, or shall I take the four riskiest files with named agents instead?

If they accept, or if they already opted in — they said "use a workflow", typed `ultracode`, or invoked a skill that calls for one — load the `workflow-authoring` reference before writing the script. Otherwise continue with named agents and do not raise it again.

## Rationalizations

| The thought | What is true |
|---|---|
| "Small, contained change — doing it inline." | You have not opened the files yet. This is the excuse a control run produced verbatim before creating two new modules and rewriting a third file. |
| "Writing the brief costs more than the work." | Then the brief is too long. A tier, a path, and a deliverable is enough. |
| "I already have the context loaded." | Context you hold is a reason to write a shorter brief, not to keep the work. |
| "Small repo, I have already read all four files — a dispatch costs more than it saves." | Verbatim from a run that then created two modules and rewrote a third file. Having read the files is what makes the brief cheap. |
| "The repo is manageable / überschaubar." | Repo size is not the unit. The unit is who located the change. |
| "It's faster to just do it." | Wall-clock is not the budget being protected. The lead's context is. |
| "I'll delegate the next one." | The next task arrives with the same argument. |
| "The user is waiting." | The user is waiting for the outcome, not for your keystrokes. |
| "The agent would need too much explaining." | That is what `fork` is for. |
| "No time for ceremony — the deadline is shorter than the round trip." | Then say that in one sentence and go inline openly. The route may bend; announcing it may not. |
| "The user told me to just do it, so the workflow rule is overridden." | An override you did not name is not an override, it is a rule you dropped. Name it and let them object. |
| "The harness says not to use the Agent tool unless a CLAUDE.md asks for it." | A `CLAUDE.md` does ask for it — that sentence permits the dispatch, it does not forbid it. |

## Red flags

- You are about to call `Edit` or `Write` and there is no gate line above it.
- You are creating a file and no agent was dispatched.
- The words "quick", "trivial", "just", or "while I'm here" appear in your reasoning about routing.
- Verification was your own re-read of the diff.
- You reported a task complete while an agent was still running.
- You chose a route because of a deadline and did not say so in the response.
- You are treating urgency, or "just do it", as permission to skip the gate line.
- You are dispatching the fourth same-shaped task by hand and never offered a workflow.
- You are about to run a workflow and the user has not said yes to one.

Each of these means: stop, write the gate line, and route the task properly.

Team mechanics — naming, resuming an agent, mailbox timing, permission boundaries, and what the teams flag actually gates — are in [references/team-mechanics.md](references/team-mechanics.md). Read it before the first dispatch of a session.
