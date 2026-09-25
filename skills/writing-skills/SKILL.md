---
name: writing-skills
description: Agent skill authoring guide. Use when creating a new skill or a SKILL.md, editing or reviewing an existing skill, writing or fixing a skill description so agents discover it, or deciding whether a recurring workflow should become a skill.
---

# Writing Skills

A skill exists to make an agent take the same *process* every run — predictability is the goal every rule below serves.

## 1. Decide whether a skill is warranted

Skills are for recurring workflows and judgment calls: techniques that weren't obvious to you, recur across projects, and would help others. Route everything else to its proper home:

- General coding conventions ("use TypeScript strict mode") → the project's `AGENTS.md` / `CLAUDE.md`.
- One-off solutions, or standard practice already well documented elsewhere → no skill.
- Rules a linter, regex, or validation can enforce → automate them instead.

Collect the evidence that already exists before designing any baseline. When the skill is carved out of live work, mine the session first — the tool sequence used, the corrections the human made (each correction is an observed failure), the input/output shapes. Then interview the requester for what no transcript shows: the failures they have actually observed (verbatim symptoms, not summaries) and the phrasings they would use to invoke the skill — one primary question per message, pinning vague reports to concrete incidents ("the import broke once" → which file, what happened?). Ask only what the working tree cannot answer. Test runner, layout, conventions, existing helpers — read them; a question whose answer sits in a file the agent could open spends the requester's attention on something free. Put the questions themselves in the shape step 3 prescribes for elicitation, with one exception that matters here: the failures they observed and the phrasings they would use are theirs alone, so ask those open and rank nothing — a menu of three guesses collects the nearest wrong one instead of the verbatim symptom. A requester-reported failure your synthetic baseline cannot reproduce stays in scope as a scenario to build — lived evidence outranks synthetic evidence.

Then run a **baseline**: give the task to a fresh agent (a subagent, or a fresh session with no prior context) *without* the skill — when editing an existing skill, the control runs the *current* version instead, on identical prompts — and record what goes wrong, verbatim — wrong choices, gaps, and the excuses it gives. A skill covering several distinct situations needs one baseline scenario per situation. Done when you hold one of two outcomes and can name where each failure came from: a concrete failure list — every requester-reported failure included as a scenario, whether your baseline reproduced it or it stays to be built — that becomes the skill's spec, plus the invocation phrasings step 2 needs; or evidence the agent already succeeds, in which case stop: the skill would restate default behaviour.

Persist the baseline scenarios beside the skill (for example `evals/evals.json`: prompt, input files, expected behaviour) rather than leaving them in a session transcript — the next edit needs the identical control to measure against.

Done when the scenario file exists and every requester-reported failure appears in it, or you have recorded that the agent already succeeds.

## 2. Name it and write the description

The `name` (folder and frontmatter, identical): lowercase letters, numbers, hyphens, at most 64 characters, and it cannot contain the reserved words "anthropic" or "claude". Verb-first for workflows (`writing-docs`, not `docs-writing`); for a technique or reference skill, a noun phrase naming the core insight (`condition-based-waiting`, not `async-test-helpers`).

The `description` is what agents decide from — alone — whether to load the skill. It is non-empty, at most 1,024 characters, and neither it nor the name may contain XML tags.

- State what the skill is in a few words, then the situations that should trigger it, phrased the way users actually ask ("Use when the user wants …, mentions …, asks about …").
- Write it in third person ("Processes Excel files…"), never "I can help you…" or "You can use this to…" — it is injected into the system prompt, and mixed point-of-view degrades matching.
- Front-load the key term — the word people naturally use when they want this skill. This is a truncation defence, not a style preference: harnesses cap the skill listing (Claude Code: ~1% of the context window, 1,536 characters per skill) and drop or truncate the descriptions of least-used skills when it overflows.
- Quote the user's own words where they are stable — `asks to "review since X"`, `says "recap"` — rather than paraphrasing the intent; a quoted phrasing matches literally, a paraphrase competes with every neighbouring skill.
- One trigger per distinct use case; synonyms restating the same case dilute the description — collapse them, unless the triggering tests in step 5 show the skill under-fires, in which case add back the phrasings that missed. Under-firing is the more common failure in a small skill set; dilution is the more common one in a large repo.
- When a near-miss skill or tool shares the key term, add one closing negative trigger naming it and its correct home: "Do NOT use for GitHub (use `gh` CLI)". One line, at the end, and only for a collision actually observed in step-5 triggering tests.
- State triggers and identity only, keeping every process detail in the body: an agent that reads a workflow summary in the description follows the summary and skips the body (a description saying "…with code review between tasks" produced one review where the body required two).
- A description too short to carry triggers, or long enough to summarise the body, is a defect either way: below the band there is no room for triggers, above it the description has started summarising the body. Pick the band once and let a mechanical validator in your skills repo hold it, so the number lives in one place instead of in this prose.

