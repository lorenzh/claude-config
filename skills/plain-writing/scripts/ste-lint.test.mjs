// Test suite for ste-lint.mjs. Run from the skill directory:
//
//   node --test scripts/ste-lint.test.mjs
//
// Node 18+, no dependencies and no shell. Most cases drive the linter in
// process through lintText(); only the cases about argv, exit codes and pipe
// behaviour spawn the script as a command.
//
// The numbered cases come from an external audit. The fixture cases at the end
// pin the candidate counts and profiles of six real documents, so a tightened
// detector cannot silently change what the linter says about ordinary prose.

import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lintText } from "./ste-lint.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, "ste-lint.mjs");
const FIXTURES = path.join(here, "fixtures");

const lint = (text, opts = {}) => lintText(text, opts);
const count = (result, tag) => result.findings.filter((f) => f.tag === tag).length;
const only = (result, tag) => result.findings.filter((f) => f.tag === tag);
const tags = (result) => result.findings.map((f) => f.tag).join(", ");

const fence = "```";

function run(args, opts = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", ...opts });
}

let tmp = null;
function tmpFile(name, content) {
  tmp = tmp ?? mkdtempSync(path.join(tmpdir(), "ste-lint-"));
  const file = path.join(tmp, name);
  writeFileSync(file, content);
  return file;
}

// ------------------------------------------------------- 1. silent wrong answers

test("defect 1 — and/or is slop, not a path", () => {
  const r = lint("Choose red and/or blue.\n", { strict: true });
  assert.equal(only(r, "slop").filter((f) => /and\/or/.test(f.msg)).length, 1, tags(r));
});

test("defect 2 — a comment inside a fenced block does not swallow the closing fence", () => {
  const src = `Before.\n${fence}html\n<!-- example\n${fence}\nIt may fail.\n`;
  const r = lint(src, { strict: true });
  assert.equal(count(r, "modal"), 1, tags(r));
  assert.equal(only(r, "modal")[0].line, 5);
});

test("defect 3 — a closing fence carries nothing but the fence and whitespace", () => {
  const src = `${fence}text\nconst should = true;\n${fence}not-a-close\nconst would = false;\n${fence}\nBody text.\n`;
  const r = lint(src, {});
  assert.equal(count(r, "modal"), 0, tags(r));
  assert.equal(count(r, "semicolon"), 0, tags(r));
});

test("defect 4 — a sentence-initial article still marks Nominalstil", () => {
  const r = lint("Die Überprüfung beginnt jetzt.\n", { lang: "de", strict: true });
  assert.equal(count(r, "nominalstil"), 1, tags(r));
});

test("defect 5 — three imperative clauses are not an enumeration", () => {
  const r = lint("Start the app, read the log, and stop the service.\n", { strict: true });
  assert.equal(count(r, "comma"), 1, tags(r));
});

test("defect 6a — a quoted sentence keeps its terminal period", () => {
  const r = lint('The message is "Save failed." Retry the request.\n', {});
  assert.equal(r.profile.sentences, 2);
  assert.equal(r.profile.longest, 4); // The message is "…" -> 4, Retry the request -> 3
});

test("defect 6b — a URL does not swallow the period after it", () => {
  const r = lint("Read the guide at https://example.com. Restart the server now.\n",
    { strict: true, limit: 5 });
  assert.equal(r.profile.sentences, 2);
  assert.equal(r.profile.longest, 5);
  assert.equal(count(r, "length"), 0, tags(r));
});

test("defect 7a — a single capital letter before a period ends the sentence", () => {
  const r = lint("Select option A. Restart the server.\n", { strict: true, limit: 3 });
  assert.equal(r.profile.sentences, 2);
  assert.equal(r.profile.longest, 3);
});

test("defect 7b — a dotted acronym does not end the sentence", () => {
  const r = lint("The U.S. service is ready.\n", {});
  assert.equal(r.profile.sentences, 1);
  assert.equal(r.profile.longest, 5);
});

