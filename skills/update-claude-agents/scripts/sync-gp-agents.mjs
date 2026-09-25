#!/usr/bin/env node
// Syncs the pinned gp-*.md subagent files against the model catalog of the
// installed Claude Code. Reads by default; writes only what --write names.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const DEFAULT_NOTE =
  'Not measured on DeepSWE, and the matrix rows are measured per model id — a newer model does not inherit them. ' +
  'Reachable but not routed: route here only on explicit human instruction, and say that is why.';
const PROBE_PROMPT = 'Reply with exactly: OK';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const TEMPLATE = path.join(HERE, '..', 'templates', 'gp-agent.md');

const USAGE = `Usage: node sync-gp-agents.mjs [options]

Reports drift between the model catalog of the installed Claude Code and the
pinned gp-*.md agent files, and writes the files you name.

  (no options)       read-only report: models without gp files, incomplete
                     effort series, and gp files whose model the catalog
                     no longer lists
  --check-access     probe every candidate model id with a real
                     \`claude --model <id> -p\` call; this is what separates
                     usable ids from the regex noise in the binary
  --write            create the missing files for --models; never overwrites an
                     existing file, and writes a model only when its access was
                     confirmed in the same run (implies --check-access)
  --models <ids>     comma-separated model ids to restrict the run to;
                     required by --write
  --efforts <list>   comma-separated efforts to write (default: ${EFFORTS.join(',')})
  --note <text>      the description sentence for the files written this run
  --timeout <sec>    per-probe timeout for --check-access (default: 90)
  --agents-dir <p>   agents directory (default: <claude config dir>/agents)
  --json             machine-readable twin of the report on stdout
  --help             this block

Exit: 0 clean, 1 drift found or a write was blocked, 2 misuse.`;