```yaml
# Weak: no triggers, and the "dispatches → reviews → merges" summary will be
# followed as a shortcut instead of the body
description: Executes plans - dispatches a subagent per task, reviews, then merges

# Strong: identity in a few words, then triggers only
description: Plan execution workflow. Use when executing an implementation plan with independent tasks, or when the user asks to work through a plan document.
```

A skill only ever invoked by hand can drop agent discovery: set `disable-model-invocation: true` (Claude Code; other agents ignore it) and write a one-line human-facing description instead. Because other harnesses ignore the field and make the skill model-invocable again, state its entry conditions in the body too.

Done when the description holds identity plus one trigger per distinct use case, the key term leads, it is third person, and no process detail appears.

## 3. Write the body

Address the baseline failures from step 1 — write for what actually went wrong, resisting content for hypothetical cases. A baseline failure licenses the reference *class* it belongs to — one missed root-cause category justifies the table covering all root-cause categories, and nothing beyond that class; a section no failure points to is hypothetical. When an instruction needs a number you can't derive, pick a sensible default and mark it as tunable.

### Shape

The section order that recurs across widely installed skills: title, one-line purpose, the core principle in bold, a decision tree when entry depends on inputs, numbered process steps, one worked example, then — last — any discipline machinery, then the pointer list to `references/`. Deviate when the skill is pure reference; otherwise this is the default.

- Two content types mix freely: **steps** (ordered actions) and **reference** (rules, definitions, facts consulted on demand). A skill can be all steps, all reference, or both.
- Keep the `SKILL.md` body short — short enough that every run can afford to read all of it, with your validator holding the exact ceiling — and push material only some runs need into `references/`, which costs nothing until read. Inline what every run needs. The *wording* of the pointer decides whether the agent actually loads the file — if a must-read reference gets skipped, sharpen the pointer before inlining the content.
- Link every reference file directly from `SKILL.md` — a reference reached only through another reference gets partially read (`head -100`) rather than read whole. Give a long reference a table of contents at the top; your validator holds the threshold for how long is long.
- Co-locate: a concept's definition, rules, and caveats under one heading, not scattered across the file.
- One excellent, runnable, real-world example beats many mediocre ones or a fill-in-the-blank template. This bounds worked examples; reference tables are bounded by the class rule above.
- A rules list past roughly a dozen items is read for gist rather than applied. Split it by the moment each rule applies, or move all but the run-critical ones to `references/`.

### Every step ends on a checkable criterion

**Every numbered step ends on a line beginning `Done when …` naming an observable artifact or state** — "Done when the spec file exists and every success criterion in it is verifiable", not "Done when the spec is good". A step you cannot end this way is either two steps, or reference material rather than a step.

### Make instructions the agent actually follows

