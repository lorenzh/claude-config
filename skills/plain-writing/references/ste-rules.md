# The 53 rules

Paraphrased from ASD-STE100 Issue 9 (January 2025), verified against the standard. The official wording is free at <https://www.asd-ste100.org/>. Issue 9 added no new rules but revised the wording of 31 of the 53.

Part 1 holds these 53 rules in 9 sections. Part 2 holds the dictionary: 875 approved and 1,274 listed un-approved words, ASD copyright, not reproduced here.

**Alternatives are usually clause rewrites, not word swaps.** The dominant pattern is a rejected verb becoming an approved noun plus a generic verb (`DO A CHECK OF`, `DO THE WORK`), and a rejected noun becoming an approved verb. Rule 9.1 exists for this. One-to-one substitution produces wrong output.

## Section 1 — Words (1.1–1.14)

| Rule | Instruction |
|---|---|
| 1.1 | Use only approved words, technical nouns, or technical verbs. |
| 1.2 | Use an approved word only as its listed part of speech. |
| 1.3 | Use an approved word only with its approved meaning. |
| 1.4 | Use only the approved forms of verbs and adjectives. |
| 1.5 | You can use domain words as technical nouns (`webhook`, `commit`, `endpoint`). |
| 1.6 | Use an unapproved word only when it is a technical noun or part of one. |
| 1.7 | Do not use technical nouns as verbs. |
| 1.8 | Use the technical nouns of your project or industry. |
| 1.9 | Keep a technical noun short and clear: not more than three words. |
| 1.10 | No regional, slang, or jargon words as technical nouns. |
| 1.11 | One item, one name. Do not call it `config` here and `settings` there. |
| 1.12 | You can use domain verbs as technical verbs (`deploy`, `compile`, `merge`). |
| 1.13 | Do not use technical verbs as nouns. The past participle of a technical verb can be an adjective ("the reamed hole"). |
| 1.14 | Use American English spelling. |

STE names 22 technical-noun categories and 4 technical-verb categories (manufacturing processes; computer processes and applications; instructions for a subject field; law and regulations). This is what makes STE usable outside aerospace.

**The limit that closes the escape hatch (1.12):** do not use a technical verb when you can write the same sentence with approved words. This is why `delete` stays rejected in ordinary prose even though it fits a verb category.

In pragmatic mode, rules 1.5, 1.8, and 1.12 do the heavy lifting: your domain vocabulary is legal. The rules agents break are 1.7, 1.11, and 1.13.

> You can webhook the event, then do a deploy.
> → Send the event to the webhook. Then deploy the service.

## Section 2 — Multi-word nouns (2.1–2.2)

| Rule | Instruction |
|---|---|
| 2.1 | Write multi-word nouns of three words or fewer. |
| 2.2 | When a technical noun needs more than three words, write it in full once, then give a short form or hyphenate the units. |

Break long chains with prepositions (of, on, in, for):

> the connection pool timeout configuration value
> → the timeout value for the connection pool

## Section 3 — Verbs (3.1–3.7)

| Rule | Instruction |
|---|---|
| 3.1 | Use only the verb forms the dictionary gives. |
| 3.2 | Use only: infinitive, imperative, simple present, simple past, simple future, past participle as an adjective. |
| 3.3 | Use the past participle form as an adjective. Place it before a noun, or after a form of `be`, `become`, or `stay`. The participle must be in the dictionary. |
| 3.4 | No auxiliary verbs for complex constructions. No present perfect, no "is to be installed". `HAVE` is an approved verb but is banned as an auxiliary. |
| 3.5 | Use an `-ing` form only as a technical noun or inside one (`logging`, `the mounting bracket`) — never as a verb, gerund, or adjective. |
| 3.6 | Active voice. In descriptive writing you can use the passive **only** when the agent is unknown. The passive is never permitted in procedural writing. |
| 3.7 | Describe an action with a verb, not a noun: "compress the file", not "perform compression of the file". |

**Approved modals: `can`, `will`, `must`, and `cannot`.** See the modal ladder in `english.md`.

> The migration has completed and the table is being rebuilt.
> → The migration is complete. The database rebuilds the table.

> The temperature must be adjusted.
> → Adjust the temperature.

## Section 4 — Sentences (4.1–4.5)

| Rule | Instruction |
|---|---|
| 4.1 | Write short and clear sentences. |
| 4.2 | Do not omit nouns, verbs, subjects, or articles to shorten a sentence, and do not use contractions. |
| 4.3 | Use a vertical list for complex text. |
| 4.4 | Use connecting words between sentences on related topics ("Then", "As a result"). |
| 4.5 | Put an article (the, a, an) or a demonstrative adjective (this, these) before nouns where applicable. |

