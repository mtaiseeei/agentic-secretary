import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertClosedHandoffTemplateSchema } from "../sprint-048-handoff.mjs";

export const INVENTORY_PATH = "plugins/secretary/collaboration-inventory.json";

const EXPECTED = {
  "secretary-router": ["plugins/secretary/skills/secretary/SKILL.md", "plugins/secretary/scripts/collaboration-router.mjs", "plugins/secretary/scripts/lib/collaboration-router.mjs"],
  "clarity-skill": ["plugins/secretary/skills/clarity/SKILL.md"],
  "projects-lifecycle": ["plugins/secretary/skills/projects/SKILL.md", "plugins/secretary/scripts/project-tools.mjs", "plugins/secretary/scripts/clarity-secretary.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs", "plugins/secretary/clarity/secretary-adapter.json"],
  "daily-attention": ["plugins/secretary/skills/daily/SKILL.md", "plugins/secretary/scripts/clarity-secretary.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs"],
  "weekly-portfolio": ["plugins/secretary/skills/weekly/SKILL.md", "plugins/secretary/scripts/clarity-secretary.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs"],
  "task-seams": ["plugins/secretary/skills/projects/SKILL.md", "plugins/secretary/scripts/clarity-secretary.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs", "plugins/secretary/clarity/secretary-adapter.json", "adapters/downstream-clarity-handoff.json"],
  "memory-care": ["plugins/secretary/skills/memory-care/SKILL.md", "plugins/secretary/rules/conversation-contract.md"],
  "build-harness": ["plugins/secretary/skills/build/SKILL.md", "plugins/secretary/edition.json"],
  "update-release": ["plugins/secretary/skills/update/SKILL.md", "plugins/secretary/release-inventory.json"],
  "onboarding-templates": ["plugins/secretary/skills/onboarding/SKILL.md", "plugins/secretary/templates/AGENTS.md", "plugins/secretary/templates/CLAUDE.md", "plugins/secretary/edition.json"],
  "rules-serializer": ["plugins/secretary/rules/plain-language.md", "plugins/secretary/rules/common-language.md", "plugins/secretary/rules/conversation-contract.md", "plugins/secretary/rules/safety.md", "plugins/secretary/rules/styles/agentic.md", "plugins/secretary/rules/rule-manifest.json", "adapters/neutral-base.json"],
  "host-inventory": ["plugins/secretary/host-inventory.json", "plugins/secretary/.claude-plugin/plugin.json", "plugins/secretary/.codex-plugin/plugin.json"],
  "edition-handoff": ["adapters/downstream-clarity-handoff.json", "plugins/secretary/release-inventory.json", "adapters/agentic-overlay.json"],
  "external-connectors": ["plugins/secretary/skills/chatwork/SKILL.md", "plugins/secretary/skills/google-chat/SKILL.md", "plugins/secretary/skills/connections/SKILL.md", "plugins/secretary/skills/setup-google/SKILL.md", "plugins/secretary/skills/setup-microsoft/SKILL.md", "plugins/secretary/skills/setup-notion/SKILL.md"],
  "clarity-hook": ["plugins/secretary/hooks/hooks.json", "plugins/secretary/scripts/clarity-hook.mjs", "plugins/secretary/scripts/lib/clarity-hook.mjs"],
  "xmind-editions": ["plugins/secretary/release-inventory.json", "adapters/downstream-clarity-handoff.json", "plugins/secretary/skills/clarity/SKILL.md"],
  "package-release-inventory": ["plugins/secretary/release-inventory.json", "plugins/secretary/.claude-plugin/plugin.json", "plugins/secretary/.codex-plugin/plugin.json", ".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"],
  "canonical-repo-reader": ["plugins/secretary/scripts/clarity-secretary.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs", "plugins/secretary/clarity/secretary-adapter.json"],
  "clarity-root-policy": ["plugins/secretary/scripts/clarity.mjs", "plugins/secretary/scripts/lib/clarity-core.mjs", "plugins/secretary/scripts/lib/clarity-drift.mjs", "plugins/secretary/scripts/lib/clarity-hook.mjs", "plugins/secretary/scripts/lib/clarity-link.mjs", "plugins/secretary/scripts/lib/clarity-projection.mjs", "plugins/secretary/scripts/lib/clarity-root.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs", "plugins/secretary/scripts/lib/safe-fs.mjs"],
  "clarity-harness-scanner": ["plugins/secretary/scripts/clarity.mjs", "plugins/secretary/scripts/lib/clarity-core.mjs", "plugins/secretary/scripts/lib/clarity-harness-scan.mjs", ".github/workflows/windows-recording-regression.yml", "scripts/sprint-047-patch-001-test.mjs", "scripts/sprint-047-test.mjs", "scripts/sprint-050-patch-004-test.mjs", "scripts/sprint-050-patch-005-test.mjs"],
};

