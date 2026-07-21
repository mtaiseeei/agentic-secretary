import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const LIVE_STATUSES = Object.freeze([
  "pass",
  "fail",
  "unverified",
  "external-live-gate-unavailable",
]);

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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

export function unavailableRecords(matrix) {
  return matrix.requiredHosts.map((hostId) => ({
    hostId,
    runner: "scripts/agentic-live-host-gate.mjs",
    status: "external-live-gate-unavailable",
    checks: Object.fromEntries(matrix.requiredChecks.map((id) => [id, "external-live-gate-unavailable"])),
    liveConversationGate: "incomplete",
    evidence: [],
  }));
}

export function summarizeHostRecords(matrix, records) {
  const recordMap = new Map();
  for (const record of records) {
    if (!matrix.requiredHosts.includes(record.hostId)) throw new Error(`unknown host record: ${record.hostId}`);
    if (recordMap.has(record.hostId)) throw new Error(`duplicate host record: ${record.hostId}`);
    if (!LIVE_STATUSES.includes(record.status)) throw new Error(`invalid host status: ${record.status}`);
    const checkKeys = Object.keys(record.checks || {}).sort();
    if (JSON.stringify(checkKeys) !== JSON.stringify([...matrix.requiredChecks].sort())) {
      throw new Error(`host ${record.hostId} does not report all required checks`);
    }
    for (const value of Object.values(record.checks)) {
      if (!LIVE_STATUSES.includes(value)) throw new Error(`host ${record.hostId} has invalid check status: ${value}`);
    }
    const allChecksPass = Object.values(record.checks).every((value) => value === "pass");
    const evidenceComplete = Array.isArray(record.evidence) && record.evidence.length > 0;
    if (record.status === "pass" && (!allChecksPass || record.liveConversationGate !== "pass" || !evidenceComplete)) {
      throw new Error(`host ${record.hostId} cannot be promoted without twelve PASS checks, live PASS, and evidence`);
    }
    recordMap.set(record.hostId, record);
  }
  const hosts = matrix.requiredHosts.map((hostId) => recordMap.get(hostId) ?? {
    hostId,
    status: "unverified",
    checks: Object.fromEntries(matrix.requiredChecks.map((id) => [id, "unverified"])),
    liveConversationGate: "incomplete",
    evidence: [],
  });
  const verifiedHosts = hosts.filter((host) => host.status === "pass").map((host) => host.hostId);
  const failedHosts = hosts.filter((host) => host.status === "fail").map((host) => host.hostId);
  const unavailableHosts = hosts.filter((host) => host.status === "external-live-gate-unavailable").map((host) => host.hostId);
  const unverifiedHosts = hosts.filter((host) => host.status === "unverified").map((host) => host.hostId);
  return {
    schemaVersion: 1,
    edition: "agentic-secretary",
    supportedHosts: [...matrix.requiredHosts],
    verifiedHosts,
    failedHosts,
    unavailableHosts,
    unverifiedHosts,
    hosts,
    allHostsVerified: verifiedHosts.length === matrix.requiredHosts.length,
    releaseStatus: verifiedHosts.length === matrix.requiredHosts.length ? "pass"
      : failedHosts.length ? "fail"
        : unavailableHosts.length ? "external-live-gate-unavailable" : "unverified",
  };
}
