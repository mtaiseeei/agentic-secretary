import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPPORTED_EDITIONS = new Set(["agentic-secretary", "yasashii-secretary"]);
const LEGACY_WIZARD_IDENTITY = "yasashii-secretary";

function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${label}を読み取れません。pluginを再導入してください。`);
  }
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label}の形式が正しくありません。pluginを再導入してください。`);
  }
  return value;
}

export function loadWizardProductIdentity(pluginRoot) {
  const edition = readJson(join(pluginRoot, "edition.json"), "edition metadata");
  const identity = edition.edition;
  if (!SUPPORTED_EDITIONS.has(identity)) {
    throw new Error("wizardの製品識別子を確認できません。pluginを再導入してください。");
  }
  if (edition.distribution?.marketplaceId !== identity
    || edition.distribution?.pluginId !== `${identity}@${identity}`) {
    throw new Error("edition metadataの配布識別子が一致しません。wizardを起動しません。");
  }

  const manifestPaths = [
    join(pluginRoot, ".claude-plugin", "plugin.json"),
    join(pluginRoot, ".codex-plugin", "plugin.json"),
  ];
  const availableManifests = manifestPaths.filter((path) => existsSync(path));
  if (availableManifests.length === 0) {
    throw new Error("正式なplugin manifestが見つかりません。wizardを起動しません。");
  }
  for (const path of availableManifests) {
    const manifest = readJson(path, "plugin manifest");
    if (manifest.name !== identity) {
      throw new Error("edition metadataとplugin manifestの製品識別子が一致しません。wizardを起動しません。");
    }
  }
  return identity;
}

export function renderWizardProductIdentity(source, identity) {
  if (!SUPPORTED_EDITIONS.has(identity)) {
    throw new Error("wizardへ適用する製品識別子が正しくありません。");
  }
  return String(source).replaceAll(LEGACY_WIZARD_IDENTITY, identity);
}
