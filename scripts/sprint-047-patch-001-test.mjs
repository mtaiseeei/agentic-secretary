#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repo, "plugins/secretary/scripts/clarity.mjs");
const work = mkdtempSync(join(tmpdir(), "agentic-s047-p001-"));
const base = join(work, "base");
const results = [];
const failureMetrics = [];
const coreSource = readFileSync(join(repo, "plugins/secretary/scripts/lib/clarity-core.mjs"), "utf8");

function run(args, { env = {}, expected = 0, root = repo } = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, CLARITY_TEST_MODE: "1", ...env } });
  if (expected !== null) assert.equal(result.status, expected, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  if (expected === null) return { result, json: null };
  const stream = expected === 0 ? result.stdout : result.stderr;
  return { result, json: JSON.parse(stream) };
}
function lines(path) { return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse); }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function fixture(name) { const root = join(work, name); cpSync(base, root, { recursive: true }); return root; }
function expireLock(root) {
  const path = join(root, ".clarity/lock.json");
  const lock = JSON.parse(readFileSync(path, "utf8"));
  lock.expiresAt = "2000-01-01T00:00:00.000Z";
  writeFileSync(path, `${JSON.stringify(lock)}\n`);
}
function operationRecord(root) {
  const runtime = join(root, ".clarity/runtime");
  const name = readdirSync(runtime).find((entry) => /^operation-[a-f0-9]{24}\.json$/u.test(entry));
  assert(name, "operation progress missing");
  const path = join(runtime, name);
  return { path, record: JSON.parse(readFileSync(path, "utf8")) };
}
function operationResidue(root) {
  const clarity = join(root, ".clarity");
  const direct = readdirSync(clarity).filter((name) => /^\.clarity-op-/u.test(name));
  const runtime = existsSync(join(clarity, "runtime")) ? readdirSync(join(clarity, "runtime")).filter((name) => /^(?:operation-|\.tmp-)/u.test(name)) : [];
  return [...direct, ...runtime];
}
function event(root, id, env = {}, expected = 0) {
  const itemId = JSON.parse(readFileSync(join(root, ".clarity/state.json"), "utf8")).items[0].itemId;
  const eventId = `cv_${createHash("sha256").update(id).digest("hex").slice(0, 20)}`;
  return run(["event", root, "--event-json", JSON.stringify({ eventId, type: "attention.override", itemId, actor: "patch-fixture", occurredAt: "2026-09-01T00:00:00.000Z", payload: { level: "high", reason: `fixture-${id}`, rank: 1 } }), "--json"], { env, expected });
}
async function test(id, title, fn) {
  try { await fn(); results.push({ id, ok: true }); process.stdout.write(`PASS ${id} ${title}\n`); }
  catch (error) { results.push({ id, ok: false }); process.stdout.write(`FAIL ${id} ${title}: ${error?.stack || error}\n`); }
}

