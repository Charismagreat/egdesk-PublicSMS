import { getEgdeskBasePath } from '../../egdesk-helpers';

const GOOGLE_SHEET_URL_KEY = "last_connected_google_sheet_url";
export const SAMPLE_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1is3rN5OZ7Hzf29XJGzuNbRFyHnhcdNmx268UYakDDDk/edit?usp=sharing";
export const SAMPLE_STATEMENT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1KVVCbyOnOcQeNSCbJEcZD5eKtea2HnfjKaivJwgBWB4/edit?usp=sharing";
export const SAMPLE_SALES_ORDER_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1atWHydklPh9pDH0UeXVPYXgXAvhG8uBuEOPbmAFr0Zc/edit?usp=sharing";
const LEGACY_DUMMY_URL = "https://docs.google.com/spreadsheets/d/1t3OiWthLbcZDgcrLJSI-XVKX-07_KBtLdcx3XCVrUoM/edit";

function getTenantStorageKey(rawKey: string): string {
  const basePath = getEgdeskBasePath();
  if (basePath) {
    const cleanPath = basePath.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${cleanPath}_${rawKey}`;
  }
  return rawKey;
}

export function getSavedGoogleSheetUrl(key?: string): string {
  if (typeof window === "undefined") return "";
  try {
    const rawKey = key || GOOGLE_SHEET_URL_KEY;
    const storageKey = getTenantStorageKey(rawKey);
    const saved = localStorage.getItem(storageKey);
    if (!saved || !saved.trim()) return "";
    
    // 과거 더미 URL이 브라우저 캐시에 남아있다면 소거하고 빈 문자열 반환
    if (saved.includes("1t3OiWthLbcZDgcrLJSI-XVKX") || saved.trim() === LEGACY_DUMMY_URL) {
      localStorage.removeItem(storageKey);
      return "";
    }

    return saved.trim();
  } catch (e) {
    return "";
  }
}

export function setSavedGoogleSheetUrl(urlOrKey: string, maybeUrl?: string, maybeSheetName?: string): void {
  if (typeof window === "undefined") return;
  try {
    let rawKey = GOOGLE_SHEET_URL_KEY;
    let value = urlOrKey;
    if (maybeUrl !== undefined) {
      rawKey = urlOrKey;
      value = maybeUrl;
    }
    const storageKey = getTenantStorageKey(rawKey);
    if (value) {
      localStorage.setItem(storageKey, value.trim());

      // 도메인 추출 (예: 'hometax_inbound_sheet_url' -> 'hometax')
      const domain = rawKey.replace(/(_inbound)?_sheet_url$/, '').replace(/^last_connected_google_sheet_url$/, 'default');
      
      // 서버 system_settings 테이블에도 비동기 자동 동기화
      fetch('/api/shared/google-sheets/saved-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          url: value.trim(),
          sheetName: maybeSheetName || ''
        })
      }).catch(err => {
        console.warn('Background sync google sheet url failed:', err);
      });
    }
  } catch (e) {
    console.warn("Failed to save google sheet url to localStorage:", e);
  }
}

/**
 * 🌐 서버(system_settings) 및 로컬스토리지로부터 저장된 구글 시트 상세 설정(URL, 선택 탭, 히스토리) 로드
 */
export async function loadSavedGoogleSheetConfig(domain: string = 'default'): Promise<{
  url: string;
  sheetName: string;
  title?: string;
  recentSheets: Array<{ url: string; sheetName?: string; title?: string; lastUsed: string }>;
}> {
  const localUrl = getSavedGoogleSheetUrl(domain === 'default' ? undefined : `${domain}_sheet_url`);
  let result = {
    url: localUrl || '',
    sheetName: '',
    title: '',
    recentSheets: [] as Array<{ url: string; sheetName?: string; title?: string; lastUsed: string }>
  };

  try {
    const res = await fetch(`/api/shared/google-sheets/saved-url?domain=${encodeURIComponent(domain)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        if (data.config.url) {
          result.url = data.config.url;
          result.sheetName = data.config.sheetName || '';
          result.title = data.config.title || '';
          result.recentSheets = Array.isArray(data.config.recentSheets) ? data.config.recentSheets : [];
          // 로컬 스토리지도 최신값으로 동기화
          setSavedGoogleSheetUrl(domain === 'default' ? GOOGLE_SHEET_URL_KEY : `${domain}_sheet_url`, data.config.url, data.config.sheetName);
        }
      }
    }
  } catch (e) {
    // 오프라인이거나 에러 시 로컬 캐시값 유지
  }

  return result;
}


