"use client";

import * as React from "react";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  translateUiText,
  type Language,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (source: string) => string;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

const ORIGINAL_TEXT = new WeakMap<Text, string>();
const RENDERED_TEXT = new WeakMap<Text, string>();
const ORIGINAL_ATTRIBUTES = new WeakMap<Element, Map<string, string>>();
const RENDERED_ATTRIBUTES = new WeakMap<Element, Map<string, string>>();
const LOCALIZED_ATTRIBUTES = [
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "title",
  "placeholder",
] as const;
const SKIPPED_ELEMENTS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

function localizeTextNode(node: Text, language: Language) {
  const current = node.data;
  const lastRendered = RENDERED_TEXT.get(node);
  if (!ORIGINAL_TEXT.has(node) || (lastRendered !== undefined && current !== lastRendered)) {
    ORIGINAL_TEXT.set(node, current);
  }
  const original = ORIGINAL_TEXT.get(node) ?? current;
  const next = translateUiText(original, language);
  RENDERED_TEXT.set(node, next);
  if (current !== next) node.data = next;
}

function localizeElementAttributes(element: Element, language: Language) {
  let originals = ORIGINAL_ATTRIBUTES.get(element);
  let rendered = RENDERED_ATTRIBUTES.get(element);
  if (!originals) {
    originals = new Map();
    ORIGINAL_ATTRIBUTES.set(element, originals);
  }
  if (!rendered) {
    rendered = new Map();
    RENDERED_ATTRIBUTES.set(element, rendered);
  }

  for (const attribute of LOCALIZED_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    const lastRendered = rendered.get(attribute);
    if (!originals.has(attribute) || (lastRendered !== undefined && current !== lastRendered)) {
      originals.set(attribute, current);
    }
    const next = translateUiText(originals.get(attribute) ?? current, language);
    rendered.set(attribute, next);
    if (current !== next) element.setAttribute(attribute, next);
  }
}

function localizeSubtree(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root as Text, language);
    return;
  }
  if (!(root instanceof Element)) return;
  if (SKIPPED_ELEMENTS.has(root.tagName)) return;

  localizeElementAttributes(root, language);
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node instanceof Element && SKIPPED_ELEMENTS.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node as Text, language);
    else localizeElementAttributes(node as Element, language);
    node = walker.nextNode();
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(DEFAULT_LANGUAGE);

  React.useLayoutEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) setLanguageState(stored);
  }, []);

  React.useLayoutEffect(() => {
    const localizedTitle = language === "en"
      ? "HCMC Traffic Routing — AI Lab 1"
      : "Định tuyến giao thông TP.HCM — Bài thực hành 1 về Trí tuệ nhân tạo";
    const localizedDescription = language === "en"
      ? "Route-planning lab with nine graph-search algorithms and multi-stop delivery-order optimization on an HCMC road network."
      : "Bài thực hành định tuyến với chín thuật toán tìm kiếm trên đồ thị và tối ưu thứ tự giao hàng nhiều điểm trên mạng đường TP.HCM.";
    const applyHeadMetadata = () => {
      if (document.title !== localizedTitle) document.title = localizedTitle;
      const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (description && description.content !== localizedDescription) {
        description.content = localizedDescription;
      }
    };
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    applyHeadMetadata();
    localizeSubtree(document.body, language);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          localizeTextNode(record.target as Text, language);
          continue;
        }
        if (record.type === "attributes") {
          localizeElementAttributes(record.target as Element, language);
          continue;
        }
        for (const node of record.addedNodes) localizeSubtree(node, language);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...LOCALIZED_ATTRIBUTES],
    });
    const headObserver = new MutationObserver(applyHeadMetadata);
    headObserver.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => {
      observer.disconnect();
      headObserver.disconnect();
    };
  }, [language]);

  const setLanguage = React.useCallback((next: Language) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    setLanguageState(next);
  }, []);
  const t = React.useCallback((source: string) => translateUiText(source, language), [language]);
  const value = React.useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = React.useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
