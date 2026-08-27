import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { safeWritePath, workingRoot, writeFileAtomicSafe } from "./safe-fs.mjs";
import { runExternalSync } from "./external-ops.mjs";

export const CLARITY_SCHEMA_VERSION = 1;
export const CLARITY_LIMITS = Object.freeze({
  maxEntries: 500,
  maxFiles: 200,
  maxReadBytes: 2 * 1024 * 1024,
  maxFileBytes: 256 * 1024,
  maxCandidates: 24,
  maxReportRows: 80,
});

const decisionStatuses = new Set(["unknown", "exploring", "proposed", "confirmed", "rejected", "superseded"]);
const executionStatuses = new Set(["unknown", "not_started", "in_progress", "implemented", "verified", "operational", "rolled_back"]);
const validationStatuses = new Set(["unknown", "pending", "passed", "failed", "waived"]);
const alignmentStatuses = new Set(["unknown", "aligned", "possible_drift", "drift", "not_applicable"]);
const dispositions = new Set(["required", "candidate", "idea", "deferred", "rejected"]);
const modes = new Set(["standalone", "secretary-local", "linked-external", "portfolio"]);
const eventTypes = new Set([
  "item.discovered",
  "decision.pending",
  "decision.proposed",
  "decision.confirmed",
  "decision.rejected",
  "decision.superseded",
  "execution.changed",
  "validation.changed",
  "alignment.changed",
  "disposition.changed",
  "evidence.linked",
]);
const evidenceTypes = new Set([
  "user-confirmation", "project-decision", "adr", "spec-section", "meeting-reference",
  "git-commit", "git-diff", "pull-request", "test-run", "deployment", "file-reference",
  "task-reference", "xmind-proposal", "agent-observation",
]);

const excludedDirectories = new Set([
  ".git", ".clarity", "node_modules", "vendor", "dist", "build", "coverage", ".next", ".cache",
]);
const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".7z",
  ".mp3", ".mp4", ".mov", ".avi", ".woff", ".woff2", ".ttf", ".class", ".jar", ".dylib", ".so", ".exe",
]);
const sensitiveNamePattern = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|id_[a-z0-9_-]+|.*(?:credential|secret|private[-_]?key|oauth|token).*)$/iu;
const secretValuePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/u,
  /\bAKIA[A-Z0-9]{16}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
  /(?:password|api[_-]?key|api[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential)\s*[:=]\s*[^\s,;]+/iu,
  /https?:\/\/[^/\s:@]+:[^/\s@]+@[^/\s]+/iu,
];

const quadrantMeta = Object.freeze({
  stabilize: { label: "定着・検証", meaning: "安定している" },
  execute: { label: "実行待ち", meaning: "あとは進めるだけ" },
  validate: { label: "暫定実装・要再確認", meaning: "注意して確認する" },
  decide: { label: "設計・意思決定", meaning: "人間の判断が必要" },
});

