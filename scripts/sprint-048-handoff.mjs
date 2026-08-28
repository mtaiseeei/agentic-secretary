#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = "adapters/downstream-clarity-handoff.json";
const SHA40 = /^[0-9a-f]{40}$/u;
const SHA64 = /^[0-9a-f]{64}$/u;
const FORBIDDEN_COMMON_PATH = /(?:^|\/)(?:my-vault|yasashii-secretary|notion-tasks|task-triage|vault-documents|vault-search)(?:\/|$)|(?:^|\/)05\/02(?:\/|$)/u;

function fail(code, detail = "") {
  throw new Error(`${code}${detail ? `:${detail}` : ""}`);
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.some((item) => typeof item !== "string" || !item)) fail(`invalid-${label}`);
  if (new Set(values).size !== values.length) fail(`duplicate-${label}`);
  return values;
}

function mode(path) {
  return lstatSync(path).mode & 0o111 ? "100755" : "100644";
}

function walk(root, current = root) {
  const output = [];
  for (const name of readdirSync(current).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const absolute = join(current, name);
    const path = relative(root, absolute).replaceAll("\\", "/");
    if (path === ".git" || path.startsWith(".git/")) continue;
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) fail("candidate-symlink", path);
    if (stat.isDirectory()) output.push(...walk(root, absolute));
    else if (stat.isFile()) output.push(path);
    else fail("candidate-entry-unsupported", path);
  }
  return output;
}

export function digestPaths(rootValue, pathsValue) {
  const root = resolve(rootValue);
  const paths = [...pathsValue].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const hash = createHash("sha256");
  for (const path of paths) {
    const absolute = join(root, path);
    if (!existsSync(absolute) || !lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()) fail("missing-common-path", path);
    hash.update(path).update("\0").update(mode(absolute)).update("\0").update(readFileSync(absolute)).update("\0");
  }
  return { fileCount: paths.length, sha256: hash.digest("hex") };
}

export function digestTree(rootValue) {
  const root = resolve(rootValue);
  const paths = walk(root);
  return { paths, ...digestPaths(root, paths) };
}

export function validateHandoffTemplate(rootValue = SCRIPT_ROOT, manifestValue = null) {
  const root = resolve(rootValue);
  const manifest = manifestValue ?? JSON.parse(readFileSync(join(root, TEMPLATE_PATH), "utf8"));
  if (manifest.schemaVersion !== 1 || manifest.kind !== "agentic-secretary-clarity-fixed-handoff") fail("handoff-schema");
  if (manifest.sourceEdition !== "agentic-secretary" || manifest.candidateVersion !== "0.11.0") fail("handoff-identity");
  if (manifest.publicationStatus !== "pending-public-evaluator-pass" || manifest.acceptedSource !== null) fail("handoff-premature-acceptance");
  const commonPaths = uniqueStrings(manifest.commonPaths, "common-paths");
  for (const path of commonPaths) {
    if (path.startsWith("/") || path.includes("..") || FORBIDDEN_COMMON_PATH.test(path)) fail("handoff-common-path-unsafe", path);
    if (!existsSync(join(root, path))) fail("handoff-common-path-missing", path);
  }
  if (!Array.isArray(manifest.adapterSeams) || manifest.adapterSeams.length < 4) fail("handoff-adapter-seams");
  for (const seam of manifest.adapterSeams) {
    if (!seam || typeof seam.id !== "string" || !commonPaths.includes(seam.path)) fail("handoff-adapter-seam-path", seam?.id || "unknown");
  }
  const excluded = uniqueStrings(manifest.excludedPaths, "excluded-paths");
  for (const required of [".git/**", ".harness/**", "docs/spec/**", "docs/sprints/**", "docs/progress/**", "docs/feedback/**", "README.md"]) {
    if (!excluded.includes(required)) fail("handoff-excluded-path-missing", required);
  }
  const expectedDownstreams = ["agentic-secretary-my-vault", "yasashii-secretary"];
  if (JSON.stringify(manifest.downstreamOrder) !== JSON.stringify(expectedDownstreams)) fail("handoff-downstream-order");
  for (const id of expectedDownstreams) uniqueStrings(manifest.protectedDownstreamPaths?.[id], `protected-${id}`);
  if (manifest.preWriteGate?.script !== "scripts/sprint-048-handoff.mjs"
    || manifest.preWriteGate?.status !== "closed"
    || manifest.preWriteGate?.requiredPublicationStatus !== "public-evaluator-pass"
    || manifest.preWriteGate?.writesDownstream !== false) fail("handoff-prewrite-template");
  if (manifest.rollback?.strategy !== "file-scoped-pre-sync-commit" || typeof manifest.rollback?.instruction !== "string") fail("handoff-rollback");
  return manifest;
}

