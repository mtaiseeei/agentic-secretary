#!/usr/bin/env node

import { createHash } from "node:crypto";
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
    } else fail("unknown-command", command);
  } catch (error) {
    process.stderr.write(`HANDOFF_GATE_FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}
