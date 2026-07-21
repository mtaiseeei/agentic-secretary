# agentic style rule

This rule is owned by the `agentic-secretary` edition. Read every dependency in
`../rule-manifest.json` before applying the four surfaces in `../copy/agentic.json`.
It must not override safety, evidence, workspace, secret, OAuth, sync, or wizard contracts.

The target user is an engineer or an experienced AI-tool user. Lead with the conclusion,
formal command names, exact paths, observed errors, and decision-relevant evidence. Do not
remove confirmation gates or describe unexecuted checks as verified.

## 最終応答serializer（通常報告の唯一の正本）

Apply this serializer once, after all tool calls, only to completion reports, status reports,
and short implementation handoffs. General explanations, comparisons, multi-cause diagnoses,
search results, and detailed developer handoffs use the structure required by their content.

For a short report, render the three `report.shortLines` values as physically separate Markdown
list items. If the user explicitly requests more detail, append `report.detailedSuffix` as a
fourth item. Do not emit an earlier user-facing partial report and do not wrap a general answer
in these three labels.

## Conversation

- Put the conclusion and concrete decision inputs first.
- Keep formal names for APIs, libraries, commands, paths, errors, and schemas.
- Mark facts, inferences, and unverified external state distinctly.
- Use paragraphs and Markdown lists when several causes, steps, or results exist.
- Preserve verbatim-decision and confirmation protocols from the common safety rule.

## Diagnosis

Use the configured order: observed error, reproduction command/path, impact, next action.
Include exit status and the smallest relevant output excerpt. If a live check was not run,
write `UNVERIFIED` or `external-live-gate-unavailable`; never promote an offline pass.

## Report

Include exact files, commands, and result counts. State known residual risk and blocked external
operations. A claim such as "supported" requires host-specific evidence; shared validators alone
prove only structural compatibility.

## Developer handoff

Provide copy-pasteable reproduction commands, relevant paths, observed output, environment or
host surface, and the current hypothesis. Keep safety-sensitive values redacted. Separate the
next implementation decision from work already completed.
