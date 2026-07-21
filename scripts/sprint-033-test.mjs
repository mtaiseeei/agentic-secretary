#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEditionConfig, inspectWorkspaceEdition } from "../plugins/secretary/scripts/lib/edition-guard.mjs";
import {
  LIVE_CONVERSATION_SCENARIOS,
  loadHostMatrix,
  summarizeHostRecords,
  unavailableRecords,
  validateHostRecord,
} from "./lib/agentic-hosts.mjs";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const root = resolve(rootIndex >= 0 ? args[rootIndex + 1] : dirname(fileURLToPath(import.meta.url)), rootIndex >= 0 ? "" : "..");
const pluginRoot = join(root, "plugins/secretary");
const neutralCommit = "52016cf10c1c5587fbd83ff2faf3888e29282d5e";
const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
let passes = 0;

function check(label, callback) {
  callback();
  passes += 1;
  process.stdout.write(`PASS ${label}\n`);
}

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? walk(item) : [item];
  });
}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
}

function allowed(path, patterns) {
  return patterns.some((pattern) => pattern.endsWith("/**")
    ? path === pattern.slice(0, -3) || path.startsWith(pattern.slice(0, -2))
    : path === pattern);
}

const evidenceKindFor = (checkId, officialValidator) => ({
  "distribution-format": officialValidator ? "official-validator" : "command",
  "fresh-install": "host-observation",
  "rules-and-skills": "host-observation",
  "basic-and-complex-conversation": "conversation",
  "completion-and-status-report": "conversation",
  "diagnosis-and-developer-handoff": "conversation",
  "wizard-launch": "screenshot",
  "workspace-boundary": "command",
  "secret-non-exposure": "command",
  "update-path-or-safe-unsupported": "host-observation",
  "host-regression": "command",
  "live-or-official-validator-evidence": officialValidator ? "official-validator" : "host-observation",
})[checkId];

function passedExecution(kind, command) {
  return {
    kind,
    command,
    exitCode: 0,
    startedAt: "2026-07-21T00:00:00.000Z",
    finishedAt: "2026-07-21T00:00:01.000Z",
    result: "pass",
  };
}

function completePassRecord(loaded, hostId) {
  const entry = loaded.entries.get(hostId);
  const checks = Object.fromEntries(loaded.matrix.requiredChecks.map((id) => [id, "pass"]));
  const evidence = loaded.matrix.requiredChecks.map((checkId) => {
    const kind = evidenceKindFor(checkId, entry.adapter.officialValidator);
    const executionKind = kind === "official-validator" ? "official-validator" : kind === "command" ? "command" : "host-ui";
    return {
      kind,
      checkId,
      hostId,
      runner: entry.adapter.runner,
      surface: entry.surface,
      execution: passedExecution(executionKind, `${executionKind}:${hostId}:${checkId}`),
      sanitized: true,
      summary: `Sanitized ${kind} evidence for ${checkId}.`,
    };
  });
  return {
    schemaVersion: 1,
    hostId,
    runner: entry.adapter.runner,
    surface: entry.surface,
    status: "pass",
    checks,
    execution: passedExecution("command", `approved-live-driver:${hostId}`),
    conversation: {
      result: "pass",
      scenarios: LIVE_CONVERSATION_SCENARIOS.map((id) => ({ id, result: "pass", markdownValidated: true })),
    },
    liveConversationGate: "pass",
    installed: true,
    evidence,
    reason: "Approved live host execution completed every required check.",
  };
}

check("distribution identity and candidate version are agentic-secretary 0.8.0", () => {
  const marketplace = json(join(root, ".claude-plugin/marketplace.json"));
  const manifest = json(join(pluginRoot, ".claude-plugin/plugin.json"));
  const edition = json(join(pluginRoot, "edition.json"));
  assert.equal(marketplace.name, "agentic-secretary");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "agentic-secretary");
  assert.equal(marketplace.plugins[0].version, "0.8.0");
  assert.equal(manifest.name, "agentic-secretary");
  assert.equal(manifest.version, "0.8.0");
  assert.equal(edition.edition, "agentic-secretary");
  assert.equal(edition.distribution.pluginId, "agentic-secretary@agentic-secretary");
  assert.equal(edition.harness.installId, "harness@agentic-harness");
  assert.equal(edition.copy.path, "rules/copy/agentic.json");
});

