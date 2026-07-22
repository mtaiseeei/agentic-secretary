#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const realGit = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
const work = realpathSync(mkdtempSync(join(tmpdir(), "secretary-pull-no-rebase-")));
let passed = 0;
let failed = 0;

function check(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    process.stdout.write(`PASS ${label}\n`);
    return;
  }
  failed += 1;
  process.stderr.write(`FAIL ${label}${detail ? `: ${detail}` : ""}\n`);
}

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  return result;
}

function must(binary, args, options = {}) {
  const result = run(binary, args, options);
  if (result.status !== 0) {
    throw new Error(`${binary} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function git(cwd, args, env) {
  return must(realGit, args, { cwd, env });
}

function fileDigest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeExecutable(path, source) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source);
  chmodSync(path, 0o755);
}

const callsites = [
  {
    id: "chatwork-wizard-sync",
    path: "plugins/secretary/skills/chatwork/scripts/wizard-server.mjs",
    marker: '["pull", "--ff-only", "--no-rebase"]',
  },
  {
    id: "chatwork-wizard-discover",
    path: "plugins/secretary/skills/chatwork/scripts/wizard-server.mjs",
    marker: '["pull", "--ff-only", "--no-rebase"]',
  },
  {
    id: "chatwork-search-flow",
    path: "plugins/secretary/skills/chatwork/scripts/search-flow.mjs",
    marker: '["pull", "--ff-only", "--no-rebase"]',
  },
  {
    id: "google-chat-search",
    path: "plugins/secretary/skills/google-chat/scripts/search.mjs",
    marker: '["pull", "--ff-only", "--no-rebase"]',
  },
  {
    id: "google-chat-search-flow",
    path: "plugins/secretary/skills/google-chat/scripts/search-flow.mjs",
    marker: '["pull", "--ff-only", "--no-rebase"]',
  },
];

const inventoryCounts = new Map();
for (const item of callsites) {
  const source = readFileSync(join(root, item.path), "utf8");
  const count = source.split(item.marker).length - 1;
  inventoryCounts.set(item.path, (inventoryCounts.get(item.path) || 0) + 1);
  check(count >= inventoryCounts.get(item.path), `inventory ${item.id} は --no-rebase を明示`);
}

const productionSources = [
  "plugins/secretary/skills/chatwork/scripts/wizard-server.mjs",
  "plugins/secretary/skills/chatwork/scripts/search-flow.mjs",
  "plugins/secretary/skills/google-chat/scripts/search.mjs",
  "plugins/secretary/skills/google-chat/scripts/search-flow.mjs",
].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
const pullArrays = [...productionSources.matchAll(/\["pull",\s*"--ff-only"[^\]]*\]/g)].map((match) => match[0]);
check(pullArrays.length === 5, "製品pull callsiteは5件", JSON.stringify(pullArrays));
check(pullArrays.every((value) => value === '["pull", "--ff-only", "--no-rebase"]'), "全callsiteのpull引数が完全一致");
check(!/(?:\[|,\s*)["'](?:rebase|merge|stash|reset|restore|commit)["']|--force/.test(pullArrays.join("\n")), "pull引数に禁止操作0件");

function makeFixture(callsite, scenario) {
  const fixture = join(work, `${callsite}-${scenario}`);
  const home = join(fixture, "home");
  const bare = join(fixture, "remote.git");
  const seed = join(fixture, "seed");
  const candidate = join(fixture, "candidate");
  mkdirSync(home, { recursive: true });
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" };
  git(fixture, ["init", "--bare", "-q", bare], env);
  git(fixture, ["clone", "-q", bare, seed], env);
  git(seed, ["config", "user.name", "Fixture Writer"], env);
  git(seed, ["config", "user.email", "fixture@example.invalid"], env);
  mkdirSync(join(seed, "chatwork", "history"), { recursive: true });
  mkdirSync(join(seed, "chatwork", "state"), { recursive: true });
  mkdirSync(join(seed, "google-chat", "history", "fixture-space"), { recursive: true });
  writeFileSync(join(seed, "chatwork", "history", "101.json"), `${JSON.stringify({ messages: [{ messageId: "1", roomId: "101", roomName: "Fixture Room", accountId: "1", accountName: "Fixture Person", sentAt: 1784160000, body: "fixture-needle" }] })}\n`);
  writeFileSync(join(seed, "chatwork", "rooms.json"), `${JSON.stringify({ version: 1, status: "ready", rooms: [{ roomId: "101", name: "Fixture Room" }] }, null, 2)}\n`);
  writeFileSync(join(seed, "chatwork", "state", "sync.json"), `${JSON.stringify({ version: 1, status: "success", results: [] }, null, 2)}\n`);
  writeFileSync(join(seed, "google-chat", "history", "fixture-space", "2026-07-22.md"), "# Fixture Space\n\nfixture-needle\n");
  writeFileSync(join(seed, "unrelated-tracked.txt"), "tracked-base\n");
  writeFileSync(join(seed, "staged.txt"), "staged-base\n");
  writeFileSync(join(seed, "conflict.txt"), "conflict-base\n");
  git(seed, ["add", "."], env);
  git(seed, ["commit", "-q", "-m", "fixture base"], env);
  git(seed, ["branch", "-M", "main"], env);
  git(seed, ["push", "-q", "-u", "origin", "main"], env);
  git(bare, ["symbolic-ref", "HEAD", "refs/heads/main"], env);
  git(fixture, ["clone", "-q", bare, candidate], env);
  git(candidate, ["config", "user.name", "Fixture Candidate"], env);
  git(candidate, ["config", "user.email", "candidate@example.invalid"], env);
  git(candidate, ["config", "pull.rebase", "true"], env);
  git(candidate, ["config", "pull.ff", "false"], env);
  git(candidate, ["config", "--global", "pull.rebase", "true"], env);

  if (callsite === "chatwork-wizard-sync") {
    const configScript = join(root, "plugins/secretary/skills/chatwork/scripts/config-transaction.mjs");
    must(process.execPath, [configScript, "--root", candidate, "--rooms", "101", "--interval", "manual", "--consent", "no"], {
      env: { ...env, YASASHII_CHATWORK_SKIP_GIT: "1", YASASHII_CHATWORK_TEST_PRIVATE: "1", YASASHII_CHATWORK_TEST_SECRET: "1" },
    });
    git(candidate, ["add", "chatwork/config.json", ".github/workflows/chatwork-sync.yml"], env);
    git(candidate, ["commit", "-q", "-m", "fixture wizard config"], env);
    git(candidate, ["push", "-q", "origin", "main"], env);
    git(seed, ["pull", "-q", "--ff-only", "--no-rebase"], env);
  }

  if (scenario === "diverged") {
    writeFileSync(join(candidate, "local-only.txt"), "local-only\n");
    git(candidate, ["add", "local-only.txt"], env);
    git(candidate, ["commit", "-q", "-m", "local divergence"], env);
  }
  if (scenario === "fast-forward") {
    writeFileSync(join(seed, "remote-only.txt"), "remote-fast-forward\n");
  } else if (scenario === "conflicting-dirty") {
    writeFileSync(join(seed, "conflict.txt"), "remote-conflict\n");
  } else if (scenario === "diverged") {
    writeFileSync(join(seed, "remote-diverged.txt"), "remote-diverged\n");
  }
  if (scenario !== "up-to-date") {
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-q", "-m", `remote ${scenario}`], env);
    git(seed, ["push", "-q", "origin", "main"], env);
  }

  writeFileSync(join(candidate, "unrelated-tracked.txt"), "tracked-dirty-preserved\n");
  writeFileSync(join(candidate, "staged.txt"), "staged-dirty-preserved\n");
  git(candidate, ["add", "staged.txt"], env);
  writeFileSync(join(candidate, "untracked.txt"), "untracked-dirty-preserved\n");
  if (scenario === "conflicting-dirty") writeFileSync(join(candidate, "conflict.txt"), "local-conflict-preserved\n");

  const bin = join(fixture, "bin");
  const gitLog = join(fixture, "git-args.log");
  const gitWrapper = join(bin, "git");
  const ghWrapper = join(bin, "gh");
  writeExecutable(gitWrapper, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$SECRETARY_GIT_ARGS_LOG"\nexec ${JSON.stringify(realGit)} "$@"\n`);
  writeExecutable(ghWrapper, `#!/usr/bin/env node\nimport{existsSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';const a=process.argv.slice(2);const state=join(process.env.SECRETARY_GH_STATE,'run.json');if(a[0]==='run'&&a[1]==='list'){if(!existsSync(state)){process.stdout.write('[]');process.exit(0)}const s=JSON.parse(readFileSync(state,'utf8'));process.stdout.write(JSON.stringify([{databaseId:701,status:'queued',conclusion:null,createdAt:s.createdAt,headBranch:'main',workflowName:'Chatwork sync',displayTitle:'Chatwork sync ['+s.correlation+']'}]));process.exit(0)}if(a[0]==='workflow'&&a[1]==='run'){const arg=a.find(v=>v.startsWith('correlation_id='));writeFileSync(state,JSON.stringify({correlation:arg.slice('correlation_id='.length),createdAt:new Date().toISOString()}));process.exit(0)}if(a[0]==='run'&&a[1]==='watch')process.exit(0);process.exit(0);\n`);
  const productEnv = {
    ...env,
    YASASHII_GIT_BIN: gitWrapper,
    YASASHII_GH_BIN: ghWrapper,
    YASASHII_CLI_TIMEOUT_MS: "5000",
    YASASHII_RUN_DISCOVERY_TIMEOUT_MS: "1000",
    YASASHII_RUN_POLL_MS: "20",
    YASASHII_CHATWORK_TEST_PRIVATE: "1",
    YASASHII_CHATWORK_TEST_SECRET: "1",
    YASASHII_CHATWORK_SKIP_GIT: "1",
    SECRETARY_GIT_ARGS_LOG: gitLog,
    SECRETARY_GH_STATE: fixture,
  };
  return { fixture, bare, seed, candidate, env, productEnv, gitLog };
}

function snapshot(target) {
  const { candidate, env } = target;
  return {
    head: git(candidate, ["rev-parse", "HEAD"], env).stdout.trim(),
    origin: git(candidate, ["rev-parse", "origin/main"], env).stdout.trim(),
    status: git(candidate, ["status", "--porcelain=v1", "--", "unrelated-tracked.txt", "staged.txt", "untracked.txt", "conflict.txt"], env).stdout,
    index: git(candidate, ["ls-files", "--stage", "--", "unrelated-tracked.txt", "staged.txt", "conflict.txt"], env).stdout,
    worktree: ["unrelated-tracked.txt", "staged.txt", "untracked.txt", "conflict.txt"].map((name) => `${name}:${fileDigest(join(candidate, name))}`).join("\n"),
    localConfig: git(candidate, ["config", "--local", "--list"], env).stdout,
    globalConfig: git(candidate, ["config", "--global", "--list"], env).stdout,
  };
}

async function startWizard(target) {
  const script = join(root, "plugins/secretary/skills/chatwork/scripts/wizard-server.mjs");
  const child = spawn(process.execPath, [script, "--root", target.candidate, "--port", "0"], {
    env: { ...target.productEnv, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errors = "";
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  const url = await new Promise((resolveUrl, reject) => {
    const timer = setTimeout(() => reject(new Error(`wizard start timeout: ${errors}`)), 5000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const found = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
      if (found) { clearTimeout(timer); resolveUrl(found.replace(/\/$/, "")); }
    });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`wizard exited ${code}: ${errors}`)); });
  });
  return { child, url };
}

