#!/usr/bin/env node
// ste-lint.mjs — mechanical pre-read for the plain-writing skill.
//
// Prints a sentence-length profile per file (count, median, mean, longest,
// number over the limit) and flags the violations a regex can see:
// contractions, banned modals, perfect tenses, -ing clauses, semicolons, Latin
// abbreviations, slop words, hedges, hard words with an everyday replacement,
// trailing conditions, sentences with two or more commas, relative clauses,
// dash asides, "of" chains, abstract subjects, and synonym rotation. German
// mode adds Passiv, Nominalstil, Funktionsverbgefüge, Modalpartikeln, and
// Genitivketten.
//
// The skill targets a median of 14 words or less. When the median is above it,
// the profile block says so.
//
// Usage:
//   node ste-lint.mjs --type procedural path/to/file.md
//   node ste-lint.mjs --lang de --type descriptive path/to/datei.md
//   node ste-lint.mjs --type descriptive --json README.md CONTRIBUTING.md
//
// Options:
//   --type procedural|descriptive   word limit 20 or 25 (default: procedural)
//   --lang en|de                    rule set (default: en)
//   --limit N                       override the word limit
//   --strict                        ASD-STE100 dictionary mode: drop the
//                                   hard-word check, because there the
//                                   dictionary word wins over the everyday word
//   --no-profile                    do not print the sentence-length profile
//   --json                          machine-readable findings, with a profile
//                                   object per file
//   --fail                          exit 1 when findings exist (default: exit 0)
//   -h, --help                      print the usage block and stop
//
// It is a regex pass. It undercounts, it produces false hits, and it never
// gives a compliance verdict. Use it to find candidates, then judge them
// yourself. Requires Node 18+.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FILLER = "§"; // masks code, quotes and parentheses; length-preserving
const MEDIAN_TARGET = 14;

// ---------------------------------------------------------------- rule tables

const SLOP_EN = [
  ["leverage", "use"],
  ["utilize", "use"],
  ["in order to", "to"],
  ["prior to", "before"],
  ["ensure", "make sure that"],
  ["it is worth noting that", "delete"],
  ["it's important to", "delete — state the fact"],
  ["it is important to", "delete — state the fact"],
  ["crucially", "delete — state the fact"],
  ["simply", "delete"],
  ["easily", "delete"],
  ["seamlessly", "delete"],
  ["effortlessly", "delete"],
  ["robust", "delete, or give the measurable property"],
  ["powerful", "delete, or give the measurable property"],
  ["comprehensive", "delete, or give the measurable property"],
  ["performant", "delete, or give the measurable property"],
  ["functionality", "function, feature"],
  ["enables you to", "you can"],
  ["allows you to", "you can"],
  ["is designed to", "delete — say what it does"],
  ["aims to", "delete — say what it does"],
  ["facilitate", "help, make possible"],
  ["dive into", "read, examine"],
  ["delve into", "read, examine"],
  ["when it comes to", "for"],
  ["in the event that", "if"],
  ["due to the fact that", "because"],
  ["as needed", "state the condition"],
  ["as necessary", "state the condition"],
  ["and/or", "pick one, or \"X, or Y, or both\""],
  ["gracefully handles", "say what it does"],
  ["out of the box", "by default"],
  ["under the hood", "internally"],
  ["blazingly fast", "fast — give the number"],
  ["state-of-the-art", "delete"],
  ["streamline", "make simpler, make faster"],
  ["plethora", "many"],
  ["myriad", "many"],
  ["addresses the issue", "corrects the fault"],
  ["tackles", "removes the error"],
];

const HEDGE_EN = [
  ["almost always", "give the number or the condition"],
  ["usually", "give the number or the condition"],
  ["tends to", "give the number or the condition"],
  ["generally", "give the number or the condition"],
  ["rarely", "give the number or the condition"],
  ["typically", "give the number or the condition"],
];

// Hard words with an everyday replacement. Words already covered by SLOP_EN
// (utilize, functionality, ensure, prior to, in order to, facilitate) are not
// repeated here. Suppressed by --strict.
const HARD_EN = [
  ["additional", "more"],
  ["additionally", "also"],
  ["approximately", "about"],
  ["assist", "help"],
  ["attempt", "try"],
  ["capability", "what it can do"],
  ["commence", "start"],
  ["component", "part"],
  ["currently", "now"],
  ["demonstrate", "show"],
  ["determine", "find out"],
  ["eligible", "allowed"],
  ["establish", "set up"],
  ["furthermore", "also"],
  ["however", "but"],
  ["immediately", "at once"],
  ["implementation", "the code"],
  ["indicate", "show"],
  ["initially", "at first"],
  ["initiate", "start"],
  ["methodology", "method"],
  ["modify", "change"],
  ["numerous", "many"],
  ["obtain", "get"],
  ["occur", "happen"],
  ["perform", "do"],
  ["permit", "let"],
  ["previously", "before"],
  ["provide", "give"],
  ["require", "need"],
  ["retain", "keep"],
  ["subsequent", "next"],
  ["sufficient", "enough"],
  ["terminate", "stop"],
  ["therefore", "so"],
  ["utilization", "use"],
  ["validate", "check"],
  ["verification", "the check"],
];

// "Verwendung finden" is a Funktionsverbgefüge and sits in FVG_DE. One entry,
// one replacement: two tables reporting the same phrase gave two findings that
// disagreed about the fix.
const SLOP_DE = [
  ["zur Verfügung stellen", "geben, bereitstellen"],
  ["beinhalten", "enthalten"],
  ["aufgrund der Tatsache, dass", "weil"],
  ["im Rahmen von", "bei, in"],
  ["diesbezüglich", "streichen"],
  ["dahingehend", "streichen"],
  ["adäquat", "passend, oder die Bedingung nennen"],
  ["performant", "die messbare Eigenschaft nennen"],
  ["robust", "die messbare Eigenschaft nennen"],
  ["mächtig", "die messbare Eigenschaft nennen"],
  ["nahtlos", "streichen"],
  ["umfassend", "streichen"],
  ["ermöglicht es", "Sie können"],
  ["dient dazu", "streichen — sag, was es tut"],
  ["unter anderem", "die Punkte nennen"],
];

const HEDGE_DE = [
  ["meistens", "die Zahl oder die Bedingung nennen"],
  ["in der Regel", "die Zahl oder die Bedingung nennen"],
  ["tendenziell", "die Zahl oder die Bedingung nennen"],
  ["eher", "die Zahl oder die Bedingung nennen"],
  ["fast immer", "die Zahl oder die Bedingung nennen"],
  ["so gut wie nie", "die Zahl oder die Bedingung nennen"],
];