check("technical copy is limited to the four edition surfaces", () => {
  const copy = json(join(pluginRoot, "rules/copy/agentic.json"));
  assert.deepEqual(Object.keys(copy.surfaces).sort(), ["conversation", "developerHandoff", "diagnosis", "report"]);
  const text = JSON.stringify(copy);
  for (const required of ["command", "path", "error", "evidence", "UNVERIFIED"]) assert(text.includes(required), `missing technical term: ${required}`);
  for (const forbidden of ["wizard", "OAuth scope", "Repository Secretを登録"]) assert(!text.includes(forbidden), `common surface leaked into edition copy: ${forbidden}`);
  assert.equal(copy.surfaces.conversation.decisionConfirmation, "この内容を決定として残しますね: <そのターンのユーザー入力全文>");
  assert(Object.values(copy.surfaces).flatMap((surface) => Object.values(surface)).flat(Infinity)
    .filter((value) => typeof value === "string").every((value) => /[ぁ-んァ-ヶ一-龠]/.test(value)));
});

check("rule graph preserves common safety and selects agentic style", () => {
  const manifest = json(join(pluginRoot, "rules/rule-manifest.json"));
  assert(manifest.priority.includes("agentic-style"));
  assert.equal(manifest.rules["agentic-style"].path, "styles/agentic.md");
  assert.equal(manifest.rules["agentic-style"].copy, "copy/agentic.json");
  assert.equal(manifest.rules.safety.protected, true);
  assert.equal(manifest.rules.evidence.protected, true);
  assert.equal(manifest.rules["common-language"].protected, true);
  assert.deepEqual(manifest.rules["agentic-style"].overrides, []);
  assert(read(join(pluginRoot, "rules/plain-language.md")).includes("styles/agentic.md"));
});

check("neutral common-core digests remain byte-identical", () => {
  const baseline = json(join(root, "adapters/neutral-base.json"));
  assert.equal(baseline.neutralizationCommit, neutralCommit);
  for (const [path, digest] of Object.entries(baseline.digests)) assert.equal(hash(join(root, path)), digest, path);
});

check("wizard Name and Secret instructions remain exact", () => {
  const app = read(join(pluginRoot, "skills/chatwork/assets/wizard/app.js"));
  assert(app.includes("<code>Name</code> 欄</dt><dd><code>CHATWORK_API_TOKEN</code>"));
  assert(app.includes("<code>Secret</code> 欄</dt><dd>Chatwork公式画面でご本人が取得したAPI Token"));
});

check("four host adapters and twelve checks are structurally complete", () => {
  const loaded = loadHostMatrix(root);
  assert.equal(loaded.entries.size, 4);
  assert.equal(loaded.matrix.requiredChecks.length, 12);
  for (const [hostId, entry] of loaded.entries) {
    assert.equal(entry.adapter.hostId, hostId);
    if (hostId.startsWith("codex-")) assert.equal(entry.adapter.officialValidator, null);
  }
});

check("unavailable hosts are not promoted by offline validation", () => {
  const loaded = loadHostMatrix(root);
  const summary = summarizeHostRecords(loaded, unavailableRecords(loaded));
  assert.equal(summary.verifiedHosts.length, 0);
  assert.equal(summary.unavailableHosts.length, 4);
  assert.equal(summary.allHostsVerified, false);
  assert.equal(summary.releaseStatus, "external-live-gate-unavailable");
});

check("negative evidence cases cannot promote the release", () => {
  const loaded = loadHostMatrix(root);
  const hostId = loaded.matrix.requiredHosts[0];
  const pass = completePassRecord(loaded, hostId);
  assert.throws(() => summarizeHostRecords(loaded, [pass]), /forbidden outside an approved live runner/);
  validateHostRecord(loaded, pass, { allowLivePass: true });
  const summary = summarizeHostRecords(loaded, [pass], { allowLivePass: true });
  assert.deepEqual(summary.verifiedHosts, [hostId]);
  assert.equal(summary.unverifiedHosts.length, 3);
  assert.equal(summary.allHostsVerified, false);
  assert.equal(summary.releaseStatus, "unverified");

  const rejects = [
    [(record) => { delete record.runner; }, /missing required field: runner/],
    [(record) => { record.runner = "scripts/fake-runner.mjs"; }, /runner mismatch/],
    [(record) => { delete record.surface; }, /missing required field: surface/],
    [(record) => { record.evidence = [{}]; }, /missing required field/],
    [(record) => { record.evidence[0].kind = "real-host"; }, /kind is unknown/],
    [(record) => { record.evidence[0].hostId = "codex-cli"; }, /does not match its record/],
    [(record) => { delete record.checks[loaded.matrix.requiredChecks[0]]; }, /does not report all required checks/],
    [(record) => { record.evidence[0].execution.result = "fail"; record.evidence[0].execution.exitCode = 1; }, /does not match checks/],
    [(record) => { record.conversation.scenarios.pop(); }, /must cover every required live conversation scenario/],
    [(record) => { record.evidence[0].sanitized = false; }, /sanitized must be true/],
  ];
  for (const [mutate, pattern] of rejects) {
    const invalid = structuredClone(pass);
    mutate(invalid);
    assert.throws(() => validateHostRecord(loaded, invalid, { allowLivePass: true }), pattern);
  }

  const oldShape = { hostId, status: "pass", checks: pass.checks, liveConversationGate: "pass", evidence: [{}] };
  assert.throws(() => summarizeHostRecords(loaded, [oldShape], { allowLivePass: true }), /missing required field/);
});

