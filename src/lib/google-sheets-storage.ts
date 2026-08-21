"use client";

const GOOGLE_SHEET_URL_KEY = "last_connected_google_sheet_url";
const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/1t3OiWthLbcZDgcrLJSI-XVKX-07_KBtLdcx3XCVrUoM/edit";

export function getSavedGoogleSheetUrl(): string {
  if (typeof window === "undefined") return DEFAULT_URL;
  try {
    const saved = localStorage.getItem(GOOGLE_SHEET_URL_KEY);
    return saved && saved.trim() ? saved.trim() : DEFAULT_URL;
  } catch (e) {
    return DEFAULT_URL;
  }
}

export function setSavedGoogleSheetUrl(url: string): void {
  if (typeof window === "undefined" || !url) return;
  try {
    localStorage.setItem(GOOGLE_SHEET_URL_KEY, url.trim());
  } catch (e) {
    console.warn("Failed to save google sheet url to localStorage:", e);
  }
}
