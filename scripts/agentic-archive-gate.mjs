#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const target = mkdtempSync("/private/tmp/agentic-archive-");
try {
  execFileSync("git", ["archive", "--format=tar", "HEAD", "-o", join(target, "candidate.tar")], { cwd: root, stdio: "inherit" });
  const extracted = join(target, "extracted");
  execFileSync("mkdir", ["-p", extracted]);
  execFileSync("tar", ["-xf", join(target, "candidate.tar"), "-C", extracted], { stdio: "inherit" });
  if (existsSync(join(extracted, ".git"))) throw new Error("archive unexpectedly contains .git");
  execFileSync("python3", [join(extracted, "scripts/check-release-integrity.py"), "--root", extracted], { stdio: "inherit" });
  execFileSync("node", [join(extracted, "scripts/sprint-033-test.mjs"), "--root", extracted], { stdio: "inherit" });
  execFileSync("node", [join(extracted, "scripts/agentic-codex-plugin-test.mjs"), "--root", extracted], { stdio: "inherit" });
  execFileSync("node", [join(extracted, "scripts/sprint-032-patch-001-readability-test.mjs"), "--root", extracted], { stdio: "inherit" });
  execFileSync("node", [join(extracted, "scripts/agentic-readability-test.mjs"), "--root", extracted], { stdio: "inherit" });
  execFileSync("node", [join(extracted, "scripts/agentic-host-gate.mjs"), "--mode", "offline"], { cwd: extracted, stdio: "inherit" });
  process.stdout.write("AGENTIC_ARCHIVE_GATE_PASS=6 FAIL=0\n");
} finally {
  rmSync(target, { recursive: true, force: true });
}