- Place a rule where it is read, not where it is tidy: a rule that governs the whole skill goes above the first step; a rule that governs one step goes inside that step. A rule stated only in a section the agent reaches after acting is a rule it will break once and read afterwards.
- Phrase instructions positively — "write one-line comments", not "never write verbose comments". A prohibition names the unwanted behaviour into context and makes it *more* likely. Keep prohibitions only as hard guardrails, paired with the positive target.
- Capitals do not enforce. Where a rule is genuinely load-bearing, give the consequence of skipping it in the same sentence ("skipping this throws `unloaded font`") — the consequence is what the agent acts on. Reserve capitalized MUST/NEVER for the handful of rules whose violation is unrecoverable, never as general emphasis — a rule that needs shouting needs [references/discipline-skills.md](references/discipline-skills.md) instead.
- Gate an ordering rule on the tool call it precedes: "before the first `Edit`, read the plan file" is obeyed where "always read the plan file first" is not — the first names a moment the agent can notice it has reached.
- When a step must actually happen, make it produce something: a named slot in the output, a line the agent must emit, or a file it must write. The agent's own subsequent context then shows whether the step ran — a claim of compliance is not evidence of it, and prose reminders leave nothing behind to check.
- A multi-step skill whose run may be compacted, resumed, or split across subagents records progress in a file, not in context. Say which file, what one entry looks like, and who may write it.
- Enforcement that lives in frontmatter (`allowed-tools`, hooks, `context: fork`, `disable-model-invocation`) is advisory outside Claude Code — write every gate so the prose alone still enforces it, and never rely on a tool restriction to make a rule unskippable.
- Nuance clauses ("don't X unless it matters") reopen negotiation and exemption clauses don't scope — write a real exception as its own conditional.

### Match the form to the failure

- Wrong-shaped output → a positive recipe stating what the output *is*, its parts in order.
- A required element omitted → a named slot the output's structure requires, not a prose reminder beside it.
- Behaviour that depends on a condition → a conditional keyed to an observable predicate ("if a Context map exists, read it first").
- An operation that is fragile or must run in one exact sequence → a verbatim command with no parameters and no room to adapt it, not a described procedure.
- A known rule skipped under pressure → the discipline machinery below.

For a skill that *enforces a rule* the agent will be tempted to skip under pressure (verification gates, test-first, mandatory checks), positive phrasing alone won't hold — apply [references/discipline-skills.md](references/discipline-skills.md) before testing. State the rule itself inline in the new skill's `SKILL.md`; the enforcement machinery (excuse table, red flags) may live in a reference behind a sharply worded pointer.

### Bundle a script

A script is warranted when it does something the agent cannot do as well itself. Four licences, each observed in shipped skills:

- **Determinism** — a check with one right answer, computed identically every run. A pre-made script is more reliable than code the agent generates, even where it could generate it.
- **Fragility** — an operation that must run in one exact sequence, or whose failure is expensive.
- **Capability** — work a prompt cannot do at all: rendering, format conversion, machine-verifying an intermediate artifact before a destructive step.
- **Repetition** — helper code independently rewritten across baseline or test runs.

**The boundary: script it when the check needs input the agent would not otherwise read** — every file in a tree, a cross-file comparison, a count. Leave it in prose when the check is decidable from what is already open: the agent applies it for free, and a script only re-reads what it already has. A rule that fits in a sentence about the file being edited is not worth a script, however mechanical it is.

Write the pointer as the exact command with its arguments — `node scripts/validate-skills.mjs` — and say whether the agent **runs** it or **reads** it. Running is the default and costs only the output; reading is legitimate when the script's logic is itself the reference. Never open the source to learn what a script *does* — the pointer already says that.

Give a script `--help` that prints its usage block, exit 0 clean / 1 blocking / 2 misuse, and a `--json` twin wherever the output is consumed rather than read. Have it print only what the agent must act on, with each error naming its fix; where the output is large, write a file and print only the path. Offer a manual fallback for the step when the runtime may be missing.

Two rules keep a script honest over its life. **Every rule it enforces has a sentence in the body naming it** — a threshold discoverable only by reading the source is a rule nobody can follow deliberately, so the prose names the rule and the script holds the number, in one place. And **a warning nobody will fix is noise on every future run**: fix it, or delete the rule that produces it. A script whose output is not empty on a clean tree has stopped being a check.

### Bundle a template

A template is the output artifact's schema, and it is the device for consistency across runs and authors. **Bundle one when the filled file is read back by a later step, another agent, or a human** — that is where step 3's *named slot* physically lives. An output nothing outside this run consumes stays an inline skeleton in `SKILL.md`. This is not the fill-in-the-blank skeleton the worked-example rule warns against: that one stands in for a demonstration, this one *is* the deliverable's structure. Two genres, and they are enforced differently.