test("defect 8a — a multi-backtick code span is masked", () => {
  const r = lint("Use ``this may fail`` now.\n", { strict: true });
  assert.equal(count(r, "modal"), 0, tags(r));
});

test("defect 8b — nested parentheses are masked as one span", () => {
  const r = lint("Keep this (the client (old) should usually retry).\n", {});
  assert.equal(count(r, "modal"), 0, tags(r));
  assert.equal(count(r, "hedge"), 0, tags(r));
});

test("defect 9a — a number and a long unit are one word", () => {
  const r = lint("Wait 10 milliseconds.\n", { limit: 2 });
  assert.equal(r.profile.longest, 2);
  assert.equal(count(r, "length"), 0, tags(r));
});

test("defect 9b — a number and a compound unit are one word", () => {
  const r = lint("Wait 10 MiB/s.\n", { limit: 2 });
  assert.equal(r.profile.longest, 2);
  assert.equal(count(r, "length"), 0, tags(r));
});

test("defect 9c — a number at the end of a sentence still ends it", () => {
  const r = lint("Procedural 20, descriptive 25, notes 25. Backticked commands count as one word.\n", {});
  assert.equal(r.profile.sentences, 2);
  assert.equal(count(r, "comma"), 1, tags(r));
});

test("defect 10 — It's is a contraction, not a possessive", () => {
  const r = lint("It's ready.\n", { strict: true });
  assert.equal(count(r, "contraction"), 1, tags(r));
  assert.equal(count(r, "possessive"), 0, tags(r));
});

test("defect 11 — a pipe inside inline code does not split a table cell", () => {
  const r = lint("| `should | would` |\n", { strict: true });
  assert.equal(count(r, "modal"), 0, tags(r));
});

// ------------------------------------------------------------ 2. false positives

test("defect 12a — \"is red\" is not passive", () => {
  const r = lint("The LED is red.\n", { strict: true });
  assert.equal(count(r, "passive"), 0, tags(r));
});

test("defect 12b — \"wird rot\" is a change of state, not Passiv", () => {
  const r = lint("Die LED wird rot.\n", { lang: "de", strict: true });
  assert.equal(count(r, "passiv"), 0, tags(r));
});

test("defect 12c — a real passive is still reported", () => {
  const en = lint("The file is deleted.\n", { strict: true });
  assert.equal(count(en, "passive"), 1, tags(en));
  for (const sentence of [
    "Die Datei wird gelöscht.",        // ge- participle
    "Der Bericht wird morgen erstellt.", // inseparable prefix
    "Die Daten werden verarbeitet.",
    "Die Prüfung wird durchgeführt.",
    "Die Datei ist gelöscht worden.",
    "Die Zahl wird angezeigt.",
  ]) {
    const de = lint(`${sentence}\n`, { lang: "de", strict: true });
    assert.equal(count(de, "passiv"), 1, `${sentence} :: ${tags(de)}`);
  }
  for (const sentence of [
    "Der Wert wird größer.",            // change of state
    "Wir werden die Daten verarbeiten.", // future tense
  ]) {
    const de = lint(`${sentence}\n`, { lang: "de", strict: true });
    assert.equal(count(de, "passiv"), 0, `${sentence} :: ${tags(de)}`);
  }
});

test("defect 13 — \"have dedicated storage\" is possession, not a perfect tense", () => {
  const r = lint("The nodes have dedicated storage.\n", { strict: true });
  assert.equal(count(r, "perfect"), 0, tags(r));
});

test("defect 13b — a real perfect tense is still reported", () => {
  const r = lint("The job has finished the upload.\n", { strict: true });
  assert.equal(count(r, "perfect"), 1, tags(r));
});

test("defect 14 — a capitalised product name is not an -ing clause", () => {
  const r = lint("Use Java, Spring, and Maven.\n", { strict: true });
  assert.equal(count(r, "ing-clause"), 0, tags(r));
});

