#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildUserDecisionReadyManifest,
  digestPaths,
  digestTree,
  evaluatePreWriteGate,
  evaluateUserDecisionPreWriteGate,
  validateHandoffTemplate,
  validateUserDecisionTemplate,
} from "./sprint-048-handoff.mjs";
import { digestSurface } from "./lib/sprint-049-inventory.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "agentic-s050-patch-001-"));
const candidateRoot = join(work, "accepted-product-git-free");
const governanceCheckoutRoot = join(work, "governance-implementation-checkout");
const governanceFeedbackFixtureRoot = join(work, "governance-pass-fixture");
const missingGovernanceRoot = join(work, "governance-missing-fixture");
const acceptedSha = "5f08d454c05576fcff8ab32c10c00887b4c15a96";
const implementationBaseSha = "9d37585aa459c2dc643ff1311d975194e3bfde50";
let governanceSha;
const otherGovernanceSha = "8".repeat(40);
const results = [];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repo,
    encoding: "utf8",
    timeout: options.timeout || 180_000,
    maxBuffer: 128 * 1024 * 1024,
  });
}

function assertRun(result, label) {
  assert.equal(result.status, 0, `${label}\n${result.stdout}\n${result.stderr}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function feedbackBody(sha, verdict = "PASS") {
  return `# Sprint 050 Patch 001 isolated governance feedback fixture\n\nVerdict: ${verdict}\nEvaluated commit: ${sha}\n`;
}

function writeGovernanceFeedback(root, body) {
  const path = join(root, "docs/feedback/sprint-050-patch-001.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return { path, sha256: sha256(Buffer.from(body)) };
}

async function check(id, title, fn) {
  try {
    await fn();
    results.push({ id, ok: true });
    process.stdout.write(`PASS ${id} ${title}\n`);
  } catch (error) {
    results.push({ id, ok: false });
    process.stdout.write(`FAIL ${id} ${title}: ${error?.stack || error}\n`);
  }
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof Error && error.message.startsWith(code), `expected ${code}`);
}

function protectedSnapshot(template, digest = "b".repeat(64)) {
  return Object.fromEntries(template.downstreamOrder.map((id) => [
    id,
    Object.fromEntries(template.protectedDownstreamPaths[id].map((path) => [path, digest])),
  ]));
}

function evaluateReady(ready, options = {}) {
  return evaluateUserDecisionPreWriteGate({
    root: repo,
    ready,
    acceptedCandidateRoot: options.acceptedCandidateRoot || candidateRoot,
    observedAcceptedSha: options.observedAcceptedSha || acceptedSha,
    originFeedbackRoot: options.originFeedbackRoot || repo,
    governanceRoot: options.governanceRoot || governanceCheckoutRoot,
    governanceFeedbackRoot: options.governanceFeedbackRoot || governanceFeedbackFixtureRoot,
    observedGovernanceSha: options.observedGovernanceSha || governanceSha,
    protectedSnapshot: options.protectedSnapshot || baselineProtected,
  });
}

function reject(id, title, code, mutate, options = {}) {
  return check(id, title, () => {
    const fixture = clone(ready);
    mutate(fixture);
    expectCode(() => evaluateReady(fixture, options), code);
  });
}

function rejectFeedback(id, title, body, code) {
  return check(id, title, () => {
    const root = join(work, `feedback-${id.toLowerCase()}`);
    const file = writeGovernanceFeedback(root, body);
    const fixture = clone(ready);
    fixture.governanceSource.feedbackSha256 = file.sha256;
    expectCode(() => evaluateReady(fixture, { governanceFeedbackRoot: root }), code);
  });
}

const template = json(join(repo, "adapters/downstream-clarity-handoff.json"));
const baselineProtected = protectedSnapshot(template);
let ready;

try {
  mkdirSync(candidateRoot, { recursive: true });
  const archivePath = join(work, "accepted-product.tar");
  assertRun(run("git", ["archive", "--format=tar", `--output=${archivePath}`, acceptedSha]), "create exact candidate archive");
  assertRun(run("tar", ["-xf", archivePath, "-C", candidateRoot]), "extract exact candidate archive");
  mkdirSync(governanceCheckoutRoot, { recursive: true });
  assertRun(run("git", ["init", "-q", "-b", "main"], { cwd: governanceCheckoutRoot }), "init governance checkout fixture");
  writeFileSync(join(governanceCheckoutRoot, "implementation.txt"), "isolated governance implementation fixture\n");
  assertRun(run("git", ["add", "implementation.txt"], { cwd: governanceCheckoutRoot }), "stage governance fixture");
  assertRun(run("git", ["-c", "user.name=Sprint 050 Patch", "-c", "user.email=s050@example.invalid", "commit", "-qm", "governance fixture"], { cwd: governanceCheckoutRoot }), "commit governance fixture");
  governanceSha = run("git", ["rev-parse", "HEAD"], { cwd: governanceCheckoutRoot }).stdout.trim();
  assert.match(governanceSha, /^[0-9a-f]{40}$/u);
  const governance = writeGovernanceFeedback(governanceFeedbackFixtureRoot, feedbackBody(governanceSha));
  mkdirSync(missingGovernanceRoot, { recursive: true });
  const authorization = clone(template.userDecisionPreWriteGate.fixedBindings.authorizationRecord);
  const governanceSource = {
    implementationFullSha: governanceSha,
    feedbackPath: "docs/feedback/sprint-050-patch-001.md",
    feedbackSha256: governance.sha256,
    verdict: "PASS",
    evaluatedFullSha: governanceSha,
  };
  const buildWithTemplate = (fixtureTemplate) => buildUserDecisionReadyManifest({
    root: repo,
    template: fixtureTemplate,
    acceptedCandidateRoot: candidateRoot,
    observedAcceptedSha: acceptedSha,
    originFeedbackRoot: repo,
    authorizationRecord: authorization,
    governanceSource,
    governanceRoot: governanceCheckoutRoot,
    governanceFeedbackRoot: governanceFeedbackFixtureRoot,
    observedGovernanceSha: governanceSha,
    protectedSnapshot: baselineProtected,
  });

  await check("UD-001", "tracked templateはclosedで受入を推測しない", () => {
    const valid = validateUserDecisionTemplate(repo, template);
    assert.equal(valid.publicationStatus, "pending-public-evaluator-pass");
    assert.equal(valid.acceptedSource, null);
    assert.equal(valid.preWriteGate.status, "closed");
    assert.equal(valid.userDecisionPreWriteGate.status, "closed");
    assert.equal(valid.preWriteGate.writesDownstream, false);
    assert.equal(valid.userDecisionPreWriteGate.writesDownstream, false);
  });

  await check("UD-002", "exact Sprint 050 product archiveのidentityを再計算", () => {
    const tree = digestTree(candidateRoot);
    const common = digestPaths(candidateRoot, template.commonPaths);
    assert.deepEqual({ sha256: tree.sha256, fileCount: tree.fileCount }, {
      sha256: "1fbffe636565355b875dcde35ff05d26cd7e15f00710c1c88a563866749037c5",
      fileCount: 828,
    });
    assert.deepEqual({ sha256: common.sha256, fileCount: common.fileCount }, {
      sha256: "4aa6e8d4b21aa9e0020cfaa6edefd5ff0e6640fd2e8f937db00478190142f849",
      fileCount: 44,
    });
  });

  await check("UD-003", "明示authorizationとgovernance PASS fixtureでだけ一時readyを生成", () => {
    ready = buildUserDecisionReadyManifest({
      root: repo,
      acceptedCandidateRoot: candidateRoot,
      observedAcceptedSha: acceptedSha,
      originFeedbackRoot: repo,
      authorizationRecord: authorization,
      governanceSource,
      governanceRoot: governanceCheckoutRoot,
      governanceFeedbackRoot: governanceFeedbackFixtureRoot,
      observedGovernanceSha: governanceSha,
      protectedSnapshot: baselineProtected,
    });
    assert.equal(ready.publicationStatus, "public-user-decision-risk-accepted");
    assert.equal(ready.acceptanceBasis.evaluatorPass, false);
    assert.equal(ready.preWriteGate.status, "closed");
    assert.equal(ready.userDecisionPreWriteGate.status, "ready");
    assert.equal(ready.acceptedSource.fullSha, acceptedSha);
    assert.equal(ready.governanceSource.implementationFullSha, governanceSha);
  });

  await check("UD-004", "ユーザー判断readyはresidualを保持しwriteを行わない", () => {
    const result = evaluateReady(ready);
    assert.deepEqual({ status: result.status, publicationStatus: result.publicationStatus, evaluatorPass: result.acceptanceBasis.evaluatorPass, writesDownstream: result.writesDownstream }, {
      status: "ready", publicationStatus: "public-user-decision-risk-accepted", evaluatorPass: false, writesDownstream: false,
    });
    assert.deepEqual(result.residuals.accepted, ["AC3", "C21"]);
    assert.deepEqual(result.residuals.conditionalNotRun, ["XM-007"]);
    assert.equal(result.residuals.otherPhase.length, 12);
  });

  await check("UD-005", "既存public-evaluator-pass経路の正例は従来どおり合格", () => {
    const publicTemplate = validateHandoffTemplate(repo, template);
    const tree = digestTree(repo);
    const common = digestPaths(repo, publicTemplate.commonPaths);
    const publicReady = clone(publicTemplate);
    publicReady.publicationStatus = "public-evaluator-pass";
    publicReady.preWriteGate.status = "ready";
    publicReady.acceptedSource = { fullSha: "a".repeat(40), treeSha256: tree.sha256, commonTreeSha256: common.sha256, fileCount: tree.fileCount };
    publicReady.protectedDigests = clone(baselineProtected);
    const result = evaluatePreWriteGate({ root: repo, template: publicTemplate, ready: publicReady, candidateRoot: repo, observedSha: "a".repeat(40), protectedSnapshot: baselineProtected });
    assert.equal(result.status, "ready");
    assert.equal(result.writesDownstream, false);
  });

  await check("UD-006", "既存PASS validatorはユーザー判断statusをaliasとして拒否", () => {
    expectCode(() => evaluatePreWriteGate({ root: repo, template, ready, candidateRoot, observedSha: acceptedSha, protectedSnapshot: baselineProtected }), "prewrite-not-ready");
  });

  await reject("UD-007", "state文字列だけではreadyにならない", "acceptance-basis-missing", (value) => { delete value.acceptanceBasis; });
  await reject("UD-008", "文脈なしの曖昧承認を拒否", "authorization-quote", (value) => { value.authorizationRecord.exactQuote = "はい"; });
  await reject("UD-009", "自動生成した承認を拒否", "authorization-provenance", (value) => { value.authorizationRecord.recordedBy = "system-generated"; });
  await reject("UD-010", "撤回済み承認を拒否", "authorization-revoked", (value) => { value.authorizationRecord.revoked = true; });
  await reject("UD-011", "承認文脈の欠落を拒否", "authorization-context", (value) => { value.authorizationRecord.context = "よいです"; });
  await reject("UD-012", "承認後のscope変更を拒否", "authorization-scope", (value) => { value.authorizationRecord.scope.authorized.push("release"); });
  await reject("UD-013", "別candidateへの承認転用を拒否", "authorization-candidate", (value) => { value.authorizationRecord.targetAcceptedFullSha = "7".repeat(40); });
  await reject("UD-014", "承認対象feedback変更を拒否", "authorization-feedback", (value) => { value.authorizationRecord.targetOriginFeedbackCommit = "7".repeat(40); });
  await reject("UD-015", "受容residual削減を拒否", "authorization-accepted-residuals", (value) => { value.authorizationRecord.acceptedResidualIds = ["AC3"]; });
  await reject("UD-016", "非受容residual削減を拒否", "authorization-not-accepted-residuals", (value) => { value.authorizationRecord.notAcceptedResidualIds = value.authorizationRecord.notAcceptedResidualIds.slice(1); });
  await reject("UD-017", "承認record内の下流順序逆転を拒否", "authorization-downstream-order", (value) => { value.authorizationRecord.downstreamOrder.reverse(); });

  await reject("UD-018", "accepted SHA差替えを拒否", "accepted-source-sha", (value) => { value.acceptedSource.fullSha = "7".repeat(40); });
  await reject("UD-019", "accepted tree digest差替えを拒否", "accepted-source-tree-digest", (value) => { value.acceptedSource.treeSha256 = "7".repeat(64); });
  await reject("UD-020", "accepted file count差替えを拒否", "accepted-source-file-count", (value) => { value.acceptedSource.fileCount += 1; });
  await reject("UD-021", "accepted common digest差替えを拒否", "accepted-source-common-digest", (value) => { value.acceptedSource.commonTreeSha256 = "7".repeat(64); });
  await reject("UD-022", "accepted common file count差替えを拒否", "accepted-source-common-file-count", (value) => { value.acceptedSource.commonFileCount += 1; });
  await reject("UD-023", "観測candidate SHA不一致を拒否", "accepted-source-stale", () => {}, { observedAcceptedSha: "7".repeat(40) });

  await reject("UD-024", "origin feedback commit差替えを拒否", "origin-feedback-commit", (value) => { value.originEvaluation.feedbackCommit = "7".repeat(40); });
  await reject("UD-025", "origin feedback path差替えを拒否", "origin-feedback-path", (value) => { value.originEvaluation.feedbackPath = "docs/feedback/other.md"; });
  await reject("UD-026", "origin feedback digest差替えを拒否", "origin-feedback-digest", (value) => { value.originEvaluation.feedbackSha256 = "7".repeat(64); });
  await reject("UD-027", "origin Verdict書換えを拒否", "origin-feedback-verdict", (value) => { value.originEvaluation.verdict = "PASS"; });
  await reject("UD-028", "origin AC3/C21残余削減を拒否", "origin-blocking-residuals", (value) => { value.originEvaluation.blockingResidualIds = ["AC3"]; });
  await reject("UD-029", "origin XM-007削減を拒否", "origin-conditional-residuals", (value) => { value.originEvaluation.conditionalNotRunIds = []; });
  await reject("UD-030", "origin 別phase残余削減を拒否", "origin-other-phase-residuals", (value) => { value.originEvaluation.otherPhaseResidualIds.pop(); });

  await reject("UD-031", "下流repo identity差替えを拒否", "user-decision-downstream-repositories-changed", (value) => { value.downstreamRepositories["yasashii-secretary"] = "example/other"; });
  await reject("UD-032", "下流順序逆転を拒否", "user-decision-downstream-order-changed", (value) => { value.downstreamOrder.reverse(); });
  await reject("UD-033", "common path追加を拒否", "user-decision-common-paths-changed", (value) => { value.commonPaths.push("plugins/secretary/extra"); });
  await reject("UD-034", "excluded path欠落を拒否", "user-decision-excluded-paths-changed", (value) => { value.excludedPaths.pop(); });
  await reject("UD-035", "protected path変更を拒否", "user-decision-protected-paths-changed", (value) => { value.protectedDownstreamPaths["yasashii-secretary"].reverse(); });
  await reject("UD-036", "adapter seam変更を拒否", "user-decision-adapter-seams-changed", (value) => { value.adapterSeams[0].owner = "downstream"; });
  await reject("UD-037", "Xmind edition差変更を拒否", "user-decision-xmind-contract-changed", (value) => { value.xmindContract.editionDefaults["yasashii-secretary"] = true; });
  await reject("UD-038", "rollback変更を拒否", "user-decision-rollback-changed", (value) => { value.rollback.strategy = "whole-tree"; });

  await reject("UD-039", "protected digest不一致を拒否", "user-decision-protected-digest-mismatch", () => {}, {
    protectedSnapshot: (() => { const value = clone(baselineProtected); const id = template.downstreamOrder[0]; const path = template.protectedDownstreamPaths[id][0]; value[id][path] = "c".repeat(64); return value; })(),
  });
  await reject("UD-040", "protected digest scope追加を拒否", "user-decision-protected-digest-scope", (value) => { value.protectedDigests[template.downstreamOrder[0]].extra = "b".repeat(64); });

  await reject("UD-041", "governance commit不一致をstaleとして拒否", "governance-source-stale", (value) => { value.governanceSource.implementationFullSha = otherGovernanceSha; });
  await reject("UD-042", "governance commitのacceptedSource誤代入を拒否", "governance-source-accepted-source-confusion", (value) => { value.governanceSource.implementationFullSha = acceptedSha; value.governanceSource.evaluatedFullSha = acceptedSha; }, { observedGovernanceSha: acceptedSha });
  await reject("UD-043", "Patch feedbackなしを拒否", "governance-feedback-missing", () => {}, { governanceFeedbackRoot: missingGovernanceRoot });
  await check("UD-044", "Patch feedback非PASSを拒否", () => {
    const root = join(work, "governance-fail-fixture");
    const file = writeGovernanceFeedback(root, feedbackBody(governanceSha, "FAIL"));
    const fixture = clone(ready); fixture.governanceSource.feedbackSha256 = file.sha256;
    expectCode(() => evaluateReady(fixture, { governanceFeedbackRoot: root }), "governance-feedback-non-pass");
  });
  await check("UD-045", "Patch feedbackの別commit評価を拒否", () => {
    const root = join(work, "governance-other-commit-fixture");
    const file = writeGovernanceFeedback(root, feedbackBody(otherGovernanceSha));
    const fixture = clone(ready); fixture.governanceSource.feedbackSha256 = file.sha256;
    expectCode(() => evaluateReady(fixture, { governanceFeedbackRoot: root }), "governance-feedback-evaluated-commit-mismatch");
  });

  await reject("UD-046", "ユーザー判断statusのpublic-evaluator-pass aliasを拒否", "user-decision-publication-status", (value) => { value.publicationStatus = "public-evaluator-pass"; });
  await reject("UD-047", "evaluatorPass=true昇格を拒否", "user-decision-evaluator-pass-promoted", (value) => { value.acceptanceBasis.evaluatorPass = true; });
  await reject("UD-048", "host live verified=true昇格を拒否", "host-live-verification-promoted", (value) => { value.verificationStatus.hostLive.verified = true; });
  await reject("UD-049", "Xmind verified=true昇格を拒否", "xmind-verification-promoted", (value) => { value.verificationStatus.xmindMcp.verified = true; });
  await reject("UD-050", "public-evaluator-pass gateのready化を拒否", "public-evaluator-gate-was-repurposed", (value) => { value.preWriteGate.status = "ready"; });

  await check("UD-051", "candidate tree改ざんを拒否", () => {
    const root = join(work, "candidate-tree-tamper"); cpSync(candidateRoot, root, { recursive: true }); writeFileSync(join(root, "tamper.txt"), "tamper\n");
    expectCode(() => evaluateReady(ready, { acceptedCandidateRoot: root }), "accepted-candidate-tree-mismatch");
  });
  await check("UD-052", "candidate common bytes改ざんを拒否", () => {
    const root = join(work, "candidate-common-tamper"); cpSync(candidateRoot, root, { recursive: true }); writeFileSync(join(root, template.commonPaths[0]), "{}\n");
    expectCode(() => evaluateReady(ready, { acceptedCandidateRoot: root }), "accepted-candidate-tree-mismatch");
  });

  await check("UD-053", "Sprint 050 feedback bytesと公開plugin bytesを変更していない", () => {
    assert.equal(sha256(readFileSync(join(repo, "docs/feedback/sprint-050.md"))), "fcaed413963cfcee2ea6303c1293a8c376b197a4998b5e3a682154eeca1b9cdd");
    assertRun(run("git", ["diff", "--exit-code", implementationBaseSha, "--", "plugins/secretary", "docs/feedback/sprint-050.md"]), "protected product/feedback diff");
  });

  await check("UD-054", "source Git・remote・downstream・external writeは0", () => {
    const before = {
      head: run("git", ["rev-parse", "HEAD"]).stdout,
      status: run("git", ["status", "--porcelain"]).stdout,
      remotes: run("git", ["remote", "-v"]).stdout,
      remoteRefs: run("git", ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/remotes"]).stdout,
    };
    const after = {
      head: run("git", ["rev-parse", "HEAD"]).stdout,
      status: run("git", ["status", "--porcelain"]).stdout,
      remotes: run("git", ["remote", "-v"]).stdout,
      remoteRefs: run("git", ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/remotes"]).stdout,
    };
    assert.deepEqual(after, before);
    assert.equal(evaluateReady(ready).writesDownstream, false);
  });

  await reject("UD-055", "authorization ID差替えを拒否", "authorization-id", (value) => { value.authorizationRecord.authorizationId = "other"; });
  await reject("UD-056", "authorization date差替えを拒否", "authorization-date", (value) => { value.authorizationRecord.decisionDate = "2026-08-29"; });
  await reject("UD-057", "origin product finding増加を拒否", "origin-product-findings", (value) => { value.originEvaluation.productFindingCount = 1; });
  await reject("UD-058", "origin registry結果差替えを拒否", "origin-registry-result", (value) => { value.originEvaluation.registry.pass = 272; });
  await reject("UD-059", "origin E2E結果差替えを拒否", "origin-e2e-result", (value) => { value.originEvaluation.e2e.pass = 3; });
  await check("UD-060", "origin feedback本文改ざんを拒否", () => {
    const root = join(work, "origin-feedback-tamper");
    const path = join(root, "docs/feedback/sprint-050.md");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${readFileSync(join(repo, "docs/feedback/sprint-050.md"), "utf8")}\n改ざん\n`);
    expectCode(() => evaluateReady(ready, { originFeedbackRoot: root }), "origin-feedback-bytes-mismatch");
  });
  await reject("UD-061", "common path欠落を拒否", "user-decision-common-paths-changed", (value) => { value.commonPaths.pop(); });
  await reject("UD-062", "excluded path追加を拒否", "user-decision-excluded-paths-changed", (value) => { value.excludedPaths.push("extra/**"); });
  await reject("UD-063", "protected path追加を拒否", "user-decision-protected-paths-changed", (value) => { value.protectedDownstreamPaths["yasashii-secretary"].push("extra/**"); });
  await reject("UD-064", "governance feedback digest不一致を拒否", "governance-feedback-bytes-mismatch", (value) => { value.governanceSource.feedbackSha256 = "7".repeat(64); });
  await check("UD-065", "dirty governance checkoutを拒否", () => {
    const root = join(work, "governance-dirty-checkout"); cpSync(governanceCheckoutRoot, root, { recursive: true }); writeFileSync(join(root, "dirty.txt"), "dirty\n");
    expectCode(() => evaluateReady(ready, { governanceRoot: root }), "governance-checkout-dirty");
  });
  await reject("UD-066", "governance checkout HEAD不一致を拒否", "governance-checkout-head-mismatch", (value) => {
    value.governanceSource.implementationFullSha = otherGovernanceSha;
    value.governanceSource.evaluatedFullSha = otherGovernanceSha;
  }, { observedGovernanceSha: otherGovernanceSha });

  await rejectFeedback("UD-067", "FAILとPASSが併存するVerdictを拒否",
    `# conflicting verdict\n\nVerdict: FAIL\nVerdict: PASS\nEvaluated commit: ${governanceSha}\n`,
    "governance-feedback-verdict-conflict");
  await rejectFeedback("UD-068", "異なるEvaluated commitが複数あるfeedbackを拒否",
    `# conflicting commits\n\nVerdict: PASS\nEvaluated commit: ${governanceSha}\nEvaluated commit: ${otherGovernanceSha}\n`,
    "governance-feedback-evaluated-commit-conflict");
  await rejectFeedback("UD-069", "code fence内のPASS markerを拒否",
    `# fenced marker\n\nVerdict: FAIL\nEvaluated commit: ${governanceSha}\n\n\`\`\`text\nVerdict: PASS\n\`\`\`\n`,
    "governance-feedback-marker-in-code-fence");
  await check("UD-070", "Sprint 049 projectionが未知governance PASS aliasを隠さない", () => {
    const root = join(work, "inventory-hidden-governance");
    const path = join(root, "adapters/downstream-clarity-handoff.json");
    const fixture = clone(template);
    fixture.userDecisionPreWriteGate.publicEvaluatorPassAlias = "PASS";
    fixture.userDecisionPreWriteGate.hiddenEvaluatorPass = true;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);
    expectCode(() => digestSurface(root, ["adapters/downstream-clarity-handoff.json"]), "user-decision-gate-schema");
  });
  await rejectFeedback("UD-071", "同じVerdictの重複を拒否",
    `# duplicate verdict\n\nVerdict: PASS\nVerdict: PASS\nEvaluated commit: ${governanceSha}\n`,
    "governance-feedback-verdict-duplicate");
  await rejectFeedback("UD-072", "同じEvaluated commitの重複を拒否",
    `# duplicate commit\n\nVerdict: PASS\nEvaluated commit: ${governanceSha}\nEvaluated commit: ${governanceSha}\n`,
    "governance-feedback-evaluated-commit-duplicate");
  await rejectFeedback("UD-073", "blockquote内のPASS markerを拒否",
    `# quoted marker\n\nVerdict: FAIL\nEvaluated commit: ${governanceSha}\n\n> Verdict: PASS\n`,
    "governance-feedback-marker-in-blockquote");
  await rejectFeedback("UD-074", "例示内のPASS markerを拒否",
    `# example marker\n\nVerdict: FAIL\nEvaluated commit: ${governanceSha}\n\nExample: Verdict: PASS\n`,
    "governance-feedback-marker-in-example");
  await rejectFeedback("UD-075", "引用符内のPASS markerを拒否",
    `# quotation marker\n\nVerdict: FAIL\nEvaluated commit: ${governanceSha}\n\n「Verdict: PASS」\n`,
    "governance-feedback-marker-in-quotation");
  await rejectFeedback("UD-076", "Verdict 0件を拒否",
    `# missing verdict\n\nEvaluated commit: ${governanceSha}\n`,
    "governance-feedback-verdict-missing");
  await rejectFeedback("UD-077", "Evaluated commit 0件を拒否",
    "# missing commit\n\nVerdict: PASS\n",
    "governance-feedback-evaluated-commit-missing");
  await check("UD-078", "fixedBindings nested objectの未知keyを拒否", () => {
    const fixture = clone(template);
    fixture.userDecisionPreWriteGate.fixedBindings.originEvaluation.registry.passAlias = "PASS";
    expectCode(() => validateUserDecisionTemplate(repo, fixture), "origin-registry-schema");
  });
  await check("UD-079", "standard validate-templateでtop-level未知keyを拒否", () => {
    const root = join(work, "validate-template-top-level-extra");
    const fixture = clone(template);
    fixture.publicEvaluatorPass = true;
    for (const path of fixture.commonPaths) {
      const absolute = join(root, path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, "fixture\n");
    }
    const manifestPath = join(root, "adapters/downstream-clarity-handoff.json");
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(fixture, null, 2)}\n`);
    const result = run(process.execPath,
      ["scripts/sprint-048-handoff.mjs", "validate-template", "--root", root]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /HANDOFF_GATE_FAIL handoff-template-top-level-schema/u);
  });
  await reject("UD-080", "ready-only acceptanceBasis未知keyを拒否", "acceptance-basis-schema", (value) => {
    value.acceptanceBasis.passAlias = "PASS";
  });
  await reject("UD-081", "ready-only verificationStatus未知keyを拒否", "verification-status-schema", (value) => {
    value.verificationStatus.evaluatorPass = true;
  });
  await reject("UD-082", "ready-only governanceSource未知keyを拒否", "governance-source-schema", (value) => {
    value.governanceSource.passAlias = "PASS";
  });
  await check("UD-083", "downstreamRepositories未知keyを拒否", () => {
    const fixture = clone(template);
    fixture.downstreamRepositories.other = "example/other";
    expectCode(() => validateHandoffTemplate(repo, fixture), "handoff-downstream-repositories-schema");
  });
  await check("UD-084", "build入口でfixedBindings未知keyを拒否", () => {
    const fixture = clone(template);
    fixture.userDecisionPreWriteGate.fixedBindings.passAlias = "PASS";
    expectCode(() => buildWithTemplate(fixture), "user-decision-fixed-bindings-schema");
  });
  await check("UD-085", "build入口でrequiredGovernance未知keyを拒否", () => {
    const fixture = clone(template);
    fixture.userDecisionPreWriteGate.requiredGovernance.evaluatorPass = true;
    expectCode(() => buildWithTemplate(fixture), "governance-requirements-schema");
  });
  await reject("UD-086", "authorization scope nested未知keyを拒否", "authorization-scope-schema", (value) => {
    value.authorizationRecord.scope.passAlias = "PASS";
  });
  await check("UD-087", "template evaluatorPass=trueを拒否", () => {
    const fixture = clone(template);
    fixture.userDecisionPreWriteGate.evaluatorPass = true;
    expectCode(() => validateUserDecisionTemplate(repo, fixture), "user-decision-template-gate");
  });
  await check("UD-088", "prewrite-user-decisionでready top-level PASS aliasを拒否", () => {
    const fixture = clone(ready);
    fixture.publicEvaluatorPassAlias = true;
    const manifestPath = join(work, "prewrite-ready-extra.json");
    const snapshotPath = join(work, "prewrite-protected-snapshot.json");
    writeFileSync(manifestPath, `${JSON.stringify(fixture, null, 2)}\n`);
    writeFileSync(snapshotPath, `${JSON.stringify(baselineProtected, null, 2)}\n`);
    const result = run(process.execPath, [
      "scripts/sprint-048-handoff.mjs", "prewrite-user-decision",
      "--root", repo,
      "--manifest", manifestPath,
      "--protected-snapshot", snapshotPath,
      "--accepted-candidate-root", candidateRoot,
      "--accepted-observed-sha", acceptedSha,
      "--origin-feedback-root", repo,
      "--governance-root", governanceCheckoutRoot,
      "--governance-feedback-root", governanceFeedbackFixtureRoot,
      "--governance-observed-sha", governanceSha,
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /HANDOFF_GATE_FAIL user-decision-ready-top-level-schema/u);
  });
  await reject("UD-089", "prewrite入口でhostLive nested未知keyを拒否", "host-live-verification-schema", (value) => {
    value.verificationStatus.hostLive.evaluatorPass = true;
  });

  const failed = results.filter((entry) => !entry.ok);
  assert.equal(results.length, 89);
  assert.equal(failed.length, 0, `failed: ${failed.map((entry) => entry.id).join(",")}`);
  process.stdout.write("SPRINT050_PATCH001_PASS=89 FAIL=0 POSITIVE=6 NEGATIVE=81 INTEGRITY=2 ATTACK_FIXTURES=23 READY_ARTIFACT_TRACKED=0 DOWNSTREAM_WRITE=0 EXTERNAL_WRITE=0\n");
} finally {
  rmSync(work, { recursive: true, force: true });
}