function assertReadyShape(template, ready) {
  if (ready.schemaVersion !== template.schemaVersion || ready.kind !== template.kind || ready.candidateVersion !== template.candidateVersion) fail("ready-schema-or-version");
  if (ready.publicationStatus !== "public-evaluator-pass" || ready.preWriteGate?.status !== "ready") fail("prewrite-not-ready");
  if (JSON.stringify(ready.commonPaths) !== JSON.stringify(template.commonPaths)) fail("ready-common-paths-changed");
  if (JSON.stringify(ready.excludedPaths) !== JSON.stringify(template.excludedPaths)) fail("ready-excluded-paths-changed");
  if (JSON.stringify(ready.protectedDownstreamPaths) !== JSON.stringify(template.protectedDownstreamPaths)) fail("ready-protected-paths-changed");
  const accepted = ready.acceptedSource;
  if (!accepted || !SHA40.test(accepted.fullSha || "") || !SHA64.test(accepted.treeSha256 || "")
    || !SHA64.test(accepted.commonTreeSha256 || "") || !Number.isInteger(accepted.fileCount) || accepted.fileCount <= 0) fail("ready-accepted-source");
  return accepted;
}

export function evaluatePreWriteGate({ root = SCRIPT_ROOT, template, ready, candidateRoot, observedSha, protectedSnapshot }) {
  const canonicalTemplate = validateHandoffTemplate(root, template);
  const accepted = assertReadyShape(canonicalTemplate, ready);
  if (!SHA40.test(observedSha || "") || observedSha !== accepted.fullSha) fail("stale-source-sha");
  const tree = digestTree(candidateRoot);
  if (tree.sha256 !== accepted.treeSha256 || tree.fileCount !== accepted.fileCount) fail("candidate-tree-mismatch");
  const common = digestPaths(candidateRoot, canonicalTemplate.commonPaths);
  if (common.sha256 !== accepted.commonTreeSha256) fail("candidate-common-digest-mismatch");
  for (const id of canonicalTemplate.downstreamOrder) {
    const expectedPaths = canonicalTemplate.protectedDownstreamPaths[id];
    const declared = ready.protectedDigests?.[id];
    const observed = protectedSnapshot?.[id];
    if (!declared || !observed) fail("protected-digest-missing", id);
    for (const path of expectedPaths) {
      if (!SHA64.test(declared[path] || "") || !SHA64.test(observed[path] || "")) fail("protected-digest-missing", `${id}:${path}`);
      if (declared[path] !== observed[path]) fail("protected-digest-mismatch", `${id}:${path}`);
    }
    for (const path of Object.keys(declared)) if (!expectedPaths.includes(path)) fail("protected-digest-extra", `${id}:${path}`);
  }
  return {
    schemaVersion: 1,
    status: "ready",
    writesDownstream: false,
    acceptedSource: accepted,
    common,
    protectedVerified: true,
    excludedVerified: true
  };
}