function die(msg) {
  process.stderr.write(`sync-gp-agents: ${msg}\n\n${USAGE}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    checkAccess: false, write: false, json: false, help: false,
    models: null, efforts: EFFORTS.slice(), note: DEFAULT_NOTE,
    timeout: 90, agentsDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) die(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case '--help': case '-h': opts.help = true; break;
      case '--json': opts.json = true; break;
      case '--check-access': opts.checkAccess = true; break;
      case '--write': opts.write = true; opts.checkAccess = true; break;
      case '--models': opts.models = val().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--efforts': opts.efforts = val().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--note': opts.note = val(); break;
      case '--timeout': opts.timeout = Number(val()); break;
      case '--agents-dir': opts.agentsDir = val(); break;
      default: die(`unknown option ${a}`);
    }
  }
  if (opts.help) return opts;
  const badEffort = opts.efforts.find((e) => !EFFORTS.includes(e));
  if (badEffort) die(`effort "${badEffort}" is not one of ${EFFORTS.join(', ')}; an invalid value is silently ignored by the harness, so it is rejected here`);
  if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) die('--timeout needs a positive number of seconds');
  if (opts.write && (!opts.models || opts.models.length === 0)) die('--write needs --models <ids>: which models get pinned files is a human decision, not a catalog fact');
  return opts;
}

// --- catalog -----------------------------------------------------------------

function whichClaude() {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = path.join(dir, `claude${ext}`);
      try {
        fs.accessSync(p, fs.constants.X_OK);
        return p;
      } catch { /* keep looking */ }
    }
  }
  return null;
}

function extractCandidates(binPath) {
  const RE = /claude-(?:opus|sonnet|haiku|fable)-[0-9a-z-]+/g;
  const CHUNK = 8 * 1024 * 1024;
  const OVERLAP = 64;
  const found = new Set();
  const fd = fs.openSync(binPath, 'r');
  const buf = Buffer.allocUnsafe(CHUNK);
  try {
    let pos = 0;
    let carry = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, CHUNK, pos);
      if (n <= 0) break;
      const text = carry + buf.toString('latin1', 0, n);
      for (const m of text.matchAll(RE)) found.add(m[0]);
      carry = text.slice(-OVERLAP);
      pos += n;
    }
  } finally {
    fs.closeSync(fd);
  }
  // The regex also catches dated ids, -v1 suffixes and truncated fragments.
  // Normalizing folds the first two onto their base id; the access probe is
  // what removes the rest.
  const out = new Set();
  for (const raw of found) {
    const id = raw.replace(/-+$/, '').replace(/-v\d+$/, '').replace(/-\d{8}$/, '');
    if (/^claude-(opus|sonnet|haiku|fable)-[0-9a-z-]*[0-9a-z]$/.test(id)) out.add(id);
  }
  return [...out].sort();
}

// --- agent files -------------------------------------------------------------

function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function readAgents(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { dir, files: [], missingDir: true };
  }
  const files = [];
  for (const f of names.filter((f) => f.startsWith('gp-') && f.endsWith('.md')).sort()) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    const field = (k) => {
      const m = fm && new RegExp(`^${k}:[ \\t]*(.+)$`, 'm').exec(fm[1]);
      return m ? m[1].trim() : null;
    };
    files.push({ file: f, path: path.join(dir, f), name: field('name'), model: field('model'), effort: field('effort') });
  }
  return { dir, files, missingDir: false };
}

// --- access probe ------------------------------------------------------------

function probe(claudeBin, model, timeoutSec) {
  return new Promise((resolve) => {
    execFile(claudeBin, ['--model', model, '-p', PROBE_PROMPT], { timeout: timeoutSec * 1000, maxBuffer: 1 << 20 },
      (err, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        const unknown = /isn't described by this version's model catalog|unrecognized_model/.test(out);
        const replied = /\bOK\b/.test(out);
        const reason = unknown ? 'not in catalog' : err ? (err.killed ? 'timeout' : 'call failed') : replied ? '' : 'no reply';
        resolve({ model, ok: !err && !unknown && replied, reason });
      });
  });
}

async function probeAll(claudeBin, models, timeoutSec) {
  const results = new Map();
  const queue = models.slice();
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (;;) {
      const m = queue.shift();
      if (m === undefined) return;
      results.set(m, await probe(claudeBin, m, timeoutSec));
    }
  });
  await Promise.all(workers);
  return models.map((m) => results.get(m));
}

// --- write -------------------------------------------------------------------

function agentName(model, effort) {
  return `gp-${model.replace(/^claude-/, '')}-${effort}`;
}

// A plain YAML scalar breaks on ": ", " #", or a leading indicator character, and
// Claude Code ignores the broken file without reporting it — so quote when needed.
function yamlScalar(text) {
  const needsQuotes = /: |\s#|^[-?:,\[\]{}#&*!|>'"%@`]/.test(text);
  if (!needsQuotes) return text;
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function writeAgentFile(dir, model, effort, note) {
  const name = agentName(model, effort);
  const target = path.join(dir, `${name}.md`);
  if (fs.existsSync(target)) return { path: target, status: 'exists' };
  const description = `General-purpose agent pinned to ${model} at ${effort} effort. ${note}`;
  const body = fs.readFileSync(TEMPLATE, 'utf8')
    .replace(/^description: .*$/m, `description: ${yamlScalar(description)}`)
    .replaceAll('{{name}}', name)
    .replaceAll('{{model}}', model)
    .replaceAll('{{effort}}', effort)
    .replaceAll('{{note}}', note);
  // The agents directory does not exist on a fresh setup, and a bare write
  // would fail with ENOENT after the access probes have already been paid for.
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, body, 'utf8');
  return { path: target, status: 'written' };
}

