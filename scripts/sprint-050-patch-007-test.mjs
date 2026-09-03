#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeUpdateDirectoryIdentity,
  observeUpdateDirectory,
  parseUpdateGitPath,
  revalidateUpdateDirectory,
  sameUpdateDirectoryIdentity,
} from "../plugins/secretary/scripts/lib/update-root-identity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requireWindows = process.argv.includes("--require-windows");
if (requireWindows && process.platform !== "win32") {
  process.stderr.write("SPRINT050_PATCH007_FAIL --require-windowsはWindows nativeでのみ実行できます。\n");
  process.exit(1);
}

const safeTemporaryBase = process.platform === "win32" && process.env.USERPROFILE && existsSync(process.env.USERPROFILE)
  ? process.env.USERPROFILE
  : existsSync("/private/tmp") ? "/private/tmp" : tmpdir();
const temporaryRoot = mkdtempSync(join(safeTemporaryBase, "sprint050-p007-root-"));
let pass = 0;
let fail = 0;

function check(label, condition, detail = "") {
  if (condition) {
    pass += 1;
    process.stdout.write(`PASS ${label}\n`);
  } else {
    fail += 1;
    process.stderr.write(`FAIL ${label}${detail ? ` (${detail})` : ""}\n`);
  }
}

function expectCode(label, fn, code) {
  try {
    fn();
    check(label, false, "拒否されませんでした");
  } catch (error) {
    check(label, error?.code === code, `code=${error?.code ?? "none"}`);
  }
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function initializeGit(path, marker) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "fixture.txt"), `${marker}\n`);
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: path });
  git(path, ["config", "user.name", "Sprint 050 Patch 007 fixture"]);
  git(path, ["config", "user.email", "sprint050-p007@example.invalid"]);
  git(path, ["add", "."]);
  git(path, ["commit", "-qm", marker]);
}

function repoSnapshot(path) {
  return {
    head: git(path, ["rev-parse", "HEAD"]),
    status: git(path, ["status", "--porcelain=v1", "--untracked-files=all"]),
    top: readdirSync(path).sort(),
  };
}

function syntheticDirectory(dev, ino) {
  return { dev, ino, isDirectory: () => true };
}

function windowsShortPath(path) {
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", `for %I in ("${path}") do @echo %~sI`], { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function canonicalWindowsSpelling(path) {
  return resolve(path).replaceAll("/", "\\").toLocaleLowerCase("en-US");
}