const USER_DECISION_STATUS = "public-user-decision-risk-accepted";
const USER_DECISION_BASIS = "user-risk-acceptance";
const ACCEPTED_PRODUCT_SOURCE = Object.freeze({
  fullSha: "5f08d454c05576fcff8ab32c10c00887b4c15a96",
  treeSha256: "1fbffe636565355b875dcde35ff05d26cd7e15f00710c1c88a563866749037c5",
  fileCount: 828,
  commonTreeSha256: "4aa6e8d4b21aa9e0020cfaa6edefd5ff0e6640fd2e8f937db00478190142f849",
  commonFileCount: 44,
});
const ORIGIN_EVALUATION = Object.freeze({
  feedbackCommit: "8483d86390b6c105163e64d24dcafe498ed2fe8b",
  feedbackPath: "docs/feedback/sprint-050.md",
  feedbackSha256: "fcaed413963cfcee2ea6303c1293a8c376b197a4998b5e3a682154eeca1b9cdd",
  verdict: "verification-scope-issue",
  productFindingCount: 0,
  blockingResidualIds: ["AC3", "C21"],
  conditionalNotRunIds: ["XM-007"],
  otherPhaseResidualIds: [
    "claude-code-desktop", "codex-app", "windows-native", "mac-mini",
    "private-my-vault-application", "yasashii-application", "release", "tag", "push",
    "marketplace", "installed-cache", "new-session-loaded-version",
  ],
  registry: { pass: 273, fail: 0, conditionalNotRun: 1 },
  e2e: { pass: 4, total: 4 },
});
const AUTHORIZATION_RECORD = Object.freeze({
  authorizationId: "sprint-050-downstream-user-decision-2026-08-28",
  decisionDate: "2026-08-28",
  exactQuote: "よいです",
  recordedBy: "user-explicit-decision",
  revoked: false,
  context: "Sprint 050のexact candidateについて、Claude CodeとCodexの実install後live conversation・Hook発火未実施を後日自ら確認するリスクとして引き受け、元feedbackと未達を保持したままprivate my-vault、次にYasashiiの別Harnessへ展開してよい。",
  scope: {
    authorized: ["private-my-vault-separate-harness", "yasashii-separate-harness-after-private"],
    notAuthorized: ["release", "tag", "push", "marketplace", "installed-cache", "new-session", "xmind-mcp-write", "host-live-write", "downstream-write-by-public-patch"],
  },
  targetAcceptedFullSha: ACCEPTED_PRODUCT_SOURCE.fullSha,
  targetOriginFeedbackCommit: ORIGIN_EVALUATION.feedbackCommit,
  targetOriginFeedbackSha256: ORIGIN_EVALUATION.feedbackSha256,
  acceptedResidualIds: ["AC3", "C21"],
  notAcceptedResidualIds: ["XM-007", ...ORIGIN_EVALUATION.otherPhaseResidualIds],
  downstreamOrder: ["agentic-secretary-my-vault", "yasashii-secretary"],
  invalidatedBy: [
    "accepted-source-change", "origin-feedback-change", "residual-reduction-or-replacement",
    "scope-change", "downstream-order-or-identity-change", "common-excluded-protected-path-change",
    "protected-digest-change", "rollback-change", "authorization-revocation",
    "governance-non-pass-or-commit-change",
  ],
});
const DOWNSTREAM_REPOSITORIES = Object.freeze({
  "agentic-secretary-my-vault": "mtaiseeei/agentic-secretary-my-vault",
  "yasashii-secretary": "mtaiseeei/yasashii-secretary",
});
const GOVERNANCE_FEEDBACK_PATH = "docs/feedback/sprint-050-patch-001.md";

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertJson(value, expected, code) {
  if (!jsonEqual(value, expected)) fail(code);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertAcceptedProductSource(source) {
  if (!source || source.fullSha !== ACCEPTED_PRODUCT_SOURCE.fullSha) fail("accepted-source-sha");
  if (source.treeSha256 !== ACCEPTED_PRODUCT_SOURCE.treeSha256) fail("accepted-source-tree-digest");
  if (source.fileCount !== ACCEPTED_PRODUCT_SOURCE.fileCount) fail("accepted-source-file-count");
  if (source.commonTreeSha256 !== ACCEPTED_PRODUCT_SOURCE.commonTreeSha256) fail("accepted-source-common-digest");
  if (source.commonFileCount !== ACCEPTED_PRODUCT_SOURCE.commonFileCount) fail("accepted-source-common-file-count");
}

function assertOriginEvaluation(origin) {
  if (!origin || origin.feedbackCommit !== ORIGIN_EVALUATION.feedbackCommit) fail("origin-feedback-commit");
  if (origin.feedbackPath !== ORIGIN_EVALUATION.feedbackPath) fail("origin-feedback-path");
  if (origin.feedbackSha256 !== ORIGIN_EVALUATION.feedbackSha256) fail("origin-feedback-digest");
  if (origin.verdict !== ORIGIN_EVALUATION.verdict) fail("origin-feedback-verdict");
  if (origin.productFindingCount !== 0) fail("origin-product-findings");
  assertJson(origin.blockingResidualIds, ORIGIN_EVALUATION.blockingResidualIds, "origin-blocking-residuals");
  assertJson(origin.conditionalNotRunIds, ORIGIN_EVALUATION.conditionalNotRunIds, "origin-conditional-residuals");
  assertJson(origin.otherPhaseResidualIds, ORIGIN_EVALUATION.otherPhaseResidualIds, "origin-other-phase-residuals");
  assertJson(origin.registry, ORIGIN_EVALUATION.registry, "origin-registry-result");
  assertJson(origin.e2e, ORIGIN_EVALUATION.e2e, "origin-e2e-result");
}

function assertAuthorization(record) {
  if (!record || typeof record !== "object") fail("authorization-record-missing");
  if (record.authorizationId !== AUTHORIZATION_RECORD.authorizationId) fail("authorization-id");
  if (record.decisionDate !== AUTHORIZATION_RECORD.decisionDate) fail("authorization-date");
  if (record.exactQuote !== AUTHORIZATION_RECORD.exactQuote) fail("authorization-quote");
  if (record.recordedBy !== AUTHORIZATION_RECORD.recordedBy) fail("authorization-provenance");
  if (record.revoked !== false) fail("authorization-revoked");
  if (record.context !== AUTHORIZATION_RECORD.context) fail("authorization-context");
  assertJson(record.scope, AUTHORIZATION_RECORD.scope, "authorization-scope");
  if (record.targetAcceptedFullSha !== ACCEPTED_PRODUCT_SOURCE.fullSha) fail("authorization-candidate");
  if (record.targetOriginFeedbackCommit !== ORIGIN_EVALUATION.feedbackCommit
    || record.targetOriginFeedbackSha256 !== ORIGIN_EVALUATION.feedbackSha256) fail("authorization-feedback");
  assertJson(record.acceptedResidualIds, AUTHORIZATION_RECORD.acceptedResidualIds, "authorization-accepted-residuals");
  assertJson(record.notAcceptedResidualIds, AUTHORIZATION_RECORD.notAcceptedResidualIds, "authorization-not-accepted-residuals");
  assertJson(record.downstreamOrder, AUTHORIZATION_RECORD.downstreamOrder, "authorization-downstream-order");
  assertJson(record.invalidatedBy, AUTHORIZATION_RECORD.invalidatedBy, "authorization-invalidation-rules");
}

export function validateUserDecisionTemplate(rootValue = SCRIPT_ROOT, manifestValue = null) {
  const manifest = validateHandoffTemplate(rootValue, manifestValue);
  assertJson(manifest.downstreamRepositories, DOWNSTREAM_REPOSITORIES, "handoff-downstream-repositories");
  const gate = manifest.userDecisionPreWriteGate;
  if (!gate || gate.status !== "closed" || gate.requiredPublicationStatus !== USER_DECISION_STATUS
    || gate.requiredAcceptanceBasisType !== USER_DECISION_BASIS || gate.evaluatorPass !== false
    || gate.writesDownstream !== false) fail("user-decision-template-gate");
  assertAcceptedProductSource(gate.fixedBindings?.acceptedProductSource);
  assertOriginEvaluation(gate.fixedBindings?.originEvaluation);
  assertAuthorization(gate.fixedBindings?.authorizationRecord);
  if (gate.requiredGovernance?.feedbackPath !== GOVERNANCE_FEEDBACK_PATH
    || gate.requiredGovernance?.verdict !== "PASS"
    || gate.requiredGovernance?.evaluatedCommitLabel !== "Evaluated commit") fail("governance-template-requirements");
  return manifest;
}

function assertUserDecisionReadyShape(template, ready) {
  if (!ready || ready.schemaVersion !== template.schemaVersion || ready.kind !== template.kind
    || ready.candidateVersion !== template.candidateVersion) fail("user-decision-ready-schema-or-version");
  if (ready.publicationStatus !== USER_DECISION_STATUS) fail("user-decision-publication-status");
  if (ready.preWriteGate?.status !== "closed") fail("public-evaluator-gate-was-repurposed");
  const gate = ready.userDecisionPreWriteGate;
  if (!gate || gate.status !== "ready" || gate.requiredPublicationStatus !== USER_DECISION_STATUS
    || gate.requiredAcceptanceBasisType !== USER_DECISION_BASIS || gate.evaluatorPass !== false
    || gate.writesDownstream !== false) fail("user-decision-prewrite-not-ready");
  if (!ready.acceptanceBasis || ready.acceptanceBasis.type !== USER_DECISION_BASIS) fail("acceptance-basis-missing");
  if (ready.acceptanceBasis.evaluatorPass !== false) fail("user-decision-evaluator-pass-promoted");
  if (ready.acceptanceBasis.originVerdict !== ORIGIN_EVALUATION.verdict) fail("acceptance-basis-origin-verdict");
  assertJson(gate.fixedBindings, template.userDecisionPreWriteGate.fixedBindings, "user-decision-fixed-bindings-changed");
  assertAcceptedProductSource(ready.acceptedSource);
  assertOriginEvaluation(ready.originEvaluation);
  assertAuthorization(ready.authorizationRecord);
  if (ready.verificationStatus?.hostLive?.verified !== false) fail("host-live-verification-promoted");
  assertJson(ready.verificationStatus?.hostLive?.blockingResidualIds, ["AC3", "C21"], "host-live-residuals-changed");
  if (ready.verificationStatus?.xmindMcp?.verified !== false) fail("xmind-verification-promoted");
  if (ready.verificationStatus?.xmindMcp?.conditionalNotRunId !== "XM-007") fail("xmind-conditional-residual-changed");
  assertJson(ready.commonPaths, template.commonPaths, "user-decision-common-paths-changed");
  assertJson(ready.adapterSeams, template.adapterSeams, "user-decision-adapter-seams-changed");
  assertJson(ready.excludedPaths, template.excludedPaths, "user-decision-excluded-paths-changed");
  assertJson(ready.protectedDownstreamPaths, template.protectedDownstreamPaths, "user-decision-protected-paths-changed");
  assertJson(ready.downstreamRepositories, template.downstreamRepositories, "user-decision-downstream-repositories-changed");
  assertJson(ready.downstreamOrder, template.downstreamOrder, "user-decision-downstream-order-changed");
  assertJson(ready.xmindContract, template.xmindContract, "user-decision-xmind-contract-changed");
  assertJson(ready.rollback, template.rollback, "user-decision-rollback-changed");
}

function assertOriginFeedback(rootValue, origin) {
  const absolute = join(resolve(rootValue), origin.feedbackPath);
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) fail("origin-feedback-file-missing");
  if (sha256(readFileSync(absolute)) !== origin.feedbackSha256) fail("origin-feedback-bytes-mismatch");
}

