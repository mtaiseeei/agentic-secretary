#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const cdp = args.get("--cdp") || "http://127.0.0.1:9235";
const chatworkUrl = args.get("--chatwork-url") || "http://127.0.0.1:18845/wizard?direct=rooms";
const googleUrl = args.get("--google-url") || "http://127.0.0.1:18846/google-chat.html?direct=settings-spaces";
const evidenceDir = resolve(args.get("--evidence") || "docs/evidence/sprint-035-patch-001");

const pages = await (await fetch(`${cdp}/json/list`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("browser page target not found");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((accept, reject) => {
  socket.addEventListener("open", accept, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const browserErrors = [];
const networkFailures = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") browserErrors.push({ kind: "exception", text: message.params.exceptionDetails.text || "exception", url: message.params.exceptionDetails.url || null });
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push({ kind: "log", text: message.params.entry.text, url: message.params.entry.url || null });
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    browserErrors.push({ kind: "console", text: message.params.args.map((item) => item.value || item.description || "console error").join(" "), url: null });
  }
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) networkFailures.push({ status: message.params.response.status, url: message.params.response.url });
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((accept, reject) => pending.set(id, { resolve: accept, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const delay = (ms) => new Promise((accept) => setTimeout(accept, ms));
async function waitFor(expression, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await delay(80);
  }
  throw new Error(`timeout: ${expression}`);
}

const modes = {
  desktop: { width: 1440, height: 900, mobile: false, scale: 1 },
  mobile: { width: 390, height: 844, mobile: true, scale: 1 },
  "200%": { width: 720, height: 450, mobile: false, scale: 2 },
};

async function open(url, mode) {
  const config = modes[mode];
  await send("Emulation.setDeviceMetricsOverride", {
    width: config.width,
    height: config.height,
    deviceScaleFactor: 1,
    mobile: config.mobile,
    screenWidth: config.width,
    screenHeight: config.height,
  });
  await send("Emulation.setPageScaleFactor", { pageScaleFactor: config.scale });
  const target = new URL(url);
  target.searchParams.set("evaluator", `${Date.now()}-${nextId}`);
  await send("Page.navigate", { url: target.href });
  await waitFor("document.readyState === 'complete' && document.querySelector('#app[data-screen]')");
}

async function screenshot(name) {
  const size = await evaluate("({width:Math.max(document.documentElement.scrollWidth,innerWidth),height:Math.max(document.documentElement.scrollHeight,innerHeight)})");
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
  });
  writeFileSync(resolve(evidenceDir, name), Buffer.from(result.data, "base64"));
}

async function dispatchTab() {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
}

async function runSearchScenario({ service, inputSelector }) {
  return evaluate(`(async () => {
    const service = ${JSON.stringify(service)};
    const inputSelector = ${JSON.stringify(inputSelector)};
    const app = document.querySelector('#app');
    const input = document.querySelector(inputSelector);
    const results = document.querySelector('[data-search-results]');
    if (!app || !input || !results) throw new Error(service + ': search surface missing');
    const allIds = () => [...document.querySelectorAll('[data-search-results] input[type="checkbox"]')].map((node) => node.value);
    const checkedIds = () => [...document.querySelectorAll('[data-search-results] input[type="checkbox"]:checked')].map((node) => node.value);
    const firstTwo = allIds().slice(0, 2);
    if (firstTwo.length !== 2) throw new Error(service + ': needs at least two fixture items');
    for (const id of firstTwo) {
      const checkbox = [...document.querySelectorAll('[data-search-results] input[type="checkbox"]')].find((node) => node.value === id);
      if (!checkbox.checked) checkbox.click();
    }
    const selectedBefore = checkedIds();
    const originalInput = input;
    const screenBefore = app.dataset.screen;
    let resultMutations = 0;
    let fullScreenMutations = 0;
    const resultObserver = new MutationObserver((entries) => { resultMutations += entries.length; });
    const appObserver = new MutationObserver((entries) => { fullScreenMutations += entries.length; });
    resultObserver.observe(results, { childList: true, subtree: true });
    appObserver.observe(app, { childList: true, subtree: false });
    const state = (label) => ({
      label,
      value: input.value,
      activeId: document.activeElement?.id || null,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      nodeSame: document.querySelector(inputSelector) === originalInput,
      screenSame: app.dataset.screen === screenBefore,
      displayedIds: allIds(),
      checkedVisibleIds: checkedIds(),
      resultMutations,
      fullScreenMutations,
    });
    const emitInput = async (value, caret, isComposing = false) => {
      input.value = value;
      input.focus();
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: isComposing ? 'insertCompositionText' : 'insertText', isComposing }));
      await Promise.resolve();
      return state('input:' + value);
    };

    input.focus();
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    const composition = [];
    for (const value of ['え', 'えい', '営業']) composition.push(await emitInput(value, value.length, true));
    const duringComposition = state('composition-active');
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '営業' }));
    await Promise.resolve();
    const afterCompositionEnd = state('composition-end');
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '営業', inputType: 'insertText', isComposing: false }));
    await Promise.resolve();
    const afterDuplicateInput = state('composition-end-followup-input');

    const afterJapaneseClear = await emitInput('', 0, false);
    const base = service === 'Chatwork' ? firstTwo[0] : firstTwo[0].split('/').at(-1);
    const consecutive = await emitInput(base, base.length, false);
    const backspaceValue = base.slice(0, -1);
    const backspace = await emitInput(backspaceValue, backspaceValue.length, false);
    const insertAt = Math.max(1, Math.floor(base.length / 2));
    const insertedValue = base.slice(0, insertAt) + 'X' + base.slice(insertAt);
    const middleInsert = await emitInput(insertedValue, insertAt + 1, false);
    const middleDelete = await emitInput(base, insertAt, false);
    const fullDelete = await emitInput('', 0, false);
    const selectedAfter = checkedIds();
    const duplicateIds = selectedAfter.filter((id, index) => selectedAfter.indexOf(id) !== index);
    resultObserver.disconnect();
    appObserver.disconnect();
    return {
      service,
      screenBefore,
      firstTwo,
      selectedBefore,
      selectedAfter,
      duplicateIds,
      composition,
      duringComposition,
      afterCompositionEnd,
      afterDuplicateInput,
      afterJapaneseClear,
      alphanumeric: { consecutive, backspace, middleInsert, middleDelete, fullDelete },
      finalResultMutations: resultMutations,
      finalFullScreenMutations: fullScreenMutations,
    };
  })()`);
}

async function inspectLayout(inputSelector) {
  return evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(inputSelector)});
    const visibleControls = [...document.querySelectorAll('#app button, #app input, #app label.choice')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const heights = visibleControls.map((node) => node.getBoundingClientRect().height);
    const actionTargets = [...document.querySelectorAll('#app button, #app input.search, #app label.choice')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const actionHeights = actionTargets.map((node) => node.getBoundingClientRect().height);
    return {
      url: location.href,
      screen: document.querySelector('#app')?.dataset.screen,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      overflowX: document.documentElement.scrollWidth > innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      minVisibleControlHeight: heights.length ? Math.min(...heights) : null,
      minActionTargetHeight: actionHeights.length ? Math.min(...actionHeights) : null,
      searchFocused: document.activeElement === input,
      searchValue: input?.value,
      selectionStart: input?.selectionStart,
      selectionEnd: input?.selectionEnd,
      displayedIds: [...document.querySelectorAll('[data-search-results] input[type="checkbox"]')].map((node) => node.value),
      selectedIds: [...document.querySelectorAll('[data-search-results] input[type="checkbox"]:checked')].map((node) => node.value),
    };
  })()`);
}

function scenarioPassed(item) {
  const scenario = item.scenario;
  const compositionStable = scenario.composition.every((state) => state.nodeSame && state.screenSame && state.activeId && state.resultMutations === 0 && state.fullScreenMutations === 0);
  const endApplied = scenario.afterCompositionEnd.nodeSame
    && scenario.afterCompositionEnd.screenSame
    && scenario.afterCompositionEnd.activeId
    && scenario.afterCompositionEnd.displayedIds.length === 1
    && scenario.afterCompositionEnd.resultMutations > 0
    && scenario.afterCompositionEnd.fullScreenMutations === 0;
  const duplicateSuppressed = scenario.afterDuplicateInput.resultMutations === scenario.afterCompositionEnd.resultMutations;
  const alpha = Object.values(scenario.alphanumeric).every((state) => state.nodeSame && state.screenSame && state.activeId && state.selectionStart === state.selectionEnd && state.fullScreenMutations === 0);
  const insertExpected = scenario.alphanumeric.middleInsert.displayedIds.length === 0;
  const restored = scenario.alphanumeric.middleDelete.displayedIds.length === 1;
  const selectionHeld = JSON.stringify(scenario.selectedBefore) === JSON.stringify(scenario.selectedAfter) && scenario.duplicateIds.length === 0;
  return compositionStable && endApplied && duplicateSuppressed && alpha && insertExpected && restored && selectionHeld
    && item.layout.overflowX === false && item.layout.minActionTargetHeight >= 44 && item.productBrowserErrors.length === 0 && item.roundTrip.selectionHeld;
}

mkdirSync(evidenceDir, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Network.clearBrowserCache");
const report = {
  candidate: "b94501f",
  surfaces: [],
  externalLive: {
    chatworkApi: "not-run",
    googleApi: "not-run",
    oauth: "not-run",
    repositorySecrets: "not-run",
    githubActions: "not-run",
    remoteWrite: "not-run",
  },
};

for (const target of [
  { service: "Chatwork", url: chatworkUrl, inputSelector: "#room-search", expectedSelectionScreen: "chatwork-select-rooms" },
  { service: "Google Chat", url: googleUrl, inputSelector: "#settings-space-search", expectedSelectionScreen: "google-chat-settings-select-spaces" },
]) {
  for (const mode of Object.keys(modes)) {
    const errorStart = browserErrors.length;
    await open(target.url, mode);
    await waitFor(`document.querySelector(${JSON.stringify(target.inputSelector)})`);
    const scenario = await runSearchScenario(target);
    await evaluate(`document.querySelector(${JSON.stringify(target.inputSelector)}).focus(); true`);
    await dispatchTab();
    const tabTarget = await evaluate("({tag:document.activeElement?.tagName,id:document.activeElement?.id||null,type:document.activeElement?.getAttribute('type')||null,action:document.activeElement?.dataset?.action||null})");
    const layout = await inspectLayout(target.inputSelector);
    const beforeRoundTrip = scenario.selectedAfter;
    await evaluate("document.querySelector('[data-action=\"next\"]')?.click(); true");
    await waitFor(`document.querySelector('#app')?.dataset.screen !== ${JSON.stringify(target.expectedSelectionScreen)}`);
    const forwardScreen = await evaluate("document.querySelector('#app')?.dataset.screen");
    await evaluate("document.querySelector('[data-action=\"back\"]')?.click(); true");
    await waitFor(`document.querySelector('#app')?.dataset.screen === ${JSON.stringify(target.expectedSelectionScreen)}`);
    const afterRoundTrip = await evaluate("[...document.querySelectorAll('[data-search-results] input[type=\"checkbox\"]:checked')].map((node)=>node.value)");
    const roundTrip = { forwardScreen, before: beforeRoundTrip, after: afterRoundTrip, selectionHeld: JSON.stringify(beforeRoundTrip) === JSON.stringify(afterRoundTrip) };
    await screenshot(`${target.service === "Chatwork" ? "chatwork" : "google-chat"}-${mode.replace('%', 'pct')}.png`);
    const surfaceBrowserErrors = browserErrors.slice(errorStart);
    const fixtureWarnings = surfaceBrowserErrors.filter((error) => error.kind === "log" && /404|Failed to load resource/.test(error.text) && /favicon\.ico(?:$|\?)/.test(error.url || ""));
    const productBrowserErrors = surfaceBrowserErrors.filter((error) => !fixtureWarnings.includes(error));
    const item = { service: target.service, mode, scenario, tabTarget, layout, roundTrip, browserErrors: surfaceBrowserErrors, fixtureWarnings, productBrowserErrors };
    item.passed = scenarioPassed(item);
    report.surfaces.push(item);
  }
}

report.browserErrors = browserErrors;
report.networkFailures = networkFailures;
report.fixtureWarnings = report.surfaces.flatMap((item) => item.fixtureWarnings);
report.productBrowserErrors = report.surfaces.flatMap((item) => item.productBrowserErrors);
report.passed = report.surfaces.length === 6 && report.surfaces.every((item) => item.passed) && report.productBrowserErrors.length === 0;
writeFileSync(resolve(evidenceDir, "browser-evidence.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`SPRINT035_PATCH001_EVALUATOR_BROWSER_PASS=${report.surfaces.filter((item) => item.passed).length} SPRINT035_PATCH001_EVALUATOR_BROWSER_FAIL=${report.surfaces.filter((item) => !item.passed).length}\n`);
socket.close();
process.exit(report.passed ? 0 : 1);
