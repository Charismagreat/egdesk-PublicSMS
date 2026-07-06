const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/EasyBot.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. FinancialStatementPreviewMessage 컴포넌트 추가
const insertMarker1 = 'function LicensePreviewMessage({ tagContent, onConfirmSuccess }: { tagContent: string; onConfirmSuccess: (msg: string) => void }) {';
const financialStatementComponent = `function FinancialStatementPreviewMessage({ tagContent, onConfirmSuccess }: { tagContent: string; onConfirmSuccess: (msg: string) => void }) {
  const [finData, setFinData] = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [companyType, setCompanyType] = useState('PARTNER');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear() - 1);
  const [fiscalQuarter, setFiscalQuarter] = useState('YR');
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [operatingIncome, setOperatingIncome] = useState(0);
  const [netIncome, setNetIncome] = useState(0);
  const [pdfFilePath, setPdfFilePath] = useState('');
  const [parsedRawJson, setParsedRawJson] = useState(null);
  const [partnersList, setPartnersList] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setFinData(parsed);
      const ocrData = parsed.data || {};
      setPartnerId(parsed.partnerId || '');
      setCompanyType(parsed.companyType || 'PARTNER');
      setFiscalYear(ocrData.fiscalYear || new Date().getFullYear() - 1);
      setFiscalQuarter(ocrData.fiscalQuarter || 'YR');
      setTotalAssets(ocrData.totalAssets || 0);
      setTotalLiabilities(ocrData.totalLiabilities || 0);
      setTotalEquity(ocrData.totalEquity || 0);
      setRevenue(ocrData.revenue || 0);
      setOperatingIncome(ocrData.operatingIncome || 0);
      setNetIncome(ocrData.netIncome || 0);
      setPdfFilePath(parsed.pdfFilePath || '');
      setParsedRawJson(ocrData.parsedRawJson || null);
      setPartnersList(parsed.partnersList || []);
    } catch (err) {
      console.error('재무제표 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!finData) return <div className="text-rose-500 font-bold p-2 text-xs">재무제표 데이터를 파싱하지 못했습니다.</div>;

  const handlePartnerChange = (selectedId) => {
    setPartnerId(selectedId);
    const matched = partnersList.find(p => p.id === selectedId);
    if (matched) {
      setCompanyType(matched.type);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!partnerId) {
      alert('대상 회사(본사 또는 거래처)를 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'FINANCIAL_STATEMENT',
          partnerId,
          companyType,
          pdfFilePath,
          data: {
            fiscalYear: Number(fiscalYear),
            fiscalQuarter,
            totalAssets: Number(totalAssets),
            totalLiabilities: Number(totalLiabilities),
            totalEquity: Number(totalEquity),
            revenue: Number(revenue),
            operatingIncome: Number(operatingIncome),
            netIncome: Number(netIncome),
            parsedRawJson
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '재무제표 적재 처리에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-purple-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/30 px-4 py-3 border-b border-purple-50 flex items-center gap-2">
        <Sparkles size={14} className="text-purple-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 재무제표 스캔 리포트</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🏢 대상 기업 매칭</label>
          <select
            value={partnerId}
            onChange={e => handlePartnerChange(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-xs cursor-pointer focus:ring-1 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">-- 회사를 선택하세요 --</option>
            {partnersList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName} {p.type === 'MY_COMPANY' ? '(본사)' : '(거래처)'}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold">📅 회계 연도</label>
            <input 
              type="number" 
              value={fiscalYear} 
              onChange={e => setFiscalYear(Number(e.target.value))}
              disabled={saving || saved}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-50/20 font-bold font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold">📊 구분</label>
            <select
              value={fiscalQuarter}
              onChange={e => setFiscalQuarter(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-xs cursor-pointer focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              <option value="YR">결산 (YR)</option>
              <option value="Q1">1분기 (Q1)</option>
              <option value="Q2">2분기 (Q2)</option>
              <option value="Q3">3분기 (Q3)</option>
              <option value="Q4">4분기 (Q4)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 my-2 pt-2">
          <p className="font-extrabold text-[10px] text-purple-700 mb-2">💰 AI 파싱 핵심 6대 지표 수치 (보정 가능)</p>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">자산총계</span>
              <input
                type="number"
                value={totalAssets}
                onChange={e => setTotalAssets(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">부채총계</span>
              <input
                type="number"
                value={totalLiabilities}
                onChange={e => setTotalLiabilities(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">자본총계</span>
              <input
                type="number"
                value={totalEquity}
                onChange={e => setTotalEquity(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">매출액</span>
              <input
                type="number"
                value={revenue}
                onChange={e => setRevenue(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">영업이익</span>
              <input
                type="number"
                value={operatingIncome}
                onChange={e => setOperatingIncome(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 w-16 font-bold">당기순이익</span>
              <input
                type="number"
                value={netIncome}
                onChange={e => setNetIncome(Number(e.target.value))}
                disabled={saving || saved}
                className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono font-bold text-right text-[10px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {parsedRawJson && (
          <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-[9px] text-purple-800 leading-relaxed font-bold">
            <span className="block font-black text-[10px] text-purple-700">✓ 세부 계정과목 트리 백업 완료</span>
            <span className="block text-slate-400 mt-1">대차대조표/손익계산서 세부 항목들이 백업되어, 이지봇 대화방 RAG RDB 자연어 분석 시 백그라운드 지식으로 탑재됩니다.</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex gap-2">
        {saved ? (
          <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-center text-[11px] flex items-center justify-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            재무제표 DB 최종 적재 완료!
          </div>
        ) : (
          <button
            type="button"
            disabled={saving || !partnerId || !fiscalYear}
            onClick={handleConfirmSubmit}
            className={\`w-full py-2.5 rounded-xl text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer \${
              !partnerId || !fiscalYear
                ? 'bg-slate-200 text-slate-400 border-none cursor-not-allowed shadow-none'
                : 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/10'
            }\`}
          >
            {saving ? (
              <>
                <RefreshCw size={11} className="animate-spin" />
                <span>데이터 적재 처리 중...</span>
              </>
            ) : (
              <span>재무제표 원터치 DB 적재 🚀</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

`;

