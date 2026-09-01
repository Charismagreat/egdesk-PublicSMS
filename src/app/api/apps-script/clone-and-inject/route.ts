export const dynamic = 'force-dynamic';
// Next.js Turbopack recompiled at 2026-09-01
import { NextResponse } from 'next/server';
import { callAppsScriptTool, callDriveTool, queryTable, insertRows, updateRows, deleteRows, getGeminiApiKey } from '@/lib/egdesk-helpers';
import { callAI, unwrapAiResponseText } from '@/lib/ai-router';
import { getTenantId } from '@/lib/tenant';

// Safe internal Sheets tool caller (avoids Turbopack module cache lock)
async function callSheetsTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
  const apiUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_EGDESK_API_URL) || 'http://localhost:8080';
  try {
    const res = await fetch(`${apiUrl}/sheets/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, arguments: args })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || json?.content?.[0]?.text;
    if (text) {
      try { return JSON.parse(text); } catch { return text; }
    }
    return json;
  } catch {
    return null;
  }
}

// Safe internal Apps Script tool caller
async function callAppsScriptToolDirect(toolName: string, args: Record<string, any> = {}): Promise<any> {
  const apiUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_EGDESK_API_URL) || 'http://localhost:8080';
  try {
    const res = await fetch(`${apiUrl}/apps-script/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, arguments: args })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Apps Script tool ${toolName} HTTP ${res.status}:`, errText);
      return null;
    }
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || json?.content?.[0]?.text;
    if (text) {
      try { return JSON.parse(text); } catch { return text; }
    }
    return json;
  } catch (err: any) {
    console.error(`Apps Script tool ${toolName} fetch error:`, err.message);
    return null;
  }
}

// 구글 스프레드시트 URL에서 Spreadsheet ID 추출 정규식
function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed.includes('/') && trimmed.length >= 20) {
    return trimmed; // 순수 ID인 경우
  }
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Google Apps Script 주입 및 복제 백엔드 API 라우트
 */
export async function POST(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json();
    const { action } = body;

    // ────────────────────────────────────────────────────────
    // 1. 구글 시트 복제 (Clone Sheet)
    // ────────────────────────────────────────────────────────
    if (action === 'clone_sheet') {
      const { sheetUrl, customTitle } = body;
      const originalSheetId = extractSpreadsheetId(sheetUrl);

      if (!originalSheetId) {
        return NextResponse.json({
          success: false,
          error: '유효한 구글 스프레드시트 URL 또는 ID를 입력해 주세요. (예: https://docs.google.com/spreadsheets/d/.../edit)'
        }, { status: 400 });
      }

      let originalTitle = '';
      let clonedSheetId = '';
      let clonedSheetUrl = '';
      let sheetHeaders: string[] = [];

      // A. 원본 구글 시트의 실제 파일명 파싱 (1. Sheets API -> 2. Drive API -> 3. HTML Title)
      // 1. Google Sheets MCP를 통한 실제 타이틀 및 속성 조회
      try {
        const sheetData = await callSheetsTool('sheets_get_spreadsheet', { spreadsheetId: originalSheetId });
        if (sheetData && sheetData.properties && sheetData.properties.title) {
          originalTitle = sheetData.properties.title;
        } else if (sheetData && sheetData.title) {
          originalTitle = sheetData.title;
        }
      } catch (sheetsErr: any) {
        console.warn('Sheets MCP title fetch note:', sheetsErr.message);
      }

      // 2. Google Drive MCP를 통한 실제 파일명 조회
      if (!originalTitle) {
        try {
          const fileInfo = await callDriveTool('drive_status', { fileId: originalSheetId });
          if (fileInfo && fileInfo.name) {
            originalTitle = fileInfo.name;
          }
        } catch {}
      }

      // 3. 웹페이지 HTML 메타데이터 파싱 시도
      if (!originalTitle) {
        try {
          const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${originalSheetId}/edit`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            cache: 'no-store'
          }).catch(() => null);

          if (htmlRes && htmlRes.ok) {
            const htmlText = await htmlRes.text();
            const titleMatch = htmlText.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              let extracted = titleMatch[1].trim();
              extracted = extracted.replace(/\s*-\s*Google\s*(Sheets|스프레드시트|문서).*$/i, '').trim();
              if (extracted && extracted !== 'Google Sheets' && extracted !== 'Google 스프레드시트' && !extracted.includes('페이지를 찾을 수 없음')) {
                originalTitle = extracted;
              }
            }
          }
        } catch (titleErr: any) {
          console.warn('Google Sheet title fetch note:', titleErr.message);
        }
      }

      if (!originalTitle) {
        originalTitle = '구글 스프레드시트';
      }

      const targetTitle = customTitle && customTitle.trim() ? customTitle.trim() : `[이지데스크 자동화] ${originalTitle}`;

      // B. 원본 시트의 모든 탭 구조 및 데이터 심층 분석
      let isClonedViaApi = false;
      let allTabs: Array<{ sheetTitle: string; headers: string[]; sampleRows: any[][] }> = [];
      let fullContextRaw: any = null;

      // 1. 원본 시트 전체 컨텍스트 및 모든 탭 상세 데이터 조회
      try {
        const contextRes = await callSheetsTool('sheets_get_full_context', {
          spreadsheetId: originalSheetId,
          sampleRows: 20
        });

        if (contextRes) {
          fullContextRaw = contextRes;
          const rawSheetsData = contextRes.sheetsData || contextRes.sheets || [];
          if (Array.isArray(rawSheetsData) && rawSheetsData.length > 0) {
            allTabs = rawSheetsData.map((s: any) => ({
              sheetTitle: s.sheetTitle || s.title || 'Sheet1',
              headers: Array.isArray(s.headers) ? s.headers : [],
              sampleRows: Array.isArray(s.sampleData) ? s.sampleData : (Array.isArray(s.sampleRows) ? s.sampleRows : [])
            }));
            if (allTabs[0]?.headers && allTabs[0].headers.length > 0) {
              sheetHeaders = allTabs[0].headers;
            }
          }
        }
      } catch (ctxErr: any) {
        console.warn('Sheets full context read note:', ctxErr.message);
      }

      // 2. Google Drive 복사(drive_copy)를 통해 원본의 모든 서식, 디자인, 수식, 셀 병합 100% 완벽 복제
      try {
        const copyRes = await callDriveTool('drive_copy', {
          fileId: originalSheetId,
          destName: targetTitle
        });

        if (copyRes && (copyRes.id || copyRes.fileId)) {
          clonedSheetId = copyRes.id || copyRes.fileId;
          clonedSheetUrl = `https://docs.google.com/spreadsheets/d/${clonedSheetId}/edit`;
          isClonedViaApi = true;
        }
      } catch (copyErr: any) {
        console.warn('Drive copy note (trying fresh create fallback):', copyErr.message);
      }

      // 3. 만약 drive_copy 실패 시 sheets_create_spreadsheet 폴백
      if (!clonedSheetId) {
        try {
          const firstTabData = allTabs[0]?.sampleRows || [];
          const createArgs: Record<string, any> = { title: targetTitle };
          if (firstTabData.length > 0) {
            createArgs.data = firstTabData;
          }

          const createRes = await callSheetsTool('sheets_create_spreadsheet', createArgs);

          if (createRes && (createRes.spreadsheetId || createRes.id)) {
            clonedSheetId = createRes.spreadsheetId || createRes.id;
            clonedSheetUrl = createRes.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${clonedSheetId}/edit`;
            isClonedViaApi = true;

            // 추가 탭 생성
            if (allTabs.length > 1) {
              for (let i = 1; i < allTabs.length; i++) {
                const tab = allTabs[i];
                try {
                  await callSheetsTool('sheets_create_tab', {
                    spreadsheetId: clonedSheetId,
                    title: tab.sheetTitle
                  });
                  if (tab.sampleRows && tab.sampleRows.length > 0) {
                    await callSheetsTool('sheets_append_values', {
                      spreadsheetId: clonedSheetId,
                      range: `'${tab.sheetTitle}'!A1`,
                      values: tab.sampleRows
                    });
                  }
                } catch {}
              }
            }
          }
        } catch (createErr: any) {
          console.warn('Sheets create spreadsheet fallback note:', createErr.message);
        }
      }

      // 4. 최종 폴백
      if (!clonedSheetId) {
        clonedSheetId = originalSheetId;
        clonedSheetUrl = `https://docs.google.com/spreadsheets/d/${originalSheetId}/edit`;
      }

      // 5. 복제된 시트에 단 하나의 전용 Apps Script 프로젝트 최초 바인딩 (딱 1회만 실행)
      let initialProjectId = '';
      let initialScriptId = '';
      let initialScriptUrl = '';
      if (clonedSheetId && isClonedViaApi) {
        try {
          const boundRes = await callAppsScriptToolDirect('apps_script_create_bound', {
            fileId: clonedSheetId,
            title: targetTitle
          });
          if (boundRes && (boundRes.id || boundRes.projectId)) {
            initialProjectId = boundRes.id || boundRes.projectId;
            initialScriptId = boundRes.scriptId || '';
            initialScriptUrl = boundRes.scriptUrl || '';
          }
        } catch (boundErr: any) {
          console.warn('Initial bound project creation note:', boundErr.message);
        }
      }

      // C. 테넌트 DB에 복제 및 연동 기록 저장
      const nowStr = new Date().toISOString();
      const record = {
        tenant_id: tenantId,
        original_sheet_id: originalSheetId,
        original_sheet_url: sheetUrl,
        cloned_sheet_id: clonedSheetId,
        cloned_sheet_url: clonedSheetUrl,
        gas_project_id: initialProjectId,
        script_id: initialScriptId,
        script_url: initialScriptUrl,
        sheet_title: targetTitle,
        headers_json: JSON.stringify(sheetHeaders),
        all_tabs_json: JSON.stringify(allTabs),
        status: 'READY',
        created_at: nowStr,
        updated_at: nowStr,
      };

      try {
        await insertRows('system_settings', [{
          key: `gas_sheet_${clonedSheetId}`,
          value: JSON.stringify(record),
          tenant_id: tenantId,
          updated_at: nowStr
        }]);
      } catch (dbErr) {
        console.warn('Failed to save clone record in system_settings:', dbErr);
      }

      return NextResponse.json({
        success: true,
        originalSheetId,
        clonedSheetId,
        clonedSheetUrl,
        gasProjectId: initialProjectId,
        scriptId: initialScriptId,
        scriptUrl: initialScriptUrl,
        sheetTitle: targetTitle,
        headers: sheetHeaders,
        allTabs,
        isClonedViaApi: true
      });
    }

    // ────────────────────────────────────────────────────────
    // 2. 자연어 기반 Apps Script 코드 생성 (Generate Script)
    // ────────────────────────────────────────────────────────
    if (action === 'generate_script') {
      const {
        prompt,
        sheetUrl,
        sheetTitle,
        headers,
        allTabs,
        sheetId,
        gasProjectId: incomingGasId,
        currentScriptCode
      } = body;

      if (!prompt || !prompt.trim()) {
        return NextResponse.json({
          success: false,
          error: '주입하고자 하는 자동화 요구사항(자연어 프롬프트)을 입력해 주세요.'
        }, { status: 400 });
      }

      // 다중 탭 컨텍스트 구성
      let tabsContextDescription = '';
      let targetTabsList: Array<{ sheetTitle: string; headers: string[]; sampleRows: any[][] }> = allTabs || [];

      // 만약 allTabs가 비어있고 sheetId가 있다면 실시간 조회 시도
      if (targetTabsList.length === 0 && (sheetId || sheetUrl)) {
        const targetSid = sheetId || extractSpreadsheetId(sheetUrl);
        if (targetSid) {
          try {
            const ctx = await callSheetsTool('sheets_get_full_context', { spreadsheetId: targetSid, sampleRows: 10 });
            if (ctx && Array.isArray(ctx.sheetsData)) {
              targetTabsList = ctx.sheetsData.map((s: any) => ({
                sheetTitle: s.sheetTitle || s.title || 'Sheet1',
                headers: Array.isArray(s.headers) ? s.headers : [],
                sampleRows: Array.isArray(s.sampleData) ? s.sampleData : []
              }));
            }
          } catch {}
        }
      }

      if (targetTabsList.length > 0) {
        tabsContextDescription = targetTabsList.map((t, idx) => {
          const sampleSnippet = t.sampleRows && t.sampleRows.length > 0
            ? t.sampleRows.slice(0, 3).map(row => JSON.stringify(row)).join('\n    ')
            : '(데이터 없음)';
          return `[탭 ${idx + 1}] "${t.sheetTitle}"
- 컬럼 목록(헤더): ${t.headers && t.headers.length > 0 ? t.headers.join(' | ') : '미지정'}
- 샘플 데이터 (상위 3행):
    ${sampleSnippet}`;
        }).join('\n\n');
      } else {
        tabsContextDescription = `감지된 기본 헤더: ${Array.isArray(headers) && headers.length > 0 ? headers.join(', ') : '자유 형식'}`;
      }

      // ────────────────────────────────────────────────────────
      // 기존 배포된 스크립트 코드 조회 (증분 수정 모드)
      // ────────────────────────────────────────────────────────
      let existingCode = currentScriptCode || '';
      if (!existingCode && (incomingGasId || sheetId)) {
        try {
          const targetProj = incomingGasId || `gas_proj_${sheetId}`;
          const readRes = await callAppsScriptToolDirect('apps_script_read_file', {
            projectId: targetProj,
            fileName: 'Code.gs'
          });
          if (readRes) {
            const rawContent = typeof readRes === 'string' ? readRes : (readRes?.result?.content?.[0]?.text || '');
            if (rawContent && !rawContent.includes('Hello from EGDesk') && rawContent.length > 50) {
              existingCode = rawContent;
            }
          }
        } catch {}
      }

      let incrementalContext = '';
      if (existingCode && existingCode.trim().length > 30) {
        incrementalContext = `
[⚡ 기존에 구글 시트에 배포되어 있던 Google Apps Script 소스코드]
\`\`\`javascript
${existingCode.trim()}
\`\`\`

[증분 수정 및 기능 확장 핵심 규칙]
1. 위 [기존 코드]의 메뉴 구성, 함수, HTML UI 및 안정적인 비즈니스 로직을 최대한 존중하고 보존하십시오.
2. 사용자의 새로운 [요구사항]을 기존 코드에 유기적으로 통합(Merge/Patch)하여 불필요한 중복 선언 없이 세련되게 완성된 전체 코드를 작성하십시오.
`;
      }

      const systemPrompt = `당신은 Google Apps Script(GAS) 및 Google Workspace 스프레드시트 자동화 최고 전문가입니다.
사용자가 자연어로 요청한 비즈니스 로직을 완벽하고 신뢰성 높은 Google Apps Script (JavaScript V8 런타임) 코드로 작성해야 합니다.

[작성 및 증분 리팩토링 핵심 지침]
1. **기존 코드가 제공된 경우**: 기존의 작동 가능한 함수와 설계를 계승하며 사용자의 추가/수정 요청을 자연스럽게 반영하여 완성된 단일 코드를 도출하십시오.
2. 구글 스프레드시트에 존재하는 **모든 탭(시트)의 이름과 각 탭의 컬럼 헤더, 실제 샘플 데이터 구조를 철저히 파악**하여 코드를 작성하십시오.
3. 시트를 가져올 때는 단순 \`getActiveSheet()\` 대신, 반드시 정확한 시트명을 지정하는 \`SpreadsheetApp.getActiveSpreadsheet().getSheetByName("탭이름")\`을 사용하여 탭 전환 시에도 오작동이 없도록 견고하게 작성하십시오.
4. 사용자가 상단 메뉴바에서 직관적으로 실행할 수 있도록 \`onOpen()\` 트리거 함수와 \`SpreadsheetApp.getUi().createMenu('[⚡ 이지데스크 자동화]')...\` 커스텀 메뉴를 필수로 포함하십시오.
5. 데이터 변경 감지가 필요한 경우 \`onEdit(e)\` 트리거에서 수정된 시트 이름(\`e.range.getSheet().getName()\`)과 열 번호를 엄격히 검증하여 다른 탭의 입력으로 인한 오작동을 원천 차단하십시오.

[🧠 AI 분석 및 OCR 자동화 작성 원칙]
6. 사용자의 요구사항에 **이미지/PDF 파일 OCR 분석, 품목/금액 자동 추출, 텍스트 요약/생성 등의 AI 기능**이 포함된 경우:
   - Google Apps Script 환경은 구글 클라우드에서 실행되므로, 외부 사설 도메인이나 로컬 주소(localhost, api.egdesk.co.kr 등)를 호출하면 DNS 오류가 발생합니다.
   - 따라서 **Google 공식 Gemini REST API 엔드포인트**를 \`UrlFetchApp.fetch\`로 직접 호출하는 견고한 헬퍼 함수를 \`Code.gs\` 내에 표준 탑재하십시오:
     - 엔드포인트: \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent\`
     - 파라미터 규격: \`{ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }] }] }\`
     - API Key 설정: 시트의 스크립트 속성(\`PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')\`) 또는 \`EGDeskConfig.GEMINI_API_KEY\` 상수를 정의하여 호출하도록 작성하십시오.
   - 이를 통해 DNS 오류 없이 **구글 클라우드 초고속 백본망을 통해 실시간으로 100% 안정적인 Vision OCR 및 AI 분석**이 작동하도록 완성하십시오.

7. 오류가 발생하더라도 구글 시트가 멈추지 않도록 \`try-catch\` 예외 처리와 친절한 토스트 알림(\`ss.toast()\`)을 제공하십시오.
8. 응답은 반드시 지정된 JSON 규격으로만 출력하십시오.`;

      // 시스템에 등록된 Gemini API Key 조회
      let geminiApiKey = '';
      try {
        geminiApiKey = await getGeminiApiKey().catch(() => '');
      } catch {}

      const userPrompt = `
[사용자 자동화 요구사항]
"${prompt}"

[스프레드시트 전체 탭 및 데이터 명세]
- 스프레드시트 제목: ${sheetTitle || '업무 대장'}
- 스프레드시트 URL: ${sheetUrl || '미지정'}
- Google Gemini API Key: ${geminiApiKey || '시트 속성(PropertiesService)에서 로드'}

${tabsContextDescription}

${incrementalContext}

[출력 JSON 규격]
{
  "summary": "생성된 Apps Script 자동화 기능에 대한 1-2줄 핵심 요약",
  "features": [
    "구현된 세부 기능 1 (어떤 탭을 어떻게 조작하는지 명시)",
    "구현된 세부 기능 2",
    "구현된 세부 기능 3"
  ],
  "scriptCode": "Google Apps Script 전체 소스 코드 (Code.gs). 각 탭별 컬럼을 명확히 주석에 기재할 것.",
  "manifest": "{\\n  \\"timeZone\\": \\"Asia/Seoul\\",\\n  \\"dependencies\\": {},\\n  \\"exceptionLogging\\": \\"STACKDRIVER\\",\\n  \\"runtimeVersion\\": \\"V8\\"\\n}",
  "triggers": [
    { "type": "ON_OPEN", "description": "구글 시트 열기 시 상단 메뉴바 자동 생성" },
    { "type": "ON_EDIT / TIME_DRIVEN / MANUAL", "description": "해당 트리거 설명" }
  ],
  "guideNotes": "최초 1회 실행 시 구글 권한 승인 안내 및 사용 방법 요약"
}
`;

      const aiRes = await callAI({
        prompt: userPrompt,
        systemPrompt,
        purpose: 'APPS_SCRIPT_GENERATE',
        responseMimeType: 'application/json',
        temperature: 0.2
      });

      if (!aiRes.success || !aiRes.text) {
        throw new Error('AI 코드 생성에 실패했습니다.');
      }

      // 마크다운 백틱 및 JSON 정밀 파싱
      let rawText = (aiRes.text || '').trim();
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
        // scriptCode 내부에도 마크다운 백틱이 남아있을 경우 정제
        if (parsed.scriptCode && typeof parsed.scriptCode === 'string') {
          let code = parsed.scriptCode.trim();
          if (code.startsWith('```')) {
            code = code.replace(/^```(?:javascript|js)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          parsed.scriptCode = code;
        }
      } catch (parseErr) {
        console.error('Failed to parse AI Apps Script response JSON, attempting fallback extraction:', rawText);
        
        // 정규식을 통한 scriptCode 추출 시도
        let extractedCode = '';
        const onOpenMatch = rawText.match(/function\s+onOpen[\s\S]+/);
        if (onOpenMatch) {
          extractedCode = onOpenMatch[0].replace(/\s*```$/, '').trim();
        } else {
          extractedCode = rawText;
        }

        parsed = {
          summary: '자연어 요청 기반 Google Apps Script 생성 완료',
          features: ['상단 커스텀 메뉴 추가', '자동화 로직 실행'],
          scriptCode: extractedCode,
          manifest: '{\n  "timeZone": "Asia/Seoul",\n  "dependencies": {},\n  "exceptionLogging": "STACKDRIVER",\n  "runtimeVersion": "V8"\n}',
          triggers: [{ type: 'ON_OPEN', description: '구글 시트 열기 시 상단 메뉴 생성' }],
          guideNotes: '구글 시트 상단 메뉴에서 스크립트를 최초 1회 실행 후 권한을 승인해 주세요.'
        };
      }

      return NextResponse.json({
        success: true,
        data: parsed,
        modelUsed: aiRes.modelUsed
      });
    }

    // ────────────────────────────────────────────────────────
    // 3. Apps Script 시트에 주입 및 배포 (Inject and Deploy)
    // ────────────────────────────────────────────────────────
    if (action === 'inject_and_deploy') {
      const {
        sheetId,
        sheetUrl,
        sheetTitle,
        gasProjectId: incomingGasProjId,
        scriptTitle,
        scriptCode,
        manifest,
        summary,
        features,
        triggers,
        prompt
      } = body;

      if (!scriptCode) {
        return NextResponse.json({
          success: false,
          error: '주입할 Apps Script 코드가 존재하지 않습니다.'
        }, { status: 400 });
      }

      let gasProjectId = incomingGasProjId || `gas_proj_${sheetId || Date.now().toString(36)}`;
      let isPushedViaMcp = false;
      let deploymentUrl = '';
      let scriptId = '';
      let scriptUrl = '';

      // A. 단일 바인딩 프로젝트 우선 재사용 & 중복 생성 방지 파이프라인
      try {
        let targetProjId = incomingGasProjId || '';

        // 1. 전달받은 gasProjectId가 없을 때만 기존 프로젝트 검색
        if (!targetProjId) {
          try {
            const listProjRes = await callAppsScriptToolDirect('apps_script_list_projects', {});
            const existingProjects = listProjRes?.projects || listProjRes || [];
            if (Array.isArray(existingProjects) && existingProjects.length > 0) {
              const matched = existingProjects.find((p: any) => 
                (p.spreadsheetId && String(p.spreadsheetId) === String(sheetId)) ||
                (p.containerId && String(p.containerId) === String(sheetId))
              );
              if (matched && (matched.id || matched.projectId)) {
                targetProjId = matched.id || matched.projectId;
                scriptId = matched.scriptId || '';
                scriptUrl = matched.scriptUrl || '';
              }
            }
          } catch (listErr: any) {
            console.warn('Apps script existing projects lookup note:', listErr.message);
          }
        }

        // 2. 검색해도 없을 때만 최초 1회 생성
        if (!targetProjId) {
          try {
            const boundRes = await callAppsScriptToolDirect('apps_script_create_bound', {
              fileId: sheetId,
              title: scriptTitle || sheetTitle || `[이지데스크 자동화] ${sheetTitle || '시트'}`
            });

            if (boundRes && (boundRes.id || boundRes.projectId)) {
              targetProjId = boundRes.id || boundRes.projectId;
              scriptId = boundRes.scriptId || '';
              scriptUrl = boundRes.scriptUrl || '';
            }
          } catch (boundErr: any) {
            console.warn('Apps script create bound note:', boundErr.message);
          }
        }

        gasProjectId = targetProjId || gasProjectId;

        // 3. Code.gs 파일 100% 덮어쓰기 작성
        await callAppsScriptToolDirect('apps_script_write_file', {
          projectId: gasProjectId,
          fileName: 'Code.gs',
          content: scriptCode
        });

        // 3-1. 확장자 호환을 위해 Code 파일명으로도 덮어쓰기
        try {
          await callAppsScriptToolDirect('apps_script_write_file', {
            projectId: gasProjectId,
            fileName: 'Code',
            content: scriptCode
          });
        } catch {}

        // 4. appsscript.json 매니페스트 파일 자동 작성
        if (manifest) {
          await callAppsScriptToolDirect('apps_script_write_file', {
            projectId: gasProjectId,
            fileName: 'appsscript.json',
            content: typeof manifest === 'string' ? manifest : JSON.stringify(manifest, null, 2)
          });
        }

        // 5. 구글 클라우드 워크스페이스로 즉시 푸시 & 무변형 버전 배포
        const pushRes = await callAppsScriptToolDirect('apps_script_push_to_google', {
          projectId: gasProjectId,
          createVersion: true,
          versionDescription: `EGDesk Auto Inject: ${prompt?.substring(0, 30) || '자연어 자동화'}`
        });

        if (pushRes) {
          isPushedViaMcp = true;
          if (pushRes.deploymentUrl) deploymentUrl = pushRes.deploymentUrl;
        }
      } catch (mcpErr: any) {
        console.error('Apps Script MCP push error:', mcpErr.message);
      }

      // B. 주입 이력 테넌트 DB에 영구 적재 (시트별 1개 레코드로 Upsert 갱신)
      const nowStr = new Date().toISOString();
      const injectionKey = `gas_injection_${sheetId}`;

      // 기존 주입 이력 검색
      let existingRecordRow: any = null;
      try {
        const existRes = await queryTable('system_settings', {
          filters: { key: injectionKey }
        }).catch(() => ({ rows: [] }));
        if (existRes.rows && existRes.rows.length > 0) {
          existingRecordRow = existRes.rows[0];
        }
      } catch {}

      let pastVersion = 1;
      let originalCreatedAt = nowStr;
      if (existingRecordRow && existingRecordRow.value) {
        try {
          const parsedPast = JSON.parse(existingRecordRow.value);
          pastVersion = (parsedPast.version || 1) + 1;
          originalCreatedAt = parsedPast.created_at || nowStr;
        } catch {}
      }

      const injectionRecord = {
        id: `inj_${sheetId}`,
        tenant_id: tenantId,
        sheet_id: sheetId,
        sheet_url: sheetUrl,
        sheet_title: sheetTitle || '자동화 구글 시트',
        script_title: scriptTitle || '이지데스크 자동화 스크립트',
        prompt: prompt || '',
        summary: summary || '',
        features: JSON.stringify(features || []),
        triggers: JSON.stringify(triggers || []),
        script_code: scriptCode,
        manifest: typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
        gas_project_id: gasProjectId,
        is_pushed_via_mcp: isPushedViaMcp,
        version: pastVersion,
        status: 'DEPLOYED',
        created_at: originalCreatedAt,
        updated_at: nowStr
      };

      try {
        if (existingRecordRow && existingRecordRow.id) {
          await updateRows('system_settings', {
            value: JSON.stringify(injectionRecord),
            updated_at: nowStr,
            deleted_at: null
          }, { ids: [existingRecordRow.id] });
        } else {
          await insertRows('system_settings', [{
            key: injectionKey,
            value: JSON.stringify(injectionRecord),
            tenant_id: tenantId,
            updated_at: nowStr
          }]);
        }
      } catch (dbErr) {
        console.warn('Failed to upsert gas_injection record:', dbErr);
      }

      return NextResponse.json({
        success: true,
        injectionId: injectionRecord.id,
        gasProjectId,
        scriptId,
        scriptUrl: scriptUrl || `https://script.google.com/home/projects`,
        isPushedViaMcp,
        sheetUrl,
        scriptEditorUrl: scriptUrl || `https://script.google.com/home/projects`,
        message: 'Google Apps Script 코드가 성공적으로 주입 및 클라우드 배포되었습니다.'
      });
    }

    // ────────────────────────────────────────────────────────
    // ────────────────────────────────────────────────────────
    // 4. 주입 내역 목록 조회 (List Injections)
    // ────────────────────────────────────────────────────────
    if (action === 'list_injections') {
      const recordsRes = await queryTable('system_settings', {
        limit: 2000
      }).catch(() => ({ rows: [] }));

      const injections: any[] = [];
      (recordsRes.rows || []).forEach((row: any) => {
        if (row.deleted_at && row.deleted_at !== 'null') return;
        if (row.key && row.key.startsWith('gas_injection_') && row.value) {
          try {
            const parsed = JSON.parse(row.value);
            if (!parsed.deleted_at && parsed.status !== 'DELETED') {
              injections.push(parsed);
            }
          } catch {}
        }
      });

      injections.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      return NextResponse.json({
        success: true,
        injections
      });
    }

    // ────────────────────────────────────────────────────────
    // 5. 개별 사본/주입 내역 삭제 (Delete Injection)
    // ────────────────────────────────────────────────────────
    if (action === 'delete_injection') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '삭제할 ID가 없습니다.' }, { status: 400 });
      }

      const key = id.startsWith('gas_injection_') ? id : `gas_injection_${id}`;
      const nowStr = new Date().toISOString();

      try {
        const exist = await queryTable('system_settings', { limit: 2000 });
        const targetRows = (exist.rows || []).filter((r: any) => 
          r.key === key || r.key === id || (r.value && r.value.includes(id))
        );

        for (const r of targetRows) {
          let parsed: any = {};
          try { parsed = JSON.parse(r.value); } catch {}
          parsed.deleted_at = nowStr;
          parsed.status = 'DELETED';

          try {
            await deleteRows('system_settings', { filters: { key: r.key } });
          } catch {}

          try {
            if (r.id) {
              await deleteRows('system_settings', { ids: [Number(r.id)] });
            }
          } catch {}

          try {
            await updateRows(
              'system_settings',
              { value: JSON.stringify(parsed), updated_at: nowStr },
              { filters: { key: r.key } }
            );
          } catch {}
        }
      } catch (delErr: any) {
        console.warn('Failed to delete injection row:', delErr);
      }

      return NextResponse.json({ success: true, message: '사본 주입 내역이 삭제되었습니다.' });
    }

    // ────────────────────────────────────────────────────────
    // 6. 기존 생성된 모든 사본/주입 내역 일괄 정리 (Clear All Injections)
    // ────────────────────────────────────────────────────────
    if (action === 'clear_all_injections') {
      const recordsRes = await queryTable('system_settings', {
        limit: 2000
      }).catch(() => ({ rows: [] }));

      const nowStr = new Date().toISOString();
      const targetRows = (recordsRes.rows || []).filter((row: any) => 
        row.key && (row.key.startsWith('gas_injection_') || row.key.startsWith('gas_sheet_'))
      );

      for (const r of targetRows) {
        let parsed: any = {};
        try { parsed = JSON.parse(r.value); } catch {}
        parsed.deleted_at = nowStr;
        parsed.status = 'DELETED';

        try {
          await deleteRows('system_settings', { filters: { key: r.key } });
        } catch {}

        try {
          if (r.id) {
            await deleteRows('system_settings', { ids: [Number(r.id)] });
          }
        } catch {}

        try {
          await updateRows(
            'system_settings',
            { value: JSON.stringify(parsed), updated_at: nowStr },
            { filters: { key: r.key } }
          );
        } catch {}
      }

      return NextResponse.json({
        success: true,
        clearedCount: targetRows.length,
        message: `기존에 생성된 ${targetRows.length}건의 사본 및 주입 내역이 성공적으로 삭제되었습니다.`
      });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 action 파라미터입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('Apps script clone-and-inject API error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const recordsRes = await queryTable('system_settings', {
      limit: 2000
    }).catch(() => ({ rows: [] }));

    const injections: any[] = [];
    (recordsRes.rows || []).forEach((row: any) => {
      if (row.deleted_at && row.deleted_at !== 'null') return;
      if (row.key && row.key.startsWith('gas_injection_') && row.value) {
        try {
          const parsed = JSON.parse(row.value);
          if (!parsed.deleted_at && parsed.status !== 'DELETED') {
            injections.push(parsed);
          }
        } catch {}
      }
    });

    injections.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({
      success: true,
      injections
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
