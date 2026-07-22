#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGoogleChatClient } from "../plugins/secretary/skills/google-chat/scripts/client.mjs";
import { mergeDiscoveredSpaces, normalizeDiscoveryResult } from "../plugins/secretary/skills/google-chat/scripts/discovery.mjs";
import { renderGoogleChatWorkflow } from "../plugins/secretary/skills/google-chat/scripts/schedule.mjs";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const scratch = realpathSync(tmpdir());
let pass = 0;
let fail = 0;
function check(label, value) { if (value) { pass += 1; process.stdout.write(`  PASS ${label}\n`); } else { fail += 1; process.stdout.write(`  FAIL ${label}\n`); } }

function response(json, status = 200) { return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } }); }
async function pageCase(pages) {
  const calls = [];
  const client = createGoogleChatClient({ accessToken: "synthetic-only", fetchImpl: async (url) => {
    const token = new URL(url).searchParams.get("pageToken") || "first";
    calls.push(token);
    const value = pages[token];
    if (value instanceof Error) throw value;
    if (value?.status) return response(value.body || {}, value.status);
    return response(value || {});
  } });
  return { result: await client.discoverSpaces(), calls };
}

const one = await pageCase({ first: { spaces: [{ name: "spaces/a", displayName: "Synthetic A", spaceType: "SPACE" }, { name: "spaces/dm", displayName: "Synthetic DM", spaceType: "DIRECT_MESSAGE" }] } });
check("1ページをcompleteで取得", one.result.status === "complete" && one.calls.join() === "first");
check("DMを除外", one.result.spaces.length === 1 && one.result.excluded === 1);
const three = await pageCase({
  first: { spaces: [{ name: "spaces/a", displayName: "Synthetic A", spaceType: "SPACE" }], nextPageToken: "p2" },
  p2: { spaces: [{ name: "spaces/b", displayName: "Synthetic B", spaceType: "SPACE" }, { name: "spaces/a", displayName: "dup", spaceType: "SPACE" }], nextPageToken: "p3" },
  p3: { spaces: [{ name: "spaces/c", displayName: "Synthetic C", spaceType: "SPACE" }, { name: "", spaceType: "SPACE" }, { name: "spaces/group", spaceType: "GROUP_CHAT" }] },
});
check("3ページのnextPageTokenを最後まで取得", three.result.status === "complete" && three.calls.join() === "first,p2,p3" && three.result.pages === 3);
check("SPACE限定・重複IDなし・欠損ID除外", three.result.spaces.map((item) => item.name).join() === "spaces/a,spaces/b,spaces/c" && three.result.excluded === 3);
const partial = await pageCase({ first: { spaces: [{ name: "spaces/a", spaceType: "SPACE" }], nextPageToken: "p2" }, p2: { status: 429 } });
check("途中失敗はpartial", partial.result.status === "partial" && partial.result.spaces.length === 1 && partial.result.error === "rate-limit");
const failed = await pageCase({ first: { status: 401 } });
check("最初のpage失敗はfailed", failed.result.status === "failed" && failed.result.spaces.length === 0 && failed.result.error === "reauth-required");
const cycle = await pageCase({ first: { spaces: [{ name: "spaces/a", spaceType: "SPACE" }], nextPageToken: "loop" }, loop: { spaces: [{ name: "spaces/b", spaceType: "SPACE" }], nextPageToken: "loop" } });
check("page token循環を無限loopにせずpartial", cycle.result.status === "partial" && cycle.calls.length === 2 && cycle.result.error === "page-token-cycle");

