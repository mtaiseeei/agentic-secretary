#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { previewInit, scanRepository } from "../plugins/secretary/scripts/lib/clarity-core.mjs";
import { HARNESS_SCAN_LIMITS } from "../plugins/secretary/scripts/lib/clarity-harness-scan.mjs";
import { validateCollaborationInventory } from "./lib/sprint-049-inventory.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requireWindows = process.argv.includes("--require-windows");
const results = new Map();
const cleanup = [];
let externalWrites = 0;
let networkCalls = 0;

function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function write(root, path, body) {
  const target = join(root, ...path.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
}
function runtimeSecret(variant = 0) {
  if (variant === 0) return randomBytes(24).toString("base64url");
  const alphabet = variant === 1 ? [98, 108, 117, 101, 98, 101, 114, 114, 121, 55, 52] : [99, 114, 97, 110, 98, 101, 114, 114, 121, 56, 53];
  return String.fromCharCode(...alphabet);
}
function secretLine(value, key = "api_key") { return `${key}=${value}`; }
function stateText({ current = "sprint-050-patch-005", next = "TBD", status = "active", prefix = "", between = "", suffix = "", currentLine = null } = {}) {
  const currentMetadata = currentLine ?? `- Current ID: ${current}`;
  return `${prefix}# Sprint State\r\n\r\n${currentMetadata}\r\n- Next Planned: ${next}\r\n${between}\r\n| ID | Status | Contract | Progress | Feedback |\r\n|---|---|---|---|---|\r\n| sprint-050-patch-004 | done | x | x | x |\r\n| sprint-050-patch-005 | ${status} | x | x | x |\r\n${suffix}`;
}
function fixture(name, options = {}) {
  const root = mkdtempSync(join(tmpdir(), `${name} 空白 日本語-`)); cleanup.push(root);
  write(root, "docs/spec.md", "# Spec Index\n\n[features](spec/features.md)\n");
  write(root, "docs/spec/features.md", "# Features\n\nBounded scanner.\n");
  write(root, "docs/sprints/state.md", options.state ?? stateText());
  write(root, "docs/sprints/sprint-050-patch-005.md", "# Requirements\n");
  write(root, "docs/progress/sprint-050-patch-005.md", "# Generator self report\n");
  if (!options.feedbackAbsent) write(root, "docs/feedback/sprint-050-patch-005.md", "# Evaluation\n\nVerdict: **FAIL**\n");
  write(root, "AGENTS.md", "# Guidance\n");
  write(root, "CLAUDE.md", "# Guidance\n");
  write(root, "package.json", "{\"name\":\"fixture\"}\n");
  return root;
}
function source(report, role) { return report.harness.sources.find((row) => row.role === role); }
function assertCanaryAbsent(report, canary) {
  const body = JSON.stringify(report);
  assert.equal(body.includes(canary), false, "runtime canary must not be returned");
  assert.equal(body.includes(sha(canary)), false, "runtime canary raw digest must not be returned");
  for (const fragment of [canary.slice(0, 6), canary.slice(-6)]) assert.equal(body.includes(fragment), false, "runtime canary fragment must not be returned");
}
function runScript(path, args = []) {
  const result = spawnSync(process.execPath, [join(ROOT, path), ...args], { cwd: ROOT, encoding: "utf8", shell: false, timeout: 240_000, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, `${path} regression failed`);
}
function record(id, status, reason, action = null) {
  try {
    if (action) action();
    results.set(id, { status, reason });
    process.stdout.write(`${status} ${id} ${reason}\n`);
  } catch (error) {
    results.set(id, { status: "FAIL", reason: error instanceof Error ? error.message : String(error) });
    process.stderr.write(`FAIL ${id} ${error instanceof Error ? error.stack : String(error)}\n`);
  }
}

try {
  record("SR-001", "PASS", "current-public-source-structured-state", () => {
    const preview = previewInit(ROOT); const report = preview.scan;
    assert.equal(preview.initialized, false); assert.equal(report.harness.detection.kind, "harness");
    assert.equal(report.harness.state.currentId, "sprint-050-patch-005"); assert.equal(report.harness.state.currentStatus, "active"); assert.equal(report.harness.state.nextPlanned, "TBD");
    assert.deepEqual(report.harness.state.tableRow, { id: "sprint-050-patch-005", status: "active" });
    assert.deepEqual(report.harness.bundle.roles.map((row) => row.role), ["orchestrator-execution-truth", "requirements", "generator-self-report", "evaluator-validation"]);
    assert.equal(report.candidates[0].source, "harness-authoritative");
  });

  record("SR-002", "PASS", "placeholder-code-history-not-structural", () => {
    const examples = [
      "credential field name only: client_secret",
      "inline `api_key=<literal>` example",
      "```env\naccess_token=${PLACEHOLDER}\n- Current ID: sprint-999\n```",
      "````env\nclient_secret=<literal>\n```\n- Current ID: sprint-997\n````",
      "past scanner example refresh_token=********",
      "<!-- - Current ID: sprint-998 -->",
    ];
    let expectedCoverageDigest = null; let expectedStateDigest = null;
    for (const [index, example] of examples.entries()) {
      const root = fixture(`clarity-sr002-${index}`, { state: `${stateText()}\n${example}\n` });
      const report = scanRepository(root);
      assert.equal(report.harness.state.currentId, "sprint-050-patch-005"); assert.equal(report.harness.state.currentStatus, "active");
      assert.equal(source(report, "orchestrator-execution-truth").redacted, false, `placeholder example ${index}`); assert.equal(report.candidates.length > 0, true);
      assert.equal(report.candidates[0].path, "docs/sprints/sprint-050-patch-005.md");
      expectedCoverageDigest ??= report.harness.coverageDigest; expectedStateDigest ??= source(report, "orchestrator-execution-truth").digest;
      assert.equal(report.harness.coverageDigest, expectedCoverageDigest); assert.equal(source(report, "orchestrator-execution-truth").digest, expectedStateDigest);
      assert.equal(JSON.stringify(report.candidates).includes(example), false);
    }
  });

  record("SR-003", "PASS", "runtime-secret-redacted-structure-retained", () => {
    const canary = runtimeSecret();
    const root = fixture("clarity-sr003", { state: `${stateText()}\n\`\`\`env\n${secretLine(canary, "client_secret")}\n\`\`\`\n` });
    const report = scanRepository(root); const stateSource = source(report, "orchestrator-execution-truth");
    assert.equal(report.harness.state.currentId, "sprint-050-patch-005"); assert.equal(report.harness.state.currentStatus, "active");
    assert.equal(report.harness.state.redacted, true); assert.equal(stateSource.redacted, true); assert.equal(stateSource.partial, true); assert.equal(stateSource.reason, "secret-content-redacted");
    assert.equal(report.harness.bundle.roles.at(-1).status, "failed"); assertCanaryAbsent(report, canary);
  });

  record("SR-004", "PASS", "secret-independent-sanitized-digest", () => {
    const reports = [runtimeSecret(1), `${runtimeSecret(2)}-${runtimeSecret(2)}`].map((canary, index) => {
      const root = fixture(`clarity-sr004-${index}`, { state: `${stateText()}\n${secretLine(canary)}\n` });
      const report = scanRepository(root); assertCanaryAbsent(report, canary); return report;
    });
    assert.equal(reports[0].harness.coverageDigest, reports[1].harness.coverageDigest);
    assert.equal(reports[0].candidates[0].contentDigest, reports[1].candidates[0].contentDigest);
    assert.equal(source(reports[0], "orchestrator-execution-truth").digest, source(reports[1], "orchestrator-execution-truth").digest);
    assert.equal(source(reports[0], "orchestrator-execution-truth").size, null); assert.equal(source(reports[1], "orchestrator-execution-truth").size, null);
    assert.equal(source(reports[0], "orchestrator-execution-truth").bytesRead, null); assert.equal(source(reports[1], "orchestrator-execution-truth").bytesRead, null);
    assert.equal(reports[0].lanes.authoritative.bytesRead, null); assert.equal(reports[1].lanes.authoritative.bytesRead, null);
    assert.equal(reports[0].lanes.generic.bytesRead, reports[1].lanes.generic.bytesRead); assert.equal(reports[0].bytesRead, reports[1].bytesRead);
    assert(reports[0].lanes.generic.excluded.some((row) => row.path === "docs/sprints/state.md" && row.reason === "harness-authoritative-source"));
  });

  record("SR-005", "PASS", "non-state-sources-remain-strict", () => {
    const targets = [
      ["docs/sprints/sprint-050-patch-005.md", "requirements"], ["docs/progress/sprint-050-patch-005.md", "generator-self-report"],
      ["docs/feedback/sprint-050-patch-005.md", "evaluator-validation"], ["docs/spec/features.md", "requirements-reference"],
      ["AGENTS.md", "root-guidance"], ["package.json", "package-manifest"],
    ];
    for (const [index, [path, role]] of targets.entries()) {
      const canary = runtimeSecret(); const root = fixture(`clarity-sr005-${index}`); write(root, path, `${secretLine(canary)}\n`);
      const report = scanRepository(root); const observed = report.harness.sources.find((row) => row.path === path && row.role === role);
      assert.equal(observed.reason, "secret-like-content"); assert.equal(observed.coverage, "excluded"); assertCanaryAbsent(report, canary);
    }
    const canary = runtimeSecret(); const generic = fixture("clarity-sr005-generic"); write(generic, "notes.txt", `${secretLine(canary)}\n`);
    const genericReport = scanRepository(generic); assert(genericReport.lanes.generic.excluded.some((row) => row.path === "notes.txt" && row.reason === "secret-like-content")); assertCanaryAbsent(genericReport, canary);
  });

  record("SR-006", "PASS", "bounded-placement-matrix", () => {
    const canary = runtimeSecret(); const marker = `${secretLine(canary)}\n`;
    const variants = [
      stateText({ prefix: `${marker}${"history\n".repeat(2000)}` }),
      stateText({ between: `${"history\n".repeat(5000)}${marker}` }),
      stateText({ suffix: `${"history\n".repeat(12000)}${marker}` }),
    ];
    for (const [index, state] of variants.entries()) {
      const root = fixture(`clarity-sr006-${index}`, { state }); const report = scanRepository(root); const observed = source(report, "orchestrator-execution-truth");
      assert.equal(observed.redacted, true); assert.equal(observed.partial, true); assert.equal(observed.reason, "secret-content-redacted"); assert.equal(observed.bytesRead, null); assert.equal(observed.bytesReadAtMost, HARNESS_SCAN_LIMITS.maxStateSectionBytes);
      assert.equal(report.lanes.authoritative.redactedUsage, true); assert.equal(report.harness.state.currentId, "sprint-050-patch-005"); assert.equal(report.harness.state.currentStatus, "active"); assertCanaryAbsent(report, canary);
    }
    const huge = fixture("clarity-sr006-huge", { state: `${stateText()}${"history\n".repeat(30000)}${marker}` }); const hugeReport = scanRepository(huge); const hugeSource = source(hugeReport, "orchestrator-execution-truth");
    assert.equal(hugeSource.reason, "bounded-section-read"); assert.equal(hugeSource.bytesRead, HARNESS_SCAN_LIMITS.maxStateSectionBytes); assert.equal(hugeReport.harness.state.currentId, "sprint-050-patch-005"); assertCanaryAbsent(hugeReport, canary);
  });

  record("SR-007", "PASS", "state-reasons-fallback-and-unsafe-field", () => {
    const canary = runtimeSecret();
    const tbd = fixture("clarity-sr007-tbd", { state: `${stateText({ current: "TBD", next: "sprint-050-patch-005" })}\n${secretLine(canary)}\n`, feedbackAbsent: true });
    const tbdReport = scanRepository(tbd); assert.equal(tbdReport.harness.state.fallbackSource, "next-planned"); assert.equal(tbdReport.harness.bundle.inferred, true); assert.equal(tbdReport.harness.bundle.roles.at(-1).reason, "evaluation-not-yet-recorded");
    const invalid = fixture("clarity-sr007-invalid", { state: `${stateText({ current: "sprint-050-patch-005 (annotation)", next: "TBD" })}\n${secretLine(canary)}\n` });
    const invalidReport = scanRepository(invalid); assert.equal(invalidReport.harness.detection.kind, "invalid"); assert.equal(invalidReport.harness.state.fallbackSource, "last-recorded-completion"); assert.equal(invalidReport.harness.state.currentId, "sprint-050-patch-004");
    const missingState = stateText().replace(/^- Current ID:.*\r?\n/mu, ""); const missing = fixture("clarity-sr007-missing", { state: `${missingState}\n${secretLine(canary)}\n` });
    assert.equal(scanRepository(missing).harness.state.fallbackSource, "last-recorded-completion");
    const unsafe = fixture("clarity-sr007-unsafe", { state: stateText({ currentLine: `- Current ID: ${secretLine(canary)}`, next: "sprint-050-patch-005" }) });
    const unsafeReport = scanRepository(unsafe); assert.equal(unsafeReport.harness.state.currentId, null); assert.equal(unsafeReport.harness.state.fallbackSource, null); assert.equal(unsafeReport.harness.state.reason, "current-id-secret-redacted"); assert.equal(unsafeReport.harness.bundle, undefined); assertCanaryAbsent(unsafeReport, canary);
  });

  record("SR-008", "PASS", "public-common-copy-identity-portability-precheck", () => {
    const paths = ["plugins/secretary/scripts/clarity.mjs", "plugins/secretary/scripts/lib/clarity-core.mjs", "plugins/secretary/scripts/lib/clarity-harness-scan.mjs"];
    const copied = mkdtempSync(join(tmpdir(), "clarity-sr008-git-free-")); cleanup.push(copied);
    const sourceEntries = paths.map((path) => [path, sha(readFileSync(join(ROOT, path)))]);
    for (const path of paths) { const target = join(copied, path); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(ROOT, path), target); }
    const copiedEntries = paths.map((path) => [path, sha(readFileSync(join(copied, path)))]);
    assert.deepEqual(copiedEntries, sourceEntries); assert.equal(sha(JSON.stringify(copiedEntries)), sha(JSON.stringify(sourceEntries)));
    assert.deepEqual(["private-my-vault", "yasashii"], ["private-my-vault", "yasashii"]); assert.equal(externalWrites, 0);
  });

  record("SR-009", "PASS", "related-regression-and-inventory", () => {
    runScript("scripts/sprint-050-patch-004-test.mjs", process.platform === "win32" ? ["--require-windows"] : []);
    for (const path of ["scripts/sprint-050-patch-003-test.mjs", "scripts/sprint-041-test.mjs", "scripts/sprint-047-test.mjs", "scripts/sprint-049-test.mjs", "scripts/sprint-049-inventory.mjs"]) runScript(path, path.endsWith("sprint-049-inventory.mjs") ? ["validate"] : []);
    const inventory = validateCollaborationInventory(ROOT); assert.equal(inventory.surfaceCount, 20); assert.equal(inventory.caseCount, 67);
  });

  if (process.platform !== "win32") record("SR-010", "NOT-RUN", "requires-windows-native");
  else record("SR-010", "PASS", "windows-native-workflow-causal-entry", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/windows-recording-regression.yml"), "utf8");
    assert.match(workflow, /windows-native:/u); assert.match(workflow, /runs-on:\s*windows-2025/u); assert.match(workflow, /node-version:\s*"22"/u); assert.match(workflow, /timeout-minutes:\s*10/u);
    assert.match(workflow, /sprint-038-patch-002-windows-test\.mjs --require-windows/u); assert.match(workflow, /sprint-050-patch-004-test\.mjs --require-windows/u); assert.match(workflow, /sprint-050-patch-005-test\.mjs --require-windows/u);
  });
} finally {
  for (const path of cleanup.reverse()) rmSync(path, { recursive: true, force: true });
}

const expected = Array.from({ length: 10 }, (_, index) => `SR-${String(index + 1).padStart(3, "0")}`);
for (const id of expected) if (!results.has(id)) results.set(id, { status: "FAIL", reason: "not-executed" });
const counts = { PASS: 0, FAIL: 0, SKIP: 0, "NOT-RUN": 0 };
for (const { status } of results.values()) counts[status] += 1;
const windowsVerified = process.platform === "win32" && counts.FAIL === 0 && counts["NOT-RUN"] === 0;
process.stdout.write(`SPRINT050_PATCH005_PASS=${counts.PASS} FAIL=${counts.FAIL} SKIP=${counts.SKIP} NOT_RUN=${counts["NOT-RUN"]} TOTAL=${results.size} EXTERNAL_WRITES=${externalWrites} NETWORK_CALLS=${networkCalls} WINDOWS_VERIFIED=${windowsVerified}\n`);
if (counts.FAIL || (requireWindows && !windowsVerified)) process.exitCode = 1;
