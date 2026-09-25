#!/usr/bin/env node
// docs.mjs — index-free discovery over the project's Markdown docs.
//   node docs.mjs list-tags                        every tag, with doc counts
//   node docs.mjs list-keywords                    every keyword, with doc counts
//   node docs.mjs query -t <tags> -k <keywords>    filter docs; at least one facet required
// Docs are Markdown files carrying YAML frontmatter with title, description, tags, and
// optional keywords. Discovery is enumerate-then-filter: read the vocabulary with a list
// command, then filter with the terms it printed. Filtering is exact on a canonical form,
// so `dead-letter-queue`, `dead_letter_queue`, and `dead letter queue` are one term.
// Read-only; runs on Windows, macOS, and Linux (Node >= 18, no dependencies).

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const MD = /\.(md|mdx|markdown)$/i;
const MAX_FILE_BYTES = 2_000_000; // a doc larger than this is generated, not written
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', 'bin', 'obj', 'target',
  'vendor', 'coverage', '.next', '.nuxt', '.venv', 'venv', '__pycache__',
  // agent tooling: skills and instruction bundles are not this project's docs
  '.claude', '.agents', '.codex', '.cursor', '.github-agents',
]);

let skipped = 0; // files the scan could not read or deliberately passed over

// ---------------------------------------------------------------- file discovery

const runGit = (args, cwd) => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 256 * 1024 * 1024, // a monorepo's file list exceeds the 1 MiB default
    });
  } catch {
    return null;
  }
};

function walk(dir, root, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    skipped++;
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, root, acc);
    } else if (entry.isFile() && MD.test(entry.name)) {
      acc.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return acc;
}

// Prefer git's file list — it already honours .gitignore — and fall back to a walk.
// Without git on PATH the walk cannot read .gitignore, so ignored Markdown is included;
// SKIP_DIRS covers the usual build output.
function listMarkdown(root) {
  const tracked = runGit(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
  if (tracked !== null) {
    return tracked
      .split('\0')
      .filter((f) => f && MD.test(f) && !f.split('/').some((seg) => SKIP_DIRS.has(seg)))
      .sort();
  }
  return walk(root, root, []).sort();
}

// ---------------------------------------------------------------- frontmatter

// Walks a YAML scalar line tracking quote state. Double quotes honour backslash
// escapes, single quotes use a doubled '' — so `"say \" # x"` holds no comment.
function* scanQuoted(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote === '"' && ch === '\\') {
      yield { i, ch, inQuote: true };
      if (i + 1 < line.length) yield { i: ++i, ch: line[i], inQuote: true };
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (quote === "'" && line[i + 1] === "'") {
          yield { i, ch, inQuote: true };
          yield { i: ++i, ch: line[i], inQuote: true };
          continue;
        }
        quote = null;
      }
      yield { i, ch, inQuote: true };
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    yield { i, ch, inQuote: quote !== null };
  }
}

// Strip surrounding quotes and resolve YAML's escapes.
function unquote(value) {
  const s = value.trim();
  const m = /^(['"])([\s\S]*)\1$/.exec(s);
  if (!m) return s;
  return (m[1] === '"' ? m[2].replace(/\\(.)/g, '$1') : m[2].replace(/''/g, "'")).trim();
}

// Drop a trailing YAML comment, respecting quotes: `tags: [a, b] # taxonomy`.
function stripComment(line) {
  for (const { i, ch, inQuote } of scanQuoted(line))
    if (!inQuote && ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  return line;
}

// Split a flow list on commas that sit outside quotes: `["a, b", c]` is two items.
function splitFlow(inner) {
  const items = [];
  let current = '';
  for (const { ch, inQuote } of scanQuoted(inner)) {
    if (!inQuote && ch === ',') {
      items.push(current);
      current = '';
    } else current += ch;
  }
  items.push(current);
  return items.map(unquote).filter(Boolean);
}

const BLOCK_SCALAR = /^[|>][-+]?\d*$/; // |, >, |-, >-, |+, |2 …

// Minimal YAML: enough for the title / description / tags / keywords block a doc carries.
function parseFrontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return { meta: null, body: text };
  const meta = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const raw = stripComment(kv[2]).trim();
    if (raw === '' || BLOCK_SCALAR.test(raw)) {
      // a block scalar, or a block sequence on the following indented lines
      const items = [];
      const block = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        const next = lines[++i];
        const item = /^\s*-\s*(.*)$/.exec(next);
        if (item) items.push(unquote(stripComment(item[1])));
        else block.push(next.trim());
      }
      meta[key] = items.length ? items.filter(Boolean) : block.join(' ');
      continue;
    }
    if (raw.startsWith('[') && raw.endsWith(']')) {
      meta[key] = splitFlow(raw.slice(1, -1));
      continue;
    }
    meta[key] = unquote(raw);
  }
  return { meta, body: text.slice(m[0].length) };
}