if (code.includes(insertMarker1) && !code.includes('function FinancialStatementPreviewMessage')) {
  code = code.replace(insertMarker1, financialStatementComponent + '\n' + insertMarker1);
}

// 2. isFinancialPreview 및 파싱 식별 추가
const targetIsLicensePreview = "const isLicensePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[LICENSE_PREVIEW:');";
const replacementIsLicensePreview = `const isLicensePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[LICENSE_PREVIEW:');
                const isFinancialPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[FINANCIAL_PREVIEW:');`;

if (code.includes(targetIsLicensePreview) && !code.includes('isFinancialPreview')) {
  code = code.replace(targetIsLicensePreview, replacementIsLicensePreview);
}

// 3. tagContent 삼항 연산자 수정
const targetTagContent = `const tagContent = isCardPreview && hasContent
                  ? msg.content.substring(14, msg.content.length - 1) 
                  : isLicensePreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isReceiptPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1) 
                  : '';`;

const replacementTagContent = `const tagContent = isCardPreview && hasContent
                  ? msg.content.substring(14, msg.content.length - 1) 
                  : isLicensePreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isReceiptPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1) 
                  : isFinancialPreview && hasContent
                  ? msg.content.substring(19, msg.content.length - 1)
                  : '';`;

if (code.includes(targetTagContent)) {
  code = code.replace(targetTagContent, replacementTagContent);
}

// 4. isCustomPreview 수정
const targetIsCustomPreview = "const isCustomPreview = isCardPreview || isLicensePreview || isReceiptPreview;";
const replacementIsCustomPreview = "const isCustomPreview = isCardPreview || isLicensePreview || isReceiptPreview || isFinancialPreview;";

if (code.includes(targetIsCustomPreview)) {
  code = code.replace(targetIsCustomPreview, replacementIsCustomPreview);
}

