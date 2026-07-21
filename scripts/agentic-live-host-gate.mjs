#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHostMatrix,
  readJson,
  summarizeHostRecords,
  unavailableRecords,
  validateHostRecord,
} from "./lib/agentic-hosts.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
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

function print(record) {
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

function exactKeys(object, required, label) {
  if (!object || typeof object !== "object" || Array.isArray(object)) throw new Error(`${label} must be an object`);
  for (const key of required) if (!Object.hasOwn(object, key)) throw new Error(`${label} missing required field: ${key}`);
  for (const key of Object.keys(object)) if (!required.includes(key)) throw new Error(`${label} has unknown field: ${key}`);
}

function timestamp(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be an ISO-8601 UTC timestamp`);
}

function validateApproval(approval) {
  exactKeys(approval, [
    "schemaVersion", "scope", "approvalId", "approved", "approvedAt", "expiresAt", "hostId", "runner",
    "surface", "approvedChecks", "driver", "cleanupPlan",
  ], "approval");
  if (approval.schemaVersion !== 1 || approval.scope !== "agentic-secretary-host-live-gate") throw new Error("invalid approval identity");
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
  exactKeys(approval.driver, ["command", "args", "cwd"], "approval.driver");
  if (!isAbsolute(approval.driver.command) || !existsSync(approval.driver.command)) throw new Error("approval.driver.command must be an existing absolute executable path");
  if (!Array.isArray(approval.driver.args) || approval.driver.args.some((item) => typeof item !== "string")) throw new Error("approval.driver.args must be an array of strings");
  if (!isAbsolute(approval.driver.cwd) || !existsSync(approval.driver.cwd)) throw new Error("approval.driver.cwd must be an existing absolute path");
  const serializedArgs = JSON.stringify(approval.driver.args);
  if (/(?:Bearer\s+[A-Za-z0-9._~+\/-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(serializedArgs)) {
    throw new Error("approval.driver.args must not contain credentials or secret values");
  }
  return approval;
}

function allowedEnvironment() {
  const env = {};
  for (const key of ["PATH", "HOME", "SHELL", "TERM", "LANG", "LC_ALL", "LC_CTYPE"]) {
    if (typeof process.env[key] === "string") env[key] = process.env[key];
  }
  env.AGENTIC_LIVE_HOST_ID = hostId;
  env.AGENTIC_LIVE_HOST_SURFACE = entry.surface;
  return env;
}

function commandText(driver) {
  return `${JSON.stringify(driver.command)} [${driver.args.length} approved argument value(s) omitted from evidence]`;
}

function failedDriverRecord(driver, startedAt, finishedAt, exitCode, reason) {
  const execution = {
    kind: "command",
    command: commandText(driver),
    exitCode: exitCode === 0 ? 1 : exitCode,
    startedAt,
    finishedAt,
    result: "fail",
  };
  return {
    ...unavailable,
    status: "fail",
    checks: Object.fromEntries(loaded.matrix.requiredChecks.map((checkId) => [checkId, checkId === "host-regression" ? "fail" : "unverified"])),
    execution,
    evidence: [{
      kind: "command",
      checkId: "host-regression",
      hostId,
      runner: entry.adapter.runner,
      surface: entry.surface,
      execution,
      sanitized: true,
      summary: "Approved host driver did not return a valid successful host record. Raw stdout and stderr were not persisted.",
    }],
    reason,
  };
}

if (!approvalPath) {
  if (outputPath) throw new Error("--output is only available with --approval");
  print(unavailable);
  process.exitCode = 2;
} else {
  if (!outputPath) throw new Error("approved live execution requires --output <new-result.json>");
  const target = resolve(outputPath);
  if (existsSync(target)) throw new Error(`refusing to overwrite existing live result: ${target}`);
  const approval = validateApproval(readJson(resolve(approvalPath)));
  const startedAt = new Date().toISOString();
  const result = spawnSync(approval.driver.command, approval.driver.args, {
    cwd: approval.driver.cwd,
    env: allowedEnvironment(),
    encoding: "utf8",
    shell: false,
    timeout: 15 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const finishedAt = new Date().toISOString();
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  let record;
  if (result.error || exitCode !== 0) {
    record = failedDriverRecord(approval.driver, startedAt, finishedAt, exitCode,
      result.error ? `Approved host driver failed: ${result.error.name}` : `Approved host driver exited with status ${exitCode}`);
  } else {
    try {
      record = JSON.parse(result.stdout);
      record.execution = {
        kind: "command",
        command: commandText(approval.driver),
        exitCode: 0,
        startedAt,
        finishedAt,
        result: "pass",
      };
      validateHostRecord(loaded, record, { allowLivePass: true });
      const summary = summarizeHostRecords(loaded, [record], { allowLivePass: true });
      if (!summary.verifiedHosts.includes(hostId)) throw new Error("approved host result did not verify the selected host");
    } catch (error) {
      record = failedDriverRecord(approval.driver, startedAt, finishedAt, 1,
        "Approved host driver returned an invalid record. The result and raw output were rejected without persistence.");
    }
  }
  validateHostRecord(loaded, record, { allowLivePass: true });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  print(record);
  process.exitCode = record.status === "pass" ? 0 : 1;
}