// Suppressed by --strict.
const HARD_DE = [
  ["anschließend", "danach"],
  ["aufweisen", "haben"],
  ["ausschließlich", "nur"],
  ["benötigen", "brauchen"],
  ["bereitstellen", "geben"],
  ["darüber hinaus", "außerdem"],
  ["eine Vielzahl von", "viele"],
  ["erforderlich", "nötig"],
  ["ermitteln", "herausfinden"],
  ["gewährleisten", "dafür sorgen"],
  ["hinsichtlich", "für"],
  ["im Anschluss", "danach"],
  ["mittels", "mit"],
  ["seitens", "von"],
  ["sofern", "wenn"],
  ["unverzüglich", "sofort"],
  ["verfügen über", "haben"],
  ["weiterhin", "auch"],
  ["zunächst", "zuerst"],
  ["zusätzlich", "noch"],
  ["erfolgen", "nenne das Verb"],
  ["durchführen", "nenne das Verb"],
];

// Nouns that end in an abstract-looking suffix but name a concrete thing.
// The abstract-subject check must not fire on them.
const CONCRETE_HEADS = new Set([
  "connection", "session", "version", "function", "option", "region",
  "partition", "direction", "extension", "permission", "application",
  "environment", "argument", "statement", "element", "segment", "condition",
  "section", "collection", "transaction", "document", "increment", "fragment",
  "instrument", "dimension", "expression", "position", "exception",
  "description", "definition", "migration", "iteration", "destination",
  "integration", "notification", "configuration", "information",
  "documentation", "authentication", "authorization",
]);

// German nouns in -ung/-heit/-keit that name a concrete thing. Nominalstil and
// the abstract-subject check must not fire on them, the way CONCRETE_HEADS
// holds the English side back.
const CONCRETE_HEADS_DE = new Set([
  "verbindung", "leitung", "sitzung", "anwendung", "umgebung", "einstellung",
  "meldung", "bedingung", "berechtigung", "erweiterung", "beschreibung",
  "sammlung", "benachrichtigung", "authentifizierung", "richtung", "endung",
  "kennung", "sicherung", "warnung", "abbildung", "oberfläche", "schnittstelle",
]);

function concreteDe(noun) {
  const word = noun.toLowerCase();
  return CONCRETE_HEADS_DE.has(word) || CONCRETE_HEADS_DE.has(word.replace(/en$/, ""));
}

// Participles that work as adjectives after "have": "have dedicated storage"
// owns storage, it does not perform a perfect tense.
const ADJECTIVAL_ED = new Set([
  "dedicated", "limited", "unlimited", "advanced", "detailed", "mixed",
  "complicated", "sophisticated", "isolated", "restricted", "reserved",
  "distributed", "nested", "related", "elevated", "automated", "integrated",
]);

// "It's" and its like are contractions; these pronouns take no possessive.
const CONTRACTED_S = /(?<![\wÀ-ÿ])(?:it|that|there|here|what|who|he|she|let)$/i;

// After these verbs, "which" opens an indirect question ("Select which
// database to use"), not a relative clause on a head noun.
const INDIRECT_Q_VERBS = new Set([
  "select", "choose", "know", "determine", "decide", "specify", "see", "check",
  "find", "ask", "learn", "tell", "show", "indicate", "define", "understand",
  "remember", "explain", "describe", "note",
]);

// A German participle: a ge- form ("gelöscht", "durchgeführt"), an -iert form,
// or an inseparable prefix with a -t ending ("erstellt", "verarbeitet"). The
// prefix branch stops at -t, because the -en form of those verbs is also the
// infinitive, and an infinitive after "wird" is a future tense, not a Passiv.
const PARTIZIP_DE = /(?<![\wÀ-ÿ])(?:[\wÀ-ÿ]*ge[\wÀ-ÿ]{2,}(?:t|en)|(?:be|er|ver|ent|emp|zer|miss|über|unter|durch|wieder)[\wÀ-ÿ]{2,}t|[\wÀ-ÿ]{2,}iert)(?![\wÀ-ÿ])/;

// "ja" is a modal particle, except where it is the answer value itself.
const JA_ANSWER = /(?<![\wÀ-ÿ])(?:ja\s+oder\s+nein|nein\s+oder\s+ja)(?![\wÀ-ÿ])/gi;

// The words that close an enumeration. "A, B, or C" is one idea, not three.
const LIST_CONJ = { en: ["and", "or"], de: ["und", "oder", "sowie"] };

// A dash this early in a list item introduces a definition, not an aside.
const DEFINITION_DASH_WORDS = 5;

const PARTIKEL_DE = [
  "eigentlich", "ja", "halt", "wohl", "durchaus", "quasi", "sozusagen",
  "im Prinzip", "letztlich", "natürlich", "bekanntlich", "im Grunde",
  "gewissermaßen",
];

const FVG_DE = [
  ["zur Anwendung bringen", "anwenden"],
  ["in Betrieb nehmen", "starten"],
  ["eine Entscheidung treffen", "entscheiden"],
  ["Verwendung finden", "verwenden"],
  ["zum Einsatz kommen", "einsetzen"],
  ["Anwendung finden", "gelten"],
  ["eine Prüfung durchführen", "prüfen"],
  ["zur Durchführung", "um zu …"],
  ["zur Prüfung", "um zu prüfen"],
];

// Synonym rotation (1.11, 9.4). Reported per document, not per sentence.
// A group holds lemmas; a lemma holds its surface forms. Two forms of one
// lemma are inflection, not rotation, so only two or more distinct lemmas
// produce a finding.
const SYNONYMS_EN = [
  { name: "check", lemmas: [
    ["check", "checks", "checked", "checking"],
    ["verify", "verifies", "verified", "verifying"],
    ["confirm", "confirms", "confirmed", "confirming"],
    ["ensure", "ensures", "ensured", "ensuring"],
    ["make sure", "makes sure"],
  ] },
  { name: "config", lemmas: [
    ["configuration", "configurations", "config", "configs"],
    ["settings"],
    ["options"],
  ] },
  { name: "run", lemmas: [
    ["run", "runs", "ran", "running"],
    ["execute", "executes", "executed", "executing"],
    ["invoke", "invokes", "invoked", "invoking"],
    ["launch", "launches", "launched", "launching"],
    ["operate", "operates", "operated", "operating"],
  ] },
  { name: "delete", lemmas: [
    ["delete", "deletes", "deleted", "deleting"],
    ["erase", "erases", "erased", "erasing"],
    ["remove", "removes", "removed", "removing"],
    ["destroy", "destroys", "destroyed", "destroying"],
  ] },
  { name: "show", lemmas: [
    ["show", "shows", "showed", "shown", "showing"],
    ["display", "displays", "displayed", "displaying"],
    ["render", "renders", "rendered", "rendering"],
    ["present", "presents", "presented", "presenting"],
  ] },
  { name: "problem", lemmas: [
    ["problem", "problems"],
    ["issue", "issues"],
    ["fault", "faults"],
  ] },
];

