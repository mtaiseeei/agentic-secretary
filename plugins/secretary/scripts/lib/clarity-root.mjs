import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import {
  FilesystemBoundaryError,
  registerWorkingRootGuard,
  workingRoot,
} from "./safe-fs.mjs";
import { runExternalSync } from "./external-ops.mjs";

// agentic-secretary:clarity-root-policy:v1
// A physical root can be reached through more than one live alias request. Keep
// each distinct observation until its handle is released; replacing a single
// physical-root slot would let a later alias hide an earlier alias change.
const observations = new Map();
let observationSequence = 0;
let activeRequestScope = null;
let gitProbeRunner = runExternalSync;

const GIT_IDENTITY_TIMEOUT_MS = 5_000;
const GIT_IDENTITY_MAX_BUFFER = 1024 * 1024;
const GIT_DISCOVERY_ENV_KEYS = [
  "GIT_COMMON_DIR",
  "GIT_DIR",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_WORK_TREE",
];

function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function filesystemIdentity(path, { follow = true } = {}) {
  const stat = follow ? statSync(path) : lstatSync(path);
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: stat.mode,
    kind: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : stat.isSymbolicLink() ? "symlink" : "other",
  };
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.kind === right.kind;
}

function directoryIdentity(path) {
  const identity = filesystemIdentity(path);
  if (identity.kind !== "directory") {
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identityが通常directoryではないため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
  return identity;
}

function resolveGitDirectory(path) {
  try {
    const physical = realpathSync(path);
    return { path: physical, identity: directoryIdentity(physical) };
  } catch (error) {
    if (error instanceof FilesystemBoundaryError) throw error;
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identityを安全に確認できないため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
}

function samePhysicalDirectory(leftPath, rightPath) {
  const left = resolveGitDirectory(leftPath);
  const right = resolveGitDirectory(rightPath);
  return sameIdentity(left.identity, right.identity);
}

function readGitControlFile(path, label) {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 64 * 1024) {
      throw new FilesystemBoundaryError(`Clarity rootの${label}が不正なため、変更せず停止しました。`, "clarity-git-path-unsafe", { changed: false });
    }
    return readFileSync(path, "utf8");
  } catch (error) {
    if (error instanceof FilesystemBoundaryError) throw error;
    throw new FilesystemBoundaryError(`Clarity rootの${label}を安全に確認できないため、変更せず停止しました。`, "clarity-git-path-unsafe", { changed: false });
  }
}

