import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const LIVE_STATUSES = Object.freeze([
  "pass",
  "fail",
  "unverified",
  "external-live-gate-unavailable",
]);

export const LIVE_CONVERSATION_SCENARIOS = Object.freeze([
  "basic-answer",
  "complex-answer",
  "completion-report",
  "status-report",
  "diagnosis",
  "developer-handoff",
  "partial-failure",
  "markdown-rendering",
]);

const EXECUTION_RESULTS = new Set(["pass", "fail", "incomplete"]);
const EXECUTION_KINDS = new Set(["command", "host-ui", "official-validator", "none"]);
const EVIDENCE_KINDS = new Set(["command", "conversation", "screenshot", "official-validator", "host-observation"]);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SENSITIVE_KEY = /(?:access.?token|refresh.?token|api.?token|client.?secret|password|credential|authorization|cookie|oauth.?code|private.?key)/i;
const SENSITIVE_VALUE = /(?:Bearer\s+[A-Za-z0-9._~+\/-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;

const CHECK_EVIDENCE_KINDS = Object.freeze({
  "distribution-format": new Set(["command", "official-validator", "host-observation"]),
  "fresh-install": new Set(["command", "host-observation"]),
  "rules-and-skills": new Set(["command", "host-observation"]),
  "basic-and-complex-conversation": new Set(["conversation"]),
  "completion-and-status-report": new Set(["conversation"]),
  "diagnosis-and-developer-handoff": new Set(["conversation"]),
  "wizard-launch": new Set(["screenshot", "host-observation"]),
  "workspace-boundary": new Set(["command", "host-observation"]),
  "secret-non-exposure": new Set(["command", "host-observation"]),
  "update-path-or-safe-unsupported": new Set(["command", "host-observation"]),
  "host-regression": new Set(["command"]),
  "live-or-official-validator-evidence": new Set(["official-validator", "host-observation"]),
});

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertExactKeys(value, required, optional, label) {
  assertObject(value, label);
  const keys = Object.keys(value);
  for (const key of required) if (!keys.includes(key)) throw new Error(`${label} missing required field: ${key}`);
  const allowed = new Set([...required, ...optional]);
  for (const key of keys) if (!allowed.has(key)) throw new Error(`${label} has unknown field: ${key}`);
}

function assertTimestamp(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`);
  }
}

function assertNoSensitiveFields(value, label) {
  const visit = (item, path) => {
    if (Array.isArray(item)) return item.forEach((child, index) => visit(child, `${path}[${index}]`));
    if (!item || typeof item !== "object") {
      if (typeof item === "string" && SENSITIVE_VALUE.test(item)) throw new Error(`${label} contains unsanitized value at ${path}`);
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      if (SENSITIVE_KEY.test(key)) throw new Error(`${label} contains forbidden sensitive field: ${path}.${key}`);
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, label);
}

function validateExecution(execution, label, { allowIncomplete = true } = {}) {
  assertExactKeys(execution, ["kind", "command", "exitCode", "startedAt", "finishedAt", "result"], [], label);
  if (!EXECUTION_KINDS.has(execution.kind)) throw new Error(`${label}.kind is invalid: ${execution.kind}`);
  if (!EXECUTION_RESULTS.has(execution.result)) throw new Error(`${label}.result is invalid: ${execution.result}`);
  if (!allowIncomplete && execution.result === "incomplete") throw new Error(`${label} cannot be incomplete`);
  const incomplete = execution.result === "incomplete";
  if (incomplete) {
    if (execution.kind !== "none" || execution.command !== null || execution.exitCode !== null) {
      throw new Error(`${label} incomplete execution must use kind=none, command=null, exitCode=null`);
    }
    assertTimestamp(execution.startedAt, `${label}.startedAt`, { nullable: true });
    assertTimestamp(execution.finishedAt, `${label}.finishedAt`, { nullable: true });
    return;
  }
  if (execution.kind === "none") throw new Error(`${label} completed execution cannot use kind=none`);
  if (typeof execution.command !== "string" || execution.command.trim() === "") throw new Error(`${label}.command is required`);
  if (!Number.isInteger(execution.exitCode) || execution.exitCode < 0) throw new Error(`${label}.exitCode must be a non-negative integer`);
  if (execution.result === "pass" && execution.exitCode !== 0) throw new Error(`${label} PASS requires exitCode=0`);
  if (execution.result === "fail" && execution.exitCode === 0) throw new Error(`${label} FAIL requires a non-zero exitCode`);
  assertTimestamp(execution.startedAt, `${label}.startedAt`);
  assertTimestamp(execution.finishedAt, `${label}.finishedAt`);
  if (Date.parse(execution.finishedAt) < Date.parse(execution.startedAt)) throw new Error(`${label} finishedAt precedes startedAt`);
}

function validateConversation(conversation, label) {
  assertExactKeys(conversation, ["result", "scenarios"], [], label);
  if (!new Set(["pass", "fail", "incomplete"]).has(conversation.result)) throw new Error(`${label}.result is invalid`);
  if (!Array.isArray(conversation.scenarios)) throw new Error(`${label}.scenarios must be an array`);
  const seen = new Set();
  for (const [index, scenario] of conversation.scenarios.entries()) {
    const itemLabel = `${label}.scenarios[${index}]`;
    assertExactKeys(scenario, ["id", "result", "markdownValidated"], [], itemLabel);
    if (!LIVE_CONVERSATION_SCENARIOS.includes(scenario.id) || seen.has(scenario.id)) throw new Error(`${itemLabel}.id is invalid or duplicate`);
    if (!new Set(["pass", "fail", "incomplete"]).has(scenario.result)) throw new Error(`${itemLabel}.result is invalid`);
    if (typeof scenario.markdownValidated !== "boolean") throw new Error(`${itemLabel}.markdownValidated must be boolean`);
    seen.add(scenario.id);
  }
  if (conversation.result === "pass") {
    if (seen.size !== LIVE_CONVERSATION_SCENARIOS.length || LIVE_CONVERSATION_SCENARIOS.some((id) => !seen.has(id))) {
      throw new Error(`${label} PASS must cover every required live conversation scenario`);
    }
    if (conversation.scenarios.some((item) => item.result !== "pass" || item.markdownValidated !== true)) {
      throw new Error(`${label} PASS requires PASS and markdownValidated=true for every scenario`);
    }
  }
  if (conversation.result === "incomplete" && conversation.scenarios.some((item) => item.result === "pass")) {
    throw new Error(`${label} incomplete result cannot contain PASS scenarios`);
  }
}

function validateEvidence(entry, index, loaded, record) {
  const label = `host ${record.hostId} evidence[${index}]`;
  assertExactKeys(entry, ["kind", "checkId", "hostId", "runner", "surface", "execution", "sanitized", "summary"], [], label);
  if (!EVIDENCE_KINDS.has(entry.kind)) throw new Error(`${label}.kind is unknown: ${entry.kind}`);
  if (!loaded.matrix.requiredChecks.includes(entry.checkId)) throw new Error(`${label}.checkId is unknown: ${entry.checkId}`);
  if (!CHECK_EVIDENCE_KINDS[entry.checkId].has(entry.kind)) throw new Error(`${label}.kind does not correspond to check ${entry.checkId}`);
  if (entry.hostId !== record.hostId || entry.runner !== record.runner || entry.surface !== record.surface) {
    throw new Error(`${label} host, runner, or surface does not match its record`);
  }
  if (entry.sanitized !== true) throw new Error(`${label}.sanitized must be true`);
  if (typeof entry.summary !== "string" || entry.summary.trim() === "") throw new Error(`${label}.summary is required`);
  validateExecution(entry.execution, `${label}.execution`, { allowIncomplete: false });
  if (entry.execution.result !== record.checks[entry.checkId]) {
    throw new Error(`${label}.execution.result does not match checks.${entry.checkId}`);
  }
  assertNoSensitiveFields(entry, label);
}

export function loadHostMatrix(rootValue) {
  const root = resolve(rootValue);
  const matrix = readJson(join(root, "adapters/host-matrix.json"));
  if (matrix.schemaVersion !== 1 || matrix.edition !== "agentic-secretary") {
    throw new Error("invalid agentic host matrix identity");
  }
  if (!Array.isArray(matrix.requiredHosts) || matrix.requiredHosts.length !== 4
    || new Set(matrix.requiredHosts).size !== 4) {
    throw new Error("host matrix must declare four unique required hosts");
  }
  if (!Array.isArray(matrix.requiredChecks) || matrix.requiredChecks.length !== 12
    || new Set(matrix.requiredChecks).size !== 12) {
    throw new Error("host matrix must declare twelve unique required checks");
  }
  const entries = new Map();
  for (const item of matrix.hosts || []) {
    if (!matrix.requiredHosts.includes(item.id) || entries.has(item.id)) {
      throw new Error(`invalid or duplicate host matrix entry: ${item.id}`);
    }
    const adapterPath = join(root, item.adapter);
    if (!existsSync(adapterPath)) throw new Error(`missing adapter: ${item.adapter}`);
    const adapter = readJson(adapterPath);
    if (adapter.schemaVersion !== 1 || adapter.hostId !== item.id || adapter.surface !== item.surface) {
      throw new Error(`adapter identity mismatch: ${item.id}`);
    }
    for (const path of [adapter.installGuide, adapter.runner, adapter.distribution?.pluginRoot]) {
      if (!path || !existsSync(join(root, path))) throw new Error(`adapter ${item.id} missing referenced path: ${path}`);
    }
    if (adapter.family === "claude-code") {
      for (const path of [adapter.distribution.marketplaceManifest, adapter.distribution.pluginManifest]) {
        if (!existsSync(join(root, path))) throw new Error(`Claude adapter ${item.id} missing ${path}`);
      }
    } else if (adapter.family === "codex") {
      for (const path of [adapter.distribution.guidance, adapter.distribution.configTemplate, adapter.distribution.skillsRoot]) {
        if (!existsSync(join(root, path))) throw new Error(`Codex adapter ${item.id} missing ${path}`);
      }
      if (adapter.officialValidator !== null) throw new Error(`Codex adapter ${item.id} invents an official validator`);
    } else throw new Error(`unknown adapter family: ${adapter.family}`);
    if (adapter.liveStatus !== "external-live-gate-unavailable") {
      throw new Error(`adapter ${item.id} must begin unavailable until real-host evidence exists`);
    }
    entries.set(item.id, { ...item, adapter });
  }
  if (entries.size !== 4 || matrix.requiredHosts.some((id) => !entries.has(id))) {
    throw new Error("host matrix does not cover all required hosts exactly once");
  }
  return { root, matrix, entries };
}

function incompleteExecution() {
  return { kind: "none", command: null, exitCode: null, startedAt: null, finishedAt: null, result: "incomplete" };
}

export function unavailableRecords(loaded) {
  return loaded.matrix.requiredHosts.map((hostId) => {
    const entry = loaded.entries.get(hostId);
    return {
      schemaVersion: 1,
      hostId,
      runner: entry.adapter.runner,
      surface: entry.surface,
      status: "external-live-gate-unavailable",
      checks: Object.fromEntries(loaded.matrix.requiredChecks.map((id) => [id, "external-live-gate-unavailable"])),
      execution: incompleteExecution(),
      conversation: { result: "incomplete", scenarios: [] },
      liveConversationGate: "incomplete",
      installed: false,
      evidence: [],
      reason: "Host installation and real-host execution were not individually approved. No offline result is promoted.",
    };
  });
}

export function validateHostRecord(loaded, record, { allowLivePass = false } = {}) {
  assertExactKeys(record, [
    "schemaVersion", "hostId", "runner", "surface", "status", "checks", "execution", "conversation",
    "liveConversationGate", "installed", "evidence", "reason",
  ], [], "host record");
  if (record.schemaVersion !== 1) throw new Error("host record schemaVersion must be 1");
  if (!loaded.matrix.requiredHosts.includes(record.hostId)) throw new Error(`unknown host record: ${record.hostId}`);
  const entry = loaded.entries.get(record.hostId);
  if (record.runner !== entry.adapter.runner) throw new Error(`host ${record.hostId} runner mismatch`);
  if (record.surface !== entry.surface) throw new Error(`host ${record.hostId} surface mismatch`);
  if (!LIVE_STATUSES.includes(record.status)) throw new Error(`invalid host status: ${record.status}`);
  if (typeof record.installed !== "boolean") throw new Error(`host ${record.hostId} installed must be boolean`);
  if (typeof record.reason !== "string" || record.reason.trim() === "") throw new Error(`host ${record.hostId} reason is required`);
  assertObject(record.checks, `host ${record.hostId} checks`);
  const checkKeys = Object.keys(record.checks).sort();
  if (JSON.stringify(checkKeys) !== JSON.stringify([...loaded.matrix.requiredChecks].sort())) {
    throw new Error(`host ${record.hostId} does not report all required checks`);
  }
  for (const value of Object.values(record.checks)) {
    if (!LIVE_STATUSES.includes(value)) throw new Error(`host ${record.hostId} has invalid check status: ${value}`);
  }
  validateExecution(record.execution, `host ${record.hostId} execution`);
  validateConversation(record.conversation, `host ${record.hostId} conversation`);
  if (record.liveConversationGate !== record.conversation.result) {
    throw new Error(`host ${record.hostId} liveConversationGate must match conversation.result`);
  }
  if (!Array.isArray(record.evidence)) throw new Error(`host ${record.hostId} evidence must be an array`);
  record.evidence.forEach((item, index) => validateEvidence(item, index, loaded, record));

  const allChecksPass = Object.values(record.checks).every((value) => value === "pass");
  if (record.status === "pass") {
    if (!allowLivePass) throw new Error(`host ${record.hostId} PASS is forbidden outside an approved live runner`);
    if (!record.installed || record.execution.result !== "pass" || !allChecksPass || record.conversation.result !== "pass") {
      throw new Error(`host ${record.hostId} cannot be promoted without install, execution PASS, twelve PASS checks, and live conversation PASS`);
    }
    const covered = new Set(record.evidence.map((item) => item.checkId));
    if (record.evidence.length < loaded.matrix.requiredChecks.length
      || loaded.matrix.requiredChecks.some((checkId) => !covered.has(checkId))) {
      throw new Error(`host ${record.hostId} PASS evidence does not cover all twelve checks`);
    }
  } else if (record.status === "external-live-gate-unavailable") {
    if (record.installed || record.execution.result !== "incomplete" || record.conversation.result !== "incomplete"
      || record.evidence.length !== 0 || Object.values(record.checks).some((value) => value !== record.status)) {
      throw new Error(`host ${record.hostId} unavailable record must remain incomplete with zero evidence`);
    }
  } else if (record.status === "unverified" && record.execution.result === "pass") {
    throw new Error(`host ${record.hostId} unverified record cannot claim execution PASS`);
  } else if (record.status === "fail" && !Object.values(record.checks).includes("fail")) {
    throw new Error(`host ${record.hostId} FAIL record must include at least one failed check`);
  }
  return record;
}

export function summarizeHostRecords(loaded, records, { allowLivePass = false } = {}) {
  const recordMap = new Map();
  for (const record of records) {
    validateHostRecord(loaded, record, { allowLivePass });
    if (recordMap.has(record.hostId)) throw new Error(`duplicate host record: ${record.hostId}`);
    recordMap.set(record.hostId, record);
  }
  const hosts = loaded.matrix.requiredHosts.map((hostId) => recordMap.get(hostId) ?? {
    ...unavailableRecords(loaded).find((record) => record.hostId === hostId),
    status: "unverified",
    checks: Object.fromEntries(loaded.matrix.requiredChecks.map((id) => [id, "unverified"])),
    reason: "No host-specific result was supplied.",
  });
  const verifiedHosts = hosts.filter((host) => host.status === "pass").map((host) => host.hostId);
  const failedHosts = hosts.filter((host) => host.status === "fail").map((host) => host.hostId);
  const unavailableHosts = hosts.filter((host) => host.status === "external-live-gate-unavailable").map((host) => host.hostId);
  const unverifiedHosts = hosts.filter((host) => host.status === "unverified").map((host) => host.hostId);
  return {
    schemaVersion: 1,
    edition: "agentic-secretary",
    supportedHosts: [...loaded.matrix.requiredHosts],
    verifiedHosts,
    failedHosts,
    unavailableHosts,
    unverifiedHosts,
    hosts,
    allHostsVerified: verifiedHosts.length === loaded.matrix.requiredHosts.length,
    releaseStatus: verifiedHosts.length === loaded.matrix.requiredHosts.length ? "pass"
      : failedHosts.length ? "fail"
        : unavailableHosts.length ? "external-live-gate-unavailable" : "unverified",
  };
}