test("defect 14b — a real -ing clause is still reported", () => {
  const r = lint("The job stops, leaving the queue full.\n", { strict: true });
  assert.equal(count(r, "ing-clause"), 1, tags(r));
});

test("defect 15 — \"which\" in an indirect question is not a relative clause", () => {
  const r = lint("Select which database to use.\n", { strict: true });
  assert.equal(count(r, "relative"), 0, tags(r));
});

test("defect 15b — a real relative clause is still reported", () => {
  const r = lint("Open the file, which the server writes.\n", { strict: true });
  assert.equal(count(r, "relative"), 1, tags(r));
});

test("defect 16 — the 5.4 message fits a descriptive passage", () => {
  const r = lint("The client retries when the network fails.\n",
    { type: "descriptive", strict: true });
  const hits = only(r, "trailing-condition");
  assert.equal(hits.length, 1, tags(r));
  assert.ok(!/the command/.test(hits[0].msg), hits[0].msg);
});

test("defect 16b — a procedural passage still names the command", () => {
  const r = lint("Restart the server when the log is full.\n",
    { type: "procedural", strict: true });
  const hits = only(r, "trailing-condition");
  assert.equal(hits.length, 1, tags(r));
  assert.ok(/the command/.test(hits[0].msg), hits[0].msg);
});

test("defect 17 — a numeric range is not a dash aside", () => {
  const r = lint("Use Node 18–20.\n", { strict: true });
  assert.equal(count(r, "dash-aside"), 0, tags(r));
});

test("defect 17b — a real dash aside is still reported", () => {
  const r = lint("The server restarts — the queue is full — and drops the job.\n",
    { strict: true });
  assert.equal(count(r, "dash-aside"), 2, tags(r));
});

test("defect 18a — a concrete noun is not Nominalstil", () => {
  const r = lint("Öffnen Sie die Verbindung.\n", { lang: "de", strict: true });
  assert.equal(count(r, "nominalstil"), 0, tags(r));
});

test("defect 18b — a concrete noun is not an abstract subject", () => {
  const r = lint("Die Leitung ist grün.\n", { lang: "de", strict: true });
  assert.equal(count(r, "abstract-subject"), 0, tags(r));
});

test("defect 18c — a real abstract subject is still reported", () => {
  const r = lint("Die Verarbeitung ist langsam.\n", { lang: "de", strict: true });
  assert.equal(count(r, "abstract-subject"), 1, tags(r));
});

test("defect 19 — German guillemets mask their content", () => {
  const r = lint("Wählen Sie »eigentlich« im Menü.\n", { lang: "de" });
  assert.equal(count(r, "partikel"), 0, tags(r));
});

// --------------------------------------------- 3. crashes, hangs, resource use

test("defect 20 — many commas stay near linear", () => {
  const src = "a,".repeat(10000) + "a.\n";
  const started = Date.now();
  const r = lint(src, {});
  const elapsed = Date.now() - started;
  assert.equal(count(r, "comma"), 1, tags(r));
  assert.ok(elapsed < 3000, `took ${elapsed} ms`);
});

// ------------------------------------------------------------- 4. portability

test("defect 21 — a Windows path is one protected word", () => {
  const r = lint("Open C:\\May\\should.txt.\n", { strict: true });
  assert.equal(count(r, "modal"), 0, tags(r));
  assert.equal(r.profile.sentences, 1);
  assert.equal(r.profile.longest, 2);
});

// ------------------------------------------------- 5. flags and input validation

test("defect 22a — a bare invocation prints the usage block and exits 1", () => {
  const res = run([]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /node ste-lint\.mjs/);
});

for (const opt of ["--lang", "--type", "--limit"]) {
  test(`defect 22b — ${opt} without a value exits 2 with one line`, () => {
    const res = run([opt]);
    assert.equal(res.status, 2, res.stderr);
    assert.equal(res.stderr.trim().split("\n").length, 1, res.stderr);
    assert.match(res.stderr, new RegExp(opt));
    assert.equal(res.stdout, "");
  });
}

