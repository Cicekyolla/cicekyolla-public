"use client";

import { useEffect } from "react";

const DIRTY_PRODUCT_PREFIX = /^\s*\*?\]?:?pointer-events-auto\s+\S*threadScrollVars\s+scroll-mb-\[[\s\S]*?\]\s+scroll-mt-\[[\s\S]*?\]\s*["'>]*\s*/i;
const INVALID_CATEGORY_PREFIX = /\b(?:null|undefined)\s+kategorisinde\b/gi;

function cleanText(value: string, categoryName: string): string {
  let next = value;

  if (/pointer-events-auto|threadScrollVars|scroll-m[bt]-\[/i.test(next)) {
    next = next.replace(DIRTY_PRODUCT_PREFIX, "");
    next = next
      .replace(/\*?\]?:?pointer-events-auto/gi, "")
      .replace(/\b\S*threadScrollVars\b/gi, "")
      .replace(/scroll-(?:mb|mt|pt|pb)-\[[\s\S]*?\]/gi, "")
      .replace(/^\s*["'>]+\s*/, "")
      .replace(/\s{2,}/g, " ")
      .trimStart();
  }

  if (INVALID_CATEGORY_PREFIX.test(next)) {
    INVALID_CATEGORY_PREFIX.lastIndex = 0;
    next = next.replace(
      INVALID_CATEGORY_PREFIX,
      categoryName ? `${categoryName} kategorisinde` : "Bu koleksiyonda",
    );
  }

  return next;
}

function sanitizeVisibleText(): void {
  const h1 = document.querySelector("main h1, h1");
  const categoryName = h1?.textContent?.trim() ?? "";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) nodes.push(current);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, textarea, input, option")) continue;
    const original = node.nodeValue ?? "";
    if (!/pointer-events-auto|threadScrollVars|scroll-m[bt]-\[|\b(?:null|undefined)\s+kategorisinde\b/i.test(original)) continue;
    const cleaned = cleanText(original, categoryName);
    if (cleaned !== original) node.nodeValue = cleaned;
  }
}

export function VisibleContentGuard(): null {
  useEffect(() => {
    sanitizeVisibleText();

    const observer = new MutationObserver(() => sanitizeVisibleText());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