// --- main --------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const claudeBin = whichClaude();
  if (!claudeBin) {
    process.stderr.write('sync-gp-agents: no `claude` on PATH — the model catalog lives in that binary; run this where Claude Code is installed\n');
    return 1;
  }
  const binPath = fs.realpathSync(claudeBin);
  const catalog = extractCandidates(binPath);
  const agentsDir = opts.agentsDir || path.join(claudeConfigDir(), 'agents');
  const agents = readAgents(agentsDir);

  const byModel = new Map();
  for (const a of agents.files) {
    if (!a.model) continue;
    if (!byModel.has(a.model)) byModel.set(a.model, new Map());
    byModel.get(a.model).set(a.effort, a);
  }

  const scope = opts.models || catalog;
  const unknownModels = opts.models
    ? opts.models.filter((m) => !catalog.includes(m))
    : [];

  const noFiles = [];
  const incomplete = [];
  for (const model of scope) {
    const have = byModel.get(model);
    if (!have) { noFiles.push(model); continue; }
    const missing = EFFORTS.filter((e) => !have.has(e));
    const bad = [...have.values()].filter((a) => !EFFORTS.includes(a.effort)).map((a) => a.file);
    if (missing.length || bad.length) incomplete.push({ model, missing, badEffort: bad });
  }
  const stale = agents.files
    .filter((a) => a.model && !catalog.includes(a.model))
    .map((a) => ({ file: a.file, model: a.model }));

  let access = null;
  if (opts.checkAccess) {
    const targets = (opts.models || [...noFiles, ...incomplete.map((i) => i.model)]);
    access = await probeAll(claudeBin, targets, opts.timeout);
  }

  const written = [];
  const blocked = [];
  if (opts.write) {
    const confirmed = new Set(access.filter((r) => r.ok).map((r) => r.model));
    for (const model of opts.models) {
      if (!confirmed.has(model)) {
        blocked.push({ model, reason: (access.find((r) => r.model === model) || {}).reason || 'unconfirmed' });
        continue;
      }
      for (const effort of opts.efforts) written.push({ model, effort, ...writeAgentFile(agentsDir, model, effort, opts.note) });
    }
  }

  const drift = noFiles.length + incomplete.length + stale.length + unknownModels.length + blocked.length > 0;
  const report = {
    claude: claudeBin, binary: binPath, version: path.basename(binPath),
    agentsDir, catalog, agentFiles: agents.files.length,
    noFiles, incomplete, stale, unknownModels,
    access, written, blocked,
    exitCode: drift ? 1 : 0,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.exitCode;
  }

  const out = [];
  out.push(`catalog: ${catalog.length} candidate ids from ${binPath}`);
  out.push(`agents:  ${agents.files.length} gp-*.md in ${agentsDir}${agents.missingDir ? ' (directory missing)' : ''}`);
  if (unknownModels.length) {
    out.push('', `not in this version's catalog (${unknownModels.length}):`);
    for (const m of unknownModels) out.push(`  ${m}`);
    out.push('  -> upgrade Claude Code, or pin an id the catalog lists');
  }
  if (noFiles.length) {
    out.push('', `no gp files (${noFiles.length}):`);
    for (const m of noFiles) out.push(`  ${m}`);
    out.push('  -> decide per model whether it gets files, then: --write --models <id>');
  }
  if (incomplete.length) {
    out.push('', `incomplete effort series (${incomplete.length}):`);
    for (const i of incomplete) {
      if (i.missing.length) out.push(`  ${i.model}  missing: ${i.missing.join(', ')}`);
      for (const f of i.badEffort) out.push(`  ${i.model}  ${f}: effort is not one of ${EFFORTS.join(', ')} and is silently ignored`);
    }
    out.push('  -> --write --models <id>');
  }
  if (stale.length) {
    out.push('', `model no longer in the catalog (${stale.length}):`);
    for (const s of stale) out.push(`  ${s.file}  model: ${s.model}`);
    out.push('  -> delete those files, or repin them to an id the catalog lists');
  }
  if (access) {
    const bad = access.filter((r) => !r.ok);
    out.push('', `access: ${access.length - bad.length}/${access.length} confirmed`);
    for (const r of bad) out.push(`  ${r.model}  ${r.reason}`);
    if (bad.length) out.push('  -> unconfirmed ids get no files; they are regex noise or need a newer Claude Code');
  }
  if (opts.write) {
    out.push('');
    for (const w of written) out.push(`  ${w.status === 'written' ? 'wrote  ' : 'exists '} ${w.path}`);
    for (const b of blocked) out.push(`  blocked ${b.model}: ${b.reason}`);
    out.push('  -> now update the matrix table and the prose under it in CLAUDE.md');
  }
  if (!drift && !opts.write) out.push('', 'clean: every catalog model has the full effort series, no stale files');
  process.stdout.write(`${out.join('\n')}\n`);
  return report.exitCode;
}

main().then((code) => process.exit(code), (err) => {
  process.stderr.write(`sync-gp-agents: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