const EXPECTED_CASES = [
  ...Array.from({ length: 20 }, (_, index) => `CLX-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 7 }, (_, index) => `CF-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 14 }, (_, index) => `AR-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 16 }, (_, index) => `HS-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `SR-${String(index + 1).padStart(3, "0")}`),
];
const OLD_CONTRACTS = ["topic-save=confirm-first", "save-copy=exact-copy", "explicit-memory-request=next-turn-confirmation"];
const COORDINATION_PATHS = new Set([INVENTORY_PATH, "adapters/downstream-clarity-handoff.json", "adapters/agentic-overlay.json", "plugins/secretary/release-inventory.json"]);
const PRIVATE_LITERALS = ["vault/10_sources", "/Users/", "rules/copy/yasashii", "rules/styles/yasashii"];

function fail(code, detail = "") {
  throw new Error(`${code}${detail ? `:${detail}` : ""}`);
}

function filesystemMode(path) {
  return lstatSync(path).mode & 0o111 ? "100755" : "100644";
}

function trackedModes(root, paths) {
  const result = spawnSync("git", ["-C", root, "ls-files", "--stage", "-z", "--", ...paths], {
    encoding: "utf8", shell: false, windowsHide: true, timeout: 5_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.status !== 0) return new Map();
  const modes = new Map();
  for (const row of String(result.stdout).split("\0").filter(Boolean)) {
    const match = row.match(/^(100644|100755)\s+[a-f0-9]+\s+\d+\t(.+)$/u);
    if (match) modes.set(match[2].replaceAll("\\", "/"), match[1]);
  }
  return modes;
}

function portableMode(path, absolute, gitModes) {
  const observed = filesystemMode(absolute);
  // NTFS does not materialize Git's executable bit in the working tree. The
  // tracked index mode is therefore the portable identity on Windows. POSIX
  // and Git-free archives keep using the observed mode, so chmod tampering is
  // still part of the digest boundary.
  return process.platform === "win32" && gitModes.has(path) ? gitModes.get(path) : observed;
}

function safeRelative(path) {
  return typeof path === "string" && path.length > 0 && !path.startsWith("/") && !path.includes("..") && !path.includes("\\");
}

function scanJsonString(body, start) {
  let escaped = false;
  for (let index = start + 1; index < body.length; index += 1) {
    const char = body[index];
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === '"') return index + 1;
  }
  fail("inventory-handoff-json-string");
}

function scanJsonValue(body, start) {
  if (body[start] === '"') return scanJsonString(body, start);
  if (body[start] !== "{" && body[start] !== "[") {
    let index = start;
    while (index < body.length && body[index] !== "," && body[index] !== "}") index += 1;
    return index;
  }
  const stack = [body[start]];
  for (let index = start + 1; index < body.length; index += 1) {
    if (body[index] === '"') index = scanJsonString(body, index) - 1;
    else if (body[index] === "{" || body[index] === "[") stack.push(body[index]);
    else if (body[index] === "}" || body[index] === "]") {
      stack.pop();
      if (stack.length === 0) return index + 1;
    }
  }
  fail("inventory-handoff-json-value");
}