// 5. 렌더링 조건 분기 수정
const targetRendering = `                        ) : isLicensePreview ? (
                          <LicensePreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (`;

const replacementRendering = `                        ) : isLicensePreview ? (
                          <LicensePreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (
                          <ReceiptPreviewMessage tagContent={tagContent} />
                        ) : isFinancialPreview ? (
                          <FinancialStatementPreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (`; // (임시 기입 매칭을 부드럽게 연결하기 위해)

// 실제 타겟 코드가 다소 상이할 수 있으니, 확실한 키워드인 isReceiptPreview 주변 분기를 교체합시다.
const targetBubbleCode = `                        ) : isCardPreview ? (
                          <CardPreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isLicensePreview ? (
                          <LicensePreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (
                          <ReceiptPreviewMessage tagContent={tagContent} />
                        ) : (
                          <SafeMarkdown content={msg.content} />
                        )`;

const replacementBubbleCode = `                        ) : isCardPreview ? (
                          <CardPreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isLicensePreview ? (
                          <LicensePreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (
                          <ReceiptPreviewMessage tagContent={tagContent} />
                        ) : isFinancialPreview ? (
                          <FinancialStatementPreviewMessage tagContent={tagContent} onConfirmSuccess={handleCardConfirmSuccess} />
                        ) : (
                          <SafeMarkdown content={msg.content} />
                        )`;

if (code.includes(targetBubbleCode)) {
  code = code.replace(targetBubbleCode, replacementBubbleCode);
}

// 6. OCR 업로드 응답 처리 조건 분기 수정
const targetReceiptOcr = `            } else if (item.itemType === 'RECEIPT') {
              const receiptPayload = {
                ...item.data
              };
              setMessages(prev => [
                ...prev,
                {
                  role: 'bot',
                  content: \`[RECEIPT_PREVIEW:\${JSON.stringify(receiptPayload)}]\`,
                  timestamp: formatTimestamp()
                }
              ]);
            }`;

const replacementReceiptOcr = `            } else if (item.itemType === 'RECEIPT') {
              const receiptPayload = {
                ...item.data
              };
              setMessages(prev => [
                ...prev,
                {
                  role: 'bot',
                  content: \`[RECEIPT_PREVIEW:\${JSON.stringify(receiptPayload)}]\`,
                  timestamp: formatTimestamp()
                }
              ]);
            } else if (item.itemType === 'FINANCIAL_STATEMENT') {
              const financialPayload = {
                status: item.status,
                partnerId: item.partnerId,
                companyType: item.companyType,
                matchedCompanyName: item.matchedCompanyName,
                pdfFilePath: item.pdfFilePath,
                data: item.data,
                partnersList: data.partnersList
              };
              setMessages(prev => [
                ...prev,
                {
                  role: 'bot',
                  content: \`[FINANCIAL_PREVIEW:\${JSON.stringify(financialPayload)}]\`,
                  timestamp: formatTimestamp()
                }
              ]);
            }`;

if (code.includes(targetReceiptOcr)) {
  code = code.replace(targetReceiptOcr, replacementReceiptOcr);
}

// 7. 업로드된 PDF 파일 사용자 메시지 문구 완화 및 PDF 사업자등록증 라벨 변경
const targetPdfMsg = `content: \`📁 사업자등록증 PDF 문서를 검증하여 등록해 주세요. (\${file.name})\`,`;
const replacementPdfMsg = `content: \`📁 PDF 문서를 검증하여 등록해 주세요. (\${file.name})\`,`;

if (code.includes(targetPdfMsg)) {
  code = code.replace(targetPdfMsg, replacementPdfMsg);
}

const targetPdfLabel = `<p className="text-[8px] opacity-70">PDF 사업자등록증 문서</p>`;
const replacementPdfLabel = `<p className="text-[8px] opacity-70">PDF 문서</p>`;

if (code.includes(targetPdfLabel)) {
  code = code.replace(targetPdfLabel, replacementPdfLabel);
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully patched EasyBot.tsx!');