function parseGovernanceFeedback(bytes) {
  const body = bytes.toString("utf8");
  const verdict = body.match(/^\s*(?:\*\*)?(?:Verdict|判定)(?:\*\*)?\s*[:：]\s*(?:\*\*)?(PASS|合格)(?:\*\*)?\s*$/imu);
  if (!verdict) fail("governance-feedback-non-pass");
  const evaluated = body.match(/^\s*(?:\*\*)?(?:Evaluated commit|評価対象commit|評価対象 commit)(?:\*\*)?\s*[:：]\s*`?([0-9a-f]{40})`?\s*$/imu);
  if (!evaluated) fail("governance-feedback-evaluated-commit-missing");
  return { verdict: "PASS", evaluatedFullSha: evaluated[1] };
}

function assertGovernanceCheckout(rootValue, expectedSha) {
  if (!rootValue) fail("governance-checkout-required");
  const root = resolve(rootValue);
  if (!existsSync(join(root, ".git"))) fail("governance-checkout-git-required");
  const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (head.status !== 0 || head.stdout.trim() !== expectedSha) fail("governance-checkout-head-mismatch");
  const status = spawnSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" });
  if (status.status !== 0 || status.stdout !== "") fail("governance-checkout-dirty");
}

function assertGovernanceSource(source, feedbackRoot, observedGovernanceSha, governanceRoot) {
  if (!source || !SHA40.test(source.implementationFullSha || "")) fail("governance-source-missing");
  if (source.implementationFullSha === ACCEPTED_PRODUCT_SOURCE.fullSha) fail("governance-source-accepted-source-confusion");
  if (!SHA40.test(observedGovernanceSha || "") || observedGovernanceSha !== source.implementationFullSha) fail("governance-source-stale");
  assertGovernanceCheckout(governanceRoot, source.implementationFullSha);
  if (source.feedbackPath !== GOVERNANCE_FEEDBACK_PATH) fail("governance-feedback-path");
  if (!SHA64.test(source.feedbackSha256 || "")) fail("governance-feedback-digest");
  if (source.verdict !== "PASS") fail("governance-source-non-pass");
  if (source.evaluatedFullSha !== source.implementationFullSha) fail("governance-source-evaluated-commit-mismatch");
  const absolute = join(resolve(feedbackRoot), source.feedbackPath);
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) fail("governance-feedback-missing");
  const bytes = readFileSync(absolute);
  if (sha256(bytes) !== source.feedbackSha256) fail("governance-feedback-bytes-mismatch");
  const parsed = parseGovernanceFeedback(bytes);
  if (parsed.evaluatedFullSha !== source.implementationFullSha) fail("governance-feedback-evaluated-commit-mismatch");
}

