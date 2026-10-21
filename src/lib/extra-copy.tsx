import { createContext, useCallback, useContext } from "react";

import type { Locale } from "../types";
import { EXTRA } from "./extra-copy.data";

/**
 * Text that is not part of the per-screen copy objects in i18n.ts: the English sentence is the key,
 * and EXTRA holds its French, Portuguese and Spanish versions. {{name}} placeholders are filled from params.
 */
export const LocaleContext = createContext<Locale>("en");

const fill = (text: string, params?: Record<string, string | number>) =>
  params ? text.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(params[k] ?? "")) : text;

export function translate(locale: Locale, text: string, params?: Record<string, string | number>): string {
  if (locale === "en") return fill(text, params);
  return fill(EXTRA[text]?.[locale] ?? text, params);
}

export type TX = (text: string, params?: Record<string, string | number>) => string;

export function useT(): TX {
  const locale = useContext(LocaleContext);
  return useCallback((text, params) => translate(locale, text, params), [locale]);
}
