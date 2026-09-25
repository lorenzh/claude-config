---
name: plain-writing
description: Write technical text under ASD-STE100 Simplified Technical English rules, in English or German, and plain prose everywhere else. Use when writing or rewriting documentation, READMEs, runbooks, procedures, error messages, release notes, incident reports, commit messages, or API guides; when the user asks for plain English, plain German, einfaches Deutsch, Simplified Technical English, or ASD-STE100; when the user asks to make a text simpler, shorter, or easier for readers who are not native speakers; when the user wants answers that are shorter or more to the point, or says a reply was too long or answered something they did not ask; or when the user says writing sounds like AI.
---

# Plain Writing

Write for a tired reader who is not a native speaker. Each sentence must survive one read.

The rules come from ASD-STE100 Simplified Technical English, the controlled language aerospace and defense manufacturers use for maintenance documentation. They exist so that an instruction cannot be misread. They remove the usual marks of AI-generated text as a side effect: long sentences, synonym rotation, hedges, filler, and decorative clauses.

## Step 1: Set the frame

Three decisions before the first sentence.

**Register.** The register follows the artifact, not the conversation around it. An error string drafted mid-chat is Technical. The chat prose that delivers it is Conversational.

- **Technical** — documentation, README, runbook, procedure, error message, release note, incident report, commit message, API guide, code comment, UI label. Steps 2 to 6 apply.
- **Conversational** — chat reply, issue, pull request description, code review comment. Skip to [Conversational register](#conversational-register).

**Mode.**

- **Pragmatic** (default) — the user wants clear text. The everyday word wins. Domain words stay (`idempotent`, `webhook`).
- **Strict** — the user names STE, ASD-STE100, or compliance. The dictionary wins. Tell the user that full compliance needs the official dictionary, free at <https://www.asd-ste100.org/>.

Where the two disagree, the mode decides. The dictionary sends `check` to `do a check of` and `find out` to `determine`. Those words are exact, and they are harder than the words they replace. In pragmatic mode write `check` and `find out`. In strict mode follow the dictionary.

**Passage type.** Do not mix the two in one passage.

| | Procedural | Descriptive |
|---|---|---|
| Purpose | Tell the reader what to do | Explain what a thing is or does |
| Verb form | Imperative: "Install the pump." | Simple present, past, or future |
| Sentence limit | **20 words** | **25 words** |
| Unit | One instruction per sentence | One topic per paragraph, six sentences maximum |

A "Getting started" section is procedural. An "Architecture" section is descriptive. A note inside a procedure is descriptive: 25 words, no imperative.

Do not apply STE to marketing copy or brand writing — it deletes persuasion by design. When the user asks for STE on non-technical text, say so and offer plain prose, or STE for the technical parts only.

Done when you can name the register, the mode, and the type of every passage you are about to write.

## Step 2: Read the reference for your language

- **German output** → [references/german.md](references/german.md). Read it for **every** German text, in either register. German grammar hides the actor, splits verbs across the sentence, and stacks genitives in ways step 3 does not name. Without it your German is grammatical and hard.
- **English output** → [references/english.md](references/english.md). Read it before your first draft. It holds the full everyday-word list, the modal ladder, phrasal verbs, and the dictionary rulings that strict mode needs.
- **The 53-rule catalog** → [references/ste-rules.md](references/ste-rules.md). Read it for strict mode, and before you cite any rule number. Never cite a rule number from memory — the numbering is unintuitive and models invent it.
- **Error messages, runbooks, incident reports, release notes, commit messages, review comments, agent instructions** → [references/use-cases.md](references/use-cases.md).

Done when you have read every reference that applies to this text.

## Step 3: Write the sentences

Eight rules. They decide every sentence in the Technical register.

**1. Name the actor.** The subject is a thing that acts: the tool, the service, the reader, a named part of the system. An event, a process, or a quality cannot act.

> A query that reads the table during the copy gets no result.
> → You cannot read the table while `dataflow` copies it.

**2. One idea per sentence.** Split at `and`, at `so`, and at every point where a second fact starts.

> The service lists the datasets and finds the partitions that are older than the threshold.
> → The service lists the datasets. Then it finds the partitions over the threshold.

**3. One comma, no dash, no semicolon.** A leading condition gets the one comma a sentence has. A second comma marks the place to split. A dash in the middle of a sentence hides a second sentence, and a semicolon joins two. Write both sentences.

**4. Cut the clause that adds a second fact.** A clause after `, which`, `, who`, or `, where` is a second sentence. Write it as one. A short `that` clause that says *which* thing you mean can stay: "the partitions that are older than the threshold" names the partitions.

> The service moves the task to a dead-letter queue, from which it can be replayed manually.
> → The service moves the task to the dead-letter queue. You can replay it from there by hand.

**5. Condition first.** Every `if` and `when` stands at the start of its sentence, before the command, with a comma.

> Increase the timeout if the network is slow.
> → If the network is slow, increase the timeout.

**6. The everyday word wins.** Prefer the word your reader met first. Where a word carries no fact, delete it instead of replacing it.

additional → more · approximately → about · assist → help · attempt → try · commence → start · component → part · demonstrate → show · determine → find out · establish → set up · furthermore → also · however → but · indicate → show · initiate → start · modify → change · numerous → many · obtain → get · occur → happen · perform → do · permit → let · prior to → before · provide → give · require → need · retain → keep · subsequent → next · sufficient → enough · terminate → stop · therefore → so · utilize → use

The full list, with the AI-slop words, is in [references/english.md](references/english.md). German has its own list in [references/german.md](references/german.md).

**7. One name per thing.** Pick one word per concept before you draft, and use no other word for it in the whole document. The check/verify/confirm/ensure concept: pick one. The config/settings/options concept: pick one. A synonym reads as a second thing.

**8. Explain the domain word you keep.** You can keep a domain term, and it is often the right word (Rule 1.5). Give it one sentence on first use. When you cannot explain it in one sentence, it is the wrong word.

> A run is idempotent.
> → A second run gives the same result as the first run.

**Keep the median sentence at or under 14 words.** The limits of 20 and 25 words are the ceiling, not the target. When every sentence sits near the ceiling, the document fails the one-read test. Step 6 measures this.

Done when every sentence obeys all eight rules.

## Step 4: Rewrite from the facts, not from the sentences

This step applies only when a source text exists — the user gave you a draft, a page, or a message to simplify.

1. Read the source once. Write its facts as short lines: who does what, the numbers, the conditions, the consequences. One fact per line.
2. Close the source. Write the new text from your fact list, under step 3.
3. Open the source once more, only to find facts that your text is missing. Do not copy its sentences back.

An edit in place keeps the shape of the source. That shape is why the text is hard.

Done when the source holds no fact that your list is missing, and every line of the list appears in the new text.

## Step 5: Leave the untouchables alone

These are technical names. Keep them exact, even when they break a rule above:

- Code blocks, inline code, identifiers, CLI commands, flags, file paths
- Quoted error messages and log lines
- Product names, API endpoint names, configuration keys

Each of these counts as **one word** against the sentence limit, as do numbers, numbers with units, abbreviations, and titles. A long identifier does not blow your budget: `sqlpipe run --config sqlpipe.yaml` in backticks is one word.

## Step 6: Check before you deliver

This step is not optional.

1. **Run the linter** from the skill directory. It prints the sentence-length profile first, then the candidates.

   ```
   node <path-to-this-skill>/scripts/ste-lint.mjs --type procedural path/to/file.md
   node <path-to-this-skill>/scripts/ste-lint.mjs --lang de --type descriptive path/to/datei.md
   ```

   In strict mode add `--strict`, which turns off the everyday-word check. A document that holds both procedural and descriptive passages gets one run per type; read the findings for the passages of that type and ignore the rest.

   It counts sentence length, commas, relative clauses, dashes, abstract subjects, and hard words. It also counts contractions, banned modals, perfect tenses, `-ing` clauses, semicolons, Latin abbreviations, slop words, trailing conditions, and synonym rotation. German adds Passiv, Nominalstil, Genitivketten, Funktionsverbgefüge, and Modalpartikeln. It is a regex pass, so it undercounts and it produces false hits. A clean report is not a verdict. The profile counts prose only; an over-long table cell appears in the findings and in a line of its own.

2. **Read the profile line.** When the median is over 14 words, go back to step 3 and split more sentences. The linter says so itself.
3. **Read the subject of every sentence.** Each one names a thing that acts.
4. **Read every domain word.** Each one has its sentence of explanation on first use.
5. **Read every claim.** Each states a fact or names the check that confirms it. Delete invented thresholds, invented flag names, and any sentence that claims experience you do not have. A placeholder is fine when you mark it as a placeholder.

Done when the profile shows a median at or under 14 words, nothing over the limit in the profile or the findings, and checks 3 to 5 find nothing.

To audit text you did not write, or when the user asks you to CHECK text rather than write it, use [references/checklist.md](references/checklist.md). Report each violation as: rule number, the offending text, a compliant rewrite.

## Conversational register

Plain prose, not STE. No controlled vocabulary, no imperative discipline. Contractions are fine. Rules 1, 6, and 7 of step 3 still pay off: name the actor, take the everyday word, use one name per thing.

### The question sets the scope

Answer the question that was asked. A second question, even a good one, waits until the reader asks it.

| The question | What it asks for | What it does not ask for |
|---|---|---|
| "Does X do Y?" | Yes or no, then the reason | A tour of how X works |
| "Why does X happen?" | The cause | The fix |
| "Should I do A or B?" | A or B, and why | Both, weighed against each other |
| "How do I do X?" | The steps for X | Why X is the wrong goal |
| "Where do I start?" | The first step | The plan |

When the reader needs something they did not ask about, give it one sentence at the end under its own lead: "Separate from your question: the getter runs on every change detection pass." One sentence, one item. When it needs more than one sentence, ask whether they want it.

Never attach advice to a premise you have not seen. You did not read the helper, so you do not know that it builds a new formatter on every call.

**The pull toward being useful is what breaks this rule.** Violating the letter of the rule is violating the spirit of the rule.

| The thought | The reality |
|---|---|
| "The cause implies the fix, so the fix is part of the answer." | They asked for the cause. They can ask for the fix in four words. |
| "They will need this next, so I save them a round trip." | An answer they must read past is not a saved round trip. |
| "One more option makes the answer complete." | It makes them choose. They asked you to choose. |
| "This caveat could bite them later." | Name it in one sentence, or wait until it does. |

**Tripwires.** In an answer to a question, each of these means you answered a question nobody asked:

- A code block, where the question began with "why", "does", "is", or "which".
- A second option, where the reader named two.
- A sentence that begins "One thing worth", "Two things to", "Also worth", or "Note that".

### When nothing was asked

An initial comment — a review, a pull request description, a status note — has no question to bound it. Say the thing once, then stop.

- **The opening line gives the outcome and the count, not the findings.** "Changes needed. Three points." Then the three points. An opening that lists them makes the reader read every finding twice.
- **One finding holds location, defect, consequence, fix.** Three sentences and 50 words, plus the code. Name one fix. A choice of two fixes hands the work back to the reader.
- **A pull request description holds what changed, why, and what the reviewer must look at.** Five sentences.

The premise rule holds here too. You read the diff, so you do not know that the controller turns this into a 204.

Done when you cannot delete a sentence without losing a fact.

### The shape

1. The answer, in the first sentence.
2. The evidence, where the reader cannot see it.
3. Stop.

Three sentences carry a normal answer. A longer answer means the reader asked for a list, a procedure, or a comparison.

Done when you can point at the words in the question that each sentence of your answer serves.

### Cut

- Give the number you have. Where you have none, name the condition that decides it.
- State facts flat, or name the check that confirms them. Never dress a fact as personal experience — "the fastest fix I've seen" describes something you did not see.
- Cut openers ("Great question"), restatements of the question, summaries of what you just wrote, and closing offers.
- Cut praise that changes no decision, and never collect it into a section at the end.
- Cut how the answer was produced: which agent ran, how many found it, what you almost missed. A limit you hit is a fact and stays ("the E2E suite did not run").
- Say each thing once. A table does not need a paragraph that reads it back.
- Cut a bulleted list where two sentences carry the point, a bold lead-in on every bullet, "not X — but Y", a third item invented to complete a triad, and a punchy verdict line at the end. Put the verdict first instead.
- Replace hedges with a number or a condition: `almost always`, `usually`, `tends to`, `generally`, `rarely`, `should generally work`.

## Full example

Real unedited AI output, then the same text as procedural STE:

> **Connection timeouts.** If sqlpipe hangs or fails with `dial tcp: i/o timeout`, check that the host running sqlpipe can reach the Postgres port (usually 5432) — this is often a security group or firewall rule blocking the connection. If you're connecting to a managed database (RDS, Cloud SQL, etc.), confirm the instance allows connections from sqlpipe's IP.

> **Connection timeouts.** sqlpipe stops with `dial tcp: i/o timeout` when it cannot reach the Postgres port (5432 by default).
>
> 1. Make sure that the host that runs sqlpipe can reach the Postgres port. A firewall or security group usually blocks it.
> 2. If the database is managed (RDS, Cloud SQL), make sure that the instance accepts connections from the IP of sqlpipe.

Sentences over 40 words became sentences under 20. `you're` expanded. `check` and `confirm` collapsed to one word. Every condition moved before its command. The dash aside became its own sentence. `etc.` disappeared. The code and the error string did not change.

## Limits

STE is written for English. No German edition exists. The German reference applies the same principles to German grammar. Its word limits come from STE. Nobody validated them for German.
