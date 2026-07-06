import React from "react";
import { queryTable } from "../../../../egdesk-helpers";
import { Metadata } from "next";

interface PrintPdfPageProps {
  searchParams: Promise<{ id?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: PrintPdfPageProps): Promise<Metadata> {
  const params = await searchParams;
  const estimateId = params.id;
  if (!estimateId) return { title: "Estimate" };

  try {
    const checkRes = await queryTable("crm_estimates", { filters: { id: estimateId }, limit: 1 });
    let activeEst = checkRes.rows?.[0];
    if (!activeEst) {
      const fallbackCheck = await queryTable("crm_estimates", { filters: { uuid: estimateId }, limit: 1 });
      activeEst = fallbackCheck.rows?.[0];
    }
    if (activeEst) {
      return { title: `Estimate_${activeEst.id}` };
    }
  } catch (e) {}

  return { title: `Estimate` };
}

export default async function PrintPdfPage({ searchParams }: PrintPdfPageProps) {
  const params = await searchParams;
  const estimateId = params.id;

  if (!estimateId) {
    return (
      <div className="p-8 text-center text-xs font-bold text-rose-500">
        ❌ 견적서 ID(id) 파라미터가 유실되었습니다.
      </div>
    );
  }

  // 1. 견적서 마스터 데이터 조회
  const estimateRes = await queryTable("crm_estimates", { filters: { id: estimateId }, limit: 1 });
  const estimate = estimateRes.rows?.[0];

  if (!estimate) {
    // 혹시 문자열 ID로 삽입되어 조회되지 않는 경우에 대한 폴백 필터링
    const fallbackRes = await queryTable("crm_estimates", { filters: { uuid: estimateId }, limit: 1 });
    const fallbackEst = fallbackRes.rows?.[0];
    if (!fallbackEst) {
      return (
        <div className="p-8 text-center text-xs font-bold text-rose-500">
          ❌ 존재하지 않거나 삭제된 견적서입니다. (ID: {estimateId})
        </div>
      );
    }
  }

  const activeEst = estimate || estimateRes.rows?.[0];
  const realDbId = String(activeEst.id);

  // 2. 견적 상세 품목 리스트 조회
  const itemsRes = await queryTable("crm_estimate_items", { filters: { estimate_id: realDbId }, limit: 100 });
  const items = itemsRes.rows || [];

  // 3. 공급자 정보(우리 회사 프로필) 조회 및 복원
  let supplier = {
    businessNumber: "",
    companyName: "공급회사명",
    representative: "대표자명",
    address: "회사 주소지",
    phone: "대표 전화번호",
    email: "대표 이메일",
    fax: "",
    sealImages: [] as string[]
  };
  try {
    const compProfile = await queryTable("system_settings", { filters: { key: "my_company_profile" } });
    if (compProfile.rows?.[0]?.value) {
      const parsed = JSON.parse(compProfile.rows[0].value);
      supplier = { ...supplier, ...parsed };
    }
  } catch (e) {
    console.error("자사 프로필 로드 오류:", e);
  }

  // 4. tags에 기입된 메타 정보 복원
  let metaTags: any = {};
  if (activeEst.tags) {
    try {
      metaTags = JSON.parse(activeEst.tags);
    } catch (e) {}
  }

  // B2B 거래처 정보 로드
  let buyerFax = "";
  let buyerEmail = activeEst.email || "";
  try {
    const partnerRes = await queryTable("crm_partners", { filters: { company_name: activeEst.partner_name }, limit: 1 });
    if (partnerRes.rows && partnerRes.rows.length > 0) {
      buyerFax = partnerRes.rows[0].fax || "";
      if (!buyerEmail) buyerEmail = partnerRes.rows[0].email || "";
    }
  } catch (e) {}

  // 💡 원가 계산 분할 (재료비, 직접가공비, 외주가공비 정밀 분류)
  const materials: any[] = [];
  const directProcess: any[] = [];
  const outsourceProcess: any[] = [];

  items.forEach((it: any) => {
    let itemSpecObj: any = {};
    if (it.spec) {
      try {
        itemSpecObj = JSON.parse(it.spec);
      } catch {}
    }
    const itemType = itemSpecObj.type || (it.item_code === 'PROC-DIR' ? 'DIRECT_PROCESS' : it.item_code === 'PROC-OUT' ? 'OUTSOURCE_PROCESS' : 'MATERIAL');

    if (itemType === 'MATERIAL') {
      materials.push(it);
    } else if (itemType === 'DIRECT_PROCESS') {
      directProcess.push(it);
    } else if (itemType === 'OUTSOURCE_PROCESS') {
      outsourceProcess.push(it);
    }
  });

  const materialsTotal = materials.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
  const processTotal = [...directProcess, ...outsourceProcess].reduce((sum: number, it: any) => sum + (it.amount || 0), 0);

  // 💡 tags에 보존된 실물 간접비 우선 복원 및 폴백 계산
  const generalAdminCost = metaTags.generalAdminCost !== undefined ? Number(metaTags.generalAdminCost) : Math.round(processTotal * 0.1);
  const businessProfit = metaTags.businessProfit !== undefined ? Number(metaTags.businessProfit) : Math.round((processTotal + generalAdminCost) * 0.1);
  const materialManageCost = metaTags.materialManageCost !== undefined ? Number(metaTags.materialManageCost) : Math.round(materialsTotal * 0.05);

  const grandTotal = activeEst.total_amount || (materialsTotal + processTotal + generalAdminCost + businessProfit + materialManageCost);

  // 사업자번호 포맷터
  const formatBusinessNumber = (num: string) => {
    const clean = String(num).replace(new RegExp("\\D", "g"), "");
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
    }
    return num;
  };

