#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGoogleChatClient } from "./client.mjs";
import { exchangeRefreshToken } from "./refresh-token.mjs";
import { workingRoot, writeFileAtomicSafe } from "./runtime-safety.mjs";

export const GENERAL_DISCOVERY_RESULT = "google-chat/spaces-discovery.json";

export function normalizeDiscoveryResult(value, expectedCorrelation = null) {
  const correlationId = String(value?.correlationId || "");
  if (!/^[A-Za-z0-9._-]{8,128}$/.test(correlationId) || (expectedCorrelation && correlationId !== expectedCorrelation)) {
    throw Object.assign(new Error("今回の通常スペース確認結果ではありません。"), { kind: "discovery-correlation-mismatch" });
  }
  if (!new Set(["complete", "partial", "failed"]).has(value?.status)) throw Object.assign(new Error("通常スペース確認結果の状態が不正です。"), { kind: "discovery-result-invalid" });
  if (!Number.isFinite(Date.parse(String(value?.generatedAt || "")))) throw Object.assign(new Error("通常スペース確認結果の生成時刻が不正です。"), { kind: "discovery-result-invalid" });
  const seen = new Set();
  const spaces = [];
  for (const resource of Array.isArray(value?.spaces) ? value.spaces : []) {
    const name = String(resource?.name || "").trim();
    if (resource?.spaceType !== "SPACE" || !/^spaces\/[^/]+$/.test(name) || seen.has(name)) continue;
    seen.add(name);
    spaces.push({ name, displayName: String(resource.displayName || `名称未取得 ${name.split("/").pop()}`), spaceType: "SPACE" });
  }
  return { correlationId, status: value.status, generatedAt: value.generatedAt, spaces };
}

export function mergeDiscoveredSpaces(knownSpaces, result) {
  const known = [];
  const seen = new Set();
  for (const resource of Array.isArray(knownSpaces) ? knownSpaces : []) {
    const name = String(resource?.name || "").trim();
    if (resource?.spaceType !== "SPACE" || !/^spaces\/[^/]+$/.test(name) || seen.has(name)) continue;
    seen.add(name);
    known.push({ ...resource, name, displayName: String(resource.displayName || `名称未取得 ${name.split("/").pop()}`), spaceType: "SPACE" });
  }
  let added = 0;
  if (result.status !== "failed") {
    for (const resource of result.spaces) {
      if (seen.has(resource.name)) continue;
      seen.add(resource.name);
      known.push(resource);
      added += 1;
    }
  }
  return { status: result.status, spaces: known, knownCount: known.length - added, added, missingKnown: result.status === "complete" && known.some((space) => !result.spaces.some((fresh) => fresh.name === space.name)) };
}

export async function createDiscoveryResult({ correlationId, client, generatedAt = new Date().toISOString() }) {
  if (!/^[A-Za-z0-9._-]{8,128}$/.test(String(correlationId || ""))) throw Object.assign(new Error("相関IDが不正です。"), { kind: "correlation-id-invalid" });
  const discovered = await client.discoverSpaces();
  return normalizeDiscoveryResult({ correlationId, status: discovered.status, generatedAt, spaces: discovered.spaces });
}

export function readDiscoveryResult(root, relativePath = GENERAL_DISCOVERY_RESULT, expectedCorrelation = null) {
  return normalizeDiscoveryResult(JSON.parse(readFileSync(join(root, relativePath), "utf8")), expectedCorrelation);
}

async function main() {
  const root = workingRoot(process.argv[2] || process.cwd());
  const correlationId = process.env.GOOGLE_CHAT_DISCOVERY_CORRELATION_ID || "";
  const accessToken = await exchangeRefreshToken({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN_GCHAT,
  });
  const result = await createDiscoveryResult({ correlationId, client: createGoogleChatClient({ accessToken }) });
  writeFileAtomicSafe(root, join(root, GENERAL_DISCOVERY_RESULT), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`GOOGLE_CHAT_DISCOVERY_STATUS=${result.status}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    process.stderr.write(`GOOGLE_CHAT_DISCOVERY_ERROR=${error?.code || "failed"}\n`);
    process.exitCode = 4;
  });
}