async function wizardPost(session, path, body) {
  const bootstrap = await fetch(`${session.url}/api/bootstrap`);
  const cookie = bootstrap.headers.get("set-cookie")?.split(";", 1)[0] || "";
  return fetch(`${session.url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: session.url, cookie },
    body: JSON.stringify(body),
  });
}

async function invoke(target, callsite) {
  const expectedSuccess = ["up-to-date", "fast-forward"].some((value) => target.fixture.endsWith(`-${value}`));
  if (callsite === "chatwork-search-flow") {
    const script = join(root, "plugins/secretary/skills/chatwork/scripts/search-flow.mjs");
    const result = run(process.execPath, [script, "--root", target.candidate, "--query", "fixture-needle", "--choice", "decline"], { env: target.productEnv });
    return { success: result.status === 0, detail: result.stdout || result.stderr };
  }
  if (callsite === "google-chat-search") {
    const script = join(root, "plugins/secretary/skills/google-chat/scripts/search.mjs");
    const result = run(process.execPath, [script, "--root", target.candidate, "--query", "fixture-needle"], { env: target.productEnv });
    const body = JSON.parse(result.stdout || "{}");
    return { success: body.status === "found", detail: result.stdout || result.stderr };
  }
  if (callsite === "google-chat-search-flow") {
    const script = join(root, "plugins/secretary/skills/google-chat/scripts/search-flow.mjs");
    const result = run(process.execPath, [script, "--root", target.candidate, "--query", "fixture-needle", "--choice", "decline"], { env: target.productEnv });
    return { success: result.status === 0, detail: result.stdout || result.stderr };
  }
  const session = await startWizard(target);
  try {
    if (callsite === "chatwork-wizard-discover") {
      const response = await wizardPost(session, "/api/discover", {});
      return { success: response.ok, detail: await response.text() };
    }
    const response = await wizardPost(session, "/api/confirm", { selectedRoomIds: ["101"], interval: "manual", automaticPushConsent: false });
    if (response.status !== 202) return { success: false, detail: await response.text() };
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 20));
      const status = await fetch(`${session.url}/api/status`).then((value) => value.json());
      if (["success", "failed"].includes(status.dispatch?.status)) return { success: status.dispatch.status === "success", detail: JSON.stringify(status) };
    }
    return { success: false, detail: "wizard status timeout" };
  } finally {
    session.child.kill("SIGTERM");
  }
}

try {
  for (const item of callsites) {
    for (const scenario of ["up-to-date", "fast-forward", "conflicting-dirty", "diverged"]) {
      const target = makeFixture(item.id, scenario);
      const before = snapshot(target);
      const result = await invoke(target, item.id);
      const after = snapshot(target);
      const expectedSuccess = scenario === "up-to-date" || scenario === "fast-forward";
      check(result.success === expectedSuccess, `${item.id} ${scenario} の終了結果`, result.detail.slice(0, 500));
      check(after.status === before.status && after.index === before.index && after.worktree === before.worktree, `${item.id} ${scenario} はtracked/untracked/staged差分とindexを保持`);
      check(after.localConfig === before.localConfig && after.globalConfig === before.globalConfig, `${item.id} ${scenario} はGit設定を保持`);
      if (scenario === "fast-forward") check(after.head === after.origin && after.head !== before.head, `${item.id} fast-forwardでremote commitへ進む`);
      else check(after.head === before.head, `${item.id} ${scenario} はHEADを意図どおり保持`);
      const merges = Number(git(target.candidate, ["rev-list", "--count", "--min-parents=2", "HEAD"], target.env).stdout.trim());
      check(merges === 0 && !existsSync(join(target.candidate, ".git", "rebase-apply")) && !existsSync(join(target.candidate, ".git", "rebase-merge")), `${item.id} ${scenario} はmerge commit／rebase状態0件`);
      const logged = existsSync(target.gitLog) ? readFileSync(target.gitLog, "utf8").trim().split("\n") : [];
      const pulls = logged.filter((line) => line.startsWith("pull "));
      check(pulls.length === 1 && pulls[0] === "pull --ff-only --no-rebase", `${item.id} ${scenario} の実pull引数`, JSON.stringify(logged));
      check(!logged.some((line) => /^(?:config .*--(?:add|replace-all|unset)|rebase|merge|stash|reset|restore|commit)\b|--force/.test(line)), `${item.id} ${scenario} の製品Git禁止操作0件`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

process.stdout.write(`SPRINT035_PATCH002_CALLSITES=${callsites.length} SPRINT035_PATCH002_PASS=${passed} SPRINT035_PATCH002_FAIL=${failed}\n`);
if (failed > 0) process.exit(1);