export class ClarityError extends Error {
  constructor(code, message, exitCode = 3, details = {}) {
    super(message);
    this.name = "ClarityError";
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

function fail(condition, code, message, details = {}) {
  if (!condition) throw new ClarityError(code, message, 3, details);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableId(prefix, value) {
  return `${prefix}_${sha256(String(value)).slice(0, 20)}`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function nowIso() {
  const injected = process.env.CLARITY_NOW || process.env.CC_SECRETARY_NOW;
  if (!injected) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/u.test(injected)) return `${injected}T00:00:00.000Z`;
  const parsed = new Date(injected);
  fail(!Number.isNaN(parsed.valueOf()), "time-invalid", "CLARITY_NOW／CC_SECRETARY_NOWはISO 8601形式で指定してください。");
  return parsed.toISOString();
}

function rootPath(value) {
  try {
    const root = workingRoot(value || ".");
    fail(root !== dirname(root), "root-unsafe", "filesystem rootはClarity working rootにできません。");
    return root;
  } catch (error) {
    if (error instanceof ClarityError) throw error;
    throw new ClarityError("root-unsafe", "working rootを安全に確認できません。symlink／junctionを含まない通常directoryを指定してください。");
  }
}

function relativePath(root, target) {
  const rel = relative(root, target).split(sep).join("/");
  fail(rel && rel !== "." && rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel), "path-outside-root", "working root外のpathは扱えません。");
  return rel;
}

function safeRelative(value, label = "path") {
  const raw = String(value ?? "").split("\\").join("/").replace(/^\.\//u, "");
  fail(raw && !raw.startsWith("/") && !isAbsolute(raw) && raw.split("/").every((part) => part && part !== "." && part !== ".."), "path-invalid", `${label}は安全な相対pathで指定してください。`);
  return raw;
}

function containsSecret(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return secretValuePatterns.some((pattern) => pattern.test(serialized));
}

function oneLine(value, label, max = 240) {
  const normalized = String(value ?? "").trim();
  fail(normalized && !/[\r\n]/u.test(normalized), "value-invalid", `${label}は空でない1行にしてください。`);
  fail(normalized.length <= max, "value-too-long", `${label}は${max}文字以内にしてください。`);
  fail(!containsSecret(normalized), "secret-detected", `${label}にSecretらしき値があるため保存しません。`);
  return normalized;
}

function optionalGit(root, args) {
  try {
    const result = runExternalSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      timeoutMs: 5_000,
      maxBuffer: 2 * 1024 * 1024,
      allowFailure: true,
      label: "Clarity Git read-only inspection",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    return result.status === 0 ? String(result.stdout).trim() : null;
  } catch { return null; }
}

function safeRemoteIdentity(raw) {
  if (!raw) return { status: "missing", repository: null };
  try {
    const normalized = raw.startsWith("git@") ? raw.replace(/^git@([^:]+):/u, "https://$1/") : raw;
    const url = new URL(normalized);
    if (url.username || url.password) return { status: "redacted", repository: null };
    return { status: "available", repository: `${url.hostname}${url.pathname.replace(/\.git$/u, "")}` };
  } catch {
    const scp = raw.match(/^[^@\s]+@([^:\s]+):([^\s]+)$/u);
    return scp ? { status: "available", repository: `${scp[1]}/${scp[2].replace(/\.git$/u, "")}` } : { status: "unparsed", repository: null };
  }
}

export function inspectRepoIdentity(rootValue) {
  const root = rootPath(rootValue);
  const top = optionalGit(root, ["rev-parse", "--show-toplevel"]);
  if (!top) {
    return { kind: "non-git", rootName: basename(root), remote: { status: "not-applicable", repository: null }, branch: null, head: null };
  }
  let canonicalTop;
  try { canonicalTop = realpathSync(top); } catch { throw new ClarityError("git-root-unreadable", "Git top-levelを安全に確認できません。"); }
  fail(canonicalTop === root, "git-root-mismatch", "Clarity initはGit top-levelで実行してください。親または子Repoへ書き込みません。", { gitTopLevel: basename(canonicalTop) });
  return {
    kind: "git",
    rootName: basename(root),
    remote: safeRemoteIdentity(optionalGit(root, ["remote", "get-url", "origin"])),
    branch: optionalGit(root, ["symbolic-ref", "--short", "-q", "HEAD"]),
    head: optionalGit(root, ["rev-parse", "--verify", "HEAD"]),
  };
}

function reportRow(report, bucket, row) {
  if (report[bucket].length < CLARITY_LIMITS.maxReportRows) report[bucket].push(row);
  else report.omittedReportRows += 1;
}

function looksBinary(buffer, path) {
  if (binaryExtensions.has(extname(path).toLowerCase())) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return sample.includes(0);
}

function titleFrom(content, path) {
  const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim();
  return (heading || basename(path, extname(path))).slice(0, 120);
}

function classifyCandidate(path, content) {
  const normalized = path.toLowerCase();
  const isAdr = /(?:^|\/)(?:adr|adrs|decisions?)(?:\/|[-_])/u.test(normalized) || /\barchitecture decision record\b/iu.test(content.slice(0, 4096));
  const accepted = /(?:^|\n)\s*(?:status\s*:\s*|#+\s*status\s*\n+\s*)(?:accepted|approved|確定|承認済み)\b/iu.test(content);
  const draft = /(?:^|\n)\s*(?:status\s*:\s*|#+\s*status\s*\n+\s*)(?:draft|proposed|案|下書き)\b/iu.test(content);
  const superseded = /(?:^|\n)\s*(?:status\s*:\s*|#+\s*status\s*\n+\s*)(?:superseded|deprecated|置換済み|廃止)\b/iu.test(content);
  if (isAdr) return { kind: "decision", source: "adr", decisionSource: accepted ? "accepted-canonical" : "adr", decisionStatus: superseded ? "superseded" : accepted ? "confirmed" : draft ? "proposed" : "exploring", humanConfirmed: false };
  if (/(?:^|\/)(?:spec|specs|requirements?|design|docs\/spec)(?:\/|\.|[-_])/u.test(normalized)) return { kind: "specification", source: "spec", decisionStatus: "proposed", humanConfirmed: false };
  if (/^(?:readme|project)\.md$/iu.test(basename(path))) return { kind: "overview", source: "file", decisionStatus: "exploring", humanConfirmed: false };
  if (/^(?:package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/u.test(basename(path).toLowerCase()) || /(?:^|\/)(?:src|app|lib)\//u.test(normalized)) {
    return { kind: "implementation", source: "file", decisionStatus: "unknown", humanConfirmed: false, executionStatus: "implemented" };
  }
  return null;
}

export function scanRepository(rootValue) {
  const root = rootPath(rootValue);
  const report = {
    limits: { ...CLARITY_LIMITS },
    entriesSeen: 0,
    filesRead: 0,
    bytesRead: 0,
    truncated: false,
    omittedReportRows: 0,
    inspected: [],
    excluded: [],
    uninspected: [],
    candidates: [],
  };
  const queue = [root];
  while (queue.length) {
    const dir = queue.shift();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en")); }
    catch { reportRow(report, "uninspected", { path: dir === root ? "." : relativePath(root, dir), reason: "directory-unreadable" }); continue; }
    for (const entry of entries) {
      if (report.entriesSeen >= CLARITY_LIMITS.maxEntries || report.filesRead >= CLARITY_LIMITS.maxFiles || report.bytesRead >= CLARITY_LIMITS.maxReadBytes) {
        report.truncated = true;
        reportRow(report, "uninspected", { path: dir === root ? "." : relativePath(root, dir), reason: "scan-limit-reached" });
        queue.length = 0;
        break;
      }
      report.entriesSeen += 1;
      const absolute = join(dir, entry.name);
      const rel = relativePath(root, absolute);
      if (entry.isSymbolicLink()) { reportRow(report, "excluded", { path: rel, reason: "symlink-not-followed" }); continue; }
      if (entry.isDirectory()) {
        if (excludedDirectories.has(entry.name) || entry.name.startsWith(".clarity-init-")) reportRow(report, "excluded", { path: rel, reason: "excluded-directory" });
        else queue.push(absolute);
        continue;
      }
      if (!entry.isFile()) { reportRow(report, "excluded", { path: rel, reason: "non-regular-file" }); continue; }
      if (sensitiveNamePattern.test(rel)) { reportRow(report, "excluded", { path: rel, reason: "sensitive-name" }); continue; }
      let size;
      try { size = statSync(absolute).size; } catch { reportRow(report, "uninspected", { path: rel, reason: "stat-failed" }); continue; }
      if (size > CLARITY_LIMITS.maxFileBytes) { reportRow(report, "excluded", { path: rel, reason: "file-too-large", size }); continue; }
      let bytes;
      try { bytes = readFileSync(absolute); } catch { reportRow(report, "uninspected", { path: rel, reason: "file-unreadable" }); continue; }
      if (looksBinary(bytes, rel)) { reportRow(report, "excluded", { path: rel, reason: "binary" }); continue; }
      report.filesRead += 1;
      report.bytesRead += bytes.length;
      const content = bytes.toString("utf8");
      if (containsSecret(content)) { reportRow(report, "excluded", { path: rel, reason: "secret-like-content" }); continue; }
      reportRow(report, "inspected", { path: rel, size: bytes.length });
      if (report.candidates.length >= CLARITY_LIMITS.maxCandidates) continue;
      const classification = classifyCandidate(rel, content);
      if (!classification) continue;
      report.candidates.push({
        path: rel,
        title: titleFrom(content, rel),
        contentDigest: sha256(bytes),
        ...classification,
      });
    }
  }
  if (!report.candidates.length) {
    const fallback = report.inspected[0];
    if (fallback) report.candidates.push({ path: fallback.path, title: basename(fallback.path), contentDigest: sha256(fallback.path), kind: "repository-area", source: "file", decisionStatus: "unknown", humanConfirmed: false });
  }
  report.candidates.sort((a, b) => a.path.localeCompare(b.path, "en"));
  return report;
}

function initialItem(projectId, candidate, timestamp) {
  const itemId = stableId("ci", `${projectId}:${candidate.path}:${candidate.title}`);
  return {
    schemaVersion: CLARITY_SCHEMA_VERSION,
    itemId,
    title: oneLine(candidate.title, "Item title", 120),
    areaPath: safeRelative(candidate.path, "Item area path"),
    kind: candidate.kind,
    disposition: "candidate",
    deferredUntil: null,
    owner: null,
    decisionOwner: null,
    dependencies: [],
    externalRefs: [],
    confidence: "unknown",
    timestamps: { createdAt: timestamp, updatedAt: timestamp },
    attention: { level: "not_evaluated", reasons: [] },
    decision: {
      status: candidate.decisionStatus,
      source: candidate.decisionSource || candidate.source,
      humanConfirmed: Boolean(candidate.humanConfirmed),
      authority: "repository-reference",
      evidenceRefs: [],
      updatedAt: timestamp,
    },
    execution: {
      status: candidate.executionStatus || "not_started",
      authority: "repository-observation",
      evidenceRefs: [],
      updatedAt: timestamp,
    },
    validation: { status: "unknown", evidenceRefs: [], updatedAt: timestamp },
    alignment: { status: "unknown", evidenceRefs: [], updatedAt: timestamp },
  };
}

function fileEvidence(projectId, item, candidate, timestamp) {
  const type = candidate.source === "adr" ? "adr" : candidate.source === "spec" ? "spec-section" : "file-reference";
  return {
    schemaVersion: CLARITY_SCHEMA_VERSION,
    evidenceId: stableId("ce", `${projectId}:${type}:${candidate.path}:${candidate.contentDigest}`),
    type,
    source: candidate.source,
    locator: { path: candidate.path },
    summary: `${candidate.kind}候補: ${candidate.title}`.slice(0, 240),
    observedAt: timestamp,
    contentDigest: candidate.contentDigest,
    sensitivity: "non-secret-reference",
    availability: "available",
  };
}

function eventFor(projectId, type, itemId, actor, occurredAt, payload) {
  return {
    schemaVersion: CLARITY_SCHEMA_VERSION,
    eventId: stableId("cv", `${projectId}:${type}:${itemId || "project"}:${JSON.stringify(payload)}`),
    type,
    itemId: itemId || null,
    actor,
    occurredAt,
    payload,
  };
}

export function validateProject(project) {
  fail(project && project.schemaVersion === 1, "project-schema-invalid", "Clarity Project schemaVersionが不正です。");
  fail(/^cp_[a-f0-9]{20}$/u.test(project.clarityProjectId || ""), "project-schema-invalid", "Clarity Project IDが不正です。");
  fail(modes.has(project.mode), "project-schema-invalid", "Clarity modeが不正です。");
  fail(project.repoIdentity && ["git", "non-git"].includes(project.repoIdentity.kind), "project-schema-invalid", "Repo identityが不正です。");
  fail(project.compatibility?.reader?.min === 1 && project.compatibility?.reader?.max === 1
    && project.compatibility?.writer?.min === 1 && project.compatibility?.writer?.max === 1,
  "project-schema-invalid", "reader／writer互換範囲が不正です。");
  fail(!containsSecret(project), "secret-detected", "Project metadataにSecretらしき値があるため拒否します。");
  return project;
}

export function validateItem(item) {
  fail(item && item.schemaVersion === 1 && /^ci_[a-f0-9]{20}$/u.test(item.itemId || ""), "item-schema-invalid", "Clarity Item schemaが不正です。");
  oneLine(item.title, "Item title", 120);
  safeRelative(item.areaPath, "Item area path");
  fail(dispositions.has(item.disposition), "item-schema-invalid", "Item dispositionが不正です。");
  fail(decisionStatuses.has(item.decision?.status), "item-schema-invalid", "Decision statusが不正です。");
  fail(executionStatuses.has(item.execution?.status), "item-schema-invalid", "Execution statusが不正です。");
  fail(validationStatuses.has(item.validation?.status), "item-schema-invalid", "Validation statusが不正です。");
  fail(alignmentStatuses.has(item.alignment?.status), "item-schema-invalid", "Alignment statusが不正です。");
  fail(item.owner === null || typeof item.owner === "string", "item-schema-invalid", "Item ownerが不正です。");
  fail(item.decisionOwner === null || typeof item.decisionOwner === "string", "item-schema-invalid", "Decision ownerが不正です。");
  fail(Array.isArray(item.dependencies) && item.dependencies.every((value) => typeof value === "string"), "item-schema-invalid", "Item dependenciesが不正です。");
  fail(Array.isArray(item.externalRefs) && item.externalRefs.every((value) => typeof value === "string"), "item-schema-invalid", "Item external refsが不正です。");
  fail(["unknown", "observed", "verified"].includes(item.confidence), "item-schema-invalid", "Item confidenceが不正です。");
  fail(item.timestamps && !Number.isNaN(new Date(item.timestamps.createdAt).valueOf()) && !Number.isNaN(new Date(item.timestamps.updatedAt).valueOf()), "item-schema-invalid", "Item timestampsが不正です。");
  fail(item.attention && ["not_evaluated"].includes(item.attention.level) && Array.isArray(item.attention.reasons), "item-schema-invalid", "Item attention placeholderが不正です。");
  if (item.decision.status === "confirmed") {
    fail(item.decision.humanConfirmed === true || item.decision.source === "accepted-canonical", "human-confirmation-invalid", "confirmed Decisionには人間確認または現在有効な明示正本が必要です。");
  }
  fail(!containsSecret(item), "secret-detected", "ItemにSecretらしき値があるため拒否します。");
  return item;
}

export function validateEvent(event) {
  fail(event && event.schemaVersion === 1 && /^cv_[a-f0-9]{20}$/u.test(event.eventId || ""), "event-schema-invalid", "Clarity Event schemaが不正です。");
  fail(eventTypes.has(event.type), "event-schema-invalid", `未対応のEvent typeです: ${event.type}`);
  fail(!event.itemId || /^ci_[a-f0-9]{20}$/u.test(event.itemId), "event-schema-invalid", "EventのItem IDが不正です。");
  oneLine(event.actor, "Event actor", 80);
  fail(!Number.isNaN(new Date(event.occurredAt).valueOf()), "event-schema-invalid", "Event occurredAtが不正です。");
  fail(!containsSecret(event), "secret-detected", "EventにSecretらしき値があるため拒否します。");
  if (event.type === "item.discovered") validateItem(event.payload?.item);
  if (event.type === "decision.confirmed") fail(event.payload?.humanConfirmed === true || event.payload?.source === "accepted-canonical", "human-confirmation-invalid", "confirmed Eventには人間確認または明示正本が必要です。");
  return event;
}

function validateLocator(locator) {
  fail(locator && typeof locator === "object" && !Array.isArray(locator), "evidence-schema-invalid", "Evidence locatorが不正です。");
  for (const [key, raw] of Object.entries(locator)) {
    const value = oneLine(raw, `Evidence locator.${key}`, 300);
    if (key.toLowerCase().includes("path")) safeRelative(value, `Evidence locator.${key}`);
    if (key === "sha") fail(/^[a-f0-9]{7,64}$/iu.test(value), "evidence-schema-invalid", "Git SHAが不正です。");
  }
}

export function validateEvidence(evidence) {
  fail(evidence && evidence.schemaVersion === 1 && /^ce_[a-f0-9]{20}$/u.test(evidence.evidenceId || ""), "evidence-schema-invalid", "Clarity Evidence schemaが不正です。");
  fail(evidenceTypes.has(evidence.type), "evidence-schema-invalid", `未対応のEvidence typeです: ${evidence.type}`);
  oneLine(evidence.source, "Evidence source", 120);
  validateLocator(evidence.locator);
  oneLine(evidence.summary, "Evidence summary", 240);
  fail(/^[a-f0-9]{64}$/u.test(evidence.contentDigest || ""), "evidence-schema-invalid", "Evidence digestが不正です。");
  fail(evidence.sensitivity === "non-secret-reference", "evidence-schema-invalid", "Evidence sensitivityは非機密参照だけを保存できます。");
  fail(["available", "source_unreachable"].includes(evidence.availability), "evidence-schema-invalid", "Evidence availabilityが不正です。");
  fail(!containsSecret(evidence), "secret-detected", "EvidenceにSecretらしき値があるため保存しません。");
  return evidence;
}

function jsonLines(path, validator) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const rows = text.split(/\r?\n/u).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new ClarityError("jsonl-invalid", `${basename(path)} ${index + 1}行目がJSONではありません。`); }
  });
  rows.forEach(validator);
  const ids = rows.map((row) => row.eventId || row.evidenceId);
  fail(new Set(ids).size === ids.length, "duplicate-id", `${basename(path)}に重複IDがあります。`);
  return rows;
}

function readCanonical(rootValue) {
  const root = rootPath(rootValue);
  const clarity = safeWritePath(root, ".clarity");
  fail(existsSync(clarity) && lstatSync(clarity).isDirectory() && !lstatSync(clarity).isSymbolicLink(), "clarity-not-initialized", "このRepoにはClarityが初期化されていません。");
  const projectPath = safeWritePath(root, ".clarity/project.json");
  fail(existsSync(projectPath), "project-missing", ".clarity/project.jsonがありません。");
  let project;
  try { project = JSON.parse(readFileSync(projectPath, "utf8")); }
  catch { throw new ClarityError("project-json-invalid", ".clarity/project.jsonがJSONではありません。"); }
  validateProject(project);
  const events = jsonLines(safeWritePath(root, ".clarity/events.jsonl"), validateEvent);
  const evidence = jsonLines(safeWritePath(root, ".clarity/evidence.jsonl"), validateEvidence);
  return { root, clarity, project, events, evidence };
}

function implemented(status) {
  return ["implemented", "verified", "operational"].includes(status);
}

export function deriveQuadrant(decisionStatus, executionStatus) {
  const confirmed = decisionStatus === "confirmed";
  const done = implemented(executionStatus);
  if (confirmed && done) return "stabilize";
  if (confirmed && !done) return "execute";
  if (!confirmed && done) return "validate";
  return "decide";
}

function applyEvent(item, event) {
  const payload = event.payload || {};
  if (event.type === "decision.pending" || event.type === "decision.proposed") {
    item.decision = { ...item.decision, status: "proposed", source: payload.source || "agent-inference", humanConfirmed: false, updatedAt: event.occurredAt };
  } else if (event.type === "decision.confirmed") {
    item.decision = { ...item.decision, status: "confirmed", source: payload.source, humanConfirmed: Boolean(payload.humanConfirmed), authority: payload.authority || item.decision.authority, updatedAt: event.occurredAt };
  } else if (event.type === "decision.rejected") {
    item.decision = { ...item.decision, status: "rejected", humanConfirmed: Boolean(payload.humanConfirmed), updatedAt: event.occurredAt };
  } else if (event.type === "decision.superseded") {
    item.decision = { ...item.decision, status: "superseded", humanConfirmed: Boolean(payload.humanConfirmed), updatedAt: event.occurredAt };
  } else if (event.type === "execution.changed") {
    fail(executionStatuses.has(payload.status), "event-schema-invalid", "Execution Eventのstatusが不正です。");
    item.execution = { ...item.execution, status: payload.status, updatedAt: event.occurredAt };
  } else if (event.type === "validation.changed") {
    fail(validationStatuses.has(payload.status), "event-schema-invalid", "Validation Eventのstatusが不正です。");
    item.validation = { ...item.validation, status: payload.status, updatedAt: event.occurredAt };
  } else if (event.type === "alignment.changed") {
    fail(alignmentStatuses.has(payload.status), "event-schema-invalid", "Alignment Eventのstatusが不正です。");
    item.alignment = { ...item.alignment, status: payload.status, updatedAt: event.occurredAt };
  } else if (event.type === "disposition.changed") {
    fail(dispositions.has(payload.disposition), "event-schema-invalid", "Disposition Eventの値が不正です。");
    item.disposition = payload.disposition;
    item.deferredUntil = payload.deferredUntil || null;
  } else if (event.type === "evidence.linked") {
    const section = payload.section;
    fail(["decision", "execution", "validation", "alignment"].includes(section), "event-schema-invalid", "Evidence link sectionが不正です。");
    const refs = new Set(item[section].evidenceRefs || []);
    refs.add(payload.evidenceId);
    item[section] = { ...item[section], evidenceRefs: [...refs].sort() };
  }
  item.timestamps = { ...item.timestamps, updatedAt: event.occurredAt };
}

function attentionState(item, evidenceById, clock) {
  const reasons = [];
  if (item.disposition === "idea" || item.disposition === "rejected") return { eligible: false, reasons };
  if (item.disposition === "deferred" && item.deferredUntil && item.deferredUntil > clock.slice(0, 10)) return { eligible: false, reasons };
  if (item.disposition === "deferred" && item.deferredUntil && item.deferredUntil <= clock.slice(0, 10)) reasons.push("deferred_due");
  if (item.decision.status !== "confirmed" && implemented(item.execution.status)) reasons.push("implemented_without_confirmed_decision");
  if (item.decision.status === "confirmed" && !implemented(item.execution.status) && item.execution.status !== "in_progress") reasons.push("confirmed_but_not_executed");
  if ([...item.decision.evidenceRefs, ...item.execution.evidenceRefs, ...item.validation.evidenceRefs, ...item.alignment.evidenceRefs]
    .some((id) => evidenceById.get(id)?.availability === "source_unreachable")) reasons.push("source_unreachable");
  return { eligible: reasons.length > 0, reasons: [...new Set(reasons)].sort() };
}

export function buildState(project, events, evidence, clock = nowIso()) {
  validateProject(project);
  events.forEach(validateEvent);
  evidence.forEach(validateEvidence);
  const evidenceById = new Map(evidence.map((row) => [row.evidenceId, row]));
  const itemMap = new Map();
  for (const event of events) {
    if (event.type === "item.discovered") {
      const item = structuredClone(event.payload.item);
      if (!itemMap.has(item.itemId)) itemMap.set(item.itemId, item);
      continue;
    }
    const item = itemMap.get(event.itemId);
    fail(item, "event-item-missing", `Eventが存在しないItemを参照しています: ${event.itemId}`);
    applyEvent(item, event);
  }
  const items = [...itemMap.values()].map((item) => {
    validateItem(item);
    const quadrant = deriveQuadrant(item.decision.status, item.execution.status);
    const attention = attentionState(item, evidenceById, clock);
    return {
      ...item,
      quadrant,
      quadrantLabel: quadrantMeta[quadrant].label,
      quadrantMeaning: quadrantMeta[quadrant].meaning,
      inProgress: item.execution.status === "in_progress",
      activeMatrix: !["rejected", "superseded"].includes(item.decision.status) && item.disposition !== "rejected",
      attentionEligible: attention.eligible,
      attentionReasons: attention.reasons,
      attention: { level: "not_evaluated", reasons: attention.reasons },
    };
  }).sort((a, b) => a.itemId.localeCompare(b.itemId, "en"));
  const generatedAt = events.map((event) => event.occurredAt).sort().at(-1) || project.createdAt;
  return {
    schemaVersion: CLARITY_SCHEMA_VERSION,
    clarityProjectId: project.clarityProjectId,
    generatedAt,
    source: { eventCount: events.length, evidenceCount: evidence.length },
    quadrants: Object.fromEntries(Object.keys(quadrantMeta).map((key) => [key, items.filter((item) => item.activeMatrix && item.quadrant === key).map((item) => item.itemId)])),
    items,
  };
}

export function validateState(state) {
  fail(state && state.schemaVersion === 1 && /^cp_[a-f0-9]{20}$/u.test(state.clarityProjectId || ""), "state-schema-invalid", "Clarity State schemaが不正です。");
  fail(Array.isArray(state.items), "state-schema-invalid", "State itemsが配列ではありません。");
  for (const item of state.items) {
    validateItem(item);
    fail(item.quadrant === deriveQuadrant(item.decision.status, item.execution.status), "state-quadrant-invalid", "State quadrantがDecision／Executionと一致しません。");
  }
  fail(!containsSecret(state), "secret-detected", "StateにSecretらしき値があるため拒否します。");
  return state;
}

function writeIfChanged(root, rel, bytes) {
  const path = safeWritePath(root, rel);
  if (existsSync(path) && readFileSync(path, "utf8") === bytes) return false;
  writeFileAtomicSafe(root, rel, bytes, { encoding: "utf8" });
  return true;
}

export function rebuildState(rootValue, { write = true } = {}) {
  const canonical = readCanonical(rootValue);
  const state = buildState(canonical.project, canonical.events, canonical.evidence);
  validateState(state);
  const bytes = stableJson(state);
  const changed = write ? writeIfChanged(canonical.root, ".clarity/state.json", bytes) : false;
  return { state, bytes, digest: sha256(bytes), changed };
}

function rootEntry() {
  return `<!-- agentic-secretary:clarity:v1:start -->\n# Project Clarity\n\n- 正本: \`.clarity/project.json\`、\`.clarity/events.jsonl\`、\`.clarity/evidence.jsonl\`\n- 現在状態: \`.clarity/state.json\`（Event／Evidenceから再構築できます）\n- 手動入口: \`clarity status\` / \`clarity history\` / \`clarity rebuild\`\n<!-- agentic-secretary:clarity:v1:end -->\n`;
}

function initializedPreview(root) {
  const canonical = readCanonical(root);
  const entryPath = safeWritePath(root, "CLARITY.md");
  const hasEntry = existsSync(entryPath) && readFileSync(entryPath, "utf8").includes("agentic-secretary:clarity:v1:start");
  return {
    action: "repair-or-noop",
    initialized: true,
    clarityProjectId: canonical.project.clarityProjectId,
    writes: hasEntry || canonical.project.rootEntry.status === "external-conflict" ? [] : ["CLARITY.md"],
    conflicts: canonical.project.rootEntry.status === "external-conflict" ? [{ path: "CLARITY.md", reason: "existing-unmanaged-file-preserved" }] : [],
    itemCount: buildState(canonical.project, canonical.events, canonical.evidence).items.length,
  };
}

export function previewInit(rootValue) {
  const root = rootPath(rootValue);
  if (existsSync(safeWritePath(root, ".clarity"))) return initializedPreview(root);
  const repoIdentity = inspectRepoIdentity(root);
  const scan = scanRepository(root);
  const existingRootEntry = existsSync(safeWritePath(root, "CLARITY.md"));
  const identitySeed = `${repoIdentity.kind}:${repoIdentity.remote.repository || repoIdentity.rootName}:${realpathSync(root)}`;
  const projectId = stableId("cp", identitySeed);
  return {
    action: "initialize",
    initialized: false,
    project: { clarityProjectId: projectId, name: repoIdentity.rootName, mode: "standalone", repoIdentity },
    scan,
    candidates: scan.candidates.map(({ contentDigest, ...candidate }) => ({ ...candidate, digest: contentDigest })),
    writes: [".clarity/project.json", ".clarity/events.jsonl", ".clarity/evidence.jsonl", ".clarity/state.json", ...(existingRootEntry ? [] : ["CLARITY.md"])],
    conflicts: existingRootEntry ? [{ path: "CLARITY.md", reason: "existing-unmanaged-file-preserved" }] : [],
    uninspected: scan.uninspected,
    excluded: scan.excluded,
  };
}

function createCanonicalFromPreview(root, preview) {
  const timestamp = nowIso();
  const project = {
    schemaVersion: CLARITY_SCHEMA_VERSION,
    clarityProjectId: preview.project.clarityProjectId,
    name: oneLine(preview.project.name, "Project name", 120),
    mode: "standalone",
    createdAt: timestamp,
    repoIdentity: preview.project.repoIdentity,
    secretaryLink: null,
    compatibility: { reader: { min: 1, max: 1 }, writer: { min: 1, max: 1 } },
    rootEntry: { path: "CLARITY.md", status: preview.conflicts.length ? "external-conflict" : "managed-block" },
  };
  validateProject(project);
  const evidence = [];
  const events = [];
  for (const candidate of preview.scan.candidates) {
    const item = initialItem(project.clarityProjectId, candidate, timestamp);
    const proof = fileEvidence(project.clarityProjectId, item, candidate, timestamp);
    item.decision.evidenceRefs = [proof.evidenceId];
    if (item.execution.status !== "not_started") item.execution.evidenceRefs = [proof.evidenceId];
    validateItem(item);
    validateEvidence(proof);
    evidence.push(proof);
    events.push(eventFor(project.clarityProjectId, "item.discovered", item.itemId, "clarity-init", timestamp, { item }));
  }
  fail(events.length > 0, "no-candidates", "実Repo由来のItem候補を作れないため、空テンプレで初期化しません。", { scan: preview.scan });
  const state = buildState(project, events, evidence, timestamp);
  return { project, events, evidence, state };
}

export function applyInit(rootValue) {
  const root = rootPath(rootValue);
  const preview = previewInit(root);
  if (preview.initialized) {
    let changed = false;
    if (preview.writes.includes("CLARITY.md")) changed = writeIfChanged(root, "CLARITY.md", rootEntry());
    const rebuilt = rebuildState(root, { write: true });
    return { status: changed || rebuilt.changed ? "repaired" : "unchanged", preview, changes: { rootEntry: changed, state: rebuilt.changed } };
  }
  const canonical = createCanonicalFromPreview(root, preview);
  const nonce = `${process.pid}-${Date.now()}`;
  const stageRel = `.clarity-init-${nonce}`;
  const stage = safeWritePath(root, stageRel);
  const target = safeWritePath(root, ".clarity");
  fail(!existsSync(target), "clarity-conflict", ".clarity/が同時に作成されたため、上書きせず停止しました。");
  mkdirSync(stage);
  try {
    writeFileSync(join(stage, "project.json"), stableJson(canonical.project), { encoding: "utf8", flag: "wx" });
    writeFileSync(join(stage, "events.jsonl"), canonical.events.map((row) => JSON.stringify(row)).join("\n") + "\n", { encoding: "utf8", flag: "wx" });
    writeFileSync(join(stage, "evidence.jsonl"), canonical.evidence.map((row) => JSON.stringify(row)).join("\n") + "\n", { encoding: "utf8", flag: "wx" });
    writeFileSync(join(stage, "state.json"), stableJson(canonical.state), { encoding: "utf8", flag: "wx" });
    if (process.env.CLARITY_FAIL_AT === "before-canonical") throw new ClarityError("failure-injected", "テスト用: canonical rename前に停止しました。", 4);
    renameSync(stage, target);
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  }
  if (process.env.CLARITY_FAIL_AT === "after-canonical") {
    throw new ClarityError("init-partial", "Clarity canonicalは作成済みですが、root entryは未完了です。再実行で残りだけを完了できます。", 4, { completed: [".clarity/"], pending: preview.conflicts.length ? [] : ["CLARITY.md"] });
  }
  let entryWritten = false;
  if (!preview.conflicts.length) entryWritten = writeIfChanged(root, "CLARITY.md", rootEntry());
  return { status: preview.conflicts.length ? "initialized-with-root-entry-conflict" : "initialized", clarityProjectId: canonical.project.clarityProjectId, itemCount: canonical.state.items.length, entryWritten, preview };
}

function appendJsonLine(root, rel, row, idKey, validator) {
  validator(row);
  const path = safeWritePath(root, rel);
  const rows = jsonLines(path, validator);
  if (rows.some((existing) => existing[idKey] === row[idKey])) return false;
  const bytes = `${rows.map((existing) => JSON.stringify(existing)).join("\n")}${rows.length ? "\n" : ""}${JSON.stringify(row)}\n`;
  writeFileAtomicSafe(root, rel, bytes, { encoding: "utf8" });
  return true;
}

export function appendEvent(rootValue, input) {
  const canonical = readCanonical(rootValue);
  const payload = structuredClone(input.payload || {});
  const occurredAt = input.occurredAt || nowIso();
  const event = {
    schemaVersion: 1,
    eventId: input.eventId || stableId("cv", `${canonical.project.clarityProjectId}:${input.type}:${input.itemId}:${JSON.stringify(payload)}`),
    type: input.type,
    itemId: input.itemId,
    actor: input.actor || "manual-cli",
    occurredAt,
    payload,
  };
  const changed = appendJsonLine(canonical.root, ".clarity/events.jsonl", event, "eventId", validateEvent);
  const rebuilt = rebuildState(canonical.root, { write: true });
  return { event, changed, stateChanged: rebuilt.changed, state: rebuilt.state };
}

export function appendEvidence(rootValue, input) {
  const canonical = readCanonical(rootValue);
  const normalized = {
    schemaVersion: 1,
    evidenceId: input.evidenceId || stableId("ce", `${canonical.project.clarityProjectId}:${input.type}:${input.source}:${JSON.stringify(input.locator)}:${input.contentDigest || sha256(input.summary || "")}`),
    type: input.type,
    source: input.source,
    locator: input.locator,
    summary: input.summary,
    observedAt: input.observedAt || nowIso(),
    contentDigest: input.contentDigest || sha256(input.summary || ""),
    sensitivity: input.sensitivity || "non-secret-reference",
    availability: input.availability || "available",
  };
  const changed = appendJsonLine(canonical.root, ".clarity/evidence.jsonl", normalized, "evidenceId", validateEvidence);
  return { evidence: normalized, changed };
}

function readStoredState(root) {
  const path = safeWritePath(root, ".clarity/state.json");
  if (!existsSync(path)) return { state: null, error: "state-missing" };
  try {
    const state = JSON.parse(readFileSync(path, "utf8"));
    validateState(state);
    return { state, error: null };
  } catch (error) {
    return { state: null, error: error instanceof ClarityError ? error.code : "state-json-invalid" };
  }
}

export function doctor(rootValue) {
  const canonical = readCanonical(rootValue);
  const expected = buildState(canonical.project, canonical.events, canonical.evidence);
  const expectedBytes = stableJson(expected);
  const stored = readStoredState(canonical.root);
  const storedBytes = stored.state ? stableJson(stored.state) : null;
  const humanConfirmationMismatch = stored.error === "human-confirmation-invalid" || Boolean(stored.state && stored.state.items.some((item) => {
    const rebuilt = expected.items.find((candidate) => candidate.itemId === item.itemId);
    return rebuilt && (item.decision.humanConfirmed !== rebuilt.decision.humanConfirmed || item.decision.status !== rebuilt.decision.status);
  }));
  return {
    ok: !stored.error && storedBytes === expectedBytes,
    mode: canonical.project.mode,
    schemaVersion: canonical.project.schemaVersion,
    clarityProjectId: canonical.project.clarityProjectId,
    repoIdentity: canonical.project.repoIdentity,
    remoteStatus: canonical.project.repoIdentity.remote.status,
    stateError: stored.error,
    stateMismatch: storedBytes !== expectedBytes,
    humanConfirmationMismatch,
    eventCount: canonical.events.length,
    evidenceCount: canonical.evidence.length,
    itemCount: expected.items.length,
    rootEntry: canonical.project.rootEntry,
  };
}

export function status(rootValue) {
  const canonical = readCanonical(rootValue);
  const state = buildState(canonical.project, canonical.events, canonical.evidence);
  return {
    clarityProjectId: canonical.project.clarityProjectId,
    mode: canonical.project.mode,
    repoIdentity: canonical.project.repoIdentity,
    itemCount: state.items.length,
    quadrants: Object.fromEntries(Object.entries(state.quadrants).map(([key, ids]) => [key, { label: quadrantMeta[key].label, count: ids.length }])),
    partial: doctor(canonical.root).stateMismatch,
  };
}

export function history(rootValue) {
  const canonical = readCanonical(rootValue);
  return {
    clarityProjectId: canonical.project.clarityProjectId,
    events: canonical.events.map((event) => ({ eventId: event.eventId, type: event.type, itemId: event.itemId, actor: event.actor, occurredAt: event.occurredAt })),
    evidence: canonical.evidence.map((item) => ({ evidenceId: item.evidenceId, type: item.type, source: item.source, locator: item.locator, observedAt: item.observedAt, availability: item.availability })),
  };
}

function projectDecisionFiles(secretaryRoot, projectName) {
  const name = oneLine(projectName, "Project name", 100);
  fail(!/[\\/]/u.test(name) && !name.includes(".."), "project-name-invalid", "Project名が安全ではありません。");
  const projectDir = safeWritePath(secretaryRoot, `projects/open/${name}`);
  fail(existsSync(projectDir) && lstatSync(projectDir).isDirectory() && !lstatSync(projectDir).isSymbolicLink(), "project-missing", "generic open projectが見つかりません。");
  return { projectDir, projectFile: safeWritePath(secretaryRoot, `projects/open/${name}/PROJECT.md`), decisionsFile: safeWritePath(secretaryRoot, `projects/open/${name}/DECISIONS.md`) };
}

function findDecision(files, decision) {
  const escaped = decision.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const path of [files.projectFile, files.decisionsFile]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const match = text.match(new RegExp(`(D-\\d{3})[^\\n]*${escaped}`, "u"));
    if (match) return { id: match[1], path: basename(path) };
  }
  return null;
}

export function decideGenericProject(rootValue, {
  secretaryRoot: secretaryRootValue,
  projectName,
  itemId,
  decision,
  current,
  next,
  operationId,
  failAt = process.env.CLARITY_DECISION_FAIL_AT || "",
} = {}) {
  const root = rootPath(rootValue);
  const secretary = rootPath(secretaryRootValue);
  const files = projectDecisionFiles(secretary, projectName);
  fail(realpathSync(files.projectDir) === root, "project-root-mismatch", "Clarity rootとgeneric project rootが一致しません。別Repoへwriteしません。");
  const canonical = readCanonical(root);
  const selectedItem = itemId || buildState(canonical.project, canonical.events, canonical.evidence).items[0]?.itemId;
  fail(selectedItem, "item-missing", "Decisionを関連付けるClarity Itemがありません。");
  const safeDecision = oneLine(decision, "Decision", 240);
  const safeCurrent = oneLine(current, "Current status", 240);
  const safeNext = oneLine(next, "Next entry", 240);
  const opId = operationId || stableId("op", `${canonical.project.clarityProjectId}:${projectName}:${safeDecision}`);
  const prior = canonical.events.filter((event) => event.payload?.operationId === opId);
  if (prior.some((event) => event.type === "decision.confirmed")) {
    return { status: "unchanged", operationId: opId, decision: findDecision(files, safeDecision), duplicate: false };
  }
  if (!prior.some((event) => event.type === "decision.pending")) {
    appendEvent(root, { type: "decision.pending", itemId: selectedItem, actor: "human-confirmation", payload: { operationId: opId, source: "generic-project-decision", humanConfirmed: false } });
  }
  let stored = findDecision(files, safeDecision);
  if (!stored) {
    if (failAt === "decision-write") {
      throw new ClarityError("decision-partial", "Clarityには確認待ちを記録しましたが、Decision正本の書込みに失敗しました。確定表示していません。", 4, { operationId: opId, completed: ["clarity-pending"], pending: ["project-decision", "clarity-confirmation"] });
    }
    const projectTool = resolve(dirname(fileURLToPath(import.meta.url)), "../project-tools.mjs");
    let result;
    try {
      result = runExternalSync(process.execPath, [projectTool, "add-decision", secretary, projectName, "--decision", safeDecision, "--current", safeCurrent, "--next", safeNext, "--confirm"], {
        encoding: "utf8",
        timeoutMs: 15_000,
        maxBuffer: 2 * 1024 * 1024,
        allowFailure: true,
        label: "generic project Decision write",
        env: { ...process.env, CC_SECRETARY_NOW: process.env.CC_SECRETARY_NOW || nowIso() },
      });
    } catch (error) {
      throw new ClarityError("decision-partial", "Clarityには確認待ちを記録しましたが、既存Decision正本の処理が安全に完了しませんでした。確定表示していません。", 4, { operationId: opId, completed: ["clarity-pending"], pending: ["project-decision", "clarity-confirmation"], decisionError: error?.code || "external-operation-failed" });
    }
    if (result.status !== 0) {
      throw new ClarityError("decision-partial", "Clarityには確認待ちを記録しましたが、既存Decision正本は更新できませんでした。確定表示していません。", 4, { operationId: opId, completed: ["clarity-pending"], pending: ["project-decision", "clarity-confirmation"], decisionExit: result.status, decisionError: String(result.stderr || "").trim().slice(0, 300) });
    }
    stored = findDecision(files, safeDecision);
    fail(stored, "decision-write-unverified", "既存Decision seam成功後の正本を再確認できませんでした。");
  }
  if (failAt === "clarity-finalize") {
    throw new ClarityError("decision-partial", "Decision正本は更新済みですが、Clarity確定Eventが未完了です。再実行はDecisionを重複せず残りだけ完了します。", 4, { operationId: opId, completed: ["project-decision"], pending: ["clarity-confirmation"], decision: stored });
  }
  const result = appendEvent(root, {
    type: "decision.confirmed",
    itemId: selectedItem,
    actor: "human-confirmation",
    payload: {
      operationId: opId,
      source: "generic-project-decision",
      humanConfirmed: true,
      authority: "project-decision-canonical",
      decisionRef: `${stored.path}#${stored.id}`,
    },
  });
  return { status: result.changed ? "saved" : "unchanged", operationId: opId, decision: stored, eventId: result.event.eventId, duplicate: false };
}