const SYNONYMS_DE = [
  { name: "prüfen", lemmas: [
    ["prüfen", "prüft", "prüfe", "prüfst", "geprüft", "prüfte", "prüften"],
    ["verifizieren", "verifiziert"],
    ["kontrollieren", "kontrolliert"],
    ["sicherstellen", "stellt sicher", "sichergestellt"],
  ] },
  { name: "Konfiguration", lemmas: [
    ["Konfiguration", "Konfigurationen", "Config", "Configs"],
    ["Einstellungen", "Einstellung"],
    ["Optionen", "Option"],
  ] },
  { name: "starten", lemmas: [
    ["starten", "startet", "gestartet"],
    ["ausführen", "führt aus", "ausgeführt"],
    ["aufrufen", "ruft auf", "aufgerufen"],
  ] },
  { name: "löschen", lemmas: [
    ["löschen", "löscht", "gelöscht"],
    ["entfernen", "entfernt"],
    ["verwerfen", "verwirft", "verworfen"],
  ] },
  { name: "anzeigen", lemmas: [
    ["anzeigen", "zeigt an", "angezeigt"],
    ["darstellen", "stellt dar", "dargestellt"],
    ["ausgeben", "gibt aus", "ausgegeben"],
  ] },
];

// True when the hit sits inside a "ja oder nein" pair.
function inAnswerPair(sentence, index) {
  JA_ANSWER.lastIndex = 0;
  let m;
  while ((m = JA_ANSWER.exec(sentence))) {
    if (index >= m.index && index < m.index + m[0].length) return true;
  }
  return false;
}

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Compile the surface forms once. Building them per sentence cost one RegExp
// per form per sentence, which dominated the run on a large file.
function compileSynonyms(groups) {
  return groups.map((group) => ({
    name: group.name,
    lemmas: group.lemmas.map((forms) => ({
      label: forms[0],
      res: forms.map((form) => phraseRe(form, "gi")),
    })),
  }));
}

// A phrase boundary that also works for German umlauts and for "and/or".
function phraseRe(phrase, flags = "gi") {
  const body = esc(phrase).replace(/\\?\s+/g, "\\s+");
  const left = /^[\wÀ-ÿ]/.test(phrase) ? "(?<![\\wÀ-ÿ])" : "";
  const right = /[\wÀ-ÿ]$/.test(phrase) ? "(?![\\wÀ-ÿ])" : "";
  return new RegExp(left + body + right, flags);
}

const SYNONYM_RES = { en: compileSynonyms(SYNONYMS_EN), de: compileSynonyms(SYNONYMS_DE) };

