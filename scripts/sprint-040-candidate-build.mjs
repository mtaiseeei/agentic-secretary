#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]) : fallback;
}

function run(command, args, options = {}) {
  const encoding = Object.hasOwn(options, "encoding") ? options.encoding : "utf8";
  const result = spawnSync(command, args, { encoding, cwd: options.cwd, input: options.input, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${String(result.error?.message || result.stderr || "").trim()}`);
  return options.encoding === null ? result.stdout : String(result.stdout).trim();
}

function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function bytes(root, path) { return readFileSync(join(root, path)); }
function digest(root, path) { return sha(bytes(root, path)); }

function walk(root, current = root) {
  const paths = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, "en"))) {
    const absolute = join(current, name);
    const rel = relative(root, absolute).replaceAll("\\", "/");
    if (rel === ".git" || rel.startsWith(".git/")
      || rel === "docs/sprints/state.md"
      || rel.startsWith("docs/progress/")
      || rel.startsWith("docs/feedback/")) continue;
    const stat = lstatSync(absolute);
    if (stat.isDirectory()) paths.push(...walk(root, absolute));
    else if (stat.isFile()) paths.push(rel);
    else throw new Error(`unsupported-candidate-entry:${rel}`);
  }
  return paths;
}

function candidateDigest(root) {
  const hash = createHash("sha256");
  const paths = walk(root).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  for (const path of paths) {
    const mode = lstatSync(join(root, path)).mode & 0o111 ? "100755" : "100644";
    hash.update(path).update("\0").update(mode).update("\0").update(bytes(root, path)).update("\0");
  }
  return { algorithm: "sorted-relative-path-NUL-mode-NUL-bytes-NUL", files: paths.length, sha256: hash.digest("hex") };
}

function copyPublicTree(source, destination) {
  mkdirSync(destination, { recursive: false });
  for (const path of walk(source)) {
    const target = join(destination, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(source, path), target, { force: true, dereference: false, preserveTimestamps: false });
    chmodSync(target, lstatSync(join(source, path)).mode & 0o111 ? 0o755 : 0o644);
  }
}

function materializeFixedBase(source, head, destination) {
  const observed = run("git", ["-C", source, "rev-parse", "HEAD"]);
  if (observed !== head) throw new Error(`fixed-base-head-mismatch:${head}:${observed}`);
  mkdirSync(destination, { recursive: false });
  const archive = run("git", ["-C", source, "archive", "--format=tar", head], { encoding: null });
  run("tar", ["-xf", "-", "-C", destination], { input: archive });
  return new Set(run("git", ["-C", source, "ls-tree", "-r", "--name-only", head]).split("\n").filter(Boolean));
}

function copyFile(sourceRoot, candidateRoot, path) {
  const source = join(sourceRoot, path);
  if (!existsSync(source) || !lstatSync(source).isFile()) throw new Error(`common-path-missing:${path}`);
  const target = join(candidateRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { force: true, dereference: false, preserveTimestamps: false });
  chmodSync(target, lstatSync(source).mode & 0o111 ? 0o755 : 0o644);
}

function markdownSection(body, heading, nextHeading) {
  const start = body.indexOf(heading);
  const end = body.indexOf(nextHeading, start + heading.length);
  if (start < 0 || end < 0) throw new Error(`section-not-found:${heading}`);
  return body.slice(start, end);
}

function replaceSection(body, heading, nextHeading, replacement) {
  const start = body.indexOf(heading);
  const end = body.indexOf(nextHeading, start + heading.length);
  if (start < 0 || end < 0) throw new Error(`candidate-section-not-found:${heading}`);
  return `${body.slice(0, start)}${replacement.trimEnd()}\n\n${body.slice(end)}`;
}

function adaptPrivate(publicRoot, candidateRoot) {
  const publicMemory = readFileSync(join(publicRoot, "plugins/secretary/skills/memory-care/SKILL.md"), "utf8");
  const memoryPath = join(candidateRoot, "plugins/secretary/skills/memory-care/SKILL.md");
  let memory = readFileSync(memoryPath, "utf8");
  memory = replaceSection(memory, "## 1. 記憶の追加・更新", "## 2.", markdownSection(publicMemory, "## 1. 記憶の追加・更新", "## 2."));
  memory = replaceSection(memory, "## 3. 節目プロトコル", "## 4.", markdownSection(publicMemory, "## 3. 節目プロトコル", "## 4."));
  if (!memory.includes("save-memory <secretary>")) {
    memory = memory.replace(
      /\| 確認済みの相談要点を案件メモへ追加[^\n]*\n/u,
      (line) => `${line}| 明示memory依頼を保存しlocal checkpoint | \`node "\${SECRETARY_PLUGIN_ROOT}/skills/memory-care/scripts/memory-tools.mjs" save-memory <secretary> <decision\\|topic> <YYYY-MM-DD> "<題名>" '<意味tuple JSON>' "<表示要点>" [--checkpoint]\` |\n`,
    );
  }
  for (const marker of [
    "explicit-memory-request=run-once",
    "content-uncertainty=preserve",
    "retry-after-checkpoint-failure=commit-only",
  ]) {
    if (!memory.includes(marker)) memory = `${memory.trimEnd()}\n\n<!-- ${marker} -->\n`;
  }
  writeFileSync(memoryPath, memory);

  const publicSecretary = readFileSync(join(publicRoot, "plugins/secretary/skills/secretary/SKILL.md"), "utf8");
  const secretaryPath = join(candidateRoot, "plugins/secretary/skills/secretary/SKILL.md");
  let secretary = readFileSync(secretaryPath, "utf8");
  let section = markdownSection(publicSecretary, "## 会話中の節目（全モード共通）", "## 成果物を保存するとき（出力規約）");
  section = section.replaceAll("secretary/memory/preferences.md", "vault/05_secretary/memory/preferences.md");
  secretary = replaceSection(secretary, "## 会話中の節目（全モード共通）", "## 成果物を保存するとき（出力規約）", section);
  writeFileSync(secretaryPath, secretary);

  const insertions = [
    ["plugins/secretary/skills/settings/SKILL.md", "`pref-note-add` は末尾追記だけに使い", "この確認は自発提案だけに適用する。利用者が「この好みを覚えて」と明示した場合は、memory scopeの許可を\n内部分類のために取り直さず、同じturnで正規シームを1回実行する。推量や留保は内容属性として残す。\n"],
    ["plugins/secretary/skills/projects/SKILL.md", "判断は原文を示して確認した後だけ", "一般memoryへの明示保存を内部分類の確認へ戻さない。ただしPJ固有であることが明示済みの判断はこのPJ正本へ1回だけ保存し、\n一般memoryへ重複させない。秘書からPJメモ保存を提案する場合だけ内容を示して確認する。\n\n"],
  ];
  for (const [path, anchor, insertion] of insertions) {
    const absolute = join(candidateRoot, path);
    let body = readFileSync(absolute, "utf8");
    if (!body.includes(insertion.trim())) {
      const at = body.indexOf(anchor);
      if (at < 0) throw new Error(`private-adaptation-anchor-missing:${path}`);
      body = `${body.slice(0, at)}${insertion}${body.slice(at)}`;
      writeFileSync(absolute, body);
    }
  }

  const dailyPath = join(candidateRoot, "plugins/secretary/skills/daily/SKILL.md");
  let daily = readFileSync(dailyPath, "utf8");
  daily = daily.replace(/^.*この内容を決定として残しますね.*\r?\n/mu, "")
    .replace(/^.*次の別ターンで.*\r?\n/mu, "");
  if (!daily.includes("伝聞・推量・訂正は内容属性として保持")) {
    daily = daily.replace(/(3\. 当日のdecisionが0件なら[^\n]*\n)([\s\S]*?)(    候補も無ければ)/u,
      "$1   利用者が「覚えて」と明示した決定はmemoryへの許可済み依頼として同じturnで1回記録し、保存するか自体が曖昧な候補だけ副作用0で1問確認する。\n   伝聞・推量・訂正は内容属性として保持し、明示保存を取り消す理由にしない。\n$3");
    writeFileSync(dailyPath, daily);
  }

  const sprint038Path = join(candidateRoot, "scripts/sprint-038-test.mjs");
  let sprint038 = readFileSync(sprint038Path, "utf8");
  const schemaAssertion = "assert.equal(fixture.schemaVersion, 1);";
  const oldBoundaries = '"quote", "hearsay", "hypothetical", "correction"';
  const oldEvidenceKeys = '["caseId", "edition", "input", "precondition", "expected", "requiredResponseElements", "forbiddenPhrases", "meaning", "beforeSnapshot", "afterSnapshot"]';
  if (!sprint038.includes(schemaAssertion) || !sprint038.includes(oldBoundaries)) {
    throw new Error("private-adaptation-anchor-missing:scripts/sprint-038-test.mjs");
  }
  const oldRunnerCall = "const observed = runConversationScenario({ input: item.input, precondition: item.precondition });";
  if (!sprint038.includes(oldEvidenceKeys) || !sprint038.includes(oldRunnerCall)) throw new Error("private-adaptation-anchor-missing:scripts/sprint-038-test.mjs:runtime-input");
  sprint038 = sprint038.replace(schemaAssertion, "assert.equal(fixture.schemaVersion, 2);")
    .replace(oldBoundaries, '"quote", "hearsay", "hypothetical", "request-hedge", "content-speculation", "content-hearsay", "correction"')
    .replace(oldEvidenceKeys, '["caseId", "edition", "input", "precondition", "classifierInput", "expected", "requiredResponseElements", "forbiddenPhrases", "meaning", "beforeSnapshot", "afterSnapshot"]')
    .replace(oldRunnerCall, "const observed = runConversationScenario({ input: item.input, precondition: item.precondition, classifierInput: item.classifierInput, execution: item.execution });");
  writeFileSync(sprint038Path, sprint038);
}