Rule 4.2 is the anti-terseness rule. STE is short sentences with complete grammar, not telegraph style:

> Ensure file exists before running.
> → Make sure that the file exists before you run the command.

Keeping the conjunction `that` is GR-1, a recommendation, not rule 4.2.

## Section 5 — Procedural writing (5.1–5.5)

| Rule | Instruction |
|---|---|
| 5.1 | Maximum 20 words per sentence. Warnings, cautions, and other safety instructions must also obey this rule. |
| 5.2 | One instruction per sentence, unless two actions happen at the same time. |
| 5.3 | Write instructions in the imperative: "Run the migration." |
| 5.4 | Put a required condition before the command, divided by a comma: "If the build fails, read the log." |
| 5.5 | Notes give information, never instructions. Maximum 25 words per sentence. A note must not give the limits, tolerances, or results of a work step, and must not use the imperative. |

> You'll want to grab the API key from the dashboard before configuring the client, which you can do under Settings.
> → Get the API key from the dashboard, under Settings. Then configure the client with this key.

## Section 6 — Descriptive writing (6.1–6.6)

| Rule | Instruction |
|---|---|
| 6.1 | Give information gradually. Make sure that each sentence contains only one subject. |
| 6.2 | Use key words and phrases to give the text a logical structure. |
| 6.3 | Maximum 25 words per sentence. |
| 6.4 | Group related information in paragraphs. |
| 6.5 | One topic per paragraph. |
| 6.6 | Maximum six sentences per paragraph. |

No imperative in descriptive text. Descriptions explain; procedures instruct.

## Section 7 — Safety instructions (7.1–7.3)

| Rule | Instruction |
|---|---|
| 7.1 | Use a word or a symbol that shows the risk level. WARNING: risk of injury or death. CAUTION: risk of damage to machines, tools, or equipment. When both apply, use a warning. |
| 7.2 | Start with a clear command or condition. |
| 7.3 | Then give the risk or the possible result. |

Other industries use `danger`, `attention`, or `notice`; STE names the two levels above.

Never bury the instruction after the explanation. The pattern transfers directly to destructive CLI flags, irreversible migrations, and dangerous API options.

> Note that data loss may occur in some circumstances if the destructive flag happens to be enabled when running against production.
> → CAUTION: Do not use the `--force` flag against production. The flag erases rows that do not match the source.

## Section 8 — Punctuation and word count (8.1–8.7)

| Rule | Instruction |
|---|---|
| 8.1 | All standard punctuation is permitted except the semicolon. Write two sentences instead. |
| 8.2 | Use hyphens to connect words that are directly related. |
| 8.3 | Parentheses are permitted for: references, item numbers, abbreviations, plural forms, explanations, alternatives, and to identify the work steps in a procedure. |
| 8.4 | In a vertical list, the lead-in colon ends a sentence for word count. |
| 8.5 | Text inside parentheses counts as one word. |
| 8.6 | Count as one word each: numbers, numbers with units, abbreviations, alphanumeric identifiers, quoted text, titles and headings and text on placards and labels, and proper nouns of individuals, groups, organizations, and geopolitical entities. |
| 8.7 | A hyphenated word counts as one word. |

Rule 8.6 matters for software text: `sqlpipe run --config sqlpipe.yaml` in backticks is quoted text and counts as one word. Long identifiers do not blow your sentence budget.

## Section 9 — Writing practices (9.1–9.4)

| Rule | Instruction |
|---|---|
| 9.1 | When a word-for-word replacement does not work, restructure the sentence. |
| 9.2 | Use each approved word correctly: approved meaning, approved part of speech. |
| 9.3 | Do not build phrasal verbs. |
| 9.4 | Keep one consistent style and terminology through the whole document. |

## General recommendations (GR-1 to GR-8)

**These are not STE rules.** The standard states so directly: they help prevent typical errors, and they do not count toward the 53.

| GR | Recommendation |
|---|---|
| GR-1 | Keep the conjunction `that`. |
| GR-2 | Be careful with the preposition `with` — it hides the relation between two things. |
| GR-3 | Give every pronoun a clear referent. Use only pronouns that are in the dictionary: `he` and `she` are not permitted. |
| GR-4 | Make sure the reader knows what `this` refers to. When it can refer to more than one item, give the applicable context again. |
| GR-5 | Avoid false friends. |
| GR-6 | Do not use Latin abbreviations: write "for example", "that is", and name the items instead of `etc.` |
| GR-7 | Use inclusive language. `he` and `she` are not permitted; `man` and `woman` only where the context requires it. |
| GR-8 | The possessive form is permitted. When you are not sure your sentence is correct, do not use it — non-native readers find it hard. |
