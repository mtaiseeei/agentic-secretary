#!/usr/bin/env node

import {
  ClarityError,
  appendEvidence,
  appendEvent,
  applyInit,
  decideGenericProject,
  doctor,
  history,
  previewInit,
  rebuildState,
  status,
} from "./lib/clarity-core.mjs";

function usage(message = "") {
  const prefix = message ? `${message}\n\n` : "";
  throw new ClarityError("usage", `${prefix}使い方:
  clarity init <repo> [--apply|--cancel] [--json]
  clarity status <repo> [--json]
  clarity history <repo> [--json]
  clarity rebuild <repo> [--json]
  clarity doctor <repo> [--json]
  clarity event <repo> --event-json '<JSON>' [--json]
  clarity evidence <repo> --evidence-json '<JSON>' [--json]
  clarity decide-project <project-root> --secretary-root <secretary> --project <name> --decision <text> --current <text> --next <text> [--item-id <id>] [--operation-id <id>] [--json]`, 2);
}
function parse(argv) {
  const positional = [];
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { positional.push(value); continue; }
    if (["--apply", "--cancel", "--json"].includes(value)) { options.set(value, true); continue; }
    if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) usage(`${value} の値がありません。`);
    options.set(value, argv[index + 1]);
    index += 1;
  }
  return { positional, options };
}

function parseJson(value, label) {
  if (!value) usage(`${label} を指定してください。`);
  try { return JSON.parse(value); }
  catch { usage(`${label} がJSONではありません。`); }
}

function render(command, result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify({ ok: true, command, ...result }, null, 2)}\n`);
    return;
  }
  if (command === "init") {
    if (result.status === "preview") {
      const preview = result.preview;
      process.stdout.write(`Clarity init preview（read-only）\n`);
      process.stdout.write(`- Project: ${preview.project?.name || "初期化済み"}\n`);
      process.stdout.write(`- Mode: ${preview.project?.mode || "standalone"}\n`);
      process.stdout.write(`- Item候補: ${preview.candidates?.length ?? preview.itemCount ?? 0}件\n`);
      process.stdout.write(`- 作成予定: ${(preview.writes || []).join(", ") || "なし"}\n`);
      process.stdout.write(`- 競合: ${(preview.conflicts || []).length}件\n`);
      process.stdout.write(`- 除外: ${(preview.excluded || []).length}件 / 未確認: ${(preview.uninspected || []).length}件\n`);
      process.stdout.write("明示確認後だけ --apply を付けて実行します。\n");
    } else if (result.status === "canceled") {
      process.stdout.write("Clarity initを取り消しました。file、Git、journal、runtimeは変更していません。\n");
    } else {
      process.stdout.write(`Clarity init: ${result.status}\n`);
      if (result.clarityProjectId) process.stdout.write(`- Project ID: ${result.clarityProjectId}\n`);
      if (Number.isInteger(result.itemCount)) process.stdout.write(`- Item: ${result.itemCount}件\n`);
    }
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const [command, ...rawArgs] = process.argv.slice(2);
try {
  if (!command) usage();
  const { positional, options } = parse(rawArgs);
  const root = positional[0];
  if (!root) usage("repo／project rootを指定してください。");
  let result;
  if (command === "init") {
    if (options.get("--apply") && options.get("--cancel")) usage("--apply と --cancel は同時に指定できません。");
    if (options.get("--cancel")) result = { status: "canceled", preview: previewInit(root) };
    else if (options.get("--apply")) result = applyInit(root);
    else result = { status: "preview", preview: previewInit(root) };
  } else if (command === "status") result = status(root);
  else if (command === "history") result = history(root);
  else if (command === "rebuild") result = rebuildState(root, { write: true });
  else if (command === "doctor") result = doctor(root);
  else if (command === "event") result = appendEvent(root, parseJson(options.get("--event-json"), "--event-json"));
  else if (command === "evidence") result = appendEvidence(root, parseJson(options.get("--evidence-json"), "--evidence-json"));
  else if (command === "decide-project") {
    result = decideGenericProject(root, {
      secretaryRoot: options.get("--secretary-root"),
      projectName: options.get("--project"),
      itemId: options.get("--item-id"),
      operationId: options.get("--operation-id"),
      decision: options.get("--decision"),
      current: options.get("--current"),
      next: options.get("--next"),
    });
  } else usage(`不明なcommandです: ${command}`);
  render(command, result, Boolean(options.get("--json")));
} catch (error) {
  const known = error instanceof ClarityError;
  const output = {
    ok: false,
    code: known ? error.code : "unexpected-error",
    message: error instanceof Error ? error.message : String(error),
    ...(known && Object.keys(error.details || {}).length ? { details: error.details } : {}),
  };
  process.stderr.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(known ? error.exitCode : 3);
}