function adaptYasashii(candidateRoot) {
  const path = join(candidateRoot, "plugins/secretary/skills/secretary/SKILL.md");
  let body = readFileSync(path, "utf8");
  body = body.replace("# agentic-secretary —", "# yasashii-secretary —")
    .replace("開発の入口（Agentic Harness）", "開発の入口（やさしいハーネス）");
  writeFileSync(path, body);
  const regressionPath = join(candidateRoot, "scripts/sprint-010-regression.sh");
  let regression = readFileSync(regressionPath, "utf8");
  regression = regression.replaceAll("styles/agentic.md", "styles/yasashii.md")
    .replaceAll("copy/agentic.json", "copy/yasashii.json");
  writeFileSync(regressionPath, regression);

  const sprint038Path = join(candidateRoot, "scripts/sprint-038-test.mjs");
  let sprint038 = readFileSync(sprint038Path, "utf8");
  const schemaAssertion = "assert.equal(fixture.schemaVersion, 1);";
  const oldBoundaries = '"quote", "hearsay", "hypothetical", "correction"';
  const oldEvidenceKeys = '["caseId", "edition", "input", "precondition", "expected", "requiredResponseElements", "forbiddenPhrases", "meaning", "beforeSnapshot", "afterSnapshot"]';
  if (!sprint038.includes(schemaAssertion) || !sprint038.includes(oldBoundaries)) {
    throw new Error("yasashii-adaptation-anchor-missing:scripts/sprint-038-test.mjs");
  }
  const oldRunnerCall = "const observed = runConversationScenario({ input: item.input, precondition: item.precondition });";
  if (!sprint038.includes(oldEvidenceKeys) || !sprint038.includes(oldRunnerCall)) throw new Error("yasashii-adaptation-anchor-missing:scripts/sprint-038-test.mjs:runtime-input");
  sprint038 = sprint038.replace(schemaAssertion, "assert.equal(fixture.schemaVersion, 2);")
    .replace(oldBoundaries, '"quote", "hearsay", "hypothetical", "request-hedge", "content-speculation", "content-hearsay", "correction"')
    .replace(oldEvidenceKeys, '["caseId", "edition", "input", "precondition", "classifierInput", "expected", "requiredResponseElements", "forbiddenPhrases", "meaning", "beforeSnapshot", "afterSnapshot"]')
    .replace(oldRunnerCall, "const observed = runConversationScenario({ input: item.input, precondition: item.precondition, classifierInput: item.classifierInput, execution: item.execution });");
  writeFileSync(sprint038Path, sprint038);
}

