# English

Word choice for English output. The shared rules are in `ste-rules.md`, the workflow in `SKILL.md`.

Two lists live here and they answer to different masters. The **everyday-word list** serves the reader. The **dictionary rulings** serve ASD-STE100. Step 1 of `SKILL.md` is the one place that decides between them: the everyday word wins in pragmatic mode, the dictionary wins in strict mode. This file does not repeat that decision.

The official dictionary (~900 approved words, ~1,200 banned words with alternatives) is ASD copyright and is not reproduced here. Its mechanics apply without it: **one word, one meaning, one part of speech.** Use American English spelling (Rule 1.14).

## The everyday word (both modes)

Prefer the word your reader met first. A Latin-root word and its everyday twin mean the same thing to you. To a reader who learned English at school, the everyday twin is the one they met first.

| Instead of | Write |
|---|---|
| additional, supplementary | more |
| additionally, furthermore, moreover | also |
| approximately | about |
| assist | help |
| attempt | try |
| capability | what it can do |
| commence, initiate | start |
| component, element | part |
| consequently, therefore, thus | so |
| currently, presently | now |
| demonstrate, illustrate | show |
| determine, ascertain | find out |
| eligible | allowed, or say what the service can now do |
| establish | set up |
| however, nevertheless | but |
| identify | find, name |
| immediately | at once |
| implementation | the code |
| indicate | show |
| initially | at first |
| methodology | method |
| modify, amend | change |
| numerous, multiple | many, several |
| obtain, acquire | get |
| occur, transpire | happen |
| perform, conduct | do |
| permit | let |
| previously, formerly | before |
| provide | give |
| purchase | buy |
| receive | get |
| regarding, concerning | about, for |
| require | need |
| retain | keep |
| subsequent | next |
| subsequently | then, after that |
| sufficient, adequate | enough |
| terminate, cease | stop |
| utilization | use |
| utilize, leverage | use |
| validate | check |
| verification | the check |

A domain term is not on this list and does not belong on it. `idempotent`, `webhook`, `partition`, and `commit` stay. Give each one a sentence of explanation on first use.

## Slop-to-simple

These are the words AI-generated text overuses. They carry no fact. Where the row says delete, delete — a replacement keeps the padding.

| Slop | Write |
|---|---|
| in order to | to |
| prior to | before |
| ensure | make sure that |
| it is worth noting that | (delete) |
| it's important to, crucially | (delete — state the fact) |
| simply, just, easily, seamlessly, effortlessly | (delete) |
| robust, powerful, comprehensive, performant | (delete, or give the measurable property) |
| functionality | function, feature |
| enables you to, allows you to | you can |
| is designed to, aims to | (delete — say what it does) |
| facilitate | help, make possible |
| dive into, delve into | read, examine |
| when it comes to | for |
| in the event that | if |
| due to the fact that | because |
| as needed, as necessary | (state the condition) |
| and/or | Pick one, or "X, or Y, or both" |
| e.g., i.e., etc. | for example, that is, (name the items) |
| gracefully handles | (say what it does: "retries three times, then stops") |
| out of the box | by default |
| under the hood | internally |
| blazingly fast, state-of-the-art | fast (give the number), (delete) |
| streamline | make simpler, make faster |
| plethora, myriad | many |
| addresses the issue, tackles | corrects the fault, removes the error |

## The modal ladder (both modes)

Approved: **can, will, must, cannot.** Not approved: should, would, may, might.

| You wrote | Write |
|---|---|
| should (requirement) | must — or restructure with `if` |
| should (recommendation) | Delete it, or state it as fact: "X is better because Y." |
| shall | must |
| may (possibility) | can, or `possibly` |
| may (permission) | can |
| might | can |
| would (hypothetical) | can, or restructure: "If X occurs, Y occurs." |

**`could` is a special case.** It is approved as the past form of `can` for ability or permission. It is banned for **possibility** only: write "an explosion can occur", never "could occur". Do not strip every `could` on sight.

`might` appears nowhere in the standard. It is unapproved by omission rather than by a dictionary entry.