function topLevelJsonMembers(body) {
  let cursor = 0;
  while (/\s/u.test(body[cursor] || "")) cursor += 1;
  if (body[cursor] !== "{") fail("inventory-handoff-json-root");
  cursor += 1;
  let previousComma = null;
  const members = [];
  while (cursor < body.length) {
    const leadingStart = cursor;
    while (/\s/u.test(body[cursor] || "")) cursor += 1;
    if (body[cursor] === "}") break;
    if (body[cursor] !== '"') fail("inventory-handoff-json-key");
    const keyEnd = scanJsonString(body, cursor);
    const key = JSON.parse(body.slice(cursor, keyEnd));
    cursor = keyEnd;
    while (/\s/u.test(body[cursor] || "")) cursor += 1;
    if (body[cursor] !== ":") fail("inventory-handoff-json-colon", key);
    cursor += 1;
    while (/\s/u.test(body[cursor] || "")) cursor += 1;
    const valueEnd = scanJsonValue(body, cursor);
    cursor = valueEnd;
    while (/\s/u.test(body[cursor] || "")) cursor += 1;
    const commaAfter = body[cursor] === "," ? cursor : null;
    members.push({ key, leadingStart, valueEnd, commaBefore: previousComma, commaAfter });
    if (commaAfter === null) break;
    previousComma = commaAfter;
    cursor = commaAfter + 1;
  }
  return members;
}

function removeTopLevelJsonMembers(body, keys) {
  const members = topLevelJsonMembers(body);
  const ranges = [];
  for (const key of keys) {
    const member = members.find((candidate) => candidate.key === key);
    if (!member) fail("inventory-handoff-governance-field-missing", key);
    if (member.commaAfter !== null) ranges.push([member.leadingStart, member.commaAfter + 1]);
    else if (member.commaBefore !== null) ranges.push([member.commaBefore, member.valueEnd]);
    else fail("inventory-handoff-projection-empty", key);
  }
  let projected = body;
  for (const [start, end] of ranges.sort((left, right) => right[0] - left[0])) {
    projected = `${projected.slice(0, start)}${projected.slice(end)}`;
  }
  return projected;
}

function productSurfaceBytes(path, absolute) {
  const bytes = readFileSync(absolute);
  if (path === "plugins/secretary/.claude-plugin/plugin.json") {
    // Claude Code loads the standard hooks/hooks.json automatically. The
    // host adapter therefore omits the redundant manifest field, while the
    // collaboration inventory keeps its pre-patch digest stable by hashing
    // the historical equivalent bytes for this one optional declaration.
    const body = bytes.toString("utf8");
    if (!topLevelJsonMembers(body).some(({ key }) => key === "hooks")) {
      const closingBrace = body.lastIndexOf("}");
      const prefix = body.slice(0, closingBrace).replace(/\s*$/u, "");
      return Buffer.from(`${prefix},\n  "hooks": "./hooks/hooks.json"\n${body.slice(closingBrace)}`);
    }
    return bytes;
  }
  if (path !== "adapters/downstream-clarity-handoff.json") return bytes;

  // Sprint 050 Patch 001 keeps the accepted product candidate frozen and adds
  // governance-only bindings beside it. The Sprint 049 inventory continues to
  // guard the exact pre-Patch product projection. JSON-aware member discovery
  // prevents field placement or formatting from widening the excluded range,
  // while the closed schema makes every excluded governance byte explicit.
  const body = bytes.toString("utf8");
  const manifest = JSON.parse(body);
  assertClosedHandoffTemplateSchema(manifest);
  return Buffer.from(removeTopLevelJsonMembers(body,
    ["downstreamRepositories", "userDecisionPreWriteGate"]));
}

function portableProductBytes(path, absolute) {
  // Git archives use the canonical blob bytes, while a Windows checkout may
  // materialize the same text with CRLF. Normalize only that portable EOL
  // representation; path, executable mode, and every other content byte stay
  // inside the digest boundary.
  return Buffer.from(productSurfaceBytes(path, absolute).toString("utf8").replaceAll("\r\n", "\n"));
}

