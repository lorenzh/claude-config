#!/usr/bin/env node
// recap-context.mjs — print everything a recap needs in one shot:
// the git change surface and the project's documentation layout.
// Read-only; runs on Windows, macOS, and Linux (Node >= 18, no deps).
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// returns command output ('' if genuinely empty), or null if the command failed
const git = (args) => {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
};

const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const show = (out, emptyLabel) => console.log(out === null ? '(git command failed)' : out || emptyLabel);

const root = git('rev-parse --show-toplevel');
if (root === null) {
  console.error('not inside a git repository (or git not on PATH)');
  process.exit(1);
}
process.chdir(root);
const hasHead = git('rev-parse --verify --quiet HEAD') !== null;

console.log('== GIT CHANGE SURFACE ==');
show(git('--no-optional-locks status --short --untracked-files=all'), '(working tree clean)');
console.log('-- diffstat (vs HEAD) --');
show(hasHead ? git('diff --stat HEAD') : git('diff --stat --cached'), '(no diff)');
console.log('-- recent commits --');
console.log(hasHead ? (git('log --oneline -15') ?? '(git command failed)') : '(no commits)');

console.log('\n== INSTRUCTION FILES (shared, checked in) ==');
const instructionFiles = ['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md', '.cursorrules'].filter(isFile);
console.log(instructionFiles.length ? instructionFiles.map((f) => `present: ${f}`).join('\n') : 'none found at repo root');
if (instructionFiles.includes('CLAUDE.md') && instructionFiles.includes('AGENTS.md')) {
  let claude = null;
  try { claude = readFileSync('CLAUDE.md', 'utf8'); } catch { console.log('routing: CLAUDE.md unreadable -> inspect it yourself'); }
  if (claude !== null) {
    if (/@AGENTS\.md\b/.test(claude)) {
      console.log('routing: CLAUDE.md imports @AGENTS.md -> AGENTS.md is the only instruction home');
    } else if (/(^|[^\w])AGENTS\.md\b/m.test(claude)) {
      console.log('routing: CLAUDE.md mentions AGENTS.md -> confirm the line defers to it; if so, AGENTS.md is the only instruction home');
    } else {
      console.log('routing: CLAUDE.md and AGENTS.md are independent -> harness-neutral notes to AGENTS.md, Claude-specific to CLAUDE.md');
    }
  }
}

console.log('\n== PERSONAL INSTRUCTION FILES ==');
// global: this user, every project — honour the harnesses' config-dir overrides
const globalFiles = [
  join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'CLAUDE.md'),
  join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'AGENTS.md'),
].filter(isFile);
console.log(
  globalFiles.length
    ? globalFiles.map((f) => `global (this user, every project): ${f}`).join('\n')
    : 'no global instruction file found'
);
// project-local: this user, this project — only a safe home when git actually ignores it
const localNames = ['CLAUDE.local.md', 'AGENTS.local.md'];
const localFiles = localNames.filter(isFile);
if (!localFiles.length) {
  console.log(
    `project-local personal: none (${localNames.join(', ')}) -> create one only if a user-only note needs a project home, and gitignore it first`
  );
} else {
  for (const f of localFiles) {
    const verdict = git(`ls-files --error-unmatch -- "${f}"`) !== null
      ? 'TRACKED -> shared with the team, not personal; fix that before writing a user-only note'
      : git(`check-ignore -q -- "${f}"`) !== null
        ? 'untracked and gitignored -> safe home for user-only notes'
        : 'untracked but NOT gitignored -> one `git add -A` from leaking; add it to .gitignore first';
    console.log(`project-local personal: ${f} -> ${verdict}`);
  }
}

// keep only real directories; dedupe names that collide on case-insensitive filesystems
const existingDirs = (candidates) => {
  const seen = new Set();
  return candidates.filter((d) => {
    if (!isDir(d)) return false;
    let id = d;
    try { id = realpathSync.native(d); } catch { /* keep the name as identity */ }
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

// recursive .md count; skips symlinks, node_modules, and .git
const countMd = (dir) => {
  let n = 0;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return n; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git') n += countMd(join(dir, e.name));
    } else if (e.name.endsWith('.md')) n++;
  }
  return n;
};

console.log('\n== DOCS FOLDERS ==');
const docsDirs = existingDirs(['docs', 'doc', 'documentation', 'Documentation', 'wiki']);
console.log(docsDirs.length ? docsDirs.map((d) => `docs dir: ${d}/ (${countMd(d)} md files)`).join('\n') : 'no conventional docs folder found');

console.log('\n== SKILLS ==');
const skillsDirs = existingDirs(['.claude/skills', '.agents/skills', '.github/skills', 'skills']);
console.log(skillsDirs.length ? skillsDirs.map((d) => `skills dir: ${d}/ -> ${readdirSync(d).join(' ')}`).join('\n') : 'no skills dir found');
const lockfiles = ['skills-lock.json', '.agents/skills-lock.json'].filter(isFile);
console.log(
  lockfiles.length
    ? lockfiles.map((l) => `lockfile: ${l} -> skills listed there are installed; treat as read-only`).join('\n')
    : 'lockfile: none found -> skills here are project-authored (editable)'
);
