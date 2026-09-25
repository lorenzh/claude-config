---
name: writing-docs
description: Writes and updates project documentation so it stays findable. Use when the user asks to write, update, or document something as a project doc, or when a doc needs its title, description, tags, or keywords fixed.
---

# Writing docs

A doc opens with a frontmatter block carrying `title`, `description`, `tags`, and `keywords`.
Discovery filters on exact terms from that block and nothing else, so a doc whose block is
missing or vague is invisible no matter how good its prose is.

Steps 1 and 5 use the same script the `discovering-docs` skill drives — when that skill is
installed, its `scripts/docs.mjs` sits in a sibling folder. Pass `--root <repo>` so the scan
targets the repository you are documenting rather than wherever the shell happens to sit, and
write the full script path into each command where the shell does not keep state between
calls:

```bash
DOCS="<path-to-discovering-docs-skill>/scripts/docs.mjs"
node "$DOCS" list-tags --root <repo>
node "$DOCS" list-keywords --root <repo>
node "$DOCS" query -t <tags> -k <keywords> --root <repo>
```

If the script is unavailable, read the frontmatter of neighbouring docs by hand to collect the
vocabulary, and tell the user the tag and keyword choices were made without it.

Write the doc in the language the surrounding docs use.

## Process

1. **Search before you write** — run `list-tags` and `list-keywords`, then `query` with every
   term that could name your topic. You are proving a duplicate does **not** exist, so filter
   from more than one angle before concluding it is absent.

   The list commands end with the files carrying no tags or no keywords. **When that tail is
   long, no filter can prove absence** — those docs are unreachable. Grep the tree for the
   topic before concluding it is undocumented: `grep -ril <topic> --include='*.md' .`

   When a doc already covers the topic, update it in place; a second doc on one topic
   disagrees with the first within a release. Note the docs that came back adjacent even when
   none is a duplicate — they decide step 2 and step 4.

   Done when you can name the doc you are updating, or state which tags and keywords you
   filtered on, that none matched, and that the grep over the unannotated tail also found
   nothing.

2. **Place the file** — a new doc joins the tree its nearest neighbours already occupy, and
   the paths from step 1 are the answer. Reuse that folder even when its name is not the one
   you would choose.

   When neighbours span several trees, follow what each tree is for: one service's internals
   → that service's docs; a procedure followed during an incident → the runbooks; a decision
   record → the decision records; a topic crossing services → the shared docs tree.

   Create a new folder only when step 1 returned no neighbour at all, and tell the user you
   did. This is where two agents documenting one topic produce two paths, so an imperfect
   existing home beats a tidy new one.

   Done when the path sits beside at least one doc from step 1, or you have told the user you
   created a folder and why.

3. **Write the metadata block**

   ```yaml
   ---
   title: Backing out a shipped release
   description: The on-call procedure for withdrawing a release that reached production, including the compensating-migration path.
   tags: [rollback, release, oncall, runbook, production]
   keywords: [revert, undo a release, back out, fix forward, compensating migration, migration]
   ---
   ```

   Either list form works — the flow list above, or a block sequence with one `- term` per
   line. Match the form the folder you are joining already uses.

   **title** — a noun phrase naming the topic the way a reader would say it out loud.

   **description** — one sentence answering "would this doc answer my question?", spent on
   concrete nouns. It is what a filter result shows, so it decides which hit gets opened.

   **tags** — three to six (tunable), lowercase with hyphens, from `list-tags`. Tags are a
   **shared, converging** vocabulary: one names the doc's primary subject, and where two tags
   mean the same thing the higher count wins. Add at most two new tags and say which in your
   summary to the user — an invented synonym for an existing tag splits the vocabulary and
   hides both docs.

   To decide whether an existing tag already names the subject, filter on it: if the result is
   this doc among a pile of unrelated ones, it does not name the subject and a new tag is
   justified. `payments` returning tax calculation and invoice generation does not name a
   webhook-deduplication doc; `webhooks` does.

   **keywords** — five to ten (tunable), the words a reader would type that the tags do not
   already carry: synonyms, abbreviations, and the phrasing someone uses before they know your
   terminology. `revert` and `back out` belong on a doc titled *Backing out a shipped release*
   precisely because its prose never says them.

   Keywords match **whole terms only**. `duplicate webhook` is not reachable by `webhook`, and
   `dead letter queue` is not reachable by `queue`, so list the bare head noun as its own
   entry beside the phrase — `[dead letter queue, dlq, queue]`. Unlike tags, keywords are
   **open and do not converge**: a keyword only this doc carries still does its job, so reuse
   from `list-keywords` where it fits but never force it.

   Done when the block carries a non-empty title and description, three to six tags with one
   naming the primary subject, five to ten keywords whose multi-word entries also appear as
   bare nouns, and every new tag is named to the user.

4. **Write the body** — answer the question the description promises. State what the reader
   must do and what happens if they do not.

   Match the surrounding docs in register and formatting: heading depth, person, whether steps
   are numbered. Let the material set the length — a repository of six-line stubs is no
   argument for writing a seventh.

   Cross-link the one or two closest docs from step 1 as Markdown links whose target resolves
   from this doc's own folder. Usually that is a sibling — `transactions.md` — and only a doc
   in another tree needs `../../ops/runbooks/release-backout.md`.

   Done when every cross-link resolves to a file that exists.

5. **Confirm it is findable** — filter the way a colleague would who does not know the doc
   exists, using their words rather than phrases lifted from your title:

   ```bash
   node "$DOCS" query -k "<what a colleague would call this>" --root <repo>
   node "$DOCS" query -t "<the doc's tags>" --root <repo>
   ```

   Try the bare nouns as well as the phrases — a single word is what a colleague actually
   types. **When one of their words returns nothing, add that word to `keywords`** rather than
   only rewording the description. These additions take precedence over step 3's count: twelve
   keywords beat dropping a term that already earns its place. Every miss caught here becomes
   a permanent handle on the doc, which is how the vocabulary earns its keep.

   Done when both filters return the doc, and every colleague word you tried either returns it
   or has been added to `keywords`.

## Updating an existing doc

Correct the metadata when the edit changed what the doc is about — new subject matter needs a
tag, a renamed concept keeps its old name as a keyword so existing habits still find it, and a
description that no longer describes the doc needs rewriting.

Leave the block alone when the edit did not change the doc's subject. Re-tagging a doc because
you happened to open it is churn: it costs a review and it drifts the shared tag vocabulary
that the `list-tags` counts depend on.

Fixing another doc's metadata is a separate change. Propose it — name the file and the terms
you would add — and apply it only if the user agrees.

Done when you have stated either which metadata you changed and why, or that the edit did not
change the doc's subject.

## Red flags — stop

- Inventing a tag without running `list-tags` first, or adding a third new tag to one doc.
- Reporting that nothing is documented when the list commands showed a long unannotated tail
  and no grep was run over it.
- Finishing without step 5, or "fixing" a failed step 5 by rewording the title until it
  matches your own query.
- Re-tagging docs you were not asked to change.
