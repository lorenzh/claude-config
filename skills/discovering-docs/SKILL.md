---
name: discovering-docs
description: Finds the project's existing documentation. Use when the user asks whether something is documented, where a doc lives, which topics the docs cover, or which tags and keywords the docs already use, and before answering from scratch a question a doc may already answer.
---

# Discovering docs

Docs sit wherever their author put them — `docs/`, `services/*/docs/`, `notes/`, `adr/`,
beside the code. Each carries a frontmatter block with `title`, `description`, `tags`, and
sometimes `keywords`. Discovery is **enumerate, then filter**: read the project's vocabulary
first, then filter with the exact terms it printed. There is no free-text search, so a term
you invent matches nothing.

```bash
node <path-to-this-skill>/scripts/docs.mjs list-tags --root <repo>       # <path-to-this-skill> = the directory containing this SKILL.md
node <path-to-this-skill>/scripts/docs.mjs list-keywords --root <repo>
node <path-to-this-skill>/scripts/docs.mjs query -t <tags> -k <keywords> --root <repo>
```

If Node is unavailable, open the frontmatter of candidate docs by hand and read their `tags`
and `keywords` — but expect to miss docs, which is the failure this script exists to prevent.

**Tags** name the area a doc belongs to, from a small shared vocabulary — `billing`,
`rollback`, `runbook`. **Keywords** name what a reader would actually type, including
synonyms and abbreviations the doc's own prose never uses — `revert`, `dlq`, `fix forward`.
Ask for an area with `-t`, a concept with `-k`.

**Terms match whole, never as fragments.** A doc keyworded `dead letter queue` is *not*
returned by `-k queue`, and `-k webhook` does not reach `duplicate webhook`. Filter with the
term exactly as the list command printed it.

## Process

1. **Enumerate the vocabulary** — run `list-tags`, `list-keywords`, or both. Each prints
   every term with the number of docs carrying it, and ends with the files carrying none.
   Read the counts: a keyword list covering 5 of 70 docs is a pilot, not an index, and a `-k`
   filter over it proves almost nothing. Guessing a term instead of reading the list is the
   one reliable way to get a confidently empty result.

   Done when you hold the printed list of candidate terms and know how much of the repository
   they cover.

2. **Filter** — pass the terms verbatim to `query`:

   ```bash
   node <path-to-this-skill>/scripts/docs.mjs query -k "revert,fix forward" --root <repo>
   node <path-to-this-skill>/scripts/docs.mjs query -t rollback -k "compensating migration" --root <repo>
   ```

   Both flags are optional and at least one is required. Terms are comma-separated and a term
   may contain spaces, so quote the whole list. Within one flag terms are **alternatives**, so
   more terms widen the result; naming both flags **narrows** it, because a doc must match
   each flag you use. Hyphens, underscores, and spaces are equivalent — `dead-letter-queue`
   and `dead letter queue` are the same term. `--limit <n>` raises the 10-result default
   (tunable). What the output means is below, under *What the commands print*.

   Done when a filter returns docs, or every term you tried was reported as unknown.

3. **Read and cite** — open the docs whose description bears on the question and read them.
   Cite each by repository-relative path.

   Done when you have read every doc you cite, and each one actually answers the question
   rather than merely sharing its subject.

## What the commands print

`list-tags` — the scanned tree on line 1, then each term with its doc count, then the files
carrying none. `list-keywords` prints the same shape for the other facet.

```
scanned /path/to/repo — 70 Markdown file(s)

43 tag(s) across 65 doc(s):

  reference      26
  howto          21
  security       11
  billing         6
  ...
  rollback        1
  runbook         1

5 Markdown file(s) list no tags — no tag filter reaches them:
  CONTRIBUTING.md
  docs/architecture.md
  packages/ui-kit/README.md
```

Read the header line before the terms. `24 keyword(s) across 5 doc(s)` on a 70-doc repository
means keywords are a pilot, so a `-k` filter says nothing about the other 65 — and the tail
that follows is truncated, so raise `--limit` when you need all of it:

```
65 Markdown file(s) list no keywords — no keyword filter reaches them:
  CONTRIBUTING.md
  adr/0001-decision-1.md
  ...
  … and 45 more — raise --limit to see them
```

`query` prints six lines per hit — title, description, path, both facets, and the doc's first
real line. The description is what decides which hit you open:

```
1 doc(s) matching keywords revert:

Backing out a shipped release
  The on-call procedure for withdrawing a release that reached production, including the compensating-migration path.
  path: ops/runbooks/release-backout.md
  tags: rollback, release, oncall, runbook, production
  keywords: revert, undo a release, back out, roll back, fix forward, compensating migration, previous artifact  (matched 1/1 terms)
  > The on-call engineer owns the decision to withdraw a release or to fix forward.
```

That doc's prose never contains "revert" — the keyword is why it was reachable.

`(matched n/m terms)` always prints, so a full match reads as `2/2` rather than as silence.
It is how you see whether a doc carried your whole filter or one term of it:

```
$ query -k "revert,dlq"                        # alternatives — widens
2 doc(s) matching keywords revert, dlq:
Backing out a shipped release        … (matched 1/2 terms)
Delivery guarantees in ingest        … (matched 1/2 terms)

$ query -t rollback -k "compensating migration"   # both facets — narrows
1 doc(s) matching tags rollback and keywords compensating-migration:
Backing out a shipped release        … (matched 2/2 terms)
```

Three different empty results, and they mean different things:

```
No doc carries the keyword "compensating-migraton". Closest: compensating-migration.
No doc carries the tag "nosuchtag". Run "list-tags" for the vocabulary.
query needs -t or -k (or both)                              # exit code 2
```

The first is a typo — correct it and filter again. The second means the vocabulary genuinely
has no such term, so widen or check the unannotated tail below. The third is a malformed
command, not a result.

## When the docs you found do not answer the question

This applies to an empty result **and** to the more common case: a doc matched your filter,
its title fits, and its contents do not answer what was asked. Do not stop at the match.

Both list commands end with the files carrying no tags — or no keywords — at all. **Those
files are unreachable by `query`.** In a project part-way through adding metadata they are
most of the repository, so an empty or unhelpful result means "not annotated yet" at least as
often as "not written". Read that tail, open the files whose paths bear on the question, and
say what you found. Use `--limit` when the tail is truncated.

Report that nothing is documented only after naming the tags and keywords you filtered on,
the docs you opened from the tail, and how many files carry no metadata. That last number is
the honest confidence bound on the answer, and it is the backlog `writing-docs` works through.

## Rules

- Pass `--root <repo>` on every call. Without it the script scans the repository enclosing the
  current directory, and a working directory that reset between commands then returns a
  confident, entirely wrong result set. Where the shell does not keep state between calls,
  write the full script path and `--root` into each command rather than relying on a variable.
- Every run prints the tree it scanned and the file count on its first line. Read that line
  and confirm it is the repository you meant.
- Enumerate with `list-tags` and `list-keywords` rather than a hand-rolled `grep '^tags:'`.
  Both frontmatter forms below are valid and common, and a grep pipeline reads the first while
  silently dropping every term in the second:

  ```yaml
  tags: [rollback, oncall]

  tags:
    - rollback
    - oncall
  ```
