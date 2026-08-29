import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { dirname, join, parse, relative, resolve, sep } from "node:path";
import {
  FilesystemBoundaryError,
  registerWorkingRootGuard,
  workingRoot,
} from "./safe-fs.mjs";
import { runExternalSync } from "./external-ops.mjs";

// agentic-secretary:clarity-root-policy:v1
const observations = new Map();

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

function git(root, args) {
  const result = runExternalSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    timeoutMs: 5_000,
    maxBuffer: 1024 * 1024,
    allowFailure: true,
    label: "Clarity root Git identity inspection",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  });
  return result.status === 0 ? String(result.stdout).trim() : null;
}

function gitConfigDigest(gitDir) {
  const path = join(gitDir, "config");
  if (!existsSync(path)) return null;
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) return null;
  return sha256(readFileSync(path));
}

function gitIdentity(root, reference = null) {
  if (reference?.kind === "git") {
    const gitDir = realpathSync(reference.gitDir);
    const top = realpathSync(reference.top);
    return {
      kind: "git",
      top,
      topIdentity: filesystemIdentity(top),
      gitDir,
      gitDirIdentity: filesystemIdentity(gitDir),
      remoteDigest: gitConfigDigest(gitDir),
    };
  }
  if (reference?.kind === "non-git" && !existsSync(join(root, ".git"))) {
    return { kind: "non-git", top: null, topIdentity: null, gitDir: null, gitDirIdentity: null, remoteDigest: null };
  }
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  if (!top) return { kind: "non-git", top: null, topIdentity: null, gitDir: null, gitDirIdentity: null, remoteDigest: null };
  const physicalTop = realpathSync(top);
  const gitDirRaw = git(root, ["rev-parse", "--absolute-git-dir"]);
  const gitDir = gitDirRaw ? realpathSync(gitDirRaw) : null;
  return {
    kind: "git",
    top: physicalTop,
    topIdentity: filesystemIdentity(physicalTop),
    gitDir,
    gitDirIdentity: gitDir ? filesystemIdentity(gitDir) : null,
    remoteDigest: gitDir ? gitConfigDigest(gitDir) : null,
  };
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
  if (observation.git.kind !== current.git.kind || observation.git.top !== current.git.top
    || observation.git.remoteDigest !== current.git.remoteDigest
    || Boolean(observation.git.topIdentity) !== Boolean(current.git.topIdentity)
    || (observation.git.topIdentity && !sameIdentity(observation.git.topIdentity, current.git.topIdentity))
    || Boolean(observation.git.gitDirIdentity) !== Boolean(current.git.gitDirIdentity)
    || (observation.git.gitDirIdentity && !sameIdentity(observation.git.gitDirIdentity, current.git.gitDirIdentity))) {
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
  const existing = observations.get(physicalRoot);
  const observation = existing && requested === physicalRoot ? existing : snapshot(requested, physicalRoot);
  observations.set(physicalRoot, observation);
  registerWorkingRootGuard(physicalRoot, () => revalidate(observation));
  return {
    root: physicalRoot,
    observation,
    policy: {
      source: "clarity-internal-root-resolver",
      allowAncestorSymlinks: true,
      requestedRootIsSymlink: false,
      ancestorAliasCount: observation.aliases.length,
      physicalRootApplied: true,
    },
  };
}

export function revalidateClarityRoot(rootValue) {
  const physical = realpathSync(resolve(rootValue));
  const observation = observations.get(physical);
  if (!observation) return resolveClarityRoot(rootValue);
  revalidate(observation);
  return { root: physical, observation, policy: rootPolicyFor(physical) };
}

export function refreshClarityRootAfterOwnedReplacement(rootValue) {
  const physical = realpathSync(resolve(rootValue));
  const previous = observations.get(physical);
  if (!previous) return resolveClarityRoot(rootValue);
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
  if (previous.git.kind !== current.git.kind || previous.git.top !== current.git.top
    || previous.git.remoteDigest !== current.git.remoteDigest
    || Boolean(previous.git.topIdentity) !== Boolean(current.git.topIdentity)
    || (previous.git.topIdentity && !sameIdentity(previous.git.topIdentity, current.git.topIdentity))
    || Boolean(previous.git.gitDirIdentity) !== Boolean(current.git.gitDirIdentity)
    || (previous.git.gitDirIdentity && !sameIdentity(previous.git.gitDirIdentity, current.git.gitDirIdentity))) {
    return rootChanged("Clarity working rootのRepo／Git identityが変わったため、変更せず停止しました。", previous, current);
  }
  observations.set(physical, current);
  registerWorkingRootGuard(physical, () => revalidate(current));
  return { root: physical, observation: current, policy: rootPolicyFor(physical) };
}

export function rootPolicyFor(rootValue) {
  const physical = realpathSync(resolve(rootValue));
  const observation = observations.get(physical);
  return {
    source: "clarity-internal-root-resolver",
    allowAncestorSymlinks: true,
    requestedRootIsSymlink: false,
    ancestorAliasCount: observation?.aliases.length || 0,
    physicalRootApplied: true,
  };
}

export function clearClarityRootObservation(rootValue) {
  const physical = realpathSync(resolve(rootValue));
  observations.delete(physical);
  registerWorkingRootGuard(physical, null);
}