function assertProtectedSnapshots(template, ready, protectedSnapshot) {
  for (const id of template.downstreamOrder) {
    const expectedPaths = template.protectedDownstreamPaths[id];
    const declared = ready.protectedDigests?.[id];
    const observed = protectedSnapshot?.[id];
    if (!declared || !observed) fail("user-decision-protected-digest-missing", id);
    if (!jsonEqual(Object.keys(declared), expectedPaths) || !jsonEqual(Object.keys(observed), expectedPaths)) fail("user-decision-protected-digest-scope", id);
    for (const path of expectedPaths) {
      if (!SHA64.test(declared[path] || "") || !SHA64.test(observed[path] || "")) fail("user-decision-protected-digest-invalid", `${id}:${path}`);
      if (declared[path] !== observed[path]) fail("user-decision-protected-digest-mismatch", `${id}:${path}`);
    }
  }
}

export function evaluateUserDecisionPreWriteGate({
  root = SCRIPT_ROOT, template, ready, acceptedCandidateRoot, observedAcceptedSha,
  originFeedbackRoot = root, governanceRoot, governanceFeedbackRoot = root, observedGovernanceSha, protectedSnapshot,
}) {
  const canonicalTemplate = validateUserDecisionTemplate(root, template);
  assertUserDecisionReadyShape(canonicalTemplate, ready);
  assertOriginFeedback(originFeedbackRoot, ready.originEvaluation);
  if (observedAcceptedSha !== ready.acceptedSource.fullSha) fail("accepted-source-stale");
  const tree = digestTree(acceptedCandidateRoot);
  if (tree.sha256 !== ready.acceptedSource.treeSha256) fail("accepted-candidate-tree-mismatch");
  if (tree.fileCount !== ready.acceptedSource.fileCount) fail("accepted-candidate-file-count-mismatch");
  const common = digestPaths(acceptedCandidateRoot, canonicalTemplate.commonPaths);
  if (common.sha256 !== ready.acceptedSource.commonTreeSha256) fail("accepted-candidate-common-digest-mismatch");
  if (common.fileCount !== ready.acceptedSource.commonFileCount) fail("accepted-candidate-common-file-count-mismatch");
  assertGovernanceSource(ready.governanceSource, governanceFeedbackRoot, observedGovernanceSha, governanceRoot);
  assertProtectedSnapshots(canonicalTemplate, ready, protectedSnapshot);
  return {
    schemaVersion: 1,
    status: "ready",
    publicationStatus: USER_DECISION_STATUS,
    acceptanceBasis: { type: USER_DECISION_BASIS, evaluatorPass: false },
    acceptedSource: structuredClone(ready.acceptedSource),
    governanceSource: structuredClone(ready.governanceSource),
    originVerdict: ORIGIN_EVALUATION.verdict,
    residuals: {
      accepted: structuredClone(ORIGIN_EVALUATION.blockingResidualIds),
      conditionalNotRun: structuredClone(ORIGIN_EVALUATION.conditionalNotRunIds),
      otherPhase: structuredClone(ORIGIN_EVALUATION.otherPhaseResidualIds),
    },
    authorizationId: AUTHORIZATION_RECORD.authorizationId,
    downstreamOrder: structuredClone(canonicalTemplate.downstreamOrder),
    writesDownstream: false,
  };
}

