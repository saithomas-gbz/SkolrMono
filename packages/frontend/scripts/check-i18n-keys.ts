import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { load } from 'js-yaml';

const ROOT = join(import.meta.dir, '..');
const LOCALE_FILE = join(ROOT, 'i18n/locales/fr.yaml');
const SCAN_DIRS = ['app'].map((dir) => join(ROOT, dir));
const SCAN_EXTENSIONS = new Set(['.vue', '.ts']);

// Matches `$t(...)` and bare `t(...)` (not `.t(` / word-prefixed `t(`), capturing
// the first argument when it's a string or template literal.
const CALL_RE = /(?:\$t|(?<![\w.$])t)\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

function flattenKeys(node: unknown, prefix: string, keys: Set<string>): void {
  if (node === null || typeof node !== 'object') {
    keys.add(prefix);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    flattenKeys(v, prefix ? `${prefix}.${k}` : k, keys);
  }
}

interface KeyUsage {
  key: string;
  dynamic: boolean;
  file: string;
  line: number;
}

function extractUsages(file: string, content: string): KeyUsage[] {
  const usages: KeyUsage[] = [];
  for (const match of content.matchAll(CALL_RE)) {
    const raw = match[1];
    const quote = raw[0];
    const inner = raw.slice(1, -1);
    const dynamic = quote === '`' && inner.includes('${');
    // Keep the static prefix as-is (including a trailing "." if present) so both
    // `${'ns.role_' + x}`-style segment interpolation and `ns.role_${x}` in-segment
    // interpolation are matched as prefixes below.
    const key = dynamic ? inner.slice(0, inner.indexOf('${')) : inner;
    if (!key) continue; // fully dynamic key, e.g. $t(someVar) — nothing to check
    const line = content.slice(0, match.index).split('\n').length;
    usages.push({ key, dynamic, file: relative(ROOT, file), line });
  }
  return usages;
}

function main(): void {
  const yamlDoc = load(readFileSync(LOCALE_FILE, 'utf-8'));
  const definedKeys = new Set<string>();
  flattenKeys(yamlDoc, '', definedKeys);
  const definedKeysList = [...definedKeys];

  const usages = walk(SCAN_DIRS[0]!).flatMap((file) =>
    extractUsages(file, readFileSync(file, 'utf-8')),
  );

  const referencedKeys = new Set<string>();
  const missing: KeyUsage[] = [];

  for (const usage of usages) {
    if (usage.dynamic) {
      const matches = definedKeysList.filter((k) => k.startsWith(usage.key));
      if (matches.length === 0) {
        missing.push(usage);
      } else {
        for (const k of matches) referencedKeys.add(k);
      }
    } else {
      if (definedKeys.has(usage.key)) {
        referencedKeys.add(usage.key);
      } else {
        missing.push(usage);
      }
    }
  }

  const unused = definedKeysList.filter((k) => !referencedKeys.has(k)).sort();

  if (unused.length > 0) {
    console.warn(`⚠ ${unused.length} unused i18n key(s) in fr.yaml (not referenced by any $t()/t() call found):`);
    for (const key of unused) console.warn(`  - ${key}`);
    console.warn('');
  }

  if (missing.length > 0) {
    console.error(`✗ ${missing.length} i18n key(s) used in code but missing from fr.yaml:`);
    for (const { key, file, line, dynamic } of missing) {
      console.error(`  - "${key}"${dynamic ? ' (dynamic prefix)' : ''} at ${file}:${line}`);
    }
    process.exit(1);
  }

  console.log(`✓ i18n keys OK (${definedKeysList.length} defined, ${usages.length} usages checked).`);
}

main();
