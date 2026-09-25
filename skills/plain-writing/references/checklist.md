# Audit checklist

Use this to audit text you did not write, and when the user asks you to CHECK text rather than write it. For your own draft, step 6 of `SKILL.md` is the shorter check.

Start with the linter. It prints the sentence-length profile, then the candidates it can see.

```
node <path-to-this-skill>/scripts/ste-lint.mjs --type procedural path/to/file.md
node <path-to-this-skill>/scripts/ste-lint.mjs --lang de --type descriptive path/to/datei.md
```

It is a regex pass. It undercounts and it produces false hits. A clean report is not a verdict.

Do not lint a style guide with this. A file that lists the words it replaces reports every one of them as a hard word.

## 1. Sentence shape

| Look for | Violation | Fix |
|---|---|---|
| A subject that is an event, a process, or a quality | No actor (3.6, 3.7) | Name the thing that acts |
| Two or more commas in one sentence | Two ideas (4.1) | Split at the second comma |
| `, which`, `, who`, `, where` | A clause that adds a second fact (4.1) | Write a second sentence |
| A dash in the middle of a sentence | Hidden second sentence (8.1) | Write that sentence |
| Two or more `of` links, or two genitives in German | Noun chain (2.1) | Name the actor and use a verb |
| ` if `, ` when ` mid-sentence | Trailing condition (5.4) | Move the condition to the front, add a comma |

## 2. Words

| Search for | Violation | Fix |
|---|---|---|
| `'ll`, `'re`, `'ve`, `n't`, `it's` | Contraction (4.2) | Expand it |
| `has been`, `have been`, `had been` | Perfect tense (3.4) | Simple past or simple present |
| `has` / `have` + past participle | Present perfect (3.4) | Simple past |
| `should`, `would`, `may`, `might` | Unapproved modal (3.2) | The modal ladder in `english.md` |
| `could` | Unapproved **only** for possibility (3.2) | `can` for possibility; keep `could` as the past form of `can` |
| `is being`, `are being`, `was being` | Progressive passive (3.4, 3.5) | Active, simple tense |
| `, making`, `, allowing`, `, enabling`, `, ensuring` | `-ing` clause as verb (3.5) | New sentence with a real subject |
| `;` | Semicolon (8.1) | Two sentences |
| `e.g.`, `i.e.`, `etc.` | Latin abbreviation (GR-6) | "for example", "that is", name the items |
| A Latin-root word with an everyday twin | Reading level | The everyday-word list in `english.md` or `german.md` |
| `simply`, `easily`, `seamlessly`, `robust` | Filler, carries no fact | Delete |
| A domain term with no explanation on first use | Unexplained term (1.5) | One sentence of explanation |

## 3. Counts

1. **Profile.** Median at or under 14 words. The profile counts prose; a table cell over the limit shows up in the findings instead. A median near the limit fails the one-read test even when no single sentence breaks the rule.
2. **Sentence length.** Procedural 20, descriptive 25, notes 25. Backticked commands, numbers with units, and identifiers count as one word each (8.6).
3. **Paragraph size.** Six sentences maximum (6.6).
4. **Multi-word nouns.** Any noun chain over three words breaks with a preposition (2.1).
5. **Instructions per sentence.** One, unless the actions are simultaneous (5.2).

## 4. Judgment

6. **Classification.** Each passage is cleanly procedural or descriptive. Procedures in the imperative, descriptions never in the imperative.
7. **Voice.** For every passive sentence: the agent is truly unknown and the passage is descriptive. Otherwise make it active (3.6).
8. **Synonym rotation.** One term per concept across the whole document (1.11, 9.4). Scan check/verify/confirm, config/settings, run/execute. Inflections of one verb are not rotation.
9. **Warnings.** Signal word matches the risk, command or condition first, consequence second, placed before the step it guards (7.1–7.3).
10. **Completeness.** Articles present, `that` present after "make sure", no telegraph style (4.2).

## 5. Claims

11. Every number is one you can source, or the text names the command that produces it.
12. Every threshold, flag name, and path is real, or is marked as an assumption to verify.
13. No sentence claims experience or observation that the writer does not have.

An invented specific is worse than an omission. The reader cannot tell it apart from a real one.

## 6. Untouchables

14. Nothing changed inside code blocks, inline code, identifiers, commands, flags, paths, quoted errors, log lines, product names, or configuration keys.

This runs last because it catches damage done by the earlier passes.

## Reporting violations

For each violation give the rule number, the offending text, and a compliant rewrite. Cite only rule numbers from `ste-rules.md`.

When the user asked for STE compliance, end the report with: "No tool can guarantee ASD-STE100 compliance. Final approval rests with the writer. The official standard is a free download at asd-ste100.org."