// A term is a plain word or phrase. Commas and semicolons always separate — a term
// carrying one could never be passed back through -t/-k. Structural YAML characters
// mean the frontmatter was malformed, so the fragment is dropped rather than indexed
// as vocabulary the writer would then copy.
const LOOKS_MALFORMED = /[[\]{}:<>|]/;
const asList = (value) =>
  (Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    .flatMap((item) => String(item).split(/[,;]/))
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && t.length <= 80 && !LOOKS_MALFORMED.test(t));

function loadDocs(root) {
  const docs = [];
  for (const file of listMarkdown(root)) {
    const full = path.join(root, file);
    let text;
    try {
      if (statSync(full).size > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }
      text = readFileSync(full, 'utf8');
    } catch {
      skipped++;
      continue;
    }
    const { meta, body } = parseFrontmatter(text);
    const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
    docs.push({
      file,
      title: (meta?.title || heading || path.basename(file)).trim(),
      description: (meta?.description || '').trim(),
      tags: asList(meta?.tags),
      keywords: asList(meta?.keywords),
      body,
    });
  }
  return docs;
}

// ---------------------------------------------------------------- terms

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
// `dead-letter-queue`, `dead_letter_queue`, and `dead letter queue` are one term.
const canon = (s) => fold(s).replace(/[\s_./-]+/g, '-').replace(/^-|-$/g, '');
// Comma is the only separator: keywords are phrases, so `-k "dead letter queue"`
// has to stay one term rather than becoming three.
const splitTerms = (value) => [...new Set(value.split(',').map(canon).filter(Boolean))];

// Distance is used only to suggest a correction for a term that matched nothing —
// never to rank results. Filtering itself is exact.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function nearest(term, vocabulary) {
  const max = term.length >= 8 ? 3 : 2;
  return [...vocabulary]
    .map((v) => ({ v, d: editDistance(term, v, max) }))
    .filter((x) => x.d <= max)
    .sort((a, b) => a.d - b.d || (a.v < b.v ? -1 : 1))
    .slice(0, 3)
    .map((x) => x.v);
}

// ---------------------------------------------------------------- output