**A slot-filling template** carries its rule inside each slot — `<What is wrong or missing today, and who feels it. Observable facts, not causes.>` — so the guidance cannot be skimmed past the way a paragraph beside it can. Pointing at it is not enough to make it get used; force it. Read the artifact back later in the workflow so a run that skipped it cannot continue, block a gate on an unresolved slot marker, or name the template an obligation list: "every section is a question it could otherwise only ask you."

**A copy-verbatim template** is fixed by a command, not a description: "copy the file, do not retype it — `cp <skill>/templates/report.html <target>.html`", with the invariant blocks staying byte-identical and comments marking which parts are variable. Where that invariant part is executable, the template is a script in disguise: test it like one.

A file copied once into a user's repository as a starting point is a deliverable seed, not an output skeleton — different genre, and the rules above do not apply to it.

A skill whose workflow depends on knowledge only a human holds at run time (their observed failures, preferences, domain facts) gets an explicit elicitation step in its body. **One primary question per message** — a batch gets the first answered and the rest skipped, and no answer can shape the next question. Where the answers can be listed, give about three concrete options derived from what the skill has already discovered, mark one as the recommendation, and invite an answer in the human's own words; where the answer is the human's alone, ask open. Pin a vague answer to a concrete scenario before moving on. Enumerate the decisions that belong to the human; anything the repo or the skill itself already settles is decided without asking. Propose the step to the requester rather than assuming it.

**An interview ends on an artifact, not on a feeling** — name the file or template whose slots the answers fill, and stop when no slot is empty. Write each answer into that artifact as it arrives, so a resumed run asks only for the slots still open.

Write the elicitation harness-neutrally — "if the harness offers a structured multiple-choice prompt, use it with the same options; otherwise write them as plain text". In Claude Code that prompt is `AskUserQuestion`: 1–4 questions per call and 2–4 options each are hard limits, an "Other" free-text row is appended automatically so never write one, and nothing is pre-selected, so first position plus a "(Recommended)" suffix is what makes a recommendation read as one.

If the skill will be shared across machines and agents, also keep it portable: bundled scripts in a runtime every target machine already has, no assumed project layout (discover instruction files, docs, and skills directories at runtime).

Done when every baseline failure from step 1 maps to a line in the body, and every step of the new skill ends on a checkable criterion.

## 4. Prune

Sweep the draft line by line:

- One authoritative place per rule — a repeated rule costs maintenance and inflates its apparent importance. One exception: a rule the agent must apply at a specific moment may be restated in one line at that moment, pointing back to the authoritative statement. Restatement for emphasis alone is still duplication.
- One term per concept throughout — mixed synonyms ("field" / "box" / "element") cost parsing accuracy. Superseded guidance goes in an "Old patterns" section rather than becoming a dated instruction.
- Delete lines the agent already follows by default ("be thorough", "write clean code"). Test each line: delete it — would a fresh agent's output differ? If not, it only costs tokens. A line that fails the test only because its wording is weak gets a stronger word before it gets deleted.
- Do not restate the description's trigger list as a "When to use this skill" section — the agent has already read the description by the time it opens the body. Keep triggers in frontmatter only; the body starts at what to do.
- Delete stale narrative — including counted appeals to unseen history ("from 24 failure memories", "in one session we found…"). The evidence belongs in the commit message that justified the line, not in the skill an agent re-reads every run. Delete the auxiliary files a skill accretes too — README, CHANGELOG, creation notes. Agents read `SKILL.md` and what it points to.

Done when every remaining line changes behaviour.

## 5. Test before shipping

Run the scenarios from your step-1 baseline against a fresh subagent (or fresh session) *with* the skill, matching the scenario to the skill type:

- **Technique** (how-to): apply it to a fresh scenario plus an edge case — do the instructions have gaps?
- **Pattern** (mental model): recognition, application, and a counterexample — does the agent know when *not* to apply it?
- **Reference** (docs/rules): retrieval questions — does the agent find and correctly apply the right section?
- **Discipline** (enforced rule): pressure-test per [references/discipline-skills.md](references/discipline-skills.md) — the rule must hold under combined pressure.
- **Triggering** (any skill with a description): fresh sessions given realistic phrasings that should load it, plus near-misses that share its keywords but belong to another skill or none. A near-miss that fires, or a real phrasing that doesn't, goes back to step 2.

Cover at least three scenarios, and run the control and the with-skill runs **on the same model — the one you are already working in**. A pair on different models measures the model, not the skill, and the model a skill will meet is unknowable in a repo whose skills run in several harnesses. A scenario passes only if the step-1 control fails it — a check the control also satisfies measures nothing. Launch the with-skill and control runs in the same turn rather than staggering them, and record pass/fail, elapsed time, and token cost per scenario so one iteration is comparable to the next.

A skill that bundles a script, carries frontmatter beyond `name` and `description`, names a specific tool or slash command, or dispatches a subagent gets one portability check — those are the four places a Claude Code run cannot fail.

**If a second harness is available in this session, run one scenario there.** Detect one rather than assuming which: probe `PATH` for a non-interactive agent CLI (`command -v`, or `where` on Windows, across `codex`, `copilot`, `gemini`, `cursor-agent`), or use a dispatch surface the session already offers. A skills root on disk is not a harness you can run — it tells you who will *consume* the skill, which is step 3's concern. Install the skill into the other harness's skills root, a symlink is enough, and give it one realistic trigger phrasing without naming it; with `codex` that is `CODEX_HOME=<scratch> codex exec --sandbox read-only --skip-git-repo-check "<phrasing>"`. Done when the run names the skill and reaches the step's `Done when` criterion, or the transcript records the tool, command, or file it stalled on.

**If none is available, read the skill as plain markdown with every harness affordance assumed absent** — frontmatter unenforced, no named tool, no slash command, no subagent — and list the instructions that stop being executable. Done when that list exists and each entry is either rewritten to hold without the affordance or recorded as a known limit. This checks the body only; whether the description fires stays untested.

A pass carries evidence: the verdict quotes the transcript line, output file, or command output that settles it. A grader that cannot quote has not graded. Anything a script can decide, a script decides — a subagent judge is for what only a reader can see. Never grade by asking a model to describe the skill; a paraphrase proves the file was read, not that behaviour changed. A weaker model's failure is a signal about a thin instruction, not a licence to add rules until it passes: what a weak model needs is what a strong one is told to remove.

Run your skills repo's own validator, if it has one, for the mechanical rules — frontmatter shape, description length, body size, reference-file length. Where the harness provides them, also run its own validators — in Claude Code, `claude plugin validate <skills dir>` for frontmatter and `/skill-doctor` for per-skill token cost and skills that never fire.

A bundled script or template ships with a test beside it whose first cases reproduce the defects a run actually found, with each fixture pinned to its measured output so a tightened rule cannot move ordinary input silently. Put those tests in CI and keep the model runs out of it — CI holds what is deterministic; the model runs' pass/fail, time, and tokens go in the commit message.

Run one **quality review** in parallel (critique against this guide; for every changed line, name its observed failure and per-invocation cost) and, when scripts exist, one **script audit**. The validator holds the mechanical rules, so point the reviewer at the defects only a reader finds: one step prescribing what a later step forbids, one rule carried by two authoritative numbers, an added line restating a rule already in the file, and any claim about another file checked against the working tree rather than a remembered copy. Apply supported findings, then allow one focused re-review limited to those findings and regressions caused by their fixes. It does not reopen the whole artifact or introduce unrelated hardening; record unrelated suggestions as future evidence. An unresolved Critical regression blocks and returns to the requester with the evidence. Done when the focused re-review resolves the original findings or names that blocker.

A failing cold scenario gets one classified correction and one rerun: absent instruction → add it; ambiguous → rewrite it; present but missed → sharpen placement; deliberately overridden → apply discipline machinery. A second failure returns the transcript and unresolved cause instead of growing another round.

Done when each baseline failure passes from the skill alone or is reported as unresolved — validation has a bounded end.