check("offline CLI rejects a syntactically complete fake PASS record", () => {
  const loaded = loadHostMatrix(root);
  const fixture = mkdtempSync("/private/tmp/agentic-fake-live-");
  const evidencePath = join(fixture, "fake.json");
  try {
    writeFileSync(evidencePath, JSON.stringify([completePassRecord(loaded, loaded.matrix.requiredHosts[0])]));
    assert.throws(() => execFileSync("node", [join(root, "scripts/agentic-host-gate.mjs"), "--mode", "offline", "--evidence", evidencePath], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    }));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

check("live runner is approval-gated and executes only an explicit driver", () => {
  const source = read(join(root, "scripts/agentic-live-host-gate.mjs"));
  for (const required of ["--approval", "--output", "spawnSync", "shell: false", "allowedEnvironment", "flag: \"wx\""]) {
    assert(source.includes(required), `missing live-runner control: ${required}`);
  }
  assert(source.includes("if (!approvalPath)"));
  assert(source.includes("external-live-gate-unavailable") || source.includes("unavailableRecords"));
});

check("fresh and opposite-edition workspace guards are deterministic", () => {
  const config = loadEditionConfig(pluginRoot);
  const fixture = mkdtempSync("/private/tmp/agentic-sprint033-");
  try {
    assert.equal(inspectWorkspaceEdition(fixture, config).state, "new");
    mkdirSync(join(fixture, ".secretary"), { recursive: true });
    writeFileSync(join(fixture, ".secretary/workspace-edition.json"), JSON.stringify({ schemaVersion: 1, edition: "agentic-secretary" }));
    assert.equal(inspectWorkspaceEdition(fixture, config).state, "same-edition");
    writeFileSync(join(fixture, ".secretary/workspace-edition.json"), JSON.stringify({ schemaVersion: 1, edition: "yasashii-secretary" }));
    assert.equal(inspectWorkspaceEdition(fixture, config).state, "opposite-edition");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

check("host adapters do not duplicate plugin core", () => {
  const adapterFiles = walk(join(root, "adapters")).map((path) => relative(root, path));
  assert(!adapterFiles.some((path) => /(^|\/)skills\//.test(path)));
  const text = adapterFiles.map((path) => read(join(root, path))).join("\n");
  assert(!text.includes("CHATWORK_API_TOKEN</code></dd>"), "wizard implementation was duplicated under adapters");
  assert(!text.includes("https://www.googleapis.com/auth/chat.messages.readonly"), "OAuth scope was duplicated under adapters");
});

check("active distribution surfaces have no opposite-edition identity", () => {
  const active = [
    ".claude-plugin/marketplace.json",
    "plugins/secretary/.claude-plugin/plugin.json",
    "plugins/secretary/rules/plain-language.md",
    "plugins/secretary/rules/rule-manifest.json",
    "plugins/secretary/rules/styles/agentic.md",
    "plugins/secretary/rules/copy/agentic.json",
  ];
  for (const path of active) assert(!read(join(root, path)).includes("yasashii-secretary"), path);
  const readme = read(join(root, "README.md"));
  assert(readme.includes("agentic-secretary"));
  assert(readme.includes("yasashii-secretary"), "sibling-edition relationship must remain explicit");
});

if (existsSync(join(root, ".git"))) {
  check("complete neutral history is retained and target has no remote", () => {
    execFileSync("git", ["merge-base", "--is-ancestor", neutralCommit, "HEAD"], { cwd: root });
    const minimum = json(join(root, "adapters/neutral-base.json")).minimumHistoryCommitCount;
    assert(Number(git("rev-list", "--count", "HEAD")) >= minimum);
    assert.equal(git("remote"), "");
  });

  check("every post-neutral path is declared by the overlay", () => {
    const overlay = json(join(root, "adapters/agentic-overlay.json"));
    const tracked = git("diff", "--name-only", neutralCommit, "--").split("\n").filter(Boolean);
    const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
    const changed = [...new Set([...tracked, ...untracked])];
    const undeclared = changed.filter((path) => !allowed(path, overlay.allowedChangedPaths));
    assert.deepEqual(undeclared, []);
  });
}

process.stdout.write(`SPRINT_033_TEST_PASS=${passes} FAIL=0\n`);