export function digestSurface(rootValue, pathsValue) {
  const root = resolve(rootValue);
  const paths = [...pathsValue].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const gitModes = trackedModes(root, paths);
  const hash = createHash("sha256");
  for (const path of paths) {
    if (!safeRelative(path)) fail("inventory-path-unsafe", path);
    const absolute = join(root, path);
    if (!existsSync(absolute)) fail("inventory-path-missing", path);
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("inventory-path-not-regular", path);
    hash.update(path).update("\0").update(portableMode(path, absolute, gitModes)).update("\0").update(portableProductBytes(path, absolute)).update("\0");
  }
  return hash.digest("hex");
}

export function loadCollaborationInventory(rootValue) {
  const root = resolve(rootValue);
  return JSON.parse(readFileSync(join(root, INVENTORY_PATH), "utf8"));
}

export function expectedSurfacePaths() {
  return structuredClone(EXPECTED);
}

export function validateCollaborationInventory(rootValue, inventoryValue = null) {
  const root = resolve(rootValue);
  const inventory = inventoryValue ?? loadCollaborationInventory(root);
  if (inventory.schemaVersion !== 1 || inventory.inventoryId !== "agentic-secretary-clarity-collaboration-v1"
    || inventory.marker !== "agentic-secretary:clarity-collaboration-inventory:v1") fail("inventory-schema");
  if (!Array.isArray(inventory.surfaces)) fail("inventory-surfaces");
  const ids = inventory.surfaces.map((surface) => surface?.id);
  if (new Set(ids).size !== ids.length) fail("inventory-surface-duplicate");
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(Object.keys(EXPECTED).sort())) fail("inventory-surface-omission-or-extra");

  const coveredCases = new Set();
  for (const surface of inventory.surfaces) {
    const expectedPaths = EXPECTED[surface.id];
    if (JSON.stringify(surface.paths) !== JSON.stringify(expectedPaths)) fail("inventory-path-contract", surface.id);
    for (const field of ["role", "edition", "delegation"]) if (typeof surface[field] !== "string" || !surface[field]) fail("inventory-field", `${surface.id}:${field}`);
    if (!Array.isArray(surface.noTouch) || surface.noTouch.length === 0 || surface.noTouch.some((value) => typeof value !== "string" || !value)) fail("inventory-no-touch", surface.id);
    if (!Array.isArray(surface.tests) || surface.tests.length === 0) fail("inventory-tests", surface.id);
    for (const id of surface.tests) {
      if (!EXPECTED_CASES.includes(id)) fail("inventory-test-unknown", `${surface.id}:${id}`);
      coveredCases.add(id);
    }
    if (!Array.isArray(surface.markers) || surface.markers.length === 0) fail("inventory-marker-missing", surface.id);
    for (const marker of surface.markers) {
      if (!surface.paths.includes(marker.path) || typeof marker.token !== "string" || !marker.token) fail("inventory-marker-invalid", surface.id);
      if (!readFileSync(join(root, marker.path), "utf8").includes(marker.token)) fail("inventory-marker-stale", `${surface.id}:${marker.path}`);
    }
    const observed = digestSurface(root, surface.paths);
    if (surface.contentDigest !== observed) fail("inventory-digest-stale", surface.id);

    for (const path of surface.paths) {
      const body = readFileSync(join(root, path), "utf8");
      for (const old of OLD_CONTRACTS) if (body.includes(old)) fail("inventory-old-contract", `${surface.id}:${path}`);
      if (!COORDINATION_PATHS.has(path)) {
        for (const literal of PRIVATE_LITERALS) if (body.includes(literal)) fail("inventory-private-literal", `${surface.id}:${path}`);
        if (/(?:^|\D)05\/02(?:\D|$)/u.test(body)) fail("inventory-private-literal", `${surface.id}:${path}`);
      }
    }
  }
  if (JSON.stringify([...coveredCases].sort()) !== JSON.stringify([...EXPECTED_CASES].sort())) fail("inventory-case-omission");
  return { surfaceCount: inventory.surfaces.length, caseCount: coveredCases.size, digestsValid: true, markersValid: true };
}