This matters double in agent instructions — a model reads `should` as optional.

## Consistency (both modes)

Collapse synonym rotation to one term each (Rules 1.11, 9.4). Pick the term before you draft.

- **check / verify / confirm / ensure** — one concept, four words. Pick one.
- **config / configuration / settings / options** — all valid technical nouns. Pick one.
- **run / execute / invoke / launch** — pick one.
- **delete / erase / remove / destroy** — pick one, unless the code names two different operations.
- **show / display / render / present** — pick one.
- **problem / issue / fault / error** — pick one.

Inflections of one verb are not rotation. `runs` and `run` are the same word.

## Dictionary rulings (strict mode)

Patterns from the ASD-STE100 dictionary. Step 1 of `SKILL.md` decides when they apply.

**Alternatives are usually clause rewrites, not word swaps.** The dominant pattern is a rejected verb becoming an approved noun plus a generic verb (`DO A CHECK OF`), and a rejected noun becoming an approved verb. Rule 9.1 exists for this.

| Word | Ruling |
|---|---|
| test, work | Noun only. "Do a functional test of the pump", not "test the pump". "Do the work". |
| check | Noun only, and the verb has **three** replacements by sense: "check that X" → `make sure that X`; "check the distance" → `measure`; "check for corrosion" → `examine`. Using `make sure` for all three mis-converts two of them. |
| oil | Technical noun only. The verb is `lubricate`, or the clause `put oil on`. |
| help | Verb only. The noun is `aid`: "with the aid of". |
| fall | Verb only, for movement down **by the force of gravity**: "Make sure that the tools do not fall into the engine." The noun sense becomes the verb `decrease` — a clause rewrite, not a noun swap. |
| follow | "To come after, to go after" only, never "obey". "Follow the green lights to the staircase" is valid; for the other sense write "obey the instructions". |
| above, below | Physical positions only. For limits write `more than`, `less than`. |
| error, problem | Nouns only, and narrower than everyday use. `error` is the metrology sense: the difference from what is correct. |
| validate | Not in the dictionary. Technical verb (Rule 1.12), or `make sure that`. |
| delete | Rejected. `erase` for data, `remove` for physical objects. |
| destroy | Rejected. `break` — not `remove`. |
| drop (verb) | Rejected. `fall` or `decrease`. **`drop` as a noun is approved** (a small quantity of liquid). |
| run, execute | Both rejected as verbs. `operate` for run, `do` for execute. `do` is scoped to completing a procedure, task, or step. No approved noun `run` exists. |
| invoke, launch | Not in the dictionary. Technical verbs (Rule 1.12). |
| display (verb) | Rejected. `show`. **`display` as a noun is approved** (a visual indication). |
| render | Rejected. `make` — not `show`: "make the system electrically safe". |
| present | Rejected. `be` for the adjective; `give` or `show` for the verb, by context. |
| issue | Not in the dictionary. Technical noun, or `problem`. |
| failure | Approved only as a technical noun: a performance error or loss of serviceability. "A failure of the pump". For "failure to comply" write `if … not`. |
| remove | Approved verb. Keep it. It is the most reused alternative in the dictionary. |

**Where strict mode makes the text harder.** `determine` for `find out` and `do a check of` for `check` raise the reading level. The dictionary buys exactness with difficulty, and that trade is correct only when the user asked for compliance.

## Phrasal verbs

Do not build them (Rule 9.3). A small set is approved; do not coin new ones.

go down → decrease · set up → install, configure · put in → install · carry out → do · turn on → start · shut down → stop

`find out` is the pragmatic-mode alternative to `determine` and stays, even though the dictionary sends it the other way.

## General recommendations (GR-1 to GR-8)

Keep the conjunction `that`. Be careful with `with` — it hides the relation between two things. Give every pronoun a clear referent, and prefer `this` plus a noun over a bare `this`. Avoid false friends and Latin abbreviations. Use inclusive language. Use the possessive apostrophe only when you are sure it is correct; if unsure, rewrite, because non-native readers find it hard.
