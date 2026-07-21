export function validateHarnessSnapshot(snapshot, expected) {
  const errors = [];
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) errors.push(`${label}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
  };
  if (!snapshot || snapshot.networkUnavailable) return ["network unavailable is not a PASS"];

  expect("commit", snapshot.commit, expected.observedCommit);
  expect("repo.full_name", snapshot.repo?.full_name, expected.repositorySlug);
  expect("repo.private", snapshot.repo?.private, false);
  expect("repo.fork", snapshot.repo?.fork, false);
  expect("Claude marketplace", snapshot.claudeMarketplace?.name, expected.claudeMarketplace);
  expect("Claude marketplace version", snapshot.claudeMarketplace?.metadata?.version, expected.version);
  expect("Claude plugin name", snapshot.claudeMarketplace?.plugins?.[0]?.name, "harness");
  expect("Claude plugin version", snapshot.claudeMarketplace?.plugins?.[0]?.version, expected.version);
  expect("Claude manifest version", snapshot.claudePlugin?.version, expected.version);
  expect("Claude manifest repository", snapshot.claudePlugin?.repository, expected.repository);
  expect("Claude manifest homepage", snapshot.claudePlugin?.homepage, expected.repository);
  expect("Codex marketplace", snapshot.codexMarketplace?.name, expected.codexMarketplace);
  expect("Codex plugin name", snapshot.codexMarketplace?.plugins?.[0]?.name, "harness");
  expect("Codex plugin path", snapshot.codexMarketplace?.plugins?.[0]?.source?.path, "./plugins/harness");
  expect("Codex manifest version", snapshot.codexPlugin?.version, expected.version);
  expect("Codex manifest repository", snapshot.codexPlugin?.repository, expected.repository);
  expect("Codex manifest homepage", snapshot.codexPlugin?.homepage, expected.repository);

  const readme = snapshot.readme || "";
  for (const command of [expected.claudeInstallCommand, expected.codexMarketplaceCommand, expected.codexInstallCommand]) {
    if (!readme.includes(command)) errors.push(`README missing ${command}`);
  }
  if (!readme.includes("$using-harness") || !readme.includes("$harness-loop")) errors.push("README missing Codex explicit entries");
  if (!readme.includes("/harness")) errors.push("README missing Claude explicit entry");
  return errors;
}

export function expectedHarnessFromEdition(edition) {
  const harness = edition.harness;
  const repositorySlug = harness.repository.replace("https://github.com/", "");
  return {
    version: harness.version,
    repository: harness.repository,
    repositorySlug,
    observedCommit: harness.observedCommit,
    claudeMarketplace: harness.hosts.claudeCode.marketplace,
    codexMarketplace: harness.hosts.codex.marketplace,
    claudeInstallCommand: `/plugin install ${harness.hosts.claudeCode.installId}`,
    codexMarketplaceCommand: `codex plugin marketplace add ${repositorySlug}`,
    codexInstallCommand: `codex plugin add ${harness.hosts.codex.installId}`,
  };
}