  return (
    <div className="bg-white p-6 max-w-[800px] mx-auto text-slate-800 text-[10px] font-medium leading-relaxed print:p-0 print:max-w-full min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: "@media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .print-border-none { border: none !important; box-shadow: none !important; } } body { font-family: sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }" }} />
      
      <div className="border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm print-border-none">
          <div className="text-center space-y-1 border-b border-slate-300 pb-4">
            <h2 className="text-lg font-black tracking-widest text-slate-900">견  적  서</h2>
          </div>

          <div className="flex gap-4 border-b border-slate-200 pb-4">
            {/* 공급받는자 */}
            <div className="w-[45%] shrink-0 space-y-2">
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">견적번호:</span>
                <span className="font-mono text-slate-700 font-bold">{activeEst.id}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">견적일자:</span>
                <span className="text-slate-700 font-bold">{String(activeEst.created_at || "").substring(0, 10)}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">수신처:</span>
                <span className="text-slate-900 font-bold underline decoration-slate-300 decoration-2 underline-offset-2">
                  {activeEst.partner_name} 귀하
                </span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">담당자:</span>
                <span className="text-slate-700 font-bold">{activeEst.partner_manager || "담당자 귀하"}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">연락처:</span>
                <span className="text-slate-700">{activeEst.partner_phone || "-"}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-14 shrink-0 font-bold">이메일:</span>
                <span className="text-slate-700">{buyerEmail || "-"}</span>
              </div>
            </div>

