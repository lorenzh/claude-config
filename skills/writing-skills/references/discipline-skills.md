# Bulletproofing Discipline Skills

A discipline skill enforces a rule the agent knows but is tempted to skip under pressure — verification before completion, test-first, mandatory review gates. The failure mode is not misunderstanding; it is *negotiation*: under time pressure, sunk cost, or an authority saying "just ship it", the agent rationalizes an exception. These techniques make the rule hold. They apply **only** to discipline failures — for wrong-shaped output or missing elements, prohibition-heavy guidance backfires; use the positive recipes from the main guide ([SKILL.md](../SKILL.md)) instead. In a mixed skill — mostly technique, with one rule the agent is tempted to skip — scope this machinery to that rule alone, never the whole skill.

## Close every loophole explicitly

Stating the rule is not enough; forbid the specific workarounds by name:

```markdown
Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing the tests
- Don't look at it
- Delete means delete
```

## Cut off "spirit vs letter" arguments

Add one foundational line early in the skill's `SKILL.md`, beside the rule it protects (in a mixed skill this line stays inline even when the machinery lives in a reference file):

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

This removes the entire class of "I'm honouring the spirit" rationalizations in one sentence.

## Build a rationalization table

Every excuse observed in baseline and pressure testing goes into a table the agent will recognize itself in:

```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. The test takes 30 seconds. |
| "I'll test after" | Tests that pass immediately prove nothing. |
| "No time to test" | Debugging an untested change costs more time than the test. |
```

## Add a red-flags list

Give the agent a self-check for the moment it starts rationalizing:

```markdown
## Red flags — STOP and start over

- Code written before the test
- "I already manually tested it"
- "This case is different because…"

**Each of these means: delete the change, restart with the rule.**
```

## Test under combined pressure

Single pressures are easy to resist; combinations are what break discipline. Pressure-test with a fresh subagent facing at least three at once — e.g. time pressure ("demo in 10 minutes") + sunk cost ("the implementation is already written and works") + exhaustion ("this is the fifth attempt"). The skill passes when the agent follows the rule anyway. Every *new* rationalization the agent produces goes back into the table and red-flags list, then re-test — repeat until a run produces no new rationalizations.

Write the scenario so the agent must act, not recite: open with a real decision ("This is a real scenario. Choose and act."), give concrete options with real constraints and file paths, and leave no defer-to-the-user exit — an agent asked "what does the skill say?" passes vacuously.

When a pressure run fails, interrogate the failing agent before editing: "You read the skill and chose B anyway — how should it have been written so A was the only acceptable answer?" Route the answer: "it was clear, I ignored it" → strengthen the foundational line; "it should have said X" → add X verbatim; "I didn't see that section" → move the rule earlier.