// Sentence-level checks: {tag, rule, re, msg, filter}
// filter(hit, ctx) may reject a match that the regex alone cannot tell
// apart; ctx carries the unit and the sentence the hit came from.
function buildChecks(lang, { strict = false } = {}) {
  const checks = [];
  const add = (tag, rule, re, msg, filter) => checks.push({ tag, rule, re, msg, filter });

  if (lang === "en") {
    add("contraction", "4.2", /(?<=[A-Za-z])'(ll|re|ve|m|d|t)(?![\wÀ-ÿ])|(?<=[A-Za-z])n't(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])(?:it|that|there|here|what|who|he|she|let)'s(?![\wÀ-ÿ])/gi,
      "contraction — write the full form");
    // "It's" is "it is", not a possessive. The pronouns above never take one.
    add("possessive", "GR-8", /(?<=[A-Za-z])'s(?![\wÀ-ÿ])/g,
      "possessive apostrophe — keep it only when you are sure it is correct",
      (hit, ctx) => !CONTRACTED_S.test(ctx.sentence.masked.slice(0, hit.index)));
    add("modal", "3.4", /(?<![\wÀ-ÿ])(should|would|shall|may|might)(?![\wÀ-ÿ])/gi,
      "unapproved modal — use can, will, must, or cannot");
    // "\w+ed" also matches "red" and "bed", so the stem needs two letters.
    add("perfect", "3.4", /(?<![\wÀ-ÿ])(has|have|had)\s+(been|not\s+been|\w{2,}ed)(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])(is|are|was|were)\s+being(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])is\s+to\s+be(?![\wÀ-ÿ])/gi,
      "auxiliary construction — use simple present, past, or future",
      // "have dedicated storage" is possession plus an adjective, not a tense.
      (hit) => !(hit[2] && ADJECTIVAL_ED.has(hit[2].toLowerCase())));
    // A capital after the comma is a name ("Java, Spring, and Maven"), not a verb.
    add("ing-clause", "3.5", /,\s+(?!and\b|or\b|but\b)[a-zà-ÿ]+ing(?![\wÀ-ÿ])/g,
      "-ing form used as a verb or a clause — rewrite as a separate sentence");
    add("passive", "3.6", /(?<![\wÀ-ÿ])(is|are|was|were|be|been|being)\s+(\w{2,}ed|built|done|made|set|written|given|taken|shown|sent|read|held|kept|lost|found)(?![\wÀ-ÿ])/gi,
      "passive voice candidate — name the actor");
    add("latin", "GR-6", /(?<![\wÀ-ÿ])(e\.\s?g\.|i\.\s?e\.|etc\.|viz\.|cf\.|vs\.)/gi,
      "Latin abbreviation — write \"for example\", \"that is\", or name the items");
    // One combined pattern: ", which" would otherwise match twice.
    add("relative", "4.1", /,\s*(which|who|whose|where)(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])(which|whose)(?![\wÀ-ÿ])/gi,
      "relative clause — write a second sentence",
      // A question is not a relative clause, and neither is a "which …" that
      // opens its sentence. A relative pronoun always has a head in front of it.
      // "Select which database …" is an indirect question, not a clause on a head.
      (hit, ctx) => {
        const before = ctx.sentence.masked.slice(0, hit.index);
        if (/\?\s*$/.test(ctx.sentence.masked)) return false;
        if (!/[\wÀ-ÿ§]/.test(before)) return false;
        if (hit[2]) {
          const prev = before.match(/([\wÀ-ÿ]+)\W*$/)?.[1]?.toLowerCase() ?? "";
          if (INDIRECT_Q_VERBS.has(prev.replace(/s$/, ""))) return false;
        }
        return true;
      });
    // The suffix word has to be the head of the subject, so it must be
    // followed by "of" or by a verb. Without that, "The Retention Service
    // deletes …" fires on "Retention" although the sentence names its actor.
    add("abstract-subject", "3.7", /^\s*(The|A|An)\s+([\wÀ-ÿ]+(?:ion|ment|ance|ence|ity|ness))\s+(?:of|is|are|was|were|has|have|had|can|will|must|does|do|occurs|happens|requires|causes)(?![\wÀ-ÿ])/g,
      "abstract subject — name the thing that acts",
      (hit) => !CONCRETE_HEADS.has(hit[2].toLowerCase()));
    for (const [word, fix] of SLOP_EN) add("slop", "—", phraseRe(word), `slop: "${word}" → ${fix}`);
    for (const [word, fix] of HEDGE_EN) add("hedge", "—", phraseRe(word), `hedge: "${word}" → ${fix}`);
    if (!strict) {
      for (const [word, fix] of HARD_EN) add("hard-word", "—", phraseRe(word), `hard word: "${word}" → ${fix}`);
    }
  } else {
    add("modal", "—", /(?<![\wÀ-ÿ])(sollte|sollten|könnte|könnten|dürfte|dürften|eventuell|würde|würden|müsste|möglicherweise)(?![\wÀ-ÿ])/gi,
      "weiches Modalverb — muss, kann, oder als Tatsache schreiben");
    add("passiv", "3.6", /(?<![\wÀ-ÿ])(wird|werden|wurde|wurden|worden)(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])lässt\s+sich(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])ist\s+zu\s+[a-zà-ÿ]+en(?![\wÀ-ÿ])|(?<![\wÀ-ÿ])man(?![\wÀ-ÿ])/gi,
      "versteckter Handelnder (Passiv, lässt sich, ist zu, man) — nenne den Handelnden",
      // "werden" carries the Passiv only with a participle behind it. Without
      // one it is a change of state ("wird rot") or a future tense ("wird
      // prüfen"). "worden" appears in nothing but a Passiv.
      (hit, ctx) => !hit[1] || /worden/i.test(hit[1])
        || PARTIZIP_DE.test(ctx.sentence.masked.slice(hit.index + hit[0].length)));
    // The article may open the sentence, so it may be capitalised.
    add("nominalstil", "3.7", /(?<![\wÀ-ÿ])(?:[Dd]er|[Dd]ie|[Dd]as|[Dd]es|[Dd]em|[Dd]en|[Zz]ur|[Zz]um|[Bb]ei|[Nn]ach|[Dd]urch|[Ff]ür|[Vv]or)\s+([A-ZÄÖÜ][\wÀ-ÿ]{3,}(?:ung|heit|keit)(?:en)?)(?![\wÀ-ÿ])/g,
      "Nominalstil — das Substantiv enthält das Verb, das der Satz braucht",
      (hit) => !concreteDe(hit[1]));
    add("latin", "GR-6", /(?<![\wÀ-ÿ])(d\.\s?h\.|z\.\s?B\.|u\.\s?a\.|usw\.|etc\.|ggf\.|bzw\.)/gi,
      "Abkürzung — \"das heißt\", \"zum Beispiel\", oder die Punkte nennen");
    add("relative", "4.1", /,\s*(der|die|das|dem|den|denen|dessen|deren|welche[rsnm]?)\s/g,
      "Relativsatz — schreib einen zweiten Satz");
    // Wie im Englischen: das Substantiv muss der Kopf des Subjekts sein, also
    // ein "von"/"der"/"des" oder ein finites Verb dahinter.
    add("abstract-subject", "3.7", /^\s*(Die|Der|Das)\s+([A-ZÄÖÜ][\wÀ-ÿ]+(?:ung|heit|keit))\s+(?:von|der|des|ist|sind|war|waren|hatten|hatte|haben|hat|können|kann|werden|wird|müssen|muss|soll|sollen|erfolgt|geschieht|benötigt|verursacht)(?![\wÀ-ÿ])/g,
      "abstraktes Subjekt — nenne, wer handelt",
      (hit) => !concreteDe(hit[2]));
    for (const [word, fix] of FVG_DE) add("fvg", "3.7", phraseRe(word), `Funktionsverbgefüge: "${word}" → ${fix}`);
    for (const word of PARTIKEL_DE) {
      add("partikel", "—", phraseRe(word), `Modalpartikel: "${word}" → streichen`,
        // "mit ja oder nein" names the answer; there "ja" is not a particle.
        word !== "ja" ? undefined : (hit, ctx) => !inAnswerPair(ctx.sentence.masked, hit.index));
    }
    for (const [word, fix] of SLOP_DE) add("slop", "—", phraseRe(word), `Blähwort: "${word}" → ${fix}`);
    for (const [word, fix] of HEDGE_DE) add("hedge", "—", phraseRe(word), `Weichmacher: "${word}" → ${fix}`);
    if (!strict) {
      for (const [word, fix] of HARD_DE) add("hard-word", "—", phraseRe(word), `schweres Wort: "${word}" → ${fix}`);
    }
  }

  // An aside set off by a dash is a second sentence in disguise. The dash must
  // sit inside the sentence, so a leading dash does not match; "--" must be
  // spaced on both sides, so a command-line flag does not match.
  add("dash-aside", "8.1", /(?<=\S)\s*[—–]\s*(?=\S)|(?<=\S)\s+--\s+(?=\S)/g, lang === "de"
    ? "Gedankenstrich-Einschub — schreib einen zweiten Satz"
    : "dash aside — write a second sentence",
    // A dash early in the FIRST sentence of a list item separates a term from
    // its definition. That is a definition list, not an aside buried in a
    // sentence. A later sentence in the same item is ordinary prose. A dash
    // between two numbers is a range ("Node 18–20"), not an aside either.
    (hit, ctx) => {
      const before = ctx.sentence.masked.slice(0, hit.index);
      const after = ctx.sentence.masked.slice(hit.index + hit[0].length);
      if (/\d\s*$/.test(before) && /^\s*\d/.test(after)) return false;
      return !(ctx.unit.listItem && ctx.sentence.start === 0
        && countWords(before) <= DEFINITION_DASH_WORDS);
    });

  add("semicolon", "8.1", /;/g, lang === "de"
    ? "Semikolon — schreib zwei Sätze"
    : "semicolon — write two sentences instead");
  return checks;
}

