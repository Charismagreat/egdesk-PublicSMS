"use client";

const GOOGLE_SHEET_URL_KEY = "last_connected_google_sheet_url";
export const SAMPLE_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1t3OiWthLbcZDgcrLJSI-XVKX-07_KBtLdcx3XCVrUoM/edit";

export function getSavedGoogleSheetUrl(key?: string): string {
  if (typeof window === "undefined") return "";
  try {
    const storageKey = key || GOOGLE_SHEET_URL_KEY;
    const saved = localStorage.getItem(storageKey);
    return saved && saved.trim() ? saved.trim() : "";
  } catch (e) {
    return "";
  }
}

export function setSavedGoogleSheetUrl(urlOrKey: string, maybeUrl?: string): void {
  if (typeof window === "undefined") return;
  try {
    let storageKey = GOOGLE_SHEET_URL_KEY;
    let value = urlOrKey;
    if (maybeUrl !== undefined) {
      storageKey = urlOrKey;
      value = maybeUrl;
    }
    if (value) {
      localStorage.setItem(storageKey, value.trim());
    }
  } catch (e) {
    console.warn("Failed to save google sheet url to localStorage:", e);
  }
}