const known = [
  { name: "spaces/a", displayName: "Known A", spaceType: "SPACE", custom: "keep" },
  { name: "spaces/missing", displayName: "Known Missing", spaceType: "SPACE" },
];
const completeResult = normalizeDiscoveryResult({ correlationId: "synthetic-complete-001", status: "complete", generatedAt: "2026-07-23T00:00:00.000Z", spaces: [{ name: "spaces/a", displayName: "Fresh A", spaceType: "SPACE" }, { name: "spaces/new", displayName: "New", spaceType: "SPACE" }] }, "synthetic-complete-001");
const merged = mergeDiscoveredSpaces(known, completeResult);
check("既知entryとcustom fieldを保持", merged.spaces[0].displayName === "Known A" && merged.spaces[0].custom === "keep");
check("今回不在の既知entryを削除しない", merged.spaces.some((item) => item.name === "spaces/missing") && merged.missingKnown);
check("新規SPACEを末尾へ1件追加", merged.added === 1 && merged.spaces.at(-1).name === "spaces/new");
check("同じ結果を2回mergeして差分なし", JSON.stringify(mergeDiscoveredSpaces(merged.spaces, completeResult).spaces) === JSON.stringify(merged.spaces));
const keptOnFailure = mergeDiscoveredSpaces(known, normalizeDiscoveryResult({ correlationId: "synthetic-failed-001", status: "failed", generatedAt: "2026-07-23T00:00:00.000Z", spaces: [] }));
check("failedでも既知一覧を保持", JSON.stringify(keptOnFailure.spaces) === JSON.stringify(known));
check("別correlation結果を拒否", (() => { try { normalizeDiscoveryResult({ ...completeResult, correlationId: "stale-result" }, "current-result"); return false; } catch (error) { return error.kind === "discovery-correlation-mismatch"; } })());

const workflow = renderGoogleChatWorkflow("3h", true);
check("workflowはmode=discover専用分岐を持つ", workflow.includes("inputs.mode == 'discover'") && workflow.includes("google-chat/scripts/discovery.mjs"));
check("discovery resultだけを専用pathへstage", workflow.includes("git add google-chat/spaces-discovery.json"));
check("通常syncと3時間scheduleを維持", workflow.includes("node google-chat/scripts/continuous-sync.mjs") && workflow.includes("23 */3 * * *"));