function firstLine(doc, width = 240) {
  const line = doc.body
    .split(/\r?\n/)
    .find((l) => l.trim() && !/^\s*(#{1,6}\s|```|<!--|---\s*$)/.test(l));
  const text = (line || '').trim().replace(/\s+/g, ' ');
  return text.length > width ? `${text.slice(0, width - 1)}…` : text;
}

const byFile = (a, b) => (a.doc.file < b.doc.file ? -1 : a.doc.file > b.doc.file ? 1 : 0);

// Naming the scanned tree makes a wrong working directory visible instead of
// looking like a repository that simply has no matching docs.
function banner(root, docs) {
  console.log(
    `scanned ${root} — ${docs.length} Markdown file(s)`
      + (skipped ? `, ${skipped} unreadable or oversized and left out` : '') + '\n',
  );
}

function printVocabulary(docs, field, label, tail) {
  // Group by canonical form so each printed row is exactly one thing `query` can match:
  // `ci-cd` and `ci_cd` are one term, and printing them apart would misstate the count.
  const groups = new Map();
  for (const doc of docs)
    for (const term of new Set(doc[field].map(canon))) {
      const group = groups.get(term) ?? { count: 0, surface: new Map() };
      group.count++;
      groups.set(term, group);
    }
  for (const doc of docs)
    for (const term of doc[field]) {
      const group = groups.get(canon(term));
      if (group) group.surface.set(term, (group.surface.get(term) ?? 0) + 1);
    }
  const sorted = [...groups.entries()]
    .map(([term, g]) => [
      [...g.surface.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? term,
      g.count,
    ])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

  if (!sorted.length) console.log(`No ${label}s found — no doc in this project lists ${label}s.`);
  else {
    const pad = sorted.reduce((w, [term]) => Math.max(w, term.length), 0);
    console.log(`${sorted.length} ${label}(s) across ${docs.filter((d) => d[field].length).length} doc(s):\n`);
    for (const [term, count] of sorted) console.log(`  ${term.padEnd(pad)}  ${count}`);
  }

  const missing = docs.filter((d) => !d[field].length);
  if (missing.length) {
    console.log(`\n${missing.length} Markdown file(s) list no ${label}s — no ${label} filter reaches them:`);
    for (const doc of missing.slice(0, tail)) console.log(`  ${doc.file}`);
    if (missing.length > tail) console.log(`  … and ${missing.length - tail} more — raise --limit to see them`);
  }
}

function printDoc(doc, note) {
  console.log(doc.title);
  if (doc.description) console.log(`  ${doc.description}`);
  console.log(`  path: ${doc.file}`);
  console.log(`  tags: ${doc.tags.join(', ') || '(none)'}`);
  console.log(`  keywords: ${doc.keywords.join(', ') || '(none)'}${note}`);
  const text = firstLine(doc);
  if (text) console.log(`  > ${text}`);
  console.log('');
}

// ---------------------------------------------------------------- commands

function cmdList(root, field, label, tail) {
  const docs = loadDocs(root);
  banner(root, docs);
  printVocabulary(docs, field, label, tail);
}

function cmdQuery(root, wantTags, wantKeywords, limit) {
  const docs = loadDocs(root);
  banner(root, docs);

  const facets = [
    { terms: wantTags, field: 'tags', label: 'tag', list: 'list-tags' },
    { terms: wantKeywords, field: 'keywords', label: 'keyword', list: 'list-keywords' },
  ].filter((f) => f.terms.length);

  // Name terms that exist nowhere, so an empty result is never mistaken for an
  // absent doc when it was really a mistyped or invented term.
  let unknown = false;
  for (const facet of facets) {
    const vocabulary = new Set(docs.flatMap((d) => d[facet.field].map(canon)));
    for (const term of facet.terms)
      if (!vocabulary.has(term)) {
        unknown = true;
        const near = nearest(term, vocabulary);
        console.log(
          `No doc carries the ${facet.label} "${term}".`
            + (near.length ? ` Closest: ${near.join(', ')}.` : ` Run "${facet.list}" for the vocabulary.`),
        );
      }
  }
  if (unknown) console.log('');

  const ranked = docs
    .map((doc) => {
      let matched = 0;
      for (const facet of facets) {
        const has = new Set(doc[facet.field].map(canon));
        const hits = facet.terms.filter((t) => has.has(t)).length;
        if (!hits) return null; // every facet named must contribute at least one term
        matched += hits;
      }
      return { doc, matched };
    })
    .filter(Boolean)
    .sort((a, b) => b.matched - a.matched || byFile(a, b))
    .slice(0, limit);

  if (!ranked.length) {
    console.log('No doc matches every facet you named. Drop a facet to widen, or run "list-tags" / "list-keywords".');
    return;
  }
  const asked = facets.reduce((n, f) => n + f.terms.length, 0);
  console.log(
    `${ranked.length} doc(s) matching ${facets.map((f) => `${f.label}s ${f.terms.join(', ')}`).join(' and ')}:\n`,
  );
  for (const { doc, matched } of ranked) printDoc(doc, `  (matched ${matched}/${asked} terms)`);
}

// ---------------------------------------------------------------- entry point

const usage = 'usage:\n'
  + '  node docs.mjs list-tags [--root <dir>]\n'
  + '  node docs.mjs list-keywords [--root <dir>]\n'
  + '  node docs.mjs query [-t <tags>] [-k <keywords>] [--limit <n>] [--root <dir>]\n'
  + '    -t and -k take a comma-separated list; at least one of them is required.\n'
  + '    Terms within a facet are alternatives; a doc must match every facet you name.';

const die = (message) => {
  console.error(message);
  process.exit(2);
};

// `--flag=value` is expanded first so a term may start with a hyphen, which the
// positional form would otherwise read as the next flag.
const argv = [];
for (const arg of process.argv.slice(2)) {
  const m = /^(--?[A-Za-z-]+)=([\s\S]*)$/.exec(arg);
  if (m) argv.push(m[1], m[2]);
  else argv.push(arg);
}

let rootArg = null;
let limit = null;
let tagArg = null;
let keywordArg = null;
const positional = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  const take = (name) => {
    const value = argv[++i];
    if (value === undefined) die(`${name} needs a value`);
    if (value.trim() === '') die(`${name} needs a non-empty value`);
    if (value.startsWith('-') && !/^-\w+=/.test(value)) die(`${name} needs a value (use ${name}=<value> for a value starting with "-")`);
    return value;
  };
  if (arg === '-t' || arg === '--tags') tagArg = [tagArg, take('-t')].filter(Boolean).join(',');
  else if (arg === '-k' || arg === '--keywords') keywordArg = [keywordArg, take('-k')].filter(Boolean).join(',');
  else if (arg === '--root') rootArg = take('--root');
  else if (arg === '--limit') {
    const value = argv[++i];
    if (!/^[1-9]\d*$/.test(value ?? '')) die('--limit needs a positive whole number');
    limit = Number(value);
  } else positional.push(arg);
}

const command = positional.shift();
if (!['list-tags', 'list-keywords', 'query'].includes(command)) die(usage);
if (positional.length) die(`unexpected argument "${positional[0]}"\n\n${usage}`);
if (command !== 'query' && (tagArg !== null || keywordArg !== null))
  die(`${command} takes no -t/-k; those belong to "query"\n\n${usage}`);

const wantTags = tagArg === null ? [] : splitTerms(tagArg);
const wantKeywords = keywordArg === null ? [] : splitTerms(keywordArg);
if (command === 'query' && !wantTags.length && !wantKeywords.length)
  die(`query needs -t or -k (or both)\n\n${usage}`);

// An explicit --root is scanned as given; without one, the enclosing repository wins
// over the current directory so a doc tree is found from anywhere inside the checkout.
let root;
if (rootArg !== null) {
  root = path.resolve(rootArg);
  let stat;
  try {
    stat = statSync(root);
  } catch {
    die(`--root: no such directory: ${root}`);
  }
  if (!stat.isDirectory()) die(`--root: not a directory: ${root}`);
} else {
  const top = runGit(['rev-parse', '--show-toplevel'], process.cwd());
  root = top ? top.trim() : process.cwd();
}

const tail = limit ?? 20; // tunable default for the "carries no terms" listing
if (command === 'list-tags') cmdList(root, 'tags', 'tag', tail);
else if (command === 'list-keywords') cmdList(root, 'keywords', 'keyword', tail);
else cmdQuery(root, wantTags, wantKeywords, limit ?? 10);
