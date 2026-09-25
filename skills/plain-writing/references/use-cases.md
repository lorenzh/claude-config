# Use cases

Same rules, different targets. Each section names the pattern and shows one before/after.

## Error messages

Three parts, in order: what happened (simple past or simple present), the cause if known, the fix as an imperative. No apology, no "Oops", no "Please".

The user reads this while something is broken. Every word that is not the cause or the fix costs them time.

**Before:** `Oops! Something went wrong. Please ensure your configuration is valid and try again.`

**After:** `The bucket "photo-archive" does not exist. Check the name and the region.`

Name the thing that failed. A message that does not say *which* bucket, *which* field, or *which* file sends the reader back to the logs. Where you do not know the interpolation syntax or the error-code scheme, leave a placeholder and say so — do not invent one.

## Runbooks

STE's home ground. Numbered imperative steps, one instruction per step, condition before command, warning before the step it guards.

**Before:** You'll want to drain the node first, then you can cordon it, but be careful because in-flight requests may be dropped if you don't wait for connections to close.

**After:**

> CAUTION: Draining a node before its connections close drops in-flight requests.
>
> 1. Cordon the node.
> 2. Wait until the connection count is zero.
> 3. Drain the node.

Note the order change: the original said "drain, then cordon", which is backwards. Long hedged sentences hide sequence errors. Splitting them exposes the error.

## Incident reports

Simple past only. Times, counts, and durations instead of adjectives. No speculation about cause in the summary; put open questions in their own section.

**Before:** We have identified an issue that may have impacted a subset of users attempting to access the service during the incident window.

**After:** Between 14:02 and 14:31 UTC, 12% of requests to `/api/sync` returned 503. 8,400 requests failed.

"May have impacted" is unfalsifiable and reads as evasion. If you do not have the number, say which query would produce it.

## Release notes

One line per change, present tense, subject first. Breaking changes follow the safety pattern: the command first, the risk second.

**Before:** We've made some improvements to the sync engine and also fixed a few bugs. Note that the config format has changed.

**After:**

> **Breaking:** Rename `sync.workers` to `sync.concurrency` in `hoardctl.toml`. A configuration with the old key does not start.
>
> - `hoardctl sync` retries a failed upload three times, then stops.
> - `hoardctl config show` prints the source of each value.

## Commit messages

Subject line is procedural: imperative, under 50 characters, no trailing period. Body is descriptive: what changed and why, 25-word sentences.

**Before:** Updated some stuff in the auth module to hopefully fix the token issue that was happening sometimes

**After:**

> Refresh the access token before it expires
>
> The client refreshed only after a 401, so every expiry cost one failed request. The client now refreshes 60 seconds before expiry.

State what the code does now, in the simple present. Do not describe your own process ("I tried X, then Y").

## Pull request descriptions and code review comments

These are Conversational register, not Technical — they argue to a person. Plain prose, no word caps.

A review comment names the file and line, states the defect, and states the consequence. It does not soften with "maybe consider possibly". Where you are unsure, say what would settle it: "If `items` can be empty here, this divides by zero — does the caller guarantee it?"

### The shape of a whole review

No word caps, but a budget: **three sentences per finding**, plus the code. A review that runs long is usually not thorough. It is a short review wrapped in prose.

- **The verdict is the first line.** Outcome, then what blocks it. Nothing stands before it — no greeting, no praise, no announcement of what you are about to say.
- **One finding: location, defect, consequence, fix.** In that order. Leave out how the code got this way, unless the history is the defect.
- **Say each thing once.** A results table does not need a paragraph that reads the table back. Put the exception in the row.
- **Cut the review process.** How many agents ran, which one found what, what you almost missed — none of it changes the code. A limit is a fact and stays: "E2E did not run, the SSO session expired."
- **Praise only where it changes a decision.** "Keep this adapter, it replaces the old two" earns its place. A "what is good" section at the end does not.
- **Cut the reassurance.** "Nothing needs a redesign", "your conclusion still holds", "this is a wording problem, not an architecture problem" — the findings already say this.

**Before:**

> Starke Arbeit, vor allem die Engine. Sie ist wirklich domänenfrei, und die Tests prüfen echtes Verhalten statt der Implementierung. Ein paar Punkte will ich trotzdem vor dem Merge klären.
>
> **Ergebnis: Nachbesserung nötig.** … Alle Punkte sind eng begrenzt. Nichts muss neu entworfen werden.

**After:**

> **Nachbesserung nötig.** Drei Punkte: ein geändertes Verhalten im Bestellprozess, ein README zu gelöschtem Code, und #1234 steht in QA mit zwei offenen Kriterien.

And one finding, from 90 words to 45:

**Before:**

> Der Callback rief früher direkt `store.setAnswer()`. Jetzt ruft er `this.answered.emit()`. Wer im Freitext tippt und innerhalb von 250 ms `StepComplete` auf "Ja" setzt, verliert die Eingabe … Zwei Reviewer haben das unabhängig voneinander gefunden. Das widerspricht der zentralen Aussage des PR, dass sich die Fachlogik nicht bewegt hat.

**After:**

> **`order-checklist-question.component.ts:82-85` verliert eine gedebouncte Antwort.** Wer im Freitext tippt und innerhalb von 250 ms `StepComplete` auf "Ja" setzt, verliert die Eingabe: `@for` zerstört die Zeile, der Timer feuert gegen einen zerstörten Output, Angular meldet NG0953. Fix über `DestroyRef`: abbrechen oder vorher flushen.

## Agent instructions (prompts, AGENTS.md, skill bodies)

A system prompt is a procedure for a reader that cannot ask a follow-up question. Every ambiguity becomes a coin flip at run time.

- One instruction per sentence.
- Never `should` — an agent reads it as optional. Use `must`, or state the fact.
- Condition first: "If a Context map exists, read it first" beats "Read the Context map first, if one exists."
- End each step on something checkable. "Every modified model accounted for" beats "produce a change list".

## Translation preparation

STE's original job. One meaning per word, plus complete grammar, removes most translation ambiguity before it reaches a translator or an MT engine.

Two habits matter most: keep the conjunction `that` (dropping it makes clause boundaries ambiguous), and give every pronoun a clear referent, or repeat the noun. German, French, and Japanese resolve pronouns differently from English; a bare "this" that works in English becomes a guess.
