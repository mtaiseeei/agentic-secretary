const ZERO_EFFECT = Object.freeze({
  fileWrites: 0,
  adapterCalls: 0,
  commandCalls: 0,
  externalCalls: 0,
});

function normalized(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function result(selectedSkill, route, reason, options = {}) {
  return {
    selectedSkill,
    route,
    reason,
    explicit: options.explicit === true,
    delegation: options.delegation || "none",
    confirmationBoundary: options.confirmationBoundary || "none",
    sideEffect: { performed: false, ...ZERO_EFFECT },
  };
}

const CONNECTOR_ROUTES = [
  { skill: "chatwork", route: "chatwork-explicit-entry", pattern: /(?:chatwork|チャットワーク)/u },
  { skill: "google-chat", route: "google-chat-explicit-entry", pattern: /(?:google\s*chat|gchat|グーグルチャット)/u },
  { skill: "setup-google", route: "google-explicit-entry", pattern: /(?:gmail|google\s*(?:calendar|drive)|google(?:カレンダー|ドライブ)|グーグル(?:カレンダー|ドライブ))/u },
  { skill: "setup-microsoft", route: "microsoft-explicit-entry", pattern: /(?:microsoft|outlook|onedrive|teams)/u },
  { skill: "setup-notion", route: "notion-connection-explicit-entry", pattern: /notion.*(?:つな|接続|設定)|(?:つな|接続|設定).*notion/u },
];

const CLARITY = /(?:project\s*clarity|\bclarity\b|クラリティ|今(?:、)?人間が考える必要|今考える(?:必要|べき)こと|決定.*実行.*(?:状態|ずれ|ズレ)|attention)/u;
const PROJECT_LIFECYCLE = /(?:プロジェクト|project|案件).*(?:作成|作って|まとめ|完了|終了|閉じ|再開|open|closed|canonicalrepo|正本repo|状況)|(?:完了|再開).*(?:プロジェクト|project|案件)/u;
const EXPLICIT_TASK = /(?:タスク化|todoに|todoへ|notion.*タスク|タスク.*notion|やることとして登録)/u;
const MEMORY = /(?:覚えて|記憶して|案件メモ|思い出して|前回の続き|決定として残)/u;
const BUILD = /(?:アプリ|ツール|サイト|機能).*(?:作って|開発|実装)|(?:作って|開発したい|実装して).*(?:アプリ|ツール|サイト|機能)/u;
const UPDATE = /(?:最新版|バージョン).*(?:確認|更新|して)|(?:プラグイン|agentic-secretary).*(?:更新|アップデート)|更新ある/u;
const DAILY = /(?:今日やること|今日の予定|朝の段取り|今日始め|今日はここまで|終わりにしよう|今日の要確認)/u;
const WEEKLY = /(?:今週|先週).*(?:振り返|活動|まとめ)|週次/u;
const CONNECTIONS = /(?:繋がってる|つながってる|接続の調子|どれが使える|接続.*診断)/u;

export function routeSecretaryIntent(input) {
  const text = normalized(input);
  if (!text) return result("secretary", "ask-current-request", "用件がまだ明示されていません。");

  // 外部サービス名が明示された場合だけ既存connector入口を選ぶ。Clarityの閲覧だけからは選ばない。
  for (const connector of CONNECTOR_ROUTES) {
    if (connector.pattern.test(text)) {
      return result(connector.skill, connector.route, "外部サービスが現在の依頼で明示されています。", {
        explicit: true,
        delegation: "existing-explicit-connector-entry",
        confirmationBoundary: "existing-connector-boundary",
      });
    }
  }
  if (CONNECTIONS.test(text)) return result("connections", "connections-read-only-diagnosis", "接続診断が明示されています。", { explicit: true });

  // task／memory／build／update／project lifecycleは各既存Skillが所有し、Clarityが横取りしない。
  if (EXPLICIT_TASK.test(text)) {
    const notion = /notion/u.test(text);
    return result(notion ? "notion-tasks" : "projects", notion ? "downstream-notion-task-handoff" : "local-todo-handoff", "タスク化が明示されています。", {
      explicit: true,
      delegation: notion ? "fixed-downstream-task-adapter" : "project-tools:add-todo",
      confirmationBoundary: "existing-task-boundary",
    });
  }
  if (MEMORY.test(text)) {
    return result("memory-care", CLARITY.test(text) ? "clarity-reference-no-duplicate-memory" : "memory-explicit-entry", "記憶操作が現在の依頼で明示されています。", {
      explicit: true,
      delegation: CLARITY.test(text) ? "reference-existing-project-decision" : "memory-care",
      confirmationBoundary: "conversation-contract",
    });
  }
  if (BUILD.test(text)) return result("build", "harness-entry", "開発依頼はHarness入口が所有します。", { explicit: true, delegation: "using-harness" });
  if (UPDATE.test(text) && !CLARITY.test(text)) return result("update", "update-read-only-diagnosis", "plugin更新の依頼です。", { explicit: true, confirmationBoundary: "existing-update-boundary" });
  if (PROJECT_LIFECYCLE.test(text)) return result("projects", "project-lifecycle", "Project lifecycleはprojectsが所有します。", { explicit: true, confirmationBoundary: "existing-project-boundary" });

  if (CLARITY.test(text)) return result("clarity", "clarity-manual-entry", "Decision／Execution／Validation／Attention／Driftの確認です。", { explicit: true });
  if (DAILY.test(text)) return result("daily", "daily-existing-entry", "予定・TODO・中断点を扱う既存daily用件です。", { explicit: true });
  if (WEEKLY.test(text)) return result("weekly", "weekly-existing-entry", "journal原本を扱う既存weekly用件です。", { explicit: true });
  return result("secretary", "secretary-general", "既存の薄いルーターで用件を確認します。");
}

export const COLLABORATION_ROUTER_MARKER = "agentic-secretary:clarity-collaboration-router:v1";