export function buildUserDecisionReadyManifest({
  root = SCRIPT_ROOT, template, acceptedCandidateRoot, observedAcceptedSha,
  originFeedbackRoot = root, authorizationRecord, governanceSource,
  governanceRoot, governanceFeedbackRoot = root, observedGovernanceSha, protectedSnapshot,
}) {
  const canonicalTemplate = validateUserDecisionTemplate(root, template);
  const ready = structuredClone(canonicalTemplate);
  ready.publicationStatus = USER_DECISION_STATUS;
  ready.acceptedSource = structuredClone(ACCEPTED_PRODUCT_SOURCE);
  ready.originEvaluation = structuredClone(ORIGIN_EVALUATION);
  ready.acceptanceBasis = { type: USER_DECISION_BASIS, evaluatorPass: false, originVerdict: ORIGIN_EVALUATION.verdict };
  ready.authorizationRecord = structuredClone(authorizationRecord);
  ready.governanceSource = structuredClone(governanceSource);
  ready.verificationStatus = {
    hostLive: { verified: false, blockingResidualIds: ["AC3", "C21"] },
    xmindMcp: { verified: false, conditionalNotRunId: "XM-007" },
  };
  ready.protectedDigests = structuredClone(protectedSnapshot);
  ready.userDecisionPreWriteGate.status = "ready";
  evaluateUserDecisionPreWriteGate({
    root, template: canonicalTemplate, ready, acceptedCandidateRoot, observedAcceptedSha,
    originFeedbackRoot, governanceRoot, governanceFeedbackRoot, observedGovernanceSha, protectedSnapshot,
  });
  return ready;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0] || "validate-template";
  try {
    if (command === "validate-template") {
      const root = resolve(option(args, "--root") || SCRIPT_ROOT);
      const result = validateHandoffTemplate(root);
      process.stdout.write(`${JSON.stringify({ status: "valid", publicationStatus: result.publicationStatus, preWriteGate: result.preWriteGate.status, writesDownstream: false }, null, 2)}\n`);
    } else if (command === "prewrite") {
      const root = resolve(option(args, "--root") || SCRIPT_ROOT);
      const ready = JSON.parse(readFileSync(resolve(option(args, "--manifest") || fail("manifest-required")), "utf8"));
      const snapshot = JSON.parse(readFileSync(resolve(option(args, "--protected-snapshot") || fail("protected-snapshot-required")), "utf8"));
      const result = evaluatePreWriteGate({ root, ready, candidateRoot: resolve(option(args, "--candidate-root") || fail("candidate-root-required")), observedSha: option(args, "--observed-sha"), protectedSnapshot: snapshot });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (command === "build-user-decision-ready") {
      const root = resolve(option(args, "--root") || SCRIPT_ROOT);
      const authorizationRecord = JSON.parse(readFileSync(resolve(option(args, "--authorization") || fail("authorization-required")), "utf8"));
      const governanceSource = JSON.parse(readFileSync(resolve(option(args, "--governance-evidence") || fail("governance-evidence-required")), "utf8"));
      const snapshot = JSON.parse(readFileSync(resolve(option(args, "--protected-snapshot") || fail("protected-snapshot-required")), "utf8"));
      const result = buildUserDecisionReadyManifest({
        root,
        acceptedCandidateRoot: resolve(option(args, "--accepted-candidate-root") || fail("accepted-candidate-root-required")),
        observedAcceptedSha: option(args, "--accepted-observed-sha"),
        originFeedbackRoot: resolve(option(args, "--origin-feedback-root") || root),
        authorizationRecord,
        governanceSource,
        governanceRoot: resolve(option(args, "--governance-root") || fail("governance-root-required")),
        governanceFeedbackRoot: resolve(option(args, "--governance-feedback-root") || root),
        observedGovernanceSha: option(args, "--governance-observed-sha"),
        protectedSnapshot: snapshot,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (command === "prewrite-user-decision") {
      const root = resolve(option(args, "--root") || SCRIPT_ROOT);
      const ready = JSON.parse(readFileSync(resolve(option(args, "--manifest") || fail("manifest-required")), "utf8"));
      const snapshot = JSON.parse(readFileSync(resolve(option(args, "--protected-snapshot") || fail("protected-snapshot-required")), "utf8"));
      const result = evaluateUserDecisionPreWriteGate({
        root,
        ready,
        acceptedCandidateRoot: resolve(option(args, "--accepted-candidate-root") || fail("accepted-candidate-root-required")),
        observedAcceptedSha: option(args, "--accepted-observed-sha"),
        originFeedbackRoot: resolve(option(args, "--origin-feedback-root") || root),
        governanceRoot: resolve(option(args, "--governance-root") || fail("governance-root-required")),
        governanceFeedbackRoot: resolve(option(args, "--governance-feedback-root") || root),
        observedGovernanceSha: option(args, "--governance-observed-sha"),
        protectedSnapshot: snapshot,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else fail("unknown-command", command);
  } catch (error) {
    process.stderr.write(`HANDOFF_GATE_FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}