function workspace(label, discoveryStatus) {
  const root = mkdtempSync(join(scratch, `gchat-p003-${label}-`));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  execFileSync("git", ["remote", "add", "origin", `https://github.com/fixture/${label}.git`], { cwd: root });
  mkdirSync(join(root, "google-chat", "state"), { recursive: true });
  const config = { version: 2, selectedSpaceNames: ["spaces/a"], selectedSpaces: [known[0]], interval: "3h", scheduleEnabled: true, automaticPushConsent: true, unrelated: "keep" };
  const cached = { version: 1, capturedAt: "2026-07-22T00:00:00.000Z", spaces: known };
  writeFileSync(join(root, "google-chat", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(join(root, "google-chat", "spaces.json"), `${JSON.stringify(cached, null, 2)}\n`);
  writeFileSync(join(root, "google-chat", "state", "sync.json"), '{"status":"success","custom":"keep"}\n');
  const fixturePath = join(root, "fixture.json");
  writeFileSync(fixturePath, `${JSON.stringify({ discoveryStatus, discoverySpaces: completeResult.spaces, spaces: completeResult.spaces }, null, 2)}\n`);
  return { root, fixturePath };
}

async function start(label, status) {
  const item = workspace(label, status);
  const child = spawn(process.execPath, [join(repo, "plugins/secretary/skills/google-chat/scripts/wizard-server.mjs"), "--root", item.root, "--port", "0"], { env: { ...process.env, YASASHII_GOOGLE_CHAT_SYNTHETIC: "1", YASASHII_GOOGLE_CHAT_TEST_PRIVATE: "1", YASASHII_GOOGLE_CHAT_FIXTURE: item.fixturePath } });
  let out = ""; let err = ""; child.stdout.on("data", (value) => { out += value; }); child.stderr.on("data", (value) => { err += value; });
  for (let i = 0; i < 100 && !/http:\/\//.test(out); i += 1) await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  const base = out.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
  if (!base) throw new Error(err || "wizard start failed");
  return { ...item, child, base };
}
async function post(item, path) {
  const boot = await fetch(`${item.base}api/bootstrap`);
  const cookie = boot.headers.get("set-cookie")?.split(";", 1)[0] || "";
  const responseValue = await fetch(`${item.base}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: new URL(item.base).origin, cookie }, body: "{}" });
  return { status: responseValue.status, body: await responseValue.json() };
}
for (const status of ["complete", "partial", "failed"]) {
  const item = await start(status, status);
  const before = ["config.json", "spaces.json", "state/sync.json"].map((path) => readFileSync(join(item.root, "google-chat", path), "utf8"));
  const result = await post(item, "api/discovery");
  const after = ["config.json", "spaces.json", "state/sync.json"].map((path) => readFileSync(join(item.root, "google-chat", path), "utf8"));
  check(`${status}: entry discovery状態を区別`, result.status === 200 && result.body.discovery.status === status);
  check(`${status}: 保存前config/spaces/sync state未変更`, JSON.stringify(before) === JSON.stringify(after));
  check(`${status}: 既存選択を保持`, result.body.current.config.selectedSpaceNames.join() === "spaces/a");
  check(`${status}: 新規を自動選択しない`, !result.body.current.config.selectedSpaceNames.includes("spaces/new"));
  item.child.kill("SIGTERM");
}

const app = readFileSync(join(repo, "plugins/secretary/skills/google-chat/assets/wizard/app.js"), "utf8");
check("設定済みentryは最新候補確認中を表示", app.includes("最新の通常スペースを確認しています") && app.includes("discoverConfiguredSpaces()"));
check("partial/failedを全参加一覧と表示しない", (app.match(/全参加一覧ではありません/g) || []).length >= 2);
check("失敗時も再試行導線を表示", app.includes("最新候補をもう一度確認する"));
check("通常entryでOAuthを必須化しない", app.indexOf("if (result.configured") < app.indexOf("else if (state.oauth.status === \"connected\")"));

const retryHelpers = app.slice(app.indexOf("function captureSettingsDiscoveryUiState"), app.indexOf("async function json"));
const configuredDiscovery = app.slice(app.indexOf("async function discoverConfiguredSpaces"), app.indexOf("function renderDiscoverFailure"));
check("再試行は保存済みconfigから選択を再構築しない", !configuredDiscovery.includes("state.selected = new Set"));
async function retryUiCase(status) {
  let screen = "result";
  let currentSearch = {
    id: "settings-space-search",
    dataset: { focusKey: "settings-space-search" },
    value: "今回",
    selectionStart: 2,
    selectionEnd: 2,
    selectionDirection: "none",
    focus() { documentFixture.activeElement = this; },
    setSelectionRange(start, end, direction) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
  };
  const documentFixture = { activeElement: currentSearch };
  const appFixture = {
    contains: (element) => screen === "result" && element === currentSearch,
    querySelector: (selector) => {
      if (screen !== "result") return null;
      if (selector === "#settings-space-search" || selector === '[data-focus-key="settings-space-search"]') return currentSearch;
      return null;
    },
  };
  const stateFixture = {
    config: { selectedSpaceNames: ["spaces/a"] },
    discovery: { status: "failed" },
    query: "今回",
    selected: new Set(["spaces/a", "spaces/missing"]),
    spaces: [],
  };
  const renderSettingsSpaces = () => {
    screen = "result";
    currentSearch = {
      id: "settings-space-search",
      dataset: { focusKey: "settings-space-search" },
      value: stateFixture.query,
      selectionStart: 0,
      selectionEnd: 0,
      selectionDirection: "none",
      focus() { documentFixture.activeElement = this; },
      setSelectionRange(start, end, direction) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
    };
  };
  const runtime = new Function("document", "app", "CSS", "state", "json", "renderSettingsSpaces", "progress", "show", `${retryHelpers}\n${configuredDiscovery}\nreturn { captureSettingsDiscoveryUiState, discoverConfiguredSpaces };`)(
    documentFixture,
    appFixture,
    { escape: (value) => value },
    stateFixture,
    async () => ({ discovery: { status, added: 0 }, spaces: [{ name: "spaces/a" }, { name: "spaces/missing" }] }),
    renderSettingsSpaces,
    () => {},
    () => { screen = "loading"; documentFixture.activeElement = { tagName: "H1" }; },
  );
  const snapshot = runtime.captureSettingsDiscoveryUiState();
  await runtime.discoverConfiguredSpaces(snapshot);
  check(`${status}: queryを保持`, currentSearch.value === "今回");
  check(`${status}: selectionStart/selectionEndを保持`, currentSearch.selectionStart === 2 && currentSearch.selectionEnd === 2);
  check(`${status}: activeElementを検索欄へ復元`, documentFixture.activeElement === currentSearch);
  check(`${status}: 未保存checkbox変更を保持`, stateFixture.selected.size === 2 && stateFixture.selected.has("spaces/missing"));
}
for (const status of ["complete", "partial", "failed"]) await retryUiCase(status);

process.stdout.write(`SPRINT035_PATCH003_PASS=${pass} SPRINT035_PATCH003_FAIL=${fail}\n`);
if (fail) process.exitCode = 1;