            {/* 공급자 */}
            <div className="w-[55%] shrink-0 border-l border-slate-200 pl-4 space-y-1.5">
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">등록번호:</span>
                <span className="font-mono text-slate-800 font-bold">{formatBusinessNumber(supplier.businessNumber)}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">공급자명:</span>
                <span className="text-slate-900 font-bold">{supplier.companyName}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">대표자:</span>
                <span className="text-slate-850">{supplier.representative} (인)</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">소재지:</span>
                <span className="text-slate-700 leading-tight">{supplier.address}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">연락처:</span>
                <span className="text-slate-700">{supplier.phone}</span>
              </div>
              <div className="flex gap-1">
                <span className="text-slate-400 w-20 shrink-0 font-bold">이메일:</span>
                <span className="text-slate-700">{supplier.email}</span>
              </div>
              {metaTags.writer_name && (
                <div className="flex gap-1">
                  <span className="text-slate-400 w-20 shrink-0 font-bold">작성자/연락처:</span>
                  <span className="text-slate-700 font-bold">
                    {`${metaTags.writer_name} / ${metaTags.writer_phone || "-"}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 총액 선언 */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 text-center text-slate-800 flex justify-between px-4 font-bold rounded-lg">
            <span>합계 견적 금액 (제조원가 합계):</span>
            <span className="underline underline-offset-2 font-black text-slate-900">₩{grandTotal.toLocaleString()}원 (부가세 별도)</span>
          </div>

          {/* 품목 요약 테이블 (재료비, 가공비) */}
          <div className="space-y-2">
            <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">제조 비용 비례 세부 명세</span>
            <table className="w-full text-left text-[9px] border-t border-b border-slate-200 divide-y divide-slate-100">
              <thead>
                <tr className="text-slate-400 bg-slate-50/50 font-bold">
                  <th className="py-1.5 pl-1 w-16">구분</th>
                  <th className="py-1.5 w-32">세부 품목/공정명</th>
                  <th className="py-1.5 w-16">규격</th>
                  <th className="py-1.5 w-10 text-center">수량</th>
                  <th className="py-1.5 w-20 text-right pr-2">단가 (원)</th>
                  <th className="py-1.5 w-24 text-right pr-1">금액 (원)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 재료비 대분류 헤더 행 (합계 금액 표기) */}
                <tr className="bg-slate-50/50 text-slate-800 font-extrabold">
                  <td className="py-1.5 pl-1 text-slate-700" colSpan={2}>재료비 (재료 품목 내역)</td>
                  <td className="py-1.5">-</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1 text-indigo-700 font-black">{materialsTotal.toLocaleString()}원</td>
                </tr>

                {/* 재료비 내역 */}
                {materials.map((m: any, idx: number) => {
                  let parsedRemark = "";
                  let parsedSpec = "-";
                  if (m.spec) {
                    try {
                      if (String(m.spec).startsWith("{")) {
                        const parsed = JSON.parse(m.spec);
                        parsedRemark = parsed.remark || "";
                        parsedSpec = parsed.spec !== undefined ? parsed.spec : "-";
                      } else {
                        parsedSpec = m.spec;
                      }
                    } catch {}
                  }
                  return (
                    <tr key={`m-${idx}`} className="text-slate-600">
                      <td className="py-1.5 pl-2 text-slate-450 font-bold">└ {m.item_code || `INV-${idx + 1}`}</td>
                      <td className="py-1.5 break-all whitespace-normal" title={m.product_name}>
                        {m.product_name}
                        {parsedRemark && (
                          <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({parsedRemark})</span>
                        )}
                      </td>
                      <td className="py-1.5 break-all whitespace-normal">
                        {parsedSpec}
                      </td>
                      <td className="py-1.5 text-center font-mono">{m.quantity}</td>
                      <td className="py-1.5 text-right font-mono pr-2">{m.unit_price ? m.unit_price.toLocaleString() : "0"}</td>
                      <td className="py-1.5 text-right font-mono pr-1">{(m.amount || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}

                {/* 가공비 대분류 헤더 행 */}
                <tr className="bg-slate-50/50 text-slate-800 font-extrabold">
                  <td className="py-1.5 pl-1 text-slate-700" colSpan={2}>가공비 (공정 및 가공비 명세)</td>
                  <td className="py-1.5">-</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1 text-indigo-700 font-black">{processTotal.toLocaleString()}원</td>
                </tr>

                {/* 직접가공비 상세 내역 */}
                {directProcess.map((p: any, idx: number) => {
                  let parsedRemark = "";
                  if (p.spec) {
                    try {
                      if (String(p.spec).startsWith("{")) {
                        const parsed = JSON.parse(p.spec);
                        parsedRemark = parsed.remark || "";
                      }
                    } catch {}
                  }
                  return (
                    <tr key={`dp-${idx}`} className="text-slate-600">
                      <td className="py-1.5 pl-2 text-indigo-500 font-bold">└ 직접가공</td>
                      <td className="py-1.5 break-all whitespace-normal">
                        {p.product_name.replace("직접가공 - ", "")}
                        {parsedRemark && (
                          <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({parsedRemark})</span>
                        )}
                      </td>
                      <td className="py-1.5">-</td>
                      <td className="py-1.5 text-center font-mono">{p.quantity}</td>
                      <td className="py-1.5 text-right font-mono pr-2">{p.unit_price ? p.unit_price.toLocaleString() : "0"}</td>
                      <td className="py-1.5 text-right font-mono pr-1">{(p.amount || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}

                {/* 외주가공비 상세 내역 */}
                {outsourceProcess.map((p: any, idx: number) => {
                  let parsedRemark = "";
                  if (p.spec) {
                    try {
                      if (String(p.spec).startsWith("{")) {
                        const parsed = JSON.parse(p.spec);
                        parsedRemark = parsed.remark || "";
                      }
                    } catch {}
                  }
                  return (
                    <tr key={`op-${idx}`} className="text-slate-600">
                      <td className="py-1.5 pl-2 text-pink-500 font-bold">└ 외주가공</td>
                      <td className="py-1.5 break-all whitespace-normal">
                        {p.product_name.replace("외주가공 - ", "")}
                        {parsedRemark && (
                          <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({parsedRemark})</span>
                        )}
                      </td>
                      <td className="py-1.5">-</td>
                      <td className="py-1.5 text-center font-mono">{p.quantity}</td>
                      <td className="py-1.5 text-right font-mono pr-2">{p.unit_price ? p.unit_price.toLocaleString() : "0"}</td>
                      <td className="py-1.5 text-right font-mono pr-1">{(p.amount || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}

                {/* 간접 제조 원가 대분류 헤더 행 */}
                <tr className="bg-slate-50/50 text-slate-800 font-extrabold">
                  <td className="py-1.5 pl-1 text-slate-700" colSpan={2}>간접 제조 원가</td>
                  <td className="py-1.5">-</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1 text-indigo-700 font-black">{(generalAdminCost + businessProfit + materialManageCost).toLocaleString()}원</td>
                </tr>

                {/* 간접원가 행들 */}
                <tr className="text-slate-600">
                  <td className="py-1.5 pl-2 text-indigo-500 font-bold">└ 일반관리비</td>
                  <td className="py-1.5" colSpan={2}>일반관리비 (가공비의 10%)</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1">{generalAdminCost.toLocaleString()}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-1.5 pl-2 text-indigo-500 font-bold">└ 기업이윤</td>
                  <td className="py-1.5" colSpan={2}>기업이윤 (가공비+관리비의 10%)</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1">{businessProfit.toLocaleString()}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-1.5 pl-2 text-indigo-500 font-bold">└ 기타비용</td>
                  <td className="py-1.5" colSpan={2}>기타비용 (재료관리비의 5%)</td>
                  <td className="py-1.5 text-center">-</td>
                  <td className="py-1.5 text-right font-mono pr-2">-</td>
                  <td className="py-1.5 text-right font-mono pr-1">{materialManageCost.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 특기사항 영역 */}
          {activeEst.memo && activeEst.memo.trim() && (
            <div className="border-t border-slate-200 pt-3 space-y-1 text-left">
              <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">특기 사항</span>
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[8.5px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                {activeEst.memo}
              </div>
            </div>
          )}

          {/* 하단 서명 명의 */}
          <div className="pt-3 text-right text-slate-500 font-bold text-[8.5px] relative space-y-1 pb-3">
            <div>위와 같이 견적서를 제출합니다.</div>
            <div className="inline-block text-slate-900 font-extrabold text-[9.5px] relative pr-8 pb-1">
              {supplier.companyName} 대표 {supplier.representative}
              {supplier.sealImages && supplier.sealImages[0] ? (
                <img
                  src={supplier.sealImages[0]}
                  alt="회사직인"
                  className="absolute right-2 -top-2.5 w-6 h-6 object-contain pointer-events-none z-10"
                  style={{ mixBlendMode: "multiply" }}
                />
              ) : (
                <span className="text-slate-400 font-medium ml-1">(인)</span>
              )}
            </div>
          </div>
        </div>

        {/* 💡 즉시 인쇄/PDF 저장 플로팅 액션 단추 (인쇄 시에는 print:hidden 에 의해 자동 차단됨) */}
        <div className="fixed bottom-6 right-6 z-50 print:hidden">
          <button
            id="print-action-btn"
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-600/30 transition-all font-black text-xs cursor-pointer active:scale-95 border-none"
            title="견적서 종이 인쇄 또는 PDF 파일로 저장"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <span>즉시 인쇄 / PDF 저장</span>
          </button>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          setTimeout(function() {
            document.title = "Estimate_" + "${estimateId}";
            var btn = document.getElementById('print-action-btn');
            if (btn) {
              btn.addEventListener('click', function() {
                window.print();
              });
            }
          }, 100);
        `}} />
      </div>
  );
}
