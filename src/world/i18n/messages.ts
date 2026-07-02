// Typed message catalog skeleton. Message values are either plain strings or
// small formatting functions that take a params bag — this lets pluralized
// English strings and their zh-Hant counterparts live side by side under one
// id without any runtime template-string parsing.

import type { Locale } from "./locale.js";

export type MessageParams = Record<string, string | number>;

type MessageValue = string | ((params: MessageParams) => string);

// Seed set: proves both catalog shapes (plain string + parameterized function)
// across a few real namespaces. Not exhaustive — grows as more UI is localized.
export type MessageId =
  | "coach.arcComplete"
  | "coach.pendingDecision"
  | "coach.outcomeRecorded"
  | "blockers.dramaCards"
  | "blockers.rewardDecisions"
  | "shell.cycle"
  | "shell.recorded"
  | "shell.dispatches"
  | "shell.lootEquip"
  | "shell.bench"
  | "shell.recommendedParty"
  | "shell.contractOutcome";

export const MESSAGES: Record<Locale, Partial<Record<MessageId, MessageValue>>> = {
  en: {
    "coach.arcComplete": "Cartridge marked complete. Inspect or export the run state before leaving.",
    "coach.pendingDecision": "Resolve the active decision. The engine applies its consequences to this cartridge run.",
    "coach.outcomeRecorded": "Outcome recorded. Inspect the changed cartridge state or choose another available node.",
    "blockers.dramaCards": (params) => {
      const count = Number(params.count);
      return `Resolve ${count} drama card${count === 1 ? "" : "s"} before advancing.`;
    },
    "blockers.rewardDecisions": (params) => {
      const count = Number(params.count);
      return `Resolve ${count} pending reward decision${count === 1 ? "" : "s"} in Reports.`;
    },
    "shell.cycle": "Cycle",
    "shell.recorded": "Recorded",
    "shell.dispatches": "Dispatches",
    "shell.lootEquip": "Loot / Equip",
    "shell.bench": "Bench",
    "shell.recommendedParty": "Recommended party",
    "shell.contractOutcome": "Contract Outcome",
  },
  "zh-Hant": {
    "coach.arcComplete": "卡匣已標記為完成。離開前請檢視或匯出本次執行狀態。",
    "coach.pendingDecision": "請處理目前的決策。引擎將把結果套用到此卡匣的執行進度。",
    "coach.outcomeRecorded": "結果已記錄。請檢視已變更的卡匣狀態，或選擇其他可用節點。",
    "blockers.dramaCards": (params) => {
      const count = Number(params.count);
      return `推進前請先處理 ${count} 張劇情卡。`;
    },
    "blockers.rewardDecisions": (params) => {
      const count = Number(params.count);
      return `請在報告中處理 ${count} 項待定的獎勵決策。`;
    },
    "shell.cycle": "週期",
    "shell.recorded": "已記錄",
    "shell.dispatches": "快報",
    "shell.lootEquip": "戰利品／裝備",
    "shell.bench": "候補",
    "shell.recommendedParty": "推薦隊伍",
    // Intentionally left untranslated to exercise the zh-Hant → en fallback path.
    // "shell.contractOutcome": "契約結果",
  },
};

export function formatMessage(locale: Locale, id: MessageId, params?: MessageParams): string {
  const value = MESSAGES[locale]?.[id] ?? MESSAGES.en[id];
  if (value === undefined) return id;
  if (typeof value === "function") return value(params ?? {});
  return value;
}
