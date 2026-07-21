#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ISOLATION_INSPECTED_TARGETS,
  loadHostMatrix,
  readJson,
  summarizeHostRecords,
  unavailableRecords,
  validateHostRecord,
} from "./lib/agentic-hosts.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pluginSource = join(root, "plugins/secretary");
const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const hostId = value("--host");
const approvalPath = value("--approval");
const outputPath = value("--output");
const loaded = loadHostMatrix(root);

if (!hostId || !loaded.entries.has(hostId)) {
  process.stderr.write("usage: agentic-live-host-gate.mjs --host <required-host-id> [--approval <approval.json> --output <new-result.json>]\n");
  process.exit(2);
}

const entry = loaded.entries.get(hostId);
const unavailable = unavailableRecords(loaded).find((record) => record.hostId === hostId);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SECRET_VALUE = /(?:Bearer\s+[A-Za-z0-9._~+\/-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:token|secret|password|credential|authorization)["'\s:=]+[A-Za-z0-9._-]{8,})/i;
const PERMISSION_MODES = new Set(["host-path-scoped-permission", "os-sandbox"]);

function print(record) {
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

function exactKeys(object, required, label) {
  if (!object || typeof object !== "object" || Array.isArray(object)) throw new Error(`${label} must be an object`);
  for (const key of required) if (!Object.hasOwn(object, key)) throw new Error(`${label} missing required field: ${key}`);
  for (const key of Object.keys(object)) if (!required.includes(key)) throw new Error(`${label} has unknown field: ${key}`);
}

function timestamp(input, label) {
  if (typeof input !== "string" || !ISO_TIMESTAMP.test(input) || Number.isNaN(Date.parse(input))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`);
  }
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walkFiles(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).sort().flatMap((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? walkFiles(item) : [item];
  });
}

function inventoryDigest(path) {
  const digest = createHash("sha256");
  for (const file of walkFiles(path)) {
    digest.update(`${relative(path, file)}:${sha256File(file)}\n`);
  }
  return digest.digest("hex");
}

function makeTreeReadOnly(path) {
  for (const file of walkFiles(path)) chmodSync(file, 0o444);
  const directories = [];
  const collect = (dir) => {
    directories.push(dir);
    for (const name of readdirSync(dir)) {
      const item = join(dir, name);
      if (statSync(item).isDirectory()) collect(item);
    }
  };
  collect(path);
  for (const directory of directories.reverse()) chmodSync(directory, 0o555);
}

function makeTreeWritable(path) {
  if (!existsSync(path)) return;
  chmodSync(path, 0o755);
  for (const name of readdirSync(path)) {
    const item = join(path, name);
    if (statSync(item).isDirectory()) makeTreeWritable(item);
    else chmodSync(item, 0o644);
  }
}

function treeHasWriteBits(path) {
  if (!existsSync(path)) return true;
  if ((statSync(path).mode & 0o222) !== 0) return true;
  return readdirSync(path).some((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? treeHasWriteBits(item) : (statSync(item).mode & 0o222) !== 0;
  });
}

function validateApproval(approval) {
  exactKeys(approval, [
    "schemaVersion", "scope", "approvalId", "approved", "approvedAt", "expiresAt", "hostId", "runner",
    "surface", "approvedChecks", "driver", "isolation", "cleanupPlan",
  ], "approval");
  if (approval.schemaVersion !== 2 || approval.scope !== "agentic-secretary-host-live-gate") {
    throw new Error("invalid approval identity");
  }
  if (approval.approved !== true || typeof approval.approvalId !== "string" || approval.approvalId.trim() === "") {
    throw new Error("approval must be explicit and carry an approvalId");
  }
  if (approval.hostId !== hostId || approval.runner !== entry.adapter.runner || approval.surface !== entry.surface) {
    throw new Error("approval host, runner, or surface does not match the selected adapter");
  }
  timestamp(approval.approvedAt, "approval.approvedAt");
  timestamp(approval.expiresAt, "approval.expiresAt");
  if (Date.parse(approval.expiresAt) <= Date.now() || Date.parse(approval.expiresAt) <= Date.parse(approval.approvedAt)) {
    throw new Error("approval is expired or has an invalid time range");
  }
  if (!Array.isArray(approval.approvedChecks)
    || JSON.stringify([...approval.approvedChecks].sort()) !== JSON.stringify([...loaded.matrix.requiredChecks].sort())) {
    throw new Error("approval must explicitly cover the twelve required host checks");
  }
  if (typeof approval.cleanupPlan !== "string" || approval.cleanupPlan.trim() === "") throw new Error("approval.cleanupPlan is required");

  exactKeys(approval.driver, ["command", "args", "executableSha256", "artifacts"], "approval.driver");
  if (!isAbsolute(approval.driver.command) || !existsSync(approval.driver.command)) {
    throw new Error("approval.driver.command must be an existing absolute executable path");
  }
  if (!/^[a-f0-9]{64}$/.test(approval.driver.executableSha256)
    || sha256File(approval.driver.command) !== approval.driver.executableSha256) {
    throw new Error("approval.driver.executableSha256 does not match the executable bytes");
  }
  if (!Array.isArray(approval.driver.args) || approval.driver.args.some((item) => typeof item !== "string")) {
    throw new Error("approval.driver.args must be an array of strings");
  }
  if (SECRET_VALUE.test(JSON.stringify(approval.driver.args))) {
    throw new Error("approval.driver.args must not contain credentials or secret values");
  }
  if (!Array.isArray(approval.driver.artifacts)) throw new Error("approval.driver.artifacts must be an array");
  const artifacts = new Map();
  for (const [index, artifact] of approval.driver.artifacts.entries()) {
    exactKeys(artifact, ["path", "sha256"], `approval.driver.artifacts[${index}]`);
    if (!isAbsolute(artifact.path) || !existsSync(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
      throw new Error(`approval.driver.artifacts[${index}] must identify existing bytes by absolute path and SHA-256`);
    }
    if (artifacts.has(artifact.path) || sha256File(artifact.path) !== artifact.sha256) {
      throw new Error(`approval.driver.artifacts[${index}] bytes do not match the approved digest`);
    }
    artifacts.set(artifact.path, artifact.sha256);
  }
  for (const item of approval.driver.args) {
    if (isAbsolute(item) && existsSync(item) && !artifacts.has(item)) {
      throw new Error("every absolute driver artifact argument must be digest-bound in approval.driver.artifacts");
    }
  }

  exactKeys(approval.isolation, [
    "workspaceParent", "syntheticHome", "pluginReadOnly", "pathScopedPermission", "canaryDenial",
    "minimalTools", "inspectedTargets", "cleanupVerified",
  ], "approval.isolation");
  if (!isAbsolute(approval.isolation.workspaceParent) || !existsSync(approval.isolation.workspaceParent)
    || !resolve(approval.isolation.workspaceParent).startsWith("/private/tmp")) {
    throw new Error("approval.isolation.workspaceParent must be an existing temporary directory under /private/tmp");
  }
  exactKeys(approval.isolation.syntheticHome, ["required", "location"], "approval.isolation.syntheticHome");
  if (approval.isolation.syntheticHome.required !== true || approval.isolation.syntheticHome.location !== "approved-workspace") {
    throw new Error("approval requires a synthetic HOME inside the approved workspace");
  }
  exactKeys(approval.isolation.pluginReadOnly, ["required", "reference", "digestAlgorithm"], "approval.isolation.pluginReadOnly");
  if (approval.isolation.pluginReadOnly.required !== true || approval.isolation.pluginReadOnly.reference !== "read-only-copy"
    || approval.isolation.pluginReadOnly.digestAlgorithm !== "sha256") {
    throw new Error("approval requires a digest-verified read-only plugin copy");
  }
  exactKeys(approval.isolation.pathScopedPermission, ["required", "mode", "writableScope"], "approval.isolation.pathScopedPermission");
  if (approval.isolation.pathScopedPermission.required !== true
    || !PERMISSION_MODES.has(approval.isolation.pathScopedPermission.mode)
    || approval.isolation.pathScopedPermission.writableScope !== "approved-workspace-only") {
    throw new Error("approval requires OS sandbox or host path-scoped permission limited to the approved workspace");
  }
  exactKeys(approval.isolation.canaryDenial, [
    "required", "writeTools", "requireBeforeAfterInvariant", "requireDenialRecord",
  ], "approval.isolation.canaryDenial");
  if (approval.isolation.canaryDenial.required !== true
    || JSON.stringify(approval.isolation.canaryDenial.writeTools) !== JSON.stringify(["Write", "Edit"])
    || approval.isolation.canaryDenial.requireBeforeAfterInvariant !== true
    || approval.isolation.canaryDenial.requireDenialRecord !== true) {
    throw new Error("approval requires a recorded Write/Edit denial and unchanged outside-workspace canary");
  }
  if (!Array.isArray(approval.isolation.minimalTools) || approval.isolation.minimalTools.length === 0
    || new Set(approval.isolation.minimalTools).size !== approval.isolation.minimalTools.length
    || approval.isolation.minimalTools.some((tool) => typeof tool !== "string" || tool.trim() === "" || tool === "Bash")) {
    throw new Error("approval.isolation.minimalTools must be a unique non-empty Bash-free tool list");
  }
  if (JSON.stringify(approval.isolation.inspectedTargets) !== JSON.stringify(ISOLATION_INSPECTED_TARGETS)) {
    throw new Error("approval must enumerate the exact bounded isolation inspection targets");
  }
  exactKeys(approval.isolation.cleanupVerified, ["required", "outcomes"], "approval.isolation.cleanupVerified");
  if (approval.isolation.cleanupVerified.required !== true
    || JSON.stringify([...approval.isolation.cleanupVerified.outcomes].sort()) !== JSON.stringify(["failure", "success"])) {
    throw new Error("approval requires cleanup verification after both success and failure");
  }
  return approval;
}

function allowedEnvironment(runtime, approval) {
  const env = {};
  for (const key of ["PATH", "SHELL", "TERM", "LANG", "LC_ALL", "LC_CTYPE"]) {
    if (typeof process.env[key] === "string") env[key] = process.env[key];
  }
  env.HOME = runtime.syntheticHome;
  env.TMPDIR = runtime.tempDir;
  env.AGENTIC_LIVE_HOST_ID = hostId;
  env.AGENTIC_LIVE_HOST_SURFACE = entry.surface;
  env.AGENTIC_LIVE_APPROVED_WORKSPACE = runtime.workspace;
  env.AGENTIC_LIVE_PLUGIN_ROOT = runtime.pluginCopy;
  env.AGENTIC_LIVE_CANARY_PATH = runtime.canaryFile;
  env.AGENTIC_LIVE_PERMISSION_MODE = approval.isolation.pathScopedPermission.mode;
  env.AGENTIC_LIVE_MINIMAL_TOOLS = JSON.stringify(approval.isolation.minimalTools);
  return env;
}

function commandText(approval) {
  return `approved-live-driver:${hostId}:sha256-${approval.driver.executableSha256.slice(0, 12)}`;
}

function setupIsolation(approval) {
  const runRoot = mkdtempSync(join(resolve(approval.isolation.workspaceParent), ".agentic-live-"));
  const workspace = join(runRoot, "workspace");
  const syntheticHome = join(workspace, "home");
  const tempDir = join(workspace, "tmp");
  const pluginCopy = join(runRoot, "plugin-read-only");
  const canaryDir = join(runRoot, "outside-workspace-canary");
  const canaryFile = join(canaryDir, "canary.txt");
  mkdirSync(join(syntheticHome, ".agentic-live"), { recursive: true });
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(join(syntheticHome, ".agentic-live", "home.json"), "{\"synthetic\":true}\n", { mode: 0o600 });
  cpSync(pluginSource, pluginCopy, { recursive: true });
  const sourceBefore = inventoryDigest(pluginSource);
  const copyBefore = inventoryDigest(pluginCopy);
  makeTreeReadOnly(pluginCopy);
  mkdirSync(canaryDir);
  writeFileSync(canaryFile, "runner-managed outside-workspace canary\n", { mode: 0o444 });
  chmodSync(canaryDir, 0o555);
  const canaryBefore = inventoryDigest(canaryDir);
  return {
    runRoot, workspace, syntheticHome, tempDir, pluginCopy, canaryDir, canaryFile,
    sourceBefore, copyBefore, canaryBefore,
  };
}

function validateDriverEnvelope(envelope, approval) {
  exactKeys(envelope, ["schemaVersion", "hostRecord", "isolationReport"], "driver envelope");
  if (envelope.schemaVersion !== 1) throw new Error("driver envelope schemaVersion must be 1");
  const report = envelope.isolationReport;
  exactKeys(report, [
    "schemaVersion", "syntheticHome", "pluginReadOnly", "pathScopedPermission", "canaryDenial",
    "minimalTools", "inspectedTargets", "cleanupReady",
  ], "driver isolationReport");
  if (report.schemaVersion !== 1) throw new Error("driver isolationReport.schemaVersion must be 1");
  exactKeys(report.syntheticHome, ["used", "declaredContents"], "driver isolationReport.syntheticHome");
  if (report.syntheticHome.used !== true || !Array.isArray(report.syntheticHome.declaredContents)
    || JSON.stringify(report.syntheticHome.declaredContents) !== JSON.stringify(["home/.agentic-live/home.json"])) {
    throw new Error("driver did not confirm the declared synthetic HOME");
  }
  exactKeys(report.pluginReadOnly, ["reference", "writeDenied"], "driver isolationReport.pluginReadOnly");
  if (report.pluginReadOnly.reference !== "read-only-copy" || report.pluginReadOnly.writeDenied !== true) {
    throw new Error("driver did not prove read-only plugin use");
  }
  exactKeys(report.pathScopedPermission, ["mode", "writableScope"], "driver isolationReport.pathScopedPermission");
  if (report.pathScopedPermission.mode !== approval.isolation.pathScopedPermission.mode
    || report.pathScopedPermission.writableScope !== "approved-workspace-only") {
    throw new Error("driver did not confirm the approved path-scoped permission mode");
  }
  exactKeys(report.canaryDenial, ["attempted", "denied", "denialSource"], "driver isolationReport.canaryDenial");
  if (report.canaryDenial.attempted !== true || report.canaryDenial.denied !== true
    || !new Set(["host-permission", "os-sandbox"]).has(report.canaryDenial.denialSource)) {
    throw new Error("driver did not return a structured canary denial record");
  }
  if (JSON.stringify(report.minimalTools) !== JSON.stringify(approval.isolation.minimalTools)) {
    throw new Error("driver minimalTools do not match the approved tool set");
  }
  if (JSON.stringify(report.inspectedTargets) !== JSON.stringify(ISOLATION_INSPECTED_TARGETS)) {
    throw new Error("driver did not enumerate the approved bounded inspection scope");
  }
  if (report.cleanupReady !== true) throw new Error("driver did not signal cleanup readiness");
  return envelope;
}

function cleanupIsolation(runtime) {
  try { makeTreeWritable(runtime.pluginCopy); } catch { /* cleanup still attempts the whole run root */ }
  try { chmodSync(runtime.canaryDir, 0o755); } catch { /* cleanup still attempts the whole run root */ }
  try { chmodSync(runtime.canaryFile, 0o644); } catch { /* cleanup still attempts the whole run root */ }
  try { rmSync(runtime.runRoot, { recursive: true, force: true }); } catch { /* reported below */ }
  const cleanup = {
    runRootRemoved: !existsSync(runtime.runRoot),
    workspaceRemoved: !existsSync(runtime.workspace),
    syntheticHomeRemoved: !existsSync(runtime.syntheticHome),
    pluginCopyRemoved: !existsSync(runtime.pluginCopy),
    canaryRemoved: !existsSync(runtime.canaryDir),
  };
  cleanup.completed = Object.values(cleanup).every(Boolean);
  return cleanup;
}

function buildIsolation(runtime, approval, report, observations, cleanup, outcome) {
  return {
    schemaVersion: 1,
    syntheticHome: {
      created: observations.syntheticHomeCreated,
      insideApprovedWorkspace: observations.syntheticHomeInsideWorkspace,
      realHomeNotTransmitted: observations.realHomeNotTransmitted,
      declaredContents: observations.syntheticHomeContents,
    },
    pluginReadOnly: {
      reference: observations.pluginCopyCreated ? "read-only-copy" : "unavailable",
      sourceDigestMatchesCopy: observations.sourceDigestMatchesCopy,
      beforeAfterUnchanged: observations.pluginBeforeAfterUnchanged,
      driverWriteDenied: report?.pluginReadOnly?.writeDenied === true,
    },
    pathScopedPermission: {
      mode: report?.pathScopedPermission?.mode ?? "unavailable",
      writableScope: report?.pathScopedPermission?.writableScope ?? "unavailable",
      driverConfirmed: report?.pathScopedPermission?.mode === approval.isolation.pathScopedPermission.mode
        && report?.pathScopedPermission?.writableScope === "approved-workspace-only",
    },
    canaryDenial: {
      attempted: report?.canaryDenial?.attempted === true,
      denied: report?.canaryDenial?.denied === true && observations.canaryBeforeAfterUnchanged,
      denialSource: report?.canaryDenial?.denialSource ?? "unavailable",
      beforeAfterUnchanged: observations.canaryBeforeAfterUnchanged,
    },
    minimalTools: [...approval.isolation.minimalTools],
    inspectedTargets: [...ISOLATION_INSPECTED_TARGETS],
    cleanupVerified: {
      outcome,
      ...cleanup,
    },
    retainedEvidence: {
      commandOmitted: true,
      sensitiveValuesOmitted: true,
      realPathsOmitted: true,
    },
  };
}

function failedDriverRecord(driverExecution, isolation, reason) {
  return {
    ...unavailable,
    status: "fail",
    checks: Object.fromEntries(loaded.matrix.requiredChecks.map((checkId) => [checkId, checkId === "host-regression" ? "fail" : "unverified"])),
    execution: driverExecution,
    conversation: { result: "incomplete", scenarios: [] },
    liveConversationGate: "incomplete",
    installed: false,
    isolation,
    evidence: [{
      kind: "command",
      checkId: "host-regression",
      hostId,
      runner: entry.adapter.runner,
      surface: entry.surface,
      execution: driverExecution,
      sanitized: true,
      summary: "承認済みdriverは有効な隔離済みhost recordを返しませんでした。command、argument、raw stdout／stderr、credential、実pathは保持していません。",
    }],
    reason,
  };
}

function assertRetainedRecordSafe(record, approval, runtime) {
  const serialized = JSON.stringify(record);
  const forbiddenValues = [
    approval.driver.command,
    ...approval.driver.artifacts.map((artifact) => artifact.path),
    runtime.runRoot,
    runtime.workspace,
    runtime.syntheticHome,
    runtime.pluginCopy,
    runtime.canaryDir,
    process.env.HOME,
  ].filter(Boolean);
  if (forbiddenValues.some((item) => serialized.includes(item))
    || /\/(?:Users|private\/tmp|tmp|System|Applications|Library)\//.test(serialized)) {
    throw new Error("retained host result contains a real filesystem path");
  }
  if (SECRET_VALUE.test(serialized)) throw new Error("retained host result contains an unsanitized sensitive value");
  if (Object.hasOwn(record, "args")) throw new Error("retained host result contains driver arguments");
}

if (!approvalPath) {
  if (outputPath) throw new Error("--output is only available with --approval");
  print(unavailable);
  process.exitCode = 2;
} else {
  if (!outputPath) throw new Error("approved live execution requires --output <new-result.json>");
  const target = resolve(outputPath);
  if (existsSync(target)) throw new Error("refusing to overwrite an existing live result");
  const approval = validateApproval(readJson(resolve(approvalPath)));
  const runtime = setupIsolation(approval);
  const startedAt = new Date().toISOString();
  let result;
  let envelope = null;
  let driverProblem = null;
  let observations;
  let cleanup;
  try {
    result = spawnSync(approval.driver.command, approval.driver.args, {
      cwd: runtime.workspace,
      env: allowedEnvironment(runtime, approval),
      encoding: "utf8",
      shell: false,
      timeout: 15 * 60 * 1000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const exitCode = Number.isInteger(result.status) ? result.status : 1;
    if (result.error || exitCode !== 0) {
      driverProblem = result.error ? `Approved host driver failed: ${result.error.name}` : `Approved host driver exited with status ${exitCode}`;
    } else {
      try {
        envelope = validateDriverEnvelope(JSON.parse(result.stdout), approval);
      } catch {
        driverProblem = "Approved host driver returned an invalid isolation envelope. Raw output was rejected without persistence.";
      }
    }
    observations = {
      syntheticHomeCreated: existsSync(runtime.syntheticHome),
      syntheticHomeInsideWorkspace: resolve(runtime.syntheticHome).startsWith(`${resolve(runtime.workspace)}/`),
      realHomeNotTransmitted: allowedEnvironment(runtime, approval).HOME !== process.env.HOME,
      syntheticHomeContents: existsSync(runtime.syntheticHome)
        ? walkFiles(runtime.syntheticHome).map((path) => `home/${relative(runtime.syntheticHome, path)}`)
        : [],
      pluginCopyCreated: existsSync(runtime.pluginCopy),
      sourceDigestMatchesCopy: inventoryDigest(pluginSource) === runtime.sourceBefore && runtime.copyBefore === runtime.sourceBefore,
      pluginBeforeAfterUnchanged: inventoryDigest(pluginSource) === runtime.sourceBefore
        && inventoryDigest(runtime.pluginCopy) === runtime.copyBefore
        && !treeHasWriteBits(runtime.pluginCopy),
      canaryBeforeAfterUnchanged: inventoryDigest(runtime.canaryDir) === runtime.canaryBefore,
    };
  } finally {
    cleanup = cleanupIsolation(runtime);
  }

  const finishedAt = new Date().toISOString();
  const actualExitCode = Number.isInteger(result?.status) ? result.status : 1;
  const executionPass = !driverProblem && cleanup.completed;
  const execution = {
    kind: "command",
    command: commandText(approval),
    exitCode: executionPass ? 0 : (actualExitCode === 0 ? 1 : actualExitCode),
    startedAt,
    finishedAt,
    result: executionPass ? "pass" : "fail",
  };
  let record;
  const report = envelope?.isolationReport ?? null;
  const requestedPass = envelope?.hostRecord?.status === "pass";
  const isolation = buildIsolation(runtime, approval, report, observations, cleanup,
    executionPass && requestedPass ? "success" : "failure");

  if (!executionPass) {
    record = failedDriverRecord(execution, isolation, driverProblem ?? "Approved host driver cleanup did not complete.");
  } else {
    try {
      record = { ...envelope.hostRecord, execution, isolation };
      validateHostRecord(loaded, record, { allowLivePass: true });
      assertRetainedRecordSafe(record, approval, runtime);
      const summary = summarizeHostRecords(loaded, [record], { allowLivePass: true });
      if (record.status === "pass" && !summary.verifiedHosts.includes(hostId)) {
        throw new Error("approved host result did not verify the selected host");
      }
    } catch {
      const failedExecution = { ...execution, exitCode: 1, result: "fail" };
      record = failedDriverRecord(failedExecution, { ...isolation, cleanupVerified: { ...isolation.cleanupVerified, outcome: "failure" } },
        "Approved host driver returned a host record that failed the exact result or containment schema.");
    }
  }

  validateHostRecord(loaded, record, { allowLivePass: true });
  assertRetainedRecordSafe(record, approval, runtime);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  print(record);
  process.exitCode = record.status === "pass" ? 0 : 1;
}