try {
  mkdirSync(base);
  writeFileSync(join(base, "README.md"), "# logical write fixture\n");
  run(["init", base, "--apply", "--json"]);

  await test("P001-01", "State canonical transient EPERMを同一logical writeで再試行", () => {
    const root = fixture("transient");
    const before = lines(join(root, ".clarity/events.jsonl")).length;
    const out = event(root, "transient", { CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-replace", target: ".clarity/state.json", times: 2, code: "EPERM", syscall: "rename" }) });
    assert.equal(lines(join(root, ".clarity/events.jsonl")).length, before + 1);
    assert(out.json.writeMetrics.replaceAttempts >= 4);
    assert(out.json.writeMetrics.replaceRetryWaitMs > 0);
    assert(out.json.writeMetrics.lockWaitMarginMs > 0 && out.json.writeMetrics.leaseMarginMs > 0);
    failureMetrics.push({ case: "P001-01", ...out.json.writeMetrics });
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-02", "permanent State失敗は自己appendだけrollbackし残骸0", () => {
    const root = fixture("permanent");
    const events = readFileSync(join(root, ".clarity/events.jsonl"));
    const state = readFileSync(join(root, ".clarity/state.json"));
    const out = event(root, "permanent", { CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-replace", target: ".clarity/state.json", times: 99, code: "EPERM", syscall: "rename" }) }, 4);
    assert.equal(out.json.code, "canonical-write-failed");
    assert(out.json.details.writeMetrics.replaceAttempts >= 8 && out.json.details.writeMetrics.rollbackMs >= 0);
    failureMetrics.push({ case: "P001-02", ...out.json.details.writeMetrics });
    assert.deepEqual(readFileSync(join(root, ".clarity/events.jsonl")), events);
    assert.deepEqual(readFileSync(join(root, ".clarity/state.json")), state);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-03", "最初のcanonical replace前の拒否も残骸0", () => {
    const root = fixture("before-replace");
    const out = event(root, "beforereplace", { CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-replace", target: ".clarity/events.jsonl", times: 99, code: "EACCES", syscall: "rename" }) }, 4);
    assert.equal(out.json.code, "canonical-write-failed");
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-04", "State失敗とrollback失敗のdouble faultをdoctor・明示rebuildで収束", () => {
    const root = fixture("double-fault");
    const failures = [
      { point: "canonical-replace", target: ".clarity/state.json", times: 99, code: "EPERM", syscall: "rename" },
      { point: "canonical-rollback", target: ".clarity/events.jsonl", times: 99, code: "EPERM", syscall: "rename" },
    ];
    const out = event(root, "doublefault", { CLARITY_FS_FAILURES: JSON.stringify(failures) }, 4);
    assert.equal(out.json.code, "canonical-double-fault");
    assert(out.json.details.writeMetrics.replaceAttempts >= 14 && out.json.details.writeMetrics.rollbackMs > 0);
    failureMetrics.push({ case: "P001-04", ...out.json.details.writeMetrics });
    assert(operationResidue(root).some((name) => name.startsWith("operation-")));
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.stateMismatch, true);
    assert(doctor.runtimeCleanup.preserved.some((row) => row.reason === "needs-explicit-rebuild"));
    const rebuilt = run(["rebuild", root, "--json"]).json;
    assert(rebuilt.recoveries.some((row) => row.recovered));
    assert.deepEqual(operationResidue(root), []);
    assert.equal(run(["doctor", root, "--hook-state", "supported", "--json"]).json.stateMismatch, false);
  });

  await test("P001-05", "cleanup failureは非成功・同一operation retryで重複0", () => {
    const root = fixture("cleanup-failure");
    const first = event(root, "cleanupfail", { CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-cleanup", times: 1, code: "EPERM", syscall: "unlink" }) }, 4);
    assert.equal(first.json.code, "canonical-cleanup-incomplete");
    assert.equal(first.json.details.changed, true);
    assert(first.json.details.writeMetrics.cleanupMs >= 0);
    failureMetrics.push({ case: "P001-05", ...first.json.details.writeMetrics });
    const count = lines(join(root, ".clarity/events.jsonl")).length;
    const retry = event(root, "cleanupfail");
    assert.equal(retry.json.changed, false);
    assert.equal(retry.json.recovered, true);
    assert.equal(lines(join(root, ".clarity/events.jsonl")).length, count);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-06", "progress replaceもproduction retry境界を通る", () => {
    const root = fixture("progress-retry");
    const out = event(root, "progressretry", { CLARITY_FS_FAILURES: JSON.stringify({ point: "progress-replace", times: 2, code: "EPERM", syscall: "rename" }) });
    assert(out.json.writeMetrics.replaceAttempts >= 4);
    assert(out.json.writeMetrics.replaceRetryWaitMs > 0);
    failureMetrics.push({ case: "P001-06", ...out.json.writeMetrics });
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-07", "lock record前失敗はinode照合cleanup、cleanup失敗は識別不能lock", () => {
    const cleanRoot = fixture("lock-record-clean");
    const rejected = event(cleanRoot, "lockrecordclean", { CLARITY_FS_FAILURES: JSON.stringify({ point: "lock-record-before", times: 1, code: "EPERM", syscall: "write" }) }, 4);
    assert.equal(rejected.json.code, "canonical-lock-create-failed");
    assert.equal(existsSync(join(cleanRoot, ".clarity/lock.json")), false);

    const dirtyRoot = fixture("lock-record-dirty");
    const failed = event(dirtyRoot, "lockrecorddirty", { CLARITY_FS_FAILURES: JSON.stringify([
      { point: "lock-record-before", times: 1, code: "EPERM", syscall: "write" },
      { point: "lock-record-cleanup", times: 1, code: "EPERM", syscall: "unlink" },
    ]) }, 4);
    assert.equal(failed.json.code, "canonical-lock-record-incomplete");
    const doctor = run(["doctor", dirtyRoot, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    assert(doctor.runtimeCleanup.preserved.some((row) => row.path === ".clarity/lock.json" && row.reason === "ownership-unverified"));
    unlinkSync(join(dirtyRoot, ".clarity/lock.json"));
  });

  await test("P001-08", "event-state間crashをdurable progressから明示rebuild", () => {
    const root = fixture("crash-gap");
    const crashed = event(root, "crashgap", { CLARITY_CRASH_AT: "event-state-between" }, null);
    assert.notEqual(crashed.result.status, 0);
    const lockPath = join(root, ".clarity/lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.expiresAt = "2000-01-01T00:00:00.000Z";
    writeFileSync(lockPath, `${JSON.stringify(lock)}\n`);
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.stateMismatch, true);
    run(["rebuild", root, "--json"]);
    assert.equal(run(["doctor", root, "--hook-state", "supported", "--json"]).json.stateMismatch, false);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-09", "記録なしorphan tempと外部canaryを自動削除しない", () => {
    const root = fixture("orphan");
    const orphan = join(root, ".clarity/.clarity-op-aaaaaaaaaaaaaaaaaaaaaaaa-events-before.tmp");
    const canary = join(work, "external-canary");
    writeFileSync(orphan, "user-owned\n"); writeFileSync(canary, "unchanged\n");
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    assert(doctor.runtimeCleanup.preserved.some((row) => row.reason === "ownership-unverified-orphan-temp"));
    run(["cleanup", root, "--apply", "--json"]);
    assert.equal(readFileSync(orphan, "utf8"), "user-owned\n");
    assert.equal(readFileSync(canary, "utf8"), "unchanged\n");
  });

  await test("P001-10", "Evidence appendとStateも同一logical writeでretry", () => {
    const root = fixture("evidence-transient");
    const evidencePath = join(root, ".clarity/evidence.jsonl");
    const before = lines(evidencePath);
    const evidence = structuredClone(before[0]);
    evidence.evidenceId = `ce_${createHash("sha256").update("evidence-transient").digest("hex").slice(0, 20)}`;
    evidence.summary = "logical evidence fixture";
    evidence.contentDigest = createHash("sha256").update(evidence.summary).digest("hex");
    evidence.observedAt = "2026-09-01T00:00:00.000Z";
    const out = run(["evidence", root, "--evidence-json", JSON.stringify(evidence), "--json"], { env: { CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-replace", target: ".clarity/state.json", times: 1, code: "EPERM", syscall: "rename" }) } }).json;
    assert.equal(out.changed, true);
    assert.equal(lines(evidencePath).length, before.length + 1);
    assert(out.writeMetrics.replaceRetryWaitMs > 0);
    failureMetrics.push({ case: "P001-10", ...out.writeMetrics });
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-11", "canonical sibling temp後crashとprogress target不一致はfail closed", () => {
    const root = fixture("progress-mismatch");
    const crashed = event(root, "progressmismatch", { CLARITY_CRASH_AT: "canonical-sibling-temp-after" }, null);
    assert.notEqual(crashed.result.status, 0);
    const lockPath = join(root, ".clarity/lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8")); lock.expiresAt = "2000-01-01T00:00:00.000Z"; writeFileSync(lockPath, `${JSON.stringify(lock)}\n`);
    const progressName = readdirSync(join(root, ".clarity/runtime")).find((name) => name.startsWith("operation-"));
    const progressPath = join(root, ".clarity/runtime", progressName);
    const progress = JSON.parse(readFileSync(progressPath, "utf8")); progress.target = ".clarity/evidence.jsonl"; writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
    const rejected = event(root, "progressmismatch", {}, 3);
    assert.equal(rejected.json.code, "operation-progress-invalid");
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert(doctor.runtimeCleanup.preserved.some((row) => ["operation-progress-mismatch", "needs-explicit-rebuild"].includes(row.reason)));
  });

  await test("P001-12", "Windows mode分岐とtest modeなしseam無効をsource contractで固定", () => {
    assert(coreSource.includes('if (process.platform !== "win32") {\n      fail((tempStat.mode & 0o077) === 0'));
    assert(coreSource.includes('if (process.platform === "win32") {\n    try { accessSync(target, constants.W_OK); }'));
    assert(coreSource.includes('if (process.env.CLARITY_TEST_MODE !== "1") return [];'));
    assert(coreSource.includes('if (process.env.CLARITY_TEST_MODE !== "1") return;'));
    assert(!coreSource.includes("tempStat.isFile() && !tempStat.isSymbolicLink() && (tempStat.mode & 0o077) === 0"));
    const root = fixture("test-mode-off");
    const before = lines(join(root, ".clarity/events.jsonl")).length;
    const out = event(root, "testmodeoff", {
      CLARITY_TEST_MODE: "0",
      CLARITY_CRASH_AT: "lock-record-before",
      CLARITY_FS_FAILURES: JSON.stringify({ point: "canonical-replace", target: ".clarity/events.jsonl", times: 99, code: "EPERM", syscall: "rename" }),
    });
    assert.equal(out.json.changed, true);
    assert.equal(lines(join(root, ".clarity/events.jsonl")).length, before + 1);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-13", "State先行の偽造progressは任意appendをroll-forwardせずfail closed", () => {
    const root = fixture("forged-state-ahead");
    const crashed = event(root, "forgedstateahead", { CLARITY_CRASH_AT: "canonical-sibling-temp-after" }, null);
    assert.notEqual(crashed.result.status, 0);
    expireLock(root);
    const { path: progressPath, record } = operationRecord(root);
    const canonicalPath = join(root, record.canonical.rel);
    const statePath = join(root, record.state.rel);
    const forgedAppend = Buffer.concat([readFileSync(canonicalPath), Buffer.from("forged-unvalidated-bytes\n", "utf8")]);
    writeFileSync(join(root, record.canonical.after), forgedAppend);
    record.canonical.afterDigest = digest(forgedAppend);
    writeFileSync(progressPath, `${JSON.stringify(record, null, 2)}\n`);
    writeFileSync(statePath, readFileSync(join(root, record.state.after)));
    const canary = join(work, "forged-state-canary");
    writeFileSync(canary, "unchanged\n");
    const before = {
      canonical: readFileSync(canonicalPath), state: readFileSync(statePath),
      progress: readFileSync(progressPath), canary: readFileSync(canary),
    };
    const rejected = run(["rebuild", root, "--json"], { expected: 3 });
    assert.equal(rejected.json.code, "operation-progress-mismatch");
    assert.deepEqual(readFileSync(canonicalPath), before.canonical);
    assert.deepEqual(readFileSync(statePath), before.state);
    assert.deepEqual(readFileSync(progressPath), before.progress);
    assert.deepEqual(readFileSync(canary), before.canary);
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    assert(doctor.runtimeCleanup.preserved.some((row) => row.reason === "needs-explicit-rebuild"));
  });

  await test("P001-14", "lock record確定前の実process killは識別不能lockを自動削除しない", () => {
    const root = fixture("lock-record-crash");
    const canonicalPaths = ["events.jsonl", "evidence.jsonl", "state.json"].map((name) => join(root, ".clarity", name));
    const before = canonicalPaths.map((path) => readFileSync(path));
    const crashed = event(root, "lockrecordcrash", { CLARITY_CRASH_AT: "lock-record-before" }, null);
    assert.notEqual(crashed.result.status, 0);
    assert.equal(readFileSync(join(root, ".clarity/lock.json")).length, 0);
    canonicalPaths.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]));
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    assert(doctor.runtimeCleanup.preserved.some((row) => row.path === ".clarity/lock.json" && row.reason === "ownership-unverified"));
    const cleanup = run(["cleanup", root, "--apply", "--json"]).json;
    assert.equal(cleanup.changed, false);
    assert.deepEqual(cleanup.removed, []);
    assert.equal(existsSync(join(root, ".clarity/lock.json")), true);
    unlinkSync(join(root, ".clarity/lock.json"));
    const recovered = event(root, "lockrecordcrash");
    assert.equal(recovered.json.changed, true);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-15", "rollback成功後progress失敗はdouble faultと誤表示せず明示回復", () => {
    const root = fixture("rollback-progress-failure");
    const canonicalPath = join(root, ".clarity/events.jsonl");
    const statePath = join(root, ".clarity/state.json");
    const before = { canonical: readFileSync(canonicalPath), state: readFileSync(statePath) };
    const failures = [
      { point: "event-state-between", times: 1, code: "EPERM", syscall: "rename" },
      { point: "progress-replace", after: 2, times: 99, code: "EPERM", syscall: "rename" },
    ];
    const rejected = event(root, "rollbackprogress", { CLARITY_FS_FAILURES: JSON.stringify(failures) }, 4);
    assert.equal(rejected.json.code, "canonical-rollback-record-incomplete");
    assert.equal(rejected.json.details.changed, false);
    assert.equal(rejected.json.details.stage, "rolled-back");
    assert.deepEqual(readFileSync(canonicalPath), before.canonical);
    assert.deepEqual(readFileSync(statePath), before.state);
    assert(operationResidue(root).some((name) => name.startsWith("operation-")));
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    const rebuilt = run(["rebuild", root, "--json"]).json;
    assert(rebuilt.recoveries.some((row) => row.recovered && row.rolledForward === false));
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-16", "明示rebuildのState replaceもbounded retryし恒久失敗で残骸0", () => {
    const transientRoot = fixture("rebuild-transient");
    writeFileSync(join(transientRoot, ".clarity/state.json"), "{broken\n");
    const transient = run(["rebuild", transientRoot, "--json"], { env: { CLARITY_FS_FAILURES: JSON.stringify({ point: "state-rebuild-replace", target: ".clarity/state.json", times: 2, code: "EPERM", syscall: "rename" }) } }).json;
    assert.equal(transient.changed, true);
    assert(transient.writeMetrics.replaceAttempts >= 3 && transient.writeMetrics.replaceRetryWaitMs > 0);
    assert.deepEqual(operationResidue(transientRoot), []);

    const permanentRoot = fixture("rebuild-permanent");
    const statePath = join(permanentRoot, ".clarity/state.json");
    writeFileSync(statePath, "{still-broken\n");
    const before = readFileSync(statePath);
    const permanent = run(["rebuild", permanentRoot, "--json"], { env: { CLARITY_FS_FAILURES: JSON.stringify({ point: "state-rebuild-replace", target: ".clarity/state.json", times: 99, code: "EPERM", syscall: "rename" }) }, expected: 4 });
    assert.equal(permanent.json.code, "canonical-write-failed");
    assert.deepEqual(readFileSync(statePath), before);
    assert.deepEqual(operationResidue(permanentRoot), []);
    run(["rebuild", permanentRoot, "--json"]);
  });

  await test("P001-17", "commit後progress失敗はchanged trueで実canonicalと一致", () => {
    const root = fixture("post-commit-progress-failure");
    const before = lines(join(root, ".clarity/events.jsonl")).length;
    const rejected = event(root, "postcommitprogress", { CLARITY_FS_FAILURES: JSON.stringify({ point: "progress-replace", after: 2, times: 99, code: "EPERM", syscall: "rename" }) }, 4);
    assert.equal(rejected.json.code, "canonical-transaction-incomplete");
    assert.equal(rejected.json.details.changed, true);
    assert.equal(lines(join(root, ".clarity/events.jsonl")).length, before + 1);
    assert.equal(JSON.parse(readFileSync(join(root, ".clarity/state.json"), "utf8")).source.eventCount, before + 1);
    const retry = event(root, "postcommitprogress");
    assert.equal(retry.json.changed, false);
    assert.equal(retry.json.recovered, true);
    assert.deepEqual(operationResidue(root), []);
  });

  await test("P001-18", "破損progressはdoctorでownership-unverifiedと次Actionを返す", () => {
    const root = fixture("corrupt-progress");
    const crashed = event(root, "corruptprogress", { CLARITY_CRASH_AT: "canonical-sibling-temp-after" }, null);
    assert.notEqual(crashed.result.status, 0);
    const { path: progressPath } = operationRecord(root);
    writeFileSync(progressPath, "not-json\n");
    const canary = join(work, "corrupt-progress-canary"); writeFileSync(canary, "unchanged\n");
    const before = [readFileSync(join(root, ".clarity/events.jsonl")), readFileSync(join(root, ".clarity/state.json")), readFileSync(canary)];
    const doctor = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert.equal(doctor.runtimeCleanup.status, "confirmation-required");
    assert(doctor.runtimeCleanup.preserved.some((row) => row.reason === "ownership-unverified"));
    assert.match(doctor.nextAction, /回復|rebuild|確認/u);
    const cleanup = run(["cleanup", root, "--apply", "--json"]).json;
    assert.equal(cleanup.changed, false);
    assert.deepEqual([readFileSync(join(root, ".clarity/events.jsonl")), readFileSync(join(root, ".clarity/state.json")), readFileSync(canary)], before);
  });

  await test("P001-19", "commit後lock release失敗は非成功・doctor・明示cleanupで回復", () => {
    const root = fixture("lock-release-cleanup-failure");
    const eventsPath = join(root, ".clarity/events.jsonl");
    const before = lines(eventsPath).length;
    const rejected = event(root, "lockreleasecleanup", { CLARITY_FS_FAILURES: JSON.stringify({ point: "lock-release-cleanup", times: 1, code: "EPERM", syscall: "unlink" }) }, 4);
    assert.equal(rejected.json.code, "canonical-release-incomplete");
    assert.equal(rejected.json.details.changed, true);
    assert.equal(lines(eventsPath).length, before + 1);
    const lockPath = join(root, ".clarity/lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    assert.equal(lock.owner, "agentic-secretary:clarity");
    const doctorActive = run(["doctor", root, "--hook-state", "supported", "--json"]).json;
    assert(doctorActive.runtimeCleanup.preserved.some((row) => row.path === ".clarity/lock.json" && row.reason === "active-or-unverified"));
    lock.expiresAt = "2000-01-01T00:00:00.000Z";
    writeFileSync(lockPath, `${JSON.stringify(lock)}\n`);
    const cleanup = run(["cleanup", root, "--apply", "--json"]).json;
    assert.equal(cleanup.changed, true);
    assert(cleanup.removed.includes(".clarity/lock.json"));
    const retry = event(root, "lockreleasecleanup");
    assert.equal(retry.json.changed, false);
    assert.equal(lines(eventsPath).length, before + 1);
    assert.deepEqual(operationResidue(root), []);
  });
} finally {
  const failed = results.filter((row) => !row.ok);
  process.stdout.write(`${JSON.stringify({ suite: "sprint-047-patch-001", cases: results.length, passed: results.length - failed.length, failed: failed.length, platform: process.platform, failureMetrics }, null, 2)}\n`);
  rmSync(work, { recursive: true, force: true });
  assert.equal(failed.length, 0, `failed: ${failed.map((row) => row.id).join(", ")}`);
}
