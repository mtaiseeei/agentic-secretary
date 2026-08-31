#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { previewInit, scanRepository } from "../plugins/secretary/scripts/lib/clarity-core.mjs";
import { HARNESS_SCAN_LIMITS } from "../plugins/secretary/scripts/lib/clarity-harness-scan.mjs";
import { validateCollaborationInventory } from "./lib/sprint-049-inventory.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TARGET_ID = "sprint-050-patch-005";
const ALLOWED_TARGET_STATUSES = new Set(["active", "awaiting-eval", "done"]);
const ALLOWED_CURRENT_STATUSES = new Set(["active", "awaiting-eval", "done", "done-by-user-decision"]);
const HARNESS_ID_PATTERN = /^sprint-\d{3}(?:-patch-\d{3})?$/u;
const CHILD_DIAGNOSTIC_STREAM_BYTES = 8 * 1024;
const CHILD_DIAGNOSTIC_ERROR_BYTES = 1024;
const CASE_FAILURE_DIAGNOSTIC_BYTES = CHILD_DIAGNOSTIC_STREAM_BYTES * 2 + 4 * 1024;
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
function structuralStateLines(body) {
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  const structural = [];
  let fence = null;
  let inComment = false;
  for (const rawLine of lines) {
    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/u);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.char && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = { char: fenceMatch[1][0], length: fenceMatch[1].length };
      continue;
    }
    let line = rawLine;
    while (line.length > 0) {
      if (inComment) {
        const end = line.indexOf("-->");
        if (end < 0) { line = ""; break; }
        line = line.slice(end + 3); inComment = false;
        continue;
      }
      const start = line.indexOf("<!--");
      if (start < 0) break;
      const end = line.indexOf("-->", start + 4);
      if (end < 0) { line = line.slice(0, start); inComment = true; break; }
      line = `${line.slice(0, start)}${line.slice(end + 3)}`;
    }
    // Structural state fields and rows never need inline code. Ignoring such
    // lines prevents historical examples from becoming the test oracle.
    if (!line.includes("`") && !line.includes("~")) structural.push(line.trim());
  }
  return structural;
}
function trackedLifecycle(root) {
  const body = readFileSync(join(root, "docs/sprints/state.md"), "utf8");
  const lines = structuralStateLines(body);
  const currentValues = lines.flatMap((line) => line.match(/^- Current ID:\s*(\S+)\s*$/u)?.[1] || []);
  const nextValues = lines.flatMap((line) => line.match(/^- Next Planned:\s*(\S+)\s*$/u)?.[1] || []);
  const rows = lines.flatMap((line) => {
    const match = line.match(/^\|\s*(sprint-\d{3}(?:-patch-\d{3})?)\s*\|\s*([a-z-]+)\s*\|/u);
    return match ? [{ id: match[1], status: match[2] }] : [];
  });
  assert.equal(currentValues.length, 1, "tracked state must declare exactly one structural Current ID");
  assert.equal(nextValues.length, 1, "tracked state must declare exactly one structural Next Planned");
  const declaredCurrentId = currentValues[0];
  assert.equal(declaredCurrentId === "TBD" || HARNESS_ID_PATTERN.test(declaredCurrentId), true, "tracked Current ID must be a canonical Sprint ID or final TBD");
  const selectedRows = declaredCurrentId === "TBD"
    ? rows.filter(({ status }) => ["done", "done-by-user-decision"].includes(status)).slice(-1)
    : rows.filter(({ id }) => id === declaredCurrentId);
  assert.equal(selectedRows.length, 1, "tracked state must contain exactly one row for the structurally selected Current Sprint");
  const { id: currentId, status } = selectedRows[0];
  assert.equal(ALLOWED_CURRENT_STATUSES.has(status), true, "tracked Current status must stay in an executable or completed Harness lifecycle");
  if (declaredCurrentId === "TBD") {
    assert.equal(nextValues[0], "TBD", "final TBD must not infer the target from Next Planned");
    assert.equal(["done", "done-by-user-decision"].includes(status), true, "final TBD fallback must select the last recorded completion");
  }
  for (const path of [`docs/sprints/${currentId}.md`, `docs/progress/${currentId}.md`]) {
    assert.equal(existsSync(join(root, path)), true, `tracked Current Sprint must retain ${path}`);
  }
  return {
    declaredCurrentId,
    currentId,
    status,
    nextPlanned: nextValues[0],
    fallbackSource: declaredCurrentId === "TBD" ? "last-recorded-completion" : null,
    inferred: declaredCurrentId === "TBD",
    executionStatus: status === "active" ? "in_progress" : "implemented",
  };
}
function expectedEvaluatorStatus(root, currentId = TARGET_ID) {
  const path = join(root, "docs/feedback", `${currentId}.md`);
  if (!existsSync(path)) return "not-recorded";
  const body = readFileSync(path, "utf8");
  if (/\bVerdict:\s*\*\*PASS\*\*|\bVerdict:\s*PASS\b/iu.test(body)) return "passed";
  if (/\bVerdict:\s*\*\*FAIL\*\*|\bVerdict:\s*FAIL\b/iu.test(body)) return "failed";
  if (/verification-scope-issue/iu.test(body)) return "verification-scope-issue";
  return "recorded-unclassified";
}
function assertLifecycleReport(report, expected, evaluatorStatus = "not-recorded") {
  const { state, bundle } = report.harness;
  assert.equal(state.currentId, expected.currentId);
  assert.equal(state.declaredCurrentId, expected.declaredCurrentId);
  assert.equal(state.currentStatus, expected.status);
  assert.equal(state.nextPlanned, expected.nextPlanned);
  assert.deepEqual(state.tableRow, { id: expected.currentId, status: expected.status });
  assert.equal(state.fallbackSource, expected.fallbackSource);
  assert.equal(state.inferred, expected.inferred);
  assert.equal(state.sourceSection, "sprint-table-row");

  assert.equal(bundle.currentId, expected.currentId);
  assert.equal(bundle.declaredCurrentId, expected.declaredCurrentId);
  assert.equal(bundle.currentStatus, expected.status);
  assert.equal(bundle.nextPlanned, expected.nextPlanned);
  assert.equal(bundle.fallbackSource, expected.fallbackSource);
  assert.equal(bundle.inferred, expected.inferred);
  assert.deepEqual(bundle.roles.map(({ path, role }) => ({ path, role })), [
    { path: "docs/sprints/state.md", role: "orchestrator-execution-truth" },
    { path: `docs/sprints/${expected.currentId}.md`, role: "requirements" },
    { path: `docs/progress/${expected.currentId}.md`, role: "generator-self-report" },
    { path: `docs/feedback/${expected.currentId}.md`, role: "evaluator-validation" },
  ]);
  assert.equal(bundle.roles[0].status, expected.status);
  assert.equal(bundle.roles[1].status, "available");
  assert.equal(bundle.roles[2].status, "available");
  assert.equal(bundle.roles[3].status, evaluatorStatus);
  if (evaluatorStatus === "not-recorded") {
    assert.equal(bundle.roles[3].coverage, "not-found");
    assert.equal(bundle.roles[3].reason, "evaluation-not-yet-recorded");
  } else {
    assert.equal(bundle.roles[3].coverage, "inspected");
  }

  const candidate = report.candidates.find((row) => row.kind === "harness-current" && row.source === "harness-authoritative");
  assert(candidate, "authoritative Current candidate must exist");
  assert.equal(report.candidates[0], candidate, "authoritative Current candidate must retain priority");
  assert.equal(candidate.path, `docs/sprints/${expected.currentId}.md`);
  assert.equal(candidate.executionStatus, expected.executionStatus);
  assert.equal(candidate.validationStatus, ["passed", "failed"].includes(evaluatorStatus) ? evaluatorStatus : "unknown");
  assert.equal(candidate.evidenceLocator.path, "docs/sprints/state.md");
  assert.equal(candidate.evidenceLocator.currentSprint, expected.currentId);
  assert.equal(candidate.evidenceLocator.sources, bundle.roles.map((row) => row.path).join(","));
  assert.deepEqual(candidate.harnessBundle, bundle);
}
function assertCanaryAbsent(report, canary) {
  const body = JSON.stringify(report);
  assert.equal(body.includes(canary), false, "runtime canary must not be returned");
  assert.equal(body.includes(sha(canary)), false, "runtime canary raw digest must not be returned");
  for (const fragment of [canary.slice(0, 6), canary.slice(-6)]) assert.equal(body.includes(fragment), false, "runtime canary fragment must not be returned");
}
function replaceDiagnosticRoot(value, absolute, placeholder) {
  const normalized = absolute.replaceAll("\\", "/");
  const fileUrl = `file://${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  return [...new Set([absolute, normalized, fileUrl])]
    .sort((left, right) => right.length - left.length)
    .reduce((body, variant) => body.split(variant).join(placeholder), value);
}
function sanitizeDiagnosticText(value) {
  let body = String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  body = replaceDiagnosticRoot(body, ROOT, "<repo-root>");
  body = replaceDiagnosticRoot(body, tmpdir(), "<tmp-root>");
  body = body.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "?");
  body = body.replace(/\bBearer\s+[^\s,;]+/giu, "Bearer <redacted>");
  body = body.replace(/((?:["'])?(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|authorization|password|secret|token)(?:["'])?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,}\]]+)/giu, "$1<redacted>");
  body = body.replace(/\b[a-f0-9]{40,128}\b/giu, "<redacted-digest>");
  body = body.replace(/\b[A-Za-z0-9_-]{30,}\b/gu, (token) => {
    const looksOpaque = /[A-Z]/u.test(token) && (/[a-z]/u.test(token) || /\d/u.test(token));
    return looksOpaque && !token.startsWith("SPRINT") ? "<redacted-opaque>" : token;
  });
  body = body.replace(/^(\s*(?:actual|expected)\s*:).+$/gimu, "$1 <redacted-assert-value>");
  body = body.replace(/^(\s*[+-])\s+(?:'[^'\n]*'|"[^"\n]*"|`[^`\n]*`)\s*$/gmu, "$1 <redacted-assert-value>");
  return body;
}
function boundDiagnosticText(value, maxBytes) {
  const body = sanitizeDiagnosticText(value);
  if (Buffer.byteLength(body) <= maxBytes) return body;
  const suffix = "\n<truncated>";
  const bodyBudget = maxBytes - Buffer.byteLength(suffix);
  let used = 0;
  let prefix = "";
  for (const character of body) {
    const size = Buffer.byteLength(character);
    if (used + size > bodyBudget) break;
    prefix += character;
    used += size;
  }
  return `${prefix}${suffix}`;
}
function childRunDiagnostic(path, result) {
  if (result.status === 0 && !result.signal && !result.error) return null;
  const errorCode = result.error && typeof result.error === "object" && "code" in result.error ? result.error.code : null;
  const errorValue = result.error
    ? `${result.error instanceof Error ? result.error.name : "Error"}${errorCode ? `(${errorCode})` : ""}: ${result.error instanceof Error ? result.error.message : String(result.error)}`
    : "none";
  const stdout = boundDiagnosticText(result.stdout, CHILD_DIAGNOSTIC_STREAM_BYTES) || "<empty>";
  const stderr = boundDiagnosticText(result.stderr, CHILD_DIAGNOSTIC_STREAM_BYTES) || "<empty>";
  return [
    `${path} regression failed`,
    `path=${String(path).replaceAll("\\", "/")}`,
    `status=${result.status ?? "null"}`,
    `signal=${result.signal ?? "none"}`,
    `error=${boundDiagnosticText(errorValue, CHILD_DIAGNOSTIC_ERROR_BYTES)}`,
    "stdout<<",
    stdout,
    ">>stdout",
    "stderr<<",
    stderr,
    ">>stderr",
  ].join("\n");
}
function assertChildRunDiagnosticFormatting() {
  assert.equal(childRunDiagnostic("scripts/helper-success.mjs", { status: 0, signal: null, error: undefined, stdout: "quiet", stderr: "" }), null);
  const canary = runtimeSecret();
  const lowEntropyCanary = runtimeSecret(1);
  const assertCanary = runtimeSecret(2);
  const rawDigest = sha(canary);
  const diagnostic = childRunDiagnostic("scripts/helper-failure.mjs", {
    status: 1,
    signal: "SIGTERM",
    error: Object.assign(new Error(`failed at ${join(ROOT, "scripts/helper-failure.mjs")}`), { code: "ETEST" }),
    stdout: `PASS helper\napi_token=${canary}\nactual: ${lowEntropyCanary}\n${rawDigest}\n${"x".repeat(CHILD_DIAGNOSTIC_STREAM_BYTES * 2)}`,
    stderr: `at ${join(tmpdir(), "helper-fixture", "child.mjs")}\n+ '${assertCanary}'\n`,
  });
  assert(diagnostic);
  for (const expected of ["path=scripts/helper-failure.mjs", "status=1", "signal=SIGTERM", "error=Error(ETEST)", "<repo-root>", "<tmp-root>", "<redacted>", "<redacted-digest>", "<redacted-assert-value>", "<truncated>"]) assert.equal(diagnostic.includes(expected), true, expected);
  for (const excluded of [canary, lowEntropyCanary, assertCanary, rawDigest, ROOT, tmpdir()]) assert.equal(diagnostic.includes(excluded), false, "diagnostic must sanitize sensitive or unstable values");
  const stdout = diagnostic.match(/stdout<<\n([\s\S]*?)\n>>stdout/u)?.[1] ?? "";
  const stderr = diagnostic.match(/stderr<<\n([\s\S]*?)\n>>stderr/u)?.[1] ?? "";
  assert.equal(Buffer.byteLength(stdout) <= CHILD_DIAGNOSTIC_STREAM_BYTES, true);
  assert.equal(Buffer.byteLength(stderr) <= CHILD_DIAGNOSTIC_STREAM_BYTES, true);
}
function runScript(path, args = []) {
  const result = spawnSync(process.execPath, [join(ROOT, path), ...args], { cwd: ROOT, encoding: "utf8", shell: false, timeout: 240_000, maxBuffer: 32 * 1024 * 1024 });
  const diagnostic = childRunDiagnostic(path, result);
  if (diagnostic) throw new Error(diagnostic);
}
function record(id, status, reason, action = null) {
  try {
    if (action) action();
    results.set(id, { status, reason });
    process.stdout.write(`${status} ${id} ${reason}\n`);
  } catch (error) {
    results.set(id, { status: "FAIL", reason: error instanceof Error ? error.message : String(error) });
    process.stderr.write(`FAIL ${id} ${boundDiagnosticText(error instanceof Error ? error.stack : String(error), CASE_FAILURE_DIAGNOSTIC_BYTES)}\n`);
  }
}