test("defect 23 — lexical ja in a yes-or-no answer is not a particle", () => {
  const r = lint("Antworten Sie mit ja oder nein.\n", { lang: "de", strict: true });
  assert.equal(count(r, "partikel"), 0, tags(r));
});

test("defect 23b — a real modal particle is still reported", () => {
  const r = lint("Das ist ja schnell.\n", { lang: "de", strict: true });
  assert.equal(count(r, "partikel"), 1, tags(r));
});

test("defect 24 — \"Verwendung finden\" produces one finding", () => {
  const r = lint("Die Option muss Verwendung finden.\n", { lang: "de", strict: true });
  const hits = r.findings.filter((f) => /Verwendung finden/.test(f.msg));
  assert.equal(hits.length, 1, hits.map((f) => f.msg).join(" | "));
});

test("defect 25 — a closed output pipe is normal termination", async () => {
  const file = tmpFile("epipe.md", "It may fail. ".repeat(50000));
  const child = spawn(process.execPath, [SCRIPT, "--json", file], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d; });
  child.stdout.once("data", () => child.stdout.destroy());
  const code = await new Promise((resolve) => child.on("close", resolve));
  assert.ok(!/EPIPE|at .*ste-lint/.test(stderr), stderr);
  assert.equal(code, 0, `exit ${code}: ${stderr}`);
});

// ------------------------------------------------------------ regression pins

// Baseline recorded before any fix, from the six documents in scripts/fixtures.
const BASELINE = [
  { file: "cold-en.md", opts: {}, findings: 1,
    profile: { sentences: 49, median: 10, mean: 9.6, longest: 18, overLimit: 0, target: 14 } },
  // Two sentences that the old number-and-unit mask glued together ("… is 7.
  // The service …") are two sentences again, so this file moved: 37 -> 38
  // sentences, and its one over-limit candidate was that glued pair.
  { file: "new-c-rewrite.md", opts: {}, findings: 0,
    profile: { sentences: 38, median: 9.5, mean: 9.4, longest: 14, overLimit: 0, target: 14 } },
  { file: "bloated-source.md", opts: {}, findings: 77,
    profile: { sentences: 10, median: 38, mean: 40.8, longest: 61, overLimit: 9, target: 14 } },
  { file: "base-b-skillonly.md", opts: {}, findings: 7,
    profile: { sentences: 48, median: 8, mean: 8.4, longest: 19, overLimit: 0, target: 14 } },
  // German means and medians moved by a word where a number now carries its
  // unit ("90 Minuten", "20 Prozent"): the unit may be longer than six letters.
  { file: "cold-de.md", opts: { lang: "de" }, findings: 2,
    profile: { sentences: 48, median: 8.5, mean: 9.2, longest: 16, overLimit: 0, target: 14 } },
  { file: "new-de.md", opts: { lang: "de" }, findings: 0,
    profile: { sentences: 51, median: 9, mean: 8.7, longest: 15, overLimit: 0, target: 14 } },
];

for (const base of BASELINE) {
  test(`regression — ${base.file} keeps its profile and candidate count`, () => {
    const src = readFileSync(path.join(FIXTURES, base.file), "utf8");
    const r = lint(src, base.opts);
    assert.deepEqual(r.profile, base.profile);
    assert.equal(r.findings.length, base.findings, tags(r));
  });
}

test("regression — the script still runs as a command", () => {
  const res = run(["--json", path.join(FIXTURES, "cold-en.md")]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.files[0].findings.length, 1);
  assert.equal(out.limit, 20);
});

test("regression — plain output keeps its shape", () => {
  const res = run([path.join(FIXTURES, "base-b-skillonly.md")]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /prose sentences · median .* · mean .* · longest .* · over limit/);
  assert.match(res.stdout, /Regex pass\. It undercounts and it produces false hits\./);
});