// Checks that describe the shape of a sentence, not a word. A heading is a
// title, not a sentence, and a table cell is a fragment by design, so the
// checks that assume a whole sentence do not apply to either.
const NO_HEADING_TAGS = new Set(["dash-aside", "abstract-subject"]);
const NO_TABLE_TAGS = new Set(["dash-aside", "abstract-subject"]);

// Only the unambiguous clause markers. "before", "after", "once", "bevor" and
// "nachdem" are prepositions at least as often as they introduce a condition,
// and a regex cannot tell the two apart.
const TRAILING_IF = {
  en: /(?<![\wÀ-ÿ])(if|when|unless)(?![\wÀ-ÿ])/gi,
  de: /(?<![\wÀ-ÿ])(wenn|falls|sofern)(?![\wÀ-ÿ])/gi,
};

// ------------------------------------------------------------------- markdown

// Split the file into units of running text, each carrying its source line.
// Fenced code is dropped. Headings are kept but exempt from the word limit
// (8.6 counts a title as one word). Table rows become one unit per cell.
function readUnits(src) {
  const rawLines = src.split(/\r?\n/);

  // A leading YAML frontmatter block is metadata, not prose. A skill's
  // description field is a trigger list; linting it as a sentence is noise.
  let from = 0;
  if (rawLines[0]?.trim() === "---") {
    for (let j = 1; j < rawLines.length; j++) {
      if (rawLines[j].trim() === "---") { from = j + 1; break; }
    }
  }

  // Fenced code is found first. An HTML comment inside a code block must not
  // swallow the closing fence and every line of prose after it, so the fenced
  // lines are blanked before the comment scan runs.
  const fenced = markFences(rawLines, from);
  const lines = blankHtmlComments(
    rawLines.map((line, i) => (fenced[i] ? " ".repeat(line.length) : line)).join("\n"),
  ).split("\n");
  const units = [];
  let current = null;

  const flush = () => {
    if (current && current.parts.length) units.push(current);
    current = null;
  };

  for (let i = from; i < lines.length; i++) {
    if (fenced[i]) { flush(); continue; }
    const raw = lines[i];

    if (!raw.trim()) { flush(); continue; }
    if (/^\s{4,}\S/.test(raw) && !current) continue;      // indented code block
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) { flush(); continue; }

    // Table row: one unit per cell; the delimiter row is skipped.
    if (/^\s*\|/.test(raw)) {
      flush();
      if (/^[\s|:-]+$/.test(raw)) continue;
      for (const cell of splitTableCells(raw, raw.indexOf("|") + 1)) {
        const text = stripInline(cell.text);
        if (text.trim()) units.push({ type: "table", parts: [{ line: i + 1, col: cell.col, text }] });
      }
      continue;
    }

    const heading = raw.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      units.push({ type: "heading", parts: [{ line: i + 1, col: raw.indexOf(heading[1]), text: stripInline(heading[1]) }] });
      continue;
    }

    let text = raw.replace(/^\s*>+\s?/, "");
    const marker = text.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/);
    if (marker) flush();
    const offset = raw.length - text.length + (marker ? marker[0].length : 0);
    text = stripInline(text.slice(marker ? marker[0].length : 0));
    if (!text.trim()) continue;
    if (!current) current = { type: "text", listItem: Boolean(marker), parts: [] };
    current.parts.push({ line: i + 1, col: offset, text });
  }
  flush();
  return units;
}