function assertGitDirectoryRelationship(top, gitDir, commonGitDir) {
  const marker = join(top, ".git");
  let markerStat;
  try { markerStat = lstatSync(marker); }
  catch {
    throw new FilesystemBoundaryError("Clarity rootのGit top-level identityを安全に確認できないため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
  if (markerStat.isSymbolicLink()) {
    throw new FilesystemBoundaryError("Clarity rootのGit top-level markerがsymlinkのため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
  if (markerStat.isDirectory()) {
    if (!samePhysicalDirectory(marker, gitDir) || !samePhysicalDirectory(gitDir, commonGitDir)) {
      throw new FilesystemBoundaryError("Clarity rootのGit directory identityが一致しないため、変更せず停止しました。", "clarity-git-identity-mismatch", { changed: false });
    }
    return;
  }
  const body = readGitControlFile(marker, "Git top-level marker").replaceAll("\r\n", "\n");
  const match = body.match(/^gitdir: ([^\n\r]+)\n?$/u);
  if (!match) {
    throw new FilesystemBoundaryError("Clarity rootのGit top-level markerが不正なため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
  const declaredGitDir = resolve(top, match[1]);
  if (!samePhysicalDirectory(declaredGitDir, gitDir)) {
    throw new FilesystemBoundaryError("Clarity rootのGit directory identityが一致しないため、変更せず停止しました。", "clarity-git-identity-mismatch", { changed: false });
  }
  const commonControl = join(gitDir, "commondir");
  const declaredCommon = existsSync(commonControl)
    ? resolve(gitDir, readGitControlFile(commonControl, "Git common directory marker").trim())
    : gitDir;
  if (!samePhysicalDirectory(declaredCommon, commonGitDir)) {
    throw new FilesystemBoundaryError("Clarity rootのGit common directory identityが一致しないため、変更せず停止しました。", "clarity-git-identity-mismatch", { changed: false });
  }
}

function gitConfigFileIdentity(path) {
  try {
    if (!existsSync(path)) return { state: "missing" };
    const stat = lstatSync(path);
    const identity = filesystemIdentity(path, { follow: false });
    if (stat.isSymbolicLink()) {
      return { state: "symlink", identity, targetDigest: sha256(readlinkSync(path)) };
    }
    if (!stat.isFile()) return { state: "non-file", identity };
    if (stat.size > GIT_IDENTITY_MAX_BUFFER) return { state: "oversized", identity, size: stat.size };
    return { state: "file", identity, size: stat.size, contentDigest: sha256(readFileSync(path)) };
  } catch (error) {
    if (error instanceof FilesystemBoundaryError) throw error;
    throw new FilesystemBoundaryError("Clarity rootのGit config identityを安全に確認できないため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
}

function gitConfigDigest(gitDir, commonGitDir) {
  const candidates = [
    ["common-config", join(commonGitDir, "config")],
    ["worktree-config", join(gitDir, "config.worktree")],
  ];
  const seen = new Set();
  const rows = [];
  for (const [label, path] of candidates) {
    const canonical = resolve(path);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    rows.push([label, gitConfigFileIdentity(canonical)]);
  }
  return sha256(JSON.stringify(rows));
}

function gitDiscoveryEnvironmentDigest() {
  return sha256(JSON.stringify(GIT_DISCOVERY_ENV_KEYS.map((key) => [key, process.env[key] ?? null])));
}

function gitMarkerSnapshot(root) {
  try {
    const rows = [];
    let cursor = resolve(root);
    let level = 0;
    while (true) {
      const marker = join(cursor, ".git");
      if (!existsSync(marker)) rows.push({ level, state: "missing" });
      else {
        const stat = lstatSync(marker);
        const identity = filesystemIdentity(marker, { follow: false });
        if (stat.isSymbolicLink()) rows.push({ level, state: "symlink", identity, targetDigest: sha256(readlinkSync(marker)) });
        else if (stat.isFile()) {
          rows.push({ level, state: "file", identity, size: stat.size, contentDigest: stat.size <= 64 * 1024 ? sha256(readFileSync(marker)) : null });
        } else rows.push({ level, state: stat.isDirectory() ? "directory" : "other", identity });
      }
      const parent = dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
      level += 1;
    }
    return rows;
  } catch (error) {
    if (error instanceof FilesystemBoundaryError) throw error;
    throw new FilesystemBoundaryError("Clarity rootのGit marker identityを安全に確認できないため、変更せず停止しました。", "clarity-git-path-unsafe", { changed: false });
  }
}

function gitMarkerDigest(root) {
  return sha256(JSON.stringify(gitMarkerSnapshot(root)));
}

function hasRepositoryMarker(root) {
  return gitMarkerSnapshot(root).some((row) => row.state !== "missing");
}

function hasGitDiscoveryOverride() {
  return GIT_DISCOVERY_ENV_KEYS.some((key) => process.env[key] !== undefined && process.env[key] !== "");
}

function parseGitIdentityOutput(stdout) {
  const normalized = String(stdout ?? "").replaceAll("\r\n", "\n");
  if (!normalized.endsWith("\n") || normalized.includes("\r") || normalized.includes("\0")) {
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identity出力が不正なため、変更せず停止しました。", "clarity-git-output-invalid", { changed: false });
  }
  const rows = normalized.slice(0, -1).split("\n");
  if (rows.length !== 3 || rows.some((row) => row.length === 0 || row.length > 32 * 1024 || !isAbsolute(row))) {
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identity出力が不正なため、変更せず停止しました。", "clarity-git-output-invalid", { changed: false });
  }
  return rows;
}

function probeGitIdentity(root) {
  let result;
  try {
    result = gitProbeRunner("git", [
      "-C", root,
      "rev-parse",
      "--path-format=absolute",
      "--show-toplevel",
      "--absolute-git-dir",
      "--git-common-dir",
    ], {
      encoding: "utf8",
      timeoutMs: GIT_IDENTITY_TIMEOUT_MS,
      maxBuffer: GIT_IDENTITY_MAX_BUFFER,
      allowFailure: true,
      label: "Clarity root Git identity inspection",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (error) {
    if (error?.code === "timeout") {
      throw new FilesystemBoundaryError("Clarity rootのRepo／Git identity確認が時間切れになったため、後続処理を行わず停止しました。", "timeout", { changed: false, timeoutMs: GIT_IDENTITY_TIMEOUT_MS });
    }
    if (error?.code === "max-buffer") {
      throw new FilesystemBoundaryError("Clarity rootのRepo／Git identity出力が上限を超えたため、変更せず停止しました。", "clarity-git-output-invalid", { changed: false });
    }
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identityを安全に確認できないため、変更せず停止しました。", "clarity-git-identity-unavailable", { changed: false });
  }
  if (result.status !== 0) {
    if (!hasRepositoryMarker(root) && !hasGitDiscoveryOverride()) return null;
    throw new FilesystemBoundaryError("Clarity rootのRepo／Git identityを安全に確認できないため、変更せず停止しました。", "clarity-git-identity-unavailable", { changed: false });
  }
  return parseGitIdentityOutput(result.stdout);
}

function gitIdentity(root, reference = null) {
  const markerDigest = gitMarkerDigest(root);
  const discoveryEnvironmentDigest = gitDiscoveryEnvironmentDigest();
  if (reference?.kind === "git") {
    const topResult = resolveGitDirectory(reference.top);
    const gitDirResult = resolveGitDirectory(reference.gitDir);
    const commonGitDirResult = resolveGitDirectory(reference.commonGitDir);
    assertGitDirectoryRelationship(topResult.path, gitDirResult.path, commonGitDirResult.path);
    return {
      kind: "git",
      top: topResult.path,
      topIdentity: topResult.identity,
      gitDir: gitDirResult.path,
      gitDirIdentity: gitDirResult.identity,
      commonGitDir: commonGitDirResult.path,
      commonGitDirIdentity: commonGitDirResult.identity,
      remoteDigest: gitConfigDigest(gitDirResult.path, commonGitDirResult.path),
      markerDigest,
      discoveryEnvironmentDigest,
    };
  }
  if (reference?.kind === "non-git") {
    return {
      kind: "non-git", top: null, topIdentity: null, gitDir: null, gitDirIdentity: null,
      commonGitDir: null, commonGitDirIdentity: null, remoteDigest: null, markerDigest, discoveryEnvironmentDigest,
    };
  }
  const probe = probeGitIdentity(root);
  if (!probe) {
    return {
      kind: "non-git", top: null, topIdentity: null, gitDir: null, gitDirIdentity: null,
      commonGitDir: null, commonGitDirIdentity: null, remoteDigest: null, markerDigest, discoveryEnvironmentDigest,
    };
  }
  const [topRaw, gitDirRaw, commonGitDirRaw] = probe;
  const topResult = resolveGitDirectory(topRaw);
  const gitDirResult = resolveGitDirectory(gitDirRaw);
  const commonGitDirResult = resolveGitDirectory(commonGitDirRaw);
  assertGitDirectoryRelationship(topResult.path, gitDirResult.path, commonGitDirResult.path);
  return {
    kind: "git",
    top: topResult.path,
    topIdentity: topResult.identity,
    gitDir: gitDirResult.path,
    gitDirIdentity: gitDirResult.identity,
    commonGitDir: commonGitDirResult.path,
    commonGitDirIdentity: commonGitDirResult.identity,
    remoteDigest: gitConfigDigest(gitDirResult.path, commonGitDirResult.path),
    markerDigest,
    discoveryEnvironmentDigest,
  };
}

function sameGitIdentity(left, right) {
  return left.kind === right.kind
    && left.remoteDigest === right.remoteDigest
    && left.markerDigest === right.markerDigest
    && left.discoveryEnvironmentDigest === right.discoveryEnvironmentDigest
    && Boolean(left.topIdentity) === Boolean(right.topIdentity)
    && (!left.topIdentity || sameIdentity(left.topIdentity, right.topIdentity))
    && Boolean(left.gitDirIdentity) === Boolean(right.gitDirIdentity)
    && (!left.gitDirIdentity || sameIdentity(left.gitDirIdentity, right.gitDirIdentity))
    && Boolean(left.commonGitDirIdentity) === Boolean(right.commonGitDirIdentity)
    && (!left.commonGitDirIdentity || sameIdentity(left.commonGitDirIdentity, right.commonGitDirIdentity));
}

function aliasChain(requested) {
  const root = parse(requested).root;
  let cursor = root;
  const rows = [];
  for (const component of relative(root, requested).split(sep).filter(Boolean)) {
    cursor = join(cursor, component);
    const stat = lstatSync(cursor);
    if (!stat.isSymbolicLink()) continue;
    rows.push({
      path: cursor,
      linkIdentity: filesystemIdentity(cursor, { follow: false }),
      linkTarget: readlinkSync(cursor),
      resolvedTarget: realpathSync(cursor),
      targetIdentity: filesystemIdentity(cursor),
    });
  }
  return rows;
}

function snapshot(requested, physicalRoot, previous = null) {
  return {
    requested,
    physicalRoot,
    rootIdentity: filesystemIdentity(physicalRoot),
    aliases: aliasChain(requested).filter((row) => row.path !== requested),
    git: gitIdentity(physicalRoot, previous?.git),
  };
}

function observationFingerprint(observation) {
  return sha256(JSON.stringify(observation));
}

function observationBucket(physicalRoot, { create = false } = {}) {
  let bucket = observations.get(physicalRoot);
  if (!bucket && create) {
    bucket = { byToken: new Map(), byFingerprint: new Map(), latestToken: null };
    observations.set(physicalRoot, bucket);
  }
  return bucket || null;
}

function latestEntry(bucket) {
  if (!bucket) return null;
  return bucket.byToken.get(bucket.latestToken) || [...bucket.byToken.values()].at(-1) || null;
}

function revalidateAll(physicalRoot) {
  const bucket = observationBucket(physicalRoot);
  if (!bucket) return;
  for (const entry of bucket.byToken.values()) revalidate(entry.observation);
}

function registerObservation(observation) {
  const bucket = observationBucket(observation.physicalRoot, { create: true });
  const fingerprint = observationFingerprint(observation);
  const existingToken = bucket.byFingerprint.get(fingerprint);
  const existing = existingToken ? bucket.byToken.get(existingToken) : null;
  if (existing) {
    existing.leases += 1;
    bucket.latestToken = existing.token;
    registerWorkingRootGuard(observation.physicalRoot, () => revalidateAll(observation.physicalRoot));
    return existing;
  }
  const token = `clarity-root-observation-${process.pid}-${++observationSequence}`;
  const entry = { token, observation, fingerprint, leases: 1 };
  bucket.byToken.set(token, entry);
  bucket.byFingerprint.set(fingerprint, token);
  bucket.latestToken = token;
  registerWorkingRootGuard(observation.physicalRoot, () => revalidateAll(observation.physicalRoot));
  return entry;
}

function trackRequestHandle(handle) {
  if (!activeRequestScope) return handle;
  const existing = activeRequestScope.handles.find((candidate) => (
    candidate.root === handle.root && candidate.observationToken === handle.observationToken
  ));
  if (existing) {
    // resolveClarityRoot acquired one more lease before finding the request-local
    // duplicate. Release only that lease; the request-owned handle stays live.
    clearClarityRootObservation(handle);
    return existing;
  }
  activeRequestScope.handles.push(handle);
  return handle;
}

function rootChanged(message, previous, current = null) {
  throw new FilesystemBoundaryError(message, "clarity-root-changed", {
    changed: false,
    previousPhysicalRoot: previous.physicalRoot,
    currentPhysicalRoot: current?.physicalRoot || null,
  });
}

function revalidate(observation) {
  let physicalRoot;
  try { physicalRoot = workingRoot(observation.requested, { allowAncestorSymlinks: true }); }
  catch (error) {
    if (["root-self-symlink", "ancestor-symlink-broken", "ancestor-symlink-not-directory"].includes(error?.code)) throw error;
    return rootChanged("Clarity working rootのaliasまたは実体が変わったため、変更せず停止しました。", observation);
  }
  if (physicalRoot !== observation.physicalRoot) {
    return rootChanged("Clarity working rootのalias解決先が変わったため、旧・新rootとも変更せず停止しました。", observation, { physicalRoot });
  }
  let current;
  try { current = snapshot(observation.requested, physicalRoot, observation); }
  catch { return rootChanged("Clarity working rootのfilesystem identityを再確認できないため、変更せず停止しました。", observation); }
  if (!sameIdentity(observation.rootIdentity, current.rootIdentity)) {
    return rootChanged("Clarity working rootの実体が差し替わったため、変更せず停止しました。", observation, current);
  }
  if (observation.aliases.length !== current.aliases.length || observation.aliases.some((row, index) => {
    const next = current.aliases[index];
    return !next || row.path !== next.path || row.linkTarget !== next.linkTarget || row.resolvedTarget !== next.resolvedTarget
      || !sameIdentity(row.linkIdentity, next.linkIdentity) || !sameIdentity(row.targetIdentity, next.targetIdentity);
  })) {
    return rootChanged("Clarity working rootのancestor aliasが差し替わったため、旧・新rootとも変更せず停止しました。", observation, current);
  }
  if (!sameGitIdentity(observation.git, current.git)) {
    return rootChanged("Clarity working rootのRepo／Git identityが変わったため、変更せず停止しました。", observation, current);
  }
  return current;
}

export function resolveClarityRoot(value) {
  const requested = resolve(value || ".");
  let physicalRoot;
  try { physicalRoot = workingRoot(requested, { allowAncestorSymlinks: true }); }
  catch (error) {
    if (error instanceof FilesystemBoundaryError) throw error;
    throw new FilesystemBoundaryError("Clarity working rootを安全に確認できません。", "working-root-unsafe");
  }
  const bucket = observationBucket(physicalRoot);
  const existing = requested === physicalRoot ? latestEntry(bucket) : null;
  const entry = existing
    ? registerObservation(existing.observation)
    : registerObservation(snapshot(requested, physicalRoot));
  const observation = entry.observation;
  return trackRequestHandle({
    root: physicalRoot,
    observation,
    observationToken: entry.token,
    policy: {
      source: "clarity-internal-root-resolver",
      allowAncestorSymlinks: true,
      requestedRootIsSymlink: false,
      ancestorAliasCount: observation.aliases.length,
      physicalRootApplied: true,
    },
  });
}

export function withClarityRootRequest(callback) {
  if (typeof callback !== "function") throw new TypeError("Clarity root request callback is required");
  if (activeRequestScope) return callback();
  const scope = { handles: [] };
  activeRequestScope = scope;
  try {
    return callback();
  } finally {
    activeRequestScope = null;
    for (const handle of [...scope.handles].reverse()) clearClarityRootObservation(handle);
  }
}

export function withClarityGitProbeRunnerForTest(runner, callback) {
  if (process.env.CLARITY_TEST_MODE !== "1") throw new Error("Clarity Git probe test runner requires CLARITY_TEST_MODE=1");
  if (typeof runner !== "function" || typeof callback !== "function") throw new TypeError("Clarity Git probe test runner and callback are required");
  const previous = gitProbeRunner;
  gitProbeRunner = runner;
  try { return callback(); }
  finally { gitProbeRunner = previous; }
}

export function withClarityRootObservation(value, callback) {
  return withClarityRootRequest(() => callback(resolveClarityRoot(value)));
}

export function revalidateClarityRoot(rootValue) {
  const physical = realpathSync(resolve(typeof rootValue === "object" && rootValue?.root ? rootValue.root : rootValue));
  const bucket = observationBucket(physical);
  const entry = rootValue?.observationToken
    ? bucket?.byToken.get(rootValue.observationToken)
    : latestEntry(bucket);
  if (!entry) return resolveClarityRoot(rootValue?.root || rootValue);
  if (rootValue?.observationToken) revalidate(entry.observation);
  else revalidateAll(physical);
  return { root: physical, observation: entry.observation, observationToken: entry.token, policy: rootPolicyFor(rootValue) };
}

export function refreshClarityRootAfterOwnedReplacement(rootValue) {
  const physical = realpathSync(resolve(typeof rootValue === "object" && rootValue?.root ? rootValue.root : rootValue));
  const bucket = observationBucket(physical);
  if (!bucket) return resolveClarityRoot(rootValue?.root || rootValue);
  for (const entry of bucket.byToken.values()) {
    const previous = entry.observation;
    const currentPhysical = workingRoot(previous.requested, { allowAncestorSymlinks: true });
    if (currentPhysical !== previous.physicalRoot) {
      return rootChanged("Clarity working rootのalias解決先が変わったため、旧・新rootとも変更せず停止しました。", previous, { physicalRoot: currentPhysical });
    }
    const current = snapshot(previous.requested, currentPhysical, previous);
    if (previous.aliases.length !== current.aliases.length || previous.aliases.some((row, index) => {
      const next = current.aliases[index];
      return !next || row.path !== next.path || row.linkTarget !== next.linkTarget || row.resolvedTarget !== next.resolvedTarget
        || !sameIdentity(row.linkIdentity, next.linkIdentity) || !sameIdentity(row.targetIdentity, next.targetIdentity);
    })) {
      return rootChanged("Clarity working rootのancestor aliasが差し替わったため、旧・新rootとも変更せず停止しました。", previous, current);
    }
    if (!sameGitIdentity(previous.git, current.git)) {
      return rootChanged("Clarity working rootのRepo／Git identityが変わったため、変更せず停止しました。", previous, current);
    }
    entry.observation = current;
    entry.fingerprint = observationFingerprint(current);
  }
  bucket.byFingerprint.clear();
  for (const entry of bucket.byToken.values()) bucket.byFingerprint.set(entry.fingerprint, entry.token);
  registerWorkingRootGuard(physical, () => revalidateAll(physical));
  const entry = latestEntry(bucket);
  return { root: physical, observation: entry.observation, observationToken: entry.token, policy: rootPolicyFor(rootValue) };
}

export function rootPolicyFor(rootValue) {
  const physical = realpathSync(resolve(typeof rootValue === "object" && rootValue?.root ? rootValue.root : rootValue));
  const bucket = observationBucket(physical);
  const entry = rootValue?.observationToken
    ? bucket?.byToken.get(rootValue.observationToken)
    : latestEntry(bucket);
  const observation = entry?.observation;
  return {
    source: "clarity-internal-root-resolver",
    allowAncestorSymlinks: true,
    requestedRootIsSymlink: false,
    ancestorAliasCount: observation?.aliases.length || 0,
    physicalRootApplied: true,
  };
}

export function clearClarityRootObservation(rootValue) {
  const isHandle = typeof rootValue === "object" && rootValue?.root && rootValue?.observationToken;
  // A handle already carries the canonical physical key. Do not require that
  // path to still exist merely to release a failed or displaced observation.
  const physical = isHandle ? resolve(rootValue.root) : realpathSync(resolve(rootValue));
  const bucket = observationBucket(physical);
  if (!bucket) return;
  if (!isHandle) {
    observations.delete(physical);
    registerWorkingRootGuard(physical, null);
    return;
  }
  const entry = bucket.byToken.get(rootValue.observationToken);
  if (!entry) return;
  entry.leases -= 1;
  if (entry.leases > 0) return;
  bucket.byToken.delete(entry.token);
  if (bucket.byFingerprint.get(entry.fingerprint) === entry.token) bucket.byFingerprint.delete(entry.fingerprint);
  if (bucket.latestToken === entry.token) bucket.latestToken = [...bucket.byToken.keys()].at(-1) || null;
  if (bucket.byToken.size === 0) {
    observations.delete(physical);
    registerWorkingRootGuard(physical, null);
  }
}
