#!/usr/bin/env node

import { userInfo } from "node:os";
import { pathToFileURL } from "node:url";
import { runExternalSync } from "./lib/external-ops.mjs";

const GENERIC_NAMES = new Set([
  "bot", "ci", "root", "admin", "administrator", "user", "username",
  "unknown", "nobody", "runner", "github-actions", "build",
]);

const SOURCES = [
  ["currentConversationName", "host-task-context", "現在の会話"],
  ["personalizationPreferredName", "host-task-context", "Personalization"],
  ["projectUserName", "host-task-context", "Project"],
  ["memoryName", "host-task-context", "現在タスクの記憶"],
];

export function normalizeNameCandidate(value) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function unicodeCaseFoldKey(value) {
  // JavaScriptにはCaseFolding.txtを直接適用するAPIがない。大文字化で
  // multi-code-point mapping（ß→SS等）を展開してから小文字化し、default
  // case-foldで特別扱いされるdotless i・capital sharp s・Cherokeeを補正する。
  const foldSegment = (segment) => segment
    .replace(/\u1E9E/gu, "\u00DF")
    .toUpperCase()
    .toLowerCase()
    .replace(/[\u13F8-\u13FD\uAB70-\uABBF]/gu, (character) => character.toUpperCase())
    .normalize("NFKC");
  return normalizeNameCandidate(value)
    .split("\u0131")
    .map(foldSegment)
    .join("\u0131")
    .normalize("NFKC");
}

function looksLikeHostName(value) {
  // TLDの列挙には依存しない。空白を含む "J. Smith" のような人名表記は
  // 対象にせず、DNS labelだけで構成された1-dot以上の値をhost名とみなす。
  return value.toLocaleLowerCase("und") === "localhost"
    || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?$/iu.test(value);
}

export function classifyNameCandidate(value, { source = "host-task-context" } = {}) {
  const normalized = normalizeNameCandidate(value);
  if (!normalized) return { accepted: false, reason: "empty", normalized };
  if ([...normalized].length > 40) return { accepted: false, reason: "too-long", normalized };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) return { accepted: false, reason: "email", normalized };
  if (GENERIC_NAMES.has(normalized.toLocaleLowerCase("und"))) {
    return { accepted: false, reason: "generic", normalized };
  }
  const visible = normalized.replace(/\s/gu, "");
  const digits = visible.match(/\p{Nd}/gu)?.length ?? 0;
  if (visible && digits * 2 >= [...visible].length) return { accepted: false, reason: "digit-heavy", normalized };
  if (/[\\/]/u.test(normalized) || /^(?:\.{1,2}|~)(?:[\\/]|$)/u.test(normalized)) {
    return { accepted: false, reason: "path", normalized };
  }
  if (/^[{(]?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[)}]?$/iu.test(normalized)) {
    return { accepted: false, reason: "uuid", normalized };
  }
  if (/(?:^|[^0-9a-f])[0-9a-f]{16,}(?:$|[^0-9a-f])/iu.test(normalized) || /^[0-9a-f]{16,}$/iu.test(normalized)) {
    return { accepted: false, reason: "long-hex", normalized };
  }
  if (looksLikeHostName(normalized)) {
    return { accepted: false, reason: "host-name", normalized };
  }
  if (/^(?:gh[opsu]_|github_pat_|xox[baprs]-|sk[-_]|eyJ)[A-Za-z0-9._-]{8,}$/u.test(normalized)) {
    return { accepted: false, reason: "token-like", normalized };
  }
  if (/^(?=.{12,}$)(?:[a-z0-9]+[-_.]){2,}[a-z0-9]+$/iu.test(normalized)
    || /^(?:runner|agent|worker|build|desktop|macbook|ubuntu|windows|host|node)[-_]?[a-z0-9-]*$/iu.test(normalized)) {
    return { accepted: false, reason: "machine-like", normalized };
  }
  if (source === "os-user-name" && !/\p{L}/u.test(normalized)) {
    return { accepted: false, reason: "os-no-letter", normalized };
  }
  return { accepted: true, reason: null, normalized };
}

function asValues(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

export function defaultNameProviders({ cwd = process.cwd() } = {}) {
  return {
    readGitUserName() {
      try {
        return runExternalSync("git", ["config", "--get", "user.name"], {
          cwd,
          encoding: "utf8",
          timeoutMs: 5_000,
          label: "Gitの表示名確認",
        }).stdout;
      } catch {
        return "";
      }
    },
    readOsUserName() {
      try {
        return userInfo().username;
      } catch {
        return "";
      }
    },
  };
}

export function collectNameCandidates({
  selection,
  hostTaskContext = {},
  providers = defaultNameProviders(),
} = {}) {
  if (selection !== "account-name") {
    return { available: false, candidates: [], providerCalls: { git: 0, os: 0 } };
  }

  const raw = [];
  for (const [key, source, sourceLabel] of SOURCES) {
    for (const value of asValues(hostTaskContext[key])) raw.push({ value, source, sourceLabel });
  }

  const providerCalls = { git: 0, os: 0 };
  providerCalls.git += 1;
  let gitValue = "";
  try { gitValue = providers.readGitUserName?.() ?? ""; } catch { /* 利用不能なら次sourceへ進む */ }
  raw.push({ value: gitValue, source: "git-user-name", sourceLabel: "Gitの表示名" });
  providerCalls.os += 1;
  let osValue = "";
  try { osValue = providers.readOsUserName?.() ?? ""; } catch { /* 利用不能なら候補なしとして扱う */ }
  raw.push({ value: osValue, source: "os-user-name", sourceLabel: "OSのユーザー名" });

  const candidates = [];
  const seen = new Set();
  for (const item of raw) {
    const result = classifyNameCandidate(item.value, { source: item.source });
    if (!result.accepted) continue;
    const key = unicodeCaseFoldKey(result.normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      value: result.normalized,
      source: item.source,
      sourceLabel: item.sourceLabel,
      recommended: candidates.length === 0,
      rank: candidates.length + 1,
    });
  }
  return { available: candidates.length > 0, candidates, providerCalls };
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text.trim() ? JSON.parse(text) : {};
}

async function main() {
  const input = await readStdin();
  const result = collectNameCandidates({
    selection: input.selection,
    hostTaskContext: input.hostTaskContext,
    providers: defaultNameProviders({ cwd: input.cwd || process.cwd() }),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch(() => {
    process.stderr.write("呼び方候補を安全に確認できませんでした。\n");
    process.exitCode = 2;
  });
}
