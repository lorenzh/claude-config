---
name: update-claude-agents
description: Syncs the pinned gp-* subagent files in `~/.claude/agents` with the model catalog of the installed Claude Code. Use when a new Claude model has shipped, when the user asks to update or refresh the pinned gp agents, when `~/.claude/agents` needs catching up after a Claude Code upgrade, or when the model matrix in `CLAUDE.md` needs a new model id.
---

# Updating the pinned Claude agents

A pinned `gp-<model>-<effort>.md` file makes one model id dispatchable at one effort. It is a claim about two things: that the id works, and that the matrix knows what to send there. **The catalog answers the first, and only a human answers the second** — the DeepSWE numbers in `CLAUDE.md` are measured per model id, and a newer model inherits none of them.

The files exist because the `Agent` tool's own `model` parameter takes only the aliases `opus`, `sonnet`, `haiku`, `fable`, which cannot tell two Opus generations apart. So each file carries exactly four frontmatter fields — `name`, `description`, `model`, `effort` — and `model` holds the full id (`claude-opus-5`), never the alias.

`effort` is one of `low`, `medium`, `high`, `xhigh`, `max`. **Any other value is silently ignored**: the file loads, the agent runs at the default effort, and nothing reports the typo. That is why `scripts/sync-gp-agents.mjs` rejects an unknown `--efforts` value instead of passing it through, and why it flags an existing file whose `effort` is off-list.

The same silence covers broken frontmatter: a `description` holding `": "`, a trailing `" #"`, or a leading indicator character is no longer a valid plain YAML scalar, and the file is skipped without a word. The script quotes the description when the text needs it, which is why a `--note` may be written in ordinary prose.

## 1. Run the sync, read-only

**Run** this — it reads a 220 MB binary and every agent file, so reading the script instead of running it answers nothing:

```
node ~/.claude/skills/update-claude-agents/scripts/sync-gp-agents.mjs
```

It finds the active binary through `command -v claude` plus `readlink -f`, pulls the candidate model ids out of it, and prints three lists: models the catalog knows that have no gp files, models whose effort series is incomplete, and gp files whose model the catalog no longer lists. `--json` is the machine-readable twin. Exit 0 means clean, 1 means drift, 2 means misuse.

The candidate list is regex output over a binary, so it carries noise — dated ids, truncated fragments, ids that were never real. Treat it as a list to test, not a list of models.

Done when the three lists are in hand and every model you intend to act on appears in one of them.

## 2. Confirm access for each candidate

A model id is usable only when a real call accepts it; an unknown id aborts the dispatch with "isn't described by this version's model catalog", which is a failure the pinned file cannot predict.

```
node ~/.claude/skills/update-claude-agents/scripts/sync-gp-agents.mjs --check-access --models <id>,<id>
```

Each candidate gets one `claude --model <id> -p` call under a timeout. This probe, not the regex, is what separates a real model from noise.

Done when every candidate is on the confirmed or the unconfirmed list, and unconfirmed ids are dropped from the run.

## 3. Ask the human, one question at a time

Two decisions belong to the human and to nobody else. Ask them per confirmed new model, **one primary question per message** — a batch gets the first answered and the rest skipped.

- **The effort series**: all five efforts, or only the ones that would actually be dispatched.
- **Routing**: does the model go onto a matrix row, or is it only reachable? The default is **not routed** — a model without its own DeepSWE measurement stays reachable-on-instruction until someone measures it, and that is the sentence the new file carries unless the human says otherwise.

If the harness offers a structured multiple-choice prompt, use it with the same options; otherwise write them as plain text. In Claude Code that prompt is `AskUserQuestion`, with hard limits of 1–4 questions per call and 2–4 options each; an "Other" free-text row is appended automatically, so never write one, and nothing is pre-selected, so a recommendation reads as one only in first position with a "(Recommended)" suffix.

Done when each confirmed model has an answer on both decisions, recorded in the `--efforts` and `--note` arguments of step 4.

## 4. Write the files

```
node ~/.claude/skills/update-claude-agents/scripts/sync-gp-agents.mjs --write --models <id> --efforts low,medium,high,xhigh,max --note "<the sentence from step 3>"
```

The script fills `templates/gp-agent.md`, prints every file it creates, **never overwrites an existing file**, and writes a model only when that model's access was confirmed in the same run. `--write` therefore re-probes; it does not trust an earlier run.

Done when the run printed one `wrote` line per intended file and no `blocked` line remains.

## 5. Update `CLAUDE.md` in the same pass

The new files change what `CLAUDE.md` says, and the table is the smaller half of the job.

- **The table**: add or move the model's rows, with the model id and effort spelled as the files spell them.
- **The prose under it**: the never-route list, the routing rules, and any sentence that counts or negates a pinned copy. A sentence like "There is no pinned copy for `claude-opus-4-8`" was true until the files existed and false the moment they did, with nothing to flag it — so read the prose around the table for every claim the new files touch, not only the list you came to edit.

A model the human left unrouted in step 3 belongs in the prose as reachable-on-instruction, not in a matrix row.

Done when the table and the surrounding prose both name the new files, and no sentence in `CLAUDE.md` still asserts something the new files contradict.
