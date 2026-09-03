#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digestSurface, loadCollaborationInventory, validateCollaborationInventory } from "./lib/sprint-049-inventory.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2] || "validate";

try {
  const inventory = loadCollaborationInventory(repo);
  if (command === "digests") {
    const values = Object.fromEntries(inventory.surfaces.map((surface) => [surface.id, digestSurface(repo, surface.paths)]));
    process.stdout.write(`${JSON.stringify(values, null, 2)}\n`);
  } else if (command === "validate") {
    const result = validateCollaborationInventory(repo, inventory);
    process.stdout.write(`SPRINT049_INVENTORY_PASS=${result.surfaceCount} FAIL=0 CASES=${result.caseCount} MARKERS=VALID DIGESTS=VALID\n`);
  } else throw new Error(`unknown-command:${command}`);
} catch (error) {
  process.stderr.write(`SPRINT049_INVENTORY_FAIL ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