// Mark every line of every fenced block, the two delimiter lines included.
// A closing fence carries the same character as the opening one, at least as
// many of them, and nothing after that but whitespace — "```not-a-close" opens
// nothing and closes nothing. An unterminated fence runs to the end of the
// file, the way a renderer treats it.
function markFences(lines, from = 0) {
  const fenced = new Array(lines.length).fill(false);
  let open = null;
  for (let i = from; i < lines.length; i++) {
    const m = lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
    if (open) {
      fenced[i] = true;
      if (m && m[1][0] === open[0] && m[1].length >= open.length
        && /^\s*([`~])\1*\s*$/.test(lines[i])) open = null;
    } else if (m) {
      fenced[i] = true;
      open = m[1];
    }
  }
  return fenced;
}

// Split a table row on the pipes that separate cells. A pipe inside inline
// code is part of the cell value, not a cell boundary.
function splitTableCells(row, from) {
  const cells = [];
  let start = from;
  let ticks = null;
  for (let i = from; i < row.length; i++) {
    if (row[i] === "`") {
      const run = /^`+/.exec(row.slice(i))[0];
      if (!ticks) ticks = run;
      else if (run.length === ticks.length) ticks = null;
      i += run.length - 1;
      continue;
    }
    if (row[i] === "|" && !ticks) {
      cells.push({ col: start, text: row.slice(start, i) });
      start = i + 1;
    }
  }
  cells.push({ col: start, text: row.slice(start) });
  return cells;
}

// An HTML comment is a note to the author, not running text. Blank it out
// instead of deleting it, so every later line number still matches the file.
// An unterminated "<!--" swallows the rest of the file, the way a renderer
// treats it.
function blankHtmlComments(src) {
  return src.replace(/<!--[\s\S]*?(?:-->|$)/g, (m) => m.replace(/[^\r\n]/g, " "));
}

// Drop markdown syntax that is not prose, keeping the character count stable
// where it is cheap to do so.
function stripInline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => " ".repeat(m.length))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, (m, label) => label + " ".repeat(m.length - label.length))
    .replace(/(?<![\w*_])([*_]{1,3})(?![*_\s])/g, (m) => " ".repeat(m.length))
    .replace(/(?<![*_\s])([*_]{1,3})(?![\w*_])/g, (m) => " ".repeat(m.length));
}

// A span counts as one word, but the punctuation that ends the sentence has to
// survive it. Keep a terminal ".", "!" or "?" and put it at the last position
// of the mask, so the splitter still sees the boundary and no character moves
// out of the span. An ellipsis ends nothing, so it is not kept.
function fillSpan(m) {
  const keep = m.match(/(?<![.!?])([.!?])[`"'”»)\]]*$/);
  return keep ? FILLER.repeat(m.length - 1) + keep[1] : FILLER.repeat(m.length);
}

const fill = (m) => FILLER.repeat(m.length);

// Same idea for a token that carries its punctuation outside itself: the
// period after a URL or a path ends the sentence, it is not part of the token.
function maskToken(m) {
  const core = m.replace(/[.,;:!?)\]}'"]+$/, "");
  return FILLER.repeat(core.length) + m.slice(core.length);
}

// A slash between two conjunctions is not a path. "and/or" has its own entry
// in the slop table and the path mask must not hide it.
const CONJ_SLASH = /^(?:and|or|und|oder)\/(?:and|or|und|oder)$/i;

// Mask spans that count as one word (8.5, 8.6) without moving any character.
function mask(text) {
  let out = text;
  // Inline code is masked whole: a period inside it belongs to the code, not
  // to the prose around it.
  out = out.replace(/(`+)[\s\S]*?\1/g, fill);                   // inline code
  out = out.replace(/"[^"]*"|“[^”]*”|„[^“”]*[“”]|»[^«»]*«|›[^‹›]*‹/g, fillSpan);
  // Parentheses nest, and one pass only reaches the innermost pair.
  for (let i = 0; i < 8; i++) {
    const next = out.replace(/\([^()]*\)/g, fillSpan);
    if (next === out) break;
    out = next;
  }
  out = out.replace(/(?<![\wÀ-ÿ])(?:https?:\/\/|www\.)\S+/g, maskToken);
  out = out.replace(/(?<![\wÀ-ÿ])(?:[A-Za-z]:\\|\\\\)\S+/g, maskToken); // Windows path
  // A number with its unit is one word, the unit may be a compound one. The
  // number has to end in a digit: in "notes 25. Backticked commands" the period
  // ends the sentence and the next word is no unit.
  out = out.replace(/(?<![\wÀ-ÿ])(\d[\d.,]*\d|\d)(\s+)([A-Za-z%°]{1,12}(?:\/[A-Za-z%°]{1,6})?)(?![\wÀ-ÿ])/g,
    (m, n, sp, unit) => n + FILLER.repeat(sp.length) + unit);
  out = out.replace(/(?<![\wÀ-ÿ])[\w.-]+\/[\w./-]+/g,           // paths
    (m) => (CONJ_SLASH.test(m) ? m : maskToken(m)));
  return out;
}

// Do not split after these. The single-letter branch covers the first half of
// "e. g.", "z. B.", "d. h." and "u. a.", where the abbreviation is not yet
// complete — it is limited to those letters, so "Select option A." still ends
// a sentence. The dotted-letter branch covers "U.S." and its like.
const ABBREV_END = /(?:^|[\s(])(?:[eizdu]|[A-Za-zÀ-ÿ](?:\.[A-Za-zÀ-ÿ])+|e\.\s?g|i\.\s?e|etc|viz|cf|vs|no|fig|z\.\s?B|d\.\s?h|u\.\s?a|usw|bzw|ca|Nr|Abb|ggf|Dr|Mr|Mrs|St)\.$/i;

// Sentences of one unit, with an offset into the joined text.
function splitSentences(joined, masked) {
  const out = [];
  let start = 0;
  const re = /[.!?]+(?=\s|$)/g;
  let m;
  while ((m = re.exec(masked))) {
    const end = m.index + m[0].length;
    const head = masked.slice(start, end);
    if (ABBREV_END.test(head.trimEnd())) continue;
    if (head.trim()) out.push({ start, text: joined.slice(start, end), masked: head });
    start = end + (masked.slice(end).match(/^\s*/)?.[0].length ?? 0);
  }
  const tail = masked.slice(start);
  if (tail.trim()) out.push({ start, text: joined.slice(start), masked: tail });
  return out;
}

function countWords(maskedSentence) {
  return maskedSentence
    .split(/\s+/)
    .filter((t) => /[\wÀ-ÿ§%°]/.test(t)).length;
}

function countMatches(text, re) {
  re.lastIndex = 0;
  let n = 0;
  let m;
  while ((m = re.exec(text))) {
    n++;
    if (m[0].length === 0) re.lastIndex++;
  }
  return n;
}

const LIST_ITEM_WORDS = 5;

// An enumeration is of noun phrases. "read the log" is a clause with a finite
// verb, and three of those separated by commas are three ideas, not one list.
// The mark is a bare verb in front of a determiner.
const CLAUSE_ITEM = {
  en: /^\s*[A-Za-z][\w'-]*\s+(?:the|a|an|its|your|their|this|these|that|those|his|her|our|all|each|every|both)(?![\wÀ-ÿ])/,
  de: /^\s*[A-Za-zÀ-ÿ]+\s+Sie(?![\wÀ-ÿ])/,
};

function listItem(text, lang) {
  return countWords(text) <= LIST_ITEM_WORDS && !CLAUSE_ITEM[lang].test(text);
}

// Blank out the commas that only separate the items of an enumeration, so the
// comma check counts ideas and not list items. A run qualifies when every item
// is short and the last one is introduced by "and", "or", "und", or "oder".
// One left-to-right pass: a segment that is not a list item can be in no run,
// so the scan restarts after it instead of backing up over what it read.
function maskListCommas(text, lang) {
  const commas = [];
  for (let i = 0; i < text.length; i++) if (text[i] === ",") commas.push(i);
  if (commas.length < 1) return text;

  const closer = new RegExp(
    `^\\s*(?:[^\\s,]+\\s+){0,${LIST_ITEM_WORDS}}(?:${LIST_CONJ[lang].join("|")})(?![\\wÀ-ÿ])`, "i");

  // One segment per comma-separated part, each classified once.
  const segs = [];
  let start = 0;
  for (const at of commas) { segs.push(text.slice(start, at)); start = at + 1; }
  segs.push(text.slice(start));
  const isItem = segs.map((seg) => listItem(seg, lang));
  const isCloser = segs.map((seg) => closer.test(seg));

  const drop = [];
  let a = 0;
  while (a < segs.length - 1) {
    let b = a;
    while (b < segs.length - 1 && isItem[b]) {
      b++;
      if (isCloser[b]) break;
    }
    if (b > a && isCloser[b]) {
      for (let k = a; k < b; k++) drop.push(commas[k]);
      a = b;
    } else {
      // segs[b] closes nothing, so no run can contain it. Start after it.
      a = b + 1;
    }
  }
  if (!drop.length) return text;
  let out = "";
  let from = 0;
  for (const at of drop) { out += text.slice(from, at) + " "; from = at + 1; }
  return out + text.slice(from);
}

function profileOf(lengths, limit) {
  const n = lengths.length;
  if (!n) return { sentences: 0, median: 0, mean: 0, longest: 0, overLimit: 0, target: MEDIAN_TARGET };
  const sorted = [...lengths].sort((a, b) => a - b);
  const mid = n >> 1;
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = lengths.reduce((a, b) => a + b, 0) / n;
  return {
    sentences: n,
    median,
    mean: Math.round(mean * 10) / 10,
    longest: sorted[n - 1],
    overLimit: lengths.filter((w) => w > limit).length,
    target: MEDIAN_TARGET,
  };
}

// ---------------------------------------------------------------------- lint

export function lintFile(path, opts) {
  return lintText(readFileSync(path, "utf8"), opts);
}

// The text pass, split out from lintFile so a test can drive it in process.
export function lintText(src, { lang = "en", type = "procedural", limit, strict = false } = {}) {
  limit = limit ?? (type === "descriptive" ? 25 : 20);
  const units = readUnits(src);
  const checks = buildChecks(lang, { strict });
  const findings = [];
  const seen = new Map(); // synonym group -> Map(lemma key -> {count, line, label})
  const lengths = [];
  const de = lang === "de";
  const synonymGroups = SYNONYM_RES[lang];

  for (const unit of units) {
    // Join the unit's lines and keep a map from offset back to the source line.
    let joined = "";
    const marks = [];
    for (const part of unit.parts) {
      if (joined) joined += " ";
      marks.push({ at: joined.length, line: part.line });
      joined += part.text.trimEnd();
    }
    const masked = mask(joined);
    const lineAt = (offset) => {
      let line = marks[0].line;
      for (const mk of marks) if (mk.at <= offset) line = mk.line;
      return line;
    };

    for (const sentence of splitSentences(joined, masked)) {
      const line = lineAt(sentence.start);

      if (unit.type !== "heading") {
        const words = countWords(sentence.masked);
        // A table cell is a fragment by design. Counting it in the profile
        // pulls the median down, and the median is the completion gate, so a
        // page with a large table would pass on the table and not on its prose.
        // The length check still runs on the cell.
        if (unit.type === "text") lengths.push(words);
        if (words > limit) {
          findings.push({
            line, tag: "length", rule: type === "procedural" ? "5.1" : "6.3",
            inTable: unit.type === "table",
            msg: `${words} words, limit ${limit} — split the sentence`,
            text: snippet(sentence.text),
          });
        }
      }

      for (const check of checks) {
        if (unit.type === "heading" && NO_HEADING_TAGS.has(check.tag)) continue;
        if (unit.type === "table" && NO_TABLE_TAGS.has(check.tag)) continue;
        check.re.lastIndex = 0;
        let hit;
        while ((hit = check.re.exec(sentence.masked))) {
          if (hit[0].length === 0) check.re.lastIndex++;
          if (check.filter && !check.filter(hit, { unit, sentence })) continue;
          findings.push({
            line: lineAt(sentence.start + hit.index),
            tag: check.tag, rule: check.rule, msg: check.msg,
            text: snippet(sentence.text.slice(Math.max(0, hit.index - 30), hit.index + hit[0].length + 30)),
          });
        }
      }

      // Counts, not matches: one finding per sentence, not one per comma.
      if (unit.type === "text") {
        if (countMatches(maskListCommas(sentence.masked, lang), /,/g) >= 2) {
          findings.push({
            line, tag: "comma", rule: "4.1",
            msg: de ? "zwei oder mehr Kommas — teile den Satz"
                    : "two or more commas — split the sentence",
            text: snippet(sentence.text),
          });
        }
        if (!de && countMatches(sentence.masked, /(?<![\wÀ-ÿ])of(?![\wÀ-ÿ])/gi) >= 2) {
          findings.push({
            line, tag: "of-chain", rule: "2.1",
            msg: "two \"of\" links — name the actor and use a verb",
            text: snippet(sentence.text),
          });
        }
        // "der" is a dative and an article as often as it is a genitive, so
        // only "des"/"eines" counts, plus a directly chained "der X der Y".
        if (de) {
          const genitives = countMatches(sentence.masked, /(?<![\wÀ-ÿ])(des|eines)\s+[\wÀ-ÿ]/gi)
            + countMatches(sentence.masked, /(?<![\wÀ-ÿ])der\s+[\wÀ-ÿ]+\s+der\s+[\wÀ-ÿ]/gi);
          if (genitives >= 2) {
            findings.push({
              line, tag: "genitivkette", rule: "2.1",
              msg: "zwei Genitive im Satz — höchstens einen pro Satz",
              text: snippet(sentence.text),
            });
          }
        }
      }

      // 5.4 — a condition belongs before its command.
      const cond = TRAILING_IF[lang];
      cond.lastIndex = 0;
      const first = cond.exec(sentence.masked);
      if (first && first.index > 0 && /[\wÀ-ÿ§]/.test(sentence.masked.slice(0, first.index))) {
        findings.push({
          line, tag: "trailing-condition", rule: "5.4",
          // A descriptive passage has no command in it, so the message names
          // the main clause instead.
          msg: de
            ? `Bedingung "${first[0]}" steht nach ${type === "procedural" ? "dem Befehl" : "dem Hauptsatz"} — zieh sie nach vorn, mit Komma`
            : `condition "${first[0]}" follows the ${type === "procedural" ? "command" : "main clause"} — move it to the front, with a comma`,
          text: snippet(sentence.text),
        });
      }

      // 1.11 / 9.4 — collect lemma use for the document-level report.
      for (const group of synonymGroups) {
        for (const lemma of group.lemmas) {
          let hits = 0;
          for (const re of lemma.res) hits += countMatches(sentence.masked, re);
          if (!hits) continue;
          if (!seen.has(group.name)) seen.set(group.name, new Map());
          const bucket = seen.get(group.name);
          const key = lemma.label.toLowerCase();
          const entry = bucket.get(key) ?? { count: 0, line, label: lemma.label };
          entry.count += hits;
          bucket.set(key, entry);
        }
      }
    }
  }

  for (const [group, bucket] of seen) {
    if (bucket.size < 2) continue; // one lemma in many forms is inflection
    const used = [...bucket.values()].map((e) => `${e.label} (${e.count}×)`).join(", ");
    findings.push({
      line: Math.min(...[...bucket.values()].map((e) => e.line)),
      tag: "synonym", rule: "1.11",
      msg: de
        ? `${bucket.size} Wörter für den Begriff "${group}" — nimm eins und bleib dabei: ${used}`
        : `${bucket.size} words for the "${group}" concept — pick one and keep it: ${used}`,
      text: "",
    });
  }

  findings.sort((a, b) => a.line - b.line || a.tag.localeCompare(b.tag));
  return { findings, profile: profileOf(lengths, limit) };
}

function snippet(text) {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > 110 ? one.slice(0, 107) + "…" : one;
}

// ---------------------------------------------------------------------- main

function main(argv) {
  const opts = {
    lang: "en", type: "procedural", limit: null,
    json: false, fail: false, strict: false, profile: true,
  };
  const files = [];
  const WITH_VALUE = { "--lang": "lang", "--type": "type", "--limit": "limit" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // An option at the end of argv has no value to read. Name the option
    // instead of printing the usage block for it.
    if (WITH_VALUE[arg]) {
      if (i + 1 >= argv.length) return fail(`${arg} needs a value`);
      const raw = argv[++i];
      opts[WITH_VALUE[arg]] = arg === "--limit" ? Number(raw) : raw;
    }
    else if (arg === "--json") opts.json = true;
    else if (arg === "--fail") opts.fail = true;
    else if (arg === "--strict") opts.strict = true;
    else if (arg === "--no-profile") opts.profile = false;
    else if (arg === "-h" || arg === "--help") return usage(0);
    else if (arg.startsWith("-")) return fail(`unknown option: ${arg}`);
    else files.push(arg);
  }
  if (!files.length) return usage(1);
  if (!["en", "de"].includes(opts.lang)) return fail(`--lang must be en or de`);
  if (!["procedural", "descriptive"].includes(opts.type)) return fail(`--type must be procedural or descriptive`);
  // Number("abc") is NaN, and "words > NaN" is always false, so an unchecked
  // --limit turns the length check off without saying so.
  if (opts.limit !== null && !(Number.isInteger(opts.limit) && opts.limit > 0)) {
    return fail(`--limit must be a whole number of words, 1 or more`);
  }
  const limit = opts.limit ?? (opts.type === "procedural" ? 20 : 25);

  const report = [];
  for (const file of files) {
    let result;
    try {
      result = lintFile(file, { ...opts, limit });
    } catch (err) {
      return fail(`${file}: ${err.message}`);
    }
    report.push({ file, profile: result.profile, findings: result.findings });
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ lang: opts.lang, type: opts.type, limit, files: report }, null, 2) + "\n");
  } else {
    print(report, { ...opts, limit });
  }

  const total = report.reduce((n, r) => n + r.findings.length, 0);
  // process.exit() throws away writes that are still queued. On a pipe that
  // truncates the report and cuts --json output mid-object, so set the code
  // and let Node exit after it has flushed.
  process.exitCode = opts.fail && total ? 1 : 0;
}

function num(x) {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

function print(report, opts) {
  const counts = new Map();
  let total = 0;
  for (const { file, findings, profile } of report) {
    console.log(`\n${file} — ${opts.lang}, ${opts.type}, limit ${opts.limit} words`);
    if (opts.profile && profile.sentences) {
      console.log(`  ${profile.sentences} prose sentences · median ${num(profile.median)} · mean ${profile.mean.toFixed(1)} · longest ${profile.longest} · over limit ${profile.overLimit}`);
      if (profile.median > MEDIAN_TARGET) {
        console.log(`  median ${num(profile.median)} over the target of ${MEDIAN_TARGET} — split more sentences`);
      }
      // Table cells are checked for length but stay out of the profile, so say
      // so whenever the two numbers would otherwise look like a contradiction.
      const cellsOver = findings.filter((f) => f.tag === "length" && f.inTable).length;
      if (cellsOver) {
        console.log(`  ${cellsOver} table ${cellsOver === 1 ? "cell is" : "cells are"} over the limit — table cells are not counted in the profile`);
      }
    }
    if (!findings.length) {
      console.log("  no candidates found");
      continue;
    }
    for (const f of findings) {
      console.log(`  ${String(f.line).padStart(4)}  ${f.tag.padEnd(19)} [${f.rule}] ${f.msg}`);
      if (f.text) console.log(`        ${f.text}`);
      counts.set(f.tag, (counts.get(f.tag) ?? 0) + 1);
      total++;
    }
  }
  if (total) {
    const summary = [...counts].sort((a, b) => b[1] - a[1]).map(([tag, n]) => `${tag} ${n}`).join(" · ");
    console.log(`\n${total} ${total === 1 ? "candidate" : "candidates"}: ${summary}`);
  }
  console.log("\nRegex pass. It undercounts and it produces false hits. Judge every candidate yourself.");
}

function usage(code) {
  console.log(`ste-lint.mjs — mechanical pre-read for plain-writing

  node ste-lint.mjs [--lang en|de] [--type procedural|descriptive] [--limit N]
                    [--strict] [--no-profile] [--json] [--fail] <file> [file …]

  --type        procedural = 20 words per sentence, descriptive = 25 (default: procedural)
  --lang        de adds Passiv, Nominalstil, Funktionsverbgefüge, Modalpartikeln,
                Genitivketten (default: en)
  --strict      ASD-STE100 dictionary mode: drop the hard-word check, because there
                the dictionary word wins over the everyday word
  --no-profile  do not print the sentence-length profile line
  --json        machine-readable findings, with a profile object per file
  --fail        exit 1 when candidates exist (default: always exit 0)

  Every file gets a profile line: sentences, median, mean, longest, and how many
  are over the limit. The target median is ${MEDIAN_TARGET} words or less.`);
  process.exitCode = code;
}

function fail(message) {
  console.error(`ste-lint: ${message}`);
  process.exitCode = 2;
}

// Run only as a command. An import (the test suite) gets the functions instead.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // A reader that closes the pipe early (head, less, a shell that quits) is
  // normal termination, not a fault. Without this, Node prints an EPIPE stack
  // trace and exits 1. process.exit() is not used here: it throws away writes
  // that are still queued and truncates the report.
  for (const stream of [process.stdout, process.stderr]) {
    stream.on("error", (err) => {
      if (err.code === "EPIPE") process.exitCode = 0;
      else throw err;
    });
  }
  main(process.argv.slice(2));
}
