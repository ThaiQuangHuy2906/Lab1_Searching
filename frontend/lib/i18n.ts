import { CURATED_EN } from "./i18n-curated.ts";
import { translateDynamicEnglish } from "./i18n-dynamic.ts";
import { EN_MESSAGES } from "./i18n-messages.ts";
import { normalizeVietnameseUiText } from "./i18n-vietnamese.ts";

export const LANGUAGE_STORAGE_KEY = "traffic-route-language";

export const LANGUAGE_VALUES = ["vi", "en"] as const;
export type Language = (typeof LANGUAGE_VALUES)[number];

export const DEFAULT_LANGUAGE: Language = "vi";

function normalizeMessage(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}

function translateEnglishCore(source: string, depth = 0): string {
  const normalized = normalizeMessage(source);
  const exact = CURATED_EN[normalized] ?? EN_MESSAGES[normalized];
  if (exact !== undefined) return exact;
  if (depth >= 4) return source;

  return translateDynamicEnglish(
    normalized,
    (part) => translateEnglishCore(part, depth + 1),
  ) ?? source;
}

export function isLanguage(value: string | null): value is Language {
  return value === "vi" || value === "en";
}

export function translateUiText(source: string, language: Language): string {
  if (source.trim() === "") return source;

  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  const core = source.slice(leading.length, source.length - trailing.length || undefined);
  if (language === "vi") {
    return `${leading}${normalizeVietnameseUiText(core)}${trailing}`;
  }
  return `${leading}${translateEnglishCore(core)}${trailing}`;
}