try {
  record("SR-001", "PASS", "current-public-source-structured-state", () => {
    const expected = trackedLifecycle(ROOT);
    const evaluatorStatus = expectedEvaluatorStatus(ROOT, expected.currentId);
    if (expected.status === "done") assert.equal(evaluatorStatus, "passed", "completed tracked state requires a PASS evaluation");
    const preview = previewInit(ROOT); const report = preview.scan;
    assert.equal(preview.initialized, false); assert.equal(report.harness.detection.kind, "harness");
    assertLifecycleReport(report, expected, evaluatorStatus);

    const lifecycleFixtures = [
      { name: "active", state: stateText({ status: "active" }), executionStatus: "in_progress", fallbackSource: null, inferred: false, declaredCurrentId: TARGET_ID, status: "active", nextPlanned: "TBD", currentId: TARGET_ID },
      { name: "awaiting", state: stateText({ status: "awaiting-eval" }), executionStatus: "implemented", fallbackSource: null, inferred: false, declaredCurrentId: TARGET_ID, status: "awaiting-eval", nextPlanned: "TBD", currentId: TARGET_ID },
      { name: "done-declared", state: stateText({ status: "done" }), executionStatus: "implemented", fallbackSource: null, inferred: false, declaredCurrentId: TARGET_ID, status: "done", nextPlanned: "TBD", currentId: TARGET_ID },
      { name: "done-fallback", state: stateText({ current: "TBD", next: "TBD", status: "done" }), executionStatus: "implemented", fallbackSource: "last-recorded-completion", inferred: true, declaredCurrentId: "TBD", status: "done", nextPlanned: "TBD", currentId: TARGET_ID },
    ];
    for (const lifecycle of lifecycleFixtures) {
      assert.equal(ALLOWED_TARGET_STATUSES.has(lifecycle.status), true, "Patch 005 synthetic lifecycle must retain its contracted statuses");
      if (lifecycle.declaredCurrentId === "TBD") assert.equal(lifecycle.status, "done", "Patch 005 final TBD fixture must retain the completed target");
      const root = fixture(`clarity-sr001-${lifecycle.name}`, { state: lifecycle.state, feedbackAbsent: true });
      assertLifecycleReport(scanRepository(root), lifecycle);
    }

    const futureId = "sprint-051-patch-001";
    const future = fixture("clarity-sr001-future-current", {
      state: stateText({ current: futureId, status: "done" }).replace(
        "| sprint-050-patch-005 | done | x | x | x |",
        `| sprint-050-patch-005 | done | x | x | x |\r\n| ${futureId} | active | x | x | - |`,
      ),
      feedbackAbsent: true,
    });
    write(future, `docs/sprints/${futureId}.md`, "# Future requirements\n");
    write(future, `docs/progress/${futureId}.md`, "# Future generator self report\n");
    const futureExpected = trackedLifecycle(future);
    assert.deepEqual(futureExpected, {
      declaredCurrentId: futureId,
      currentId: futureId,
      status: "active",
      nextPlanned: "TBD",
      fallbackSource: null,
      inferred: false,
      executionStatus: "in_progress",
    });
    assertLifecycleReport(scanRepository(future), futureExpected);

    const invalidId = fixture("clarity-sr001-invalid-current", { state: stateText({ current: "future-current" }) });
    assert.throws(() => trackedLifecycle(invalidId), /canonical Sprint ID/u);
    const missingRow = fixture("clarity-sr001-missing-row", { state: stateText({ current: futureId }) });
    assert.throws(() => trackedLifecycle(missingRow), /exactly one row/u);
    const missingFiles = fixture("clarity-sr001-missing-files", {
      state: stateText({ current: futureId }).replace(
        "| sprint-050-patch-005 | active | x | x | x |",
        `| sprint-050-patch-005 | done | x | x | x |\r\n| ${futureId} | active | x | x | - |`,
      ),
    });
    assert.throws(() => trackedLifecycle(missingFiles), /must retain docs\/sprints/u);
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
    assertChildRunDiagnosticFormatting();
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