try {
  const large = 18_014_398_509_481_999n;
  const normalized = normalizeUpdateDirectoryIdentity(syntheticDirectory(large, large + 1n));
  check("BigInt identityを精度を落とさず10進文字列化", normalized.dev === large.toString() && normalized.ino === (large + 1n).toString());
  check("dev/ino完全一致だけを同一identityとして受理", sameUpdateDirectoryIdentity(normalized, { ...normalized }));
  check("identityの片側またはfield欠損を拒否", [null, {}, { dev: normalized.dev }, { ino: normalized.ino }]
    .every((candidate) => !sameUpdateDirectoryIdentity(normalized, candidate) && !sameUpdateDirectoryIdentity(candidate, normalized)));
  check("devが異なるidentityを拒否", !sameUpdateDirectoryIdentity(normalized, { ...normalized, dev: (large + 2n).toString() }));
  check("inoが異なるidentityを拒否", !sameUpdateDirectoryIdentity(normalized, { ...normalized, ino: (large + 3n).toString() }));
  expectCode("dev=0をfail closed", () => normalizeUpdateDirectoryIdentity(syntheticDirectory(0n, 1n)), "update-root-identity-unavailable");
  expectCode("ino=0をfail closed", () => normalizeUpdateDirectoryIdentity(syntheticDirectory(1n, 0n)), "update-root-identity-unavailable");
  expectCode("BigInt以外のidentityをfail closed", () => normalizeUpdateDirectoryIdentity(syntheticDirectory(1, 2)), "update-root-not-directory");
  expectCode("非directoryをfail closed", () => normalizeUpdateDirectoryIdentity({ dev: 1n, ino: 2n, isDirectory: () => false }), "update-root-not-directory");

  const validPath = resolve(temporaryRoot, "valid");
  check("Git単一絶対pathを受理", parseUpdateGitPath({ status: 0, stdout: `${validPath}${process.platform === "win32" ? "\r\n" : "\n"}` }) === validPath);
  expectCode("Git複数行出力を拒否", () => parseUpdateGitPath({ status: 0, stdout: `${validPath}\n${validPath}\n` }), "update-git-output-unsafe");
  expectCode("Git非0を拒否", () => parseUpdateGitPath({ status: 1, stdout: "" }), "update-git-probe-failed");

  const repo = join(temporaryRoot, "Long workspace identity fixture");
  initializeGit(repo, "root identity baseline");
  const before = repoSnapshot(repo);
  const observation = observeUpdateDirectory(repo);
  const gitTopObservation = observeUpdateDirectory(git(repo, ["rev-parse", "--show-toplevel"]));
  check("通常Git rootの物理identityを受理", sameUpdateDirectoryIdentity(observation.identity, gitTopObservation.identity));
  check("root観測はworkspaceとGitへ副作用0", JSON.stringify(repoSnapshot(repo)) === JSON.stringify(before));

  const other = join(temporaryRoot, "other-root");
  const child = join(repo, "child");
  const prefixSibling = `${repo}-sibling`;
  initializeGit(other, "other root");
  mkdirSync(child);
  mkdirSync(prefixSibling);
  const otherObservation = observeUpdateDirectory(other);
  check("異なるroot identityを拒否", !sameUpdateDirectoryIdentity(observation.identity, otherObservation.identity));
  const childIdentity = normalizeUpdateDirectoryIdentity(lstatSync(child, { bigint: true }));
  const prefixIdentity = normalizeUpdateDirectoryIdentity(lstatSync(prefixSibling, { bigint: true }));
  check("親子pathだけでは同一rootにしない", !sameUpdateDirectoryIdentity(observation.identity, childIdentity));
  check("prefix siblingだけでは同一rootにしない", !sameUpdateDirectoryIdentity(observation.identity, prefixIdentity));

  const nonRepo = join(temporaryRoot, "not-a-repository");
  mkdirSync(nonRepo);
  const nonRepoProbe = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: nonRepo, encoding: "utf8" });
  expectCode("Git管理外directoryを副作用なく拒否", () => parseUpdateGitPath(nonRepoProbe), "update-git-probe-failed");

  const alias = join(temporaryRoot, "root-alias");
  let aliasCreated = false;
  try {
    symlinkSync(repo, alias, process.platform === "win32" ? "junction" : "dir");
    aliasCreated = true;
  } catch { /* required check below records unsupported junction creation as a failure */ }
  check("symlink/junction fixtureを作成", aliasCreated);
  if (aliasCreated) {
    try {
      observeUpdateDirectory(alias);
      check("workspace自身のsymlink/junctionを拒否", false, "拒否されませんでした");
    } catch {
      check("workspace自身のsymlink/junctionを拒否", true);
    }
  }

  if (process.platform === "win32") {
    const short = windowsShortPath(repo);
    const shortObservation = short ? observeUpdateDirectory(short) : null;
    const longGitTop = git(repo, ["rev-parse", "--show-toplevel"]);
    const longGitTopObservation = observeUpdateDirectory(longGitTop);
    const canonicalShort = short ? canonicalWindowsSpelling(short) : "";
    const canonicalLong = canonicalWindowsSpelling(longGitTop);
    const genuineShortAlias = /(?:^|\\)[^\\]*~\d+(?=\\|$)/u.test(canonicalShort);
    check("Windows 8.3短縮pathと長いGit rootを実identityで受理",
      Boolean(shortObservation && genuineShortAlias && canonicalShort !== canonicalLong
        && sameUpdateDirectoryIdentity(shortObservation.identity, longGitTopObservation.identity)),
      `shortAlias=${Boolean(short)} genuine8dot3=${genuineShortAlias} canonicalDistinct=${Boolean(short && canonicalShort !== canonicalLong)}`);
  } else {
    check("Windows 8.3 native positiveはPOSIXではNOT-RUN", !requireWindows);
  }

  const replaceable = join(temporaryRoot, "replaceable-root");
  const displaced = join(temporaryRoot, "displaced-root");
  initializeGit(replaceable, "original identity");
  const replaceObservation = observeUpdateDirectory(replaceable);
  renameSync(replaceable, displaced);
  initializeGit(replaceable, "replacement identity");
  const replacementBefore = repoSnapshot(replaceable);
  expectCode("観測後のroot差替えを更新write前に拒否", () => revalidateUpdateDirectory(replaceObservation), "update-root-identity-changed");
  check("root差替え拒否はreplacementへ副作用0", JSON.stringify(repoSnapshot(replaceable)) === JSON.stringify(replacementBefore));

  const productSource = readFileSync(join(root, "plugins/secretary/scripts/update-apply.mjs"), "utf8");
  const startSource = productSource.slice(productSource.indexOf("function start("), productSource.indexOf("function retryPlugin("));
  check("保護commit直前にrootとGit identityを再検査", startSource.indexOf("revalidateUpdateWorkspace(workspaceObservation)") >= 0
    && startSource.indexOf("revalidateUpdateWorkspace(workspaceObservation)") < startSource.indexOf("protectionCommit("));
  check("製品コードはidentity値やabsolute pathを出力しない", !/JSON\.stringify\([^\n]*(?:workspaceObservation|gitTopObservation|gitDirObservation)/u.test(productSource));
} catch (error) {
  check("Sprint 050 Patch 007 focused harness", false, error?.stack ?? String(error));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

process.stdout.write(`SPRINT050_PATCH007_PASS=${pass} FAIL=${fail} WINDOWS_NATIVE=${process.platform === "win32" ? "RUN" : "NOT-RUN"}\n`);
process.exit(fail ? 1 : 0);