function markerCounts(root, inventory) {
  const bodies = inventory.surfaces.map((item) => existsSync(join(root, item.path)) ? readFileSync(join(root, item.path), "utf8") : "");
  return Object.fromEntries(inventory.requiredMarkers.map((marker) => [marker, bodies.filter((body) => body.includes(marker)).length]));
}

function candidateInventory(root, sourceInventory, tracked, editionId) {
  return sourceInventory.surfaces.map((item) => ({
    ...item,
    appliesToEdition: item.editions.includes(editionId),
    requiredMarkers: item.requiredMarkers ?? [],
    candidateSha256: digest(root, item.path),
    tracked: tracked.has(item.path),
  }));
}

function main() {
  const publicRoot = option("--public-root", scriptRoot);
  const output = option("--output");
  const yasashiiSource = option("--yasashii-source", resolve(publicRoot, "../yasashii-secretary"));
  const privateSource = option("--private-source", resolve(publicRoot, "../agentic-secretary-my-vault"));
  if (!output) throw new Error("--output is required");
  if (existsSync(output)) throw new Error("candidate-output-already-exists");

  const handoff = JSON.parse(readFileSync(join(publicRoot, "scripts/fixtures/sprint-040/downstream-handoff.json"), "utf8"));
  const inventory = JSON.parse(readFileSync(join(publicRoot, handoff.inventory), "utf8"));
  mkdirSync(output, { recursive: false });
  const reports = [];

  for (const edition of handoff.editions) {
    const candidate = join(output, edition.id);
    let tracked;
    let baseMarkerCounts;
    if (edition.id === "agentic") {
      copyPublicTree(publicRoot, candidate);
      tracked = existsSync(join(publicRoot, ".git"))
        ? new Set(run("git", ["-C", publicRoot, "ls-files"]).split("\n").filter(Boolean))
        : new Set(walk(publicRoot));
      baseMarkerCounts = markerCounts(candidate, inventory);
    } else {
      const source = edition.sourceKey === "yasashii" ? yasashiiSource : privateSource;
      tracked = materializeFixedBase(source, edition.baseHead, candidate);
      baseMarkerCounts = markerCounts(candidate, inventory);
      for (const path of handoff.exactCommonPaths) {
        copyFile(publicRoot, candidate, path);
        tracked.add(path);
      }
      if (edition.id === "yasashii") {
        for (const path of handoff.yasashiiExactPaths) { copyFile(publicRoot, candidate, path); tracked.add(path); }
        adaptYasashii(candidate);
      } else {
        for (const path of handoff.privateExactPaths) { copyFile(publicRoot, candidate, path); tracked.add(path); }
        adaptPrivate(publicRoot, candidate);
      }
    }
    const protectedBefore = Object.fromEntries((edition.protected ?? []).map((item) => [item.path, item.sha256]));
    const protectedAfter = Object.fromEntries((edition.protected ?? []).map((item) => [item.path, digest(candidate, item.path)]));
    for (const item of edition.protected ?? []) if (protectedAfter[item.path] !== item.sha256) throw new Error(`${edition.id}:protected-changed:${item.path}`);
    const actualInventory = candidateInventory(candidate, inventory, tracked, edition.id);
    const identity = candidateDigest(candidate);
    reports.push({
      id: edition.id,
      candidateRoot: edition.id,
      baseHead: edition.baseHead,
      baseMarkerCounts,
      candidateMarkerCounts: markerCounts(candidate, inventory),
      protectedBefore,
      protectedAfter,
      inventory: actualInventory,
      candidate: identity,
      suite: edition.suite,
    });
  }

  const report = {
    schemaVersion: 2,
    publicationStatus: handoff.publicationStatus,
    notExecuted: handoff.notExecuted,
    sourceInventorySha256: digest(publicRoot, handoff.inventory),
    candidates: reports,
  };
  writeFileSync(join(output, "candidate-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  for (const item of reports) console.log(`SPRINT040_${item.id.toUpperCase().replaceAll("-", "_")}_CANDIDATE=${item.candidate.sha256} FILES=${item.candidate.files}`);
  console.log(`SPRINT040_CANDIDATE_BUILD_PASS=${reports.length} FAIL=0`);
}

try { main(); } catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
