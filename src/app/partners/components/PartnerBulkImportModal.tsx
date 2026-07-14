"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Sparkles, CheckCircle2, AlertCircle, FileSpreadsheet, Info, Check } from "lucide-react";
import * as XLSX from "xlsx";

interface PartnerBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (partners: any[]) => Promise<{ success: boolean; addedCount?: number; error?: string }>;
}

// 엑셀/CSV 한글 헤더 ➡️ 영문 컬럼 맵핑 정의
const HEADER_MAPPING: Record<string, string> = {
  "상호명": "company_name",
  "거래처구분": "type",
  "사업자번호": "business_number",
  "대표자명": "representative",
  "대표번호": "phone",
  "팩스번호": "fax",
  "계산서이메일": "email",
  "주소": "address",
  "대표담당자": "manager_name",
  "담당자직급": "manager_position",
  "담당자연락처": "manager_phone",
  "담당자이메일": "manager_email",
  "우대등급": "vip_level",
  "여신한도": "credit_limit",
  "비고": "memo"
};

export function PartnerBulkImportModal({ isOpen, onClose, onImport }: PartnerBulkImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<string>("엑셀 파싱 및 데이터 검증 진행 중...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // 엑셀/CSV 파일 파싱 및 스키마 검증
  const processFile = (file: File) => {
    setLoading(true);
    setErrors([]);
    setParsedData([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook;
        if (file.name.endsWith(".csv")) {
          // CSV 처리
          workbook = XLSX.read(data, { type: "binary", codepage: 949 }); // 한글 인코딩 폴백 대응
        } else {
          // Excel 처리
          workbook = XLSX.read(data, { type: "binary" });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

        if (jsonRows.length === 0) {
          throw new Error("엑셀 파일에 데이터 행이 존재하지 않습니다.");
        }

        // 헤더 맵핑 및 가공
        const mappedList: any[] = [];
        const errList: string[] = [];

        jsonRows.forEach((row, idx) => {
          const rowNum = idx + 2; // 엑셀 행 번호 (헤더가 1행이므로 +2)
          const newRow: Record<string, any> = {};

          // 한글 키 ➡️ 영문 키 치환
          Object.keys(row).forEach((k) => {
            const trimmedKey = k.trim();
            const engKey = HEADER_MAPPING[trimmedKey];
            if (engKey) {
              newRow[engKey] = String(row[k] || "").trim();
            }
          });

          // 필수값 검사 (상호명, 구분)
          if (!newRow.company_name) {
            errList.push(`[${rowNum}행] '상호명'이 비어 있습니다.`);
          }
          if (!newRow.type) {
            errList.push(`[${rowNum}행] '거래처구분'이 비어 있습니다.`);
          } else {
            // 구분 값 영문화 정제
            const upperType = newRow.type.toUpperCase();
            if (upperType.includes("공급") || upperType.includes("VENDOR") || upperType.includes("매입")) {
              newRow.type = "VENDOR";
            } else if (upperType.includes("바이어") || upperType.includes("BUYER") || upperType.includes("매출") || upperType.includes("고객")) {
              newRow.type = "BUYER";
            } else if (upperType.includes("관계") || upperType.includes("AFFILIATE")) {
              newRow.type = "AFFILIATE";
            } else {
              errList.push(`[${rowNum}행] '거래처구분' 값이 올바르지 않습니다. (입력값: ${newRow.type} ➡️ '공급사/VENDOR' 또는 '바이어/BUYER' 또는 '관계사/AFFILIATE' 입력 필요)`);
            }
          }

          // 숫자 포맷 정제 (여신한도)
          if (newRow.credit_limit) {
            const rawLimit = String(newRow.credit_limit).replace(/[^0-9]/g, "");
            newRow.credit_limit = parseInt(rawLimit) || 0;
          } else {
            newRow.credit_limit = 0;
          }

          // 사업자번호 정제
          if (newRow.business_number) {
            newRow.business_number = newRow.business_number.replace(/[^0-9]/g, "");
          }

          mappedList.push(newRow);
        });

        if (errList.length > 0) {
          setErrors(errList);
        } else {
          setParsedData(mappedList);
        }
      } catch (err: any) {
        setErrors([`파일을 파싱하는 중 오류가 발생했습니다: ${err.message}`]);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrors(["파일 읽기 도중 오류가 발생했습니다."]);
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // 서버로 벌크 전송
  // 서버로 벌크 전송 (프론트엔드 청킹 순차 전송)
  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setErrors([]);
    
    const clientChunkSize = 300; // 300개 단위로 쪼개서 서버로 순차적 전송
    let totalAdded = 0;
    let hasError = false;
    let errorMsg = "";

    try {
      for (let i = 0; i < parsedData.length; i += clientChunkSize) {
        const chunk = parsedData.slice(i, i + clientChunkSize);
        setImportStatus(`거래처 등록 중... (${Math.min(i + clientChunkSize, parsedData.length)} / ${parsedData.length}건)`);
        
        const res = await onImport(chunk);
        if (res.success) {
          totalAdded += res.addedCount || 0;
        } else {
          hasError = true;
          errorMsg = res.error || "일부 데이터를 저장하는 도중 오류가 발생했습니다.";
          break;
        }
      }

      if (hasError) {
        setErrors([errorMsg]);
      } else {
        alert(`✨ 총 ${totalAdded}개의 거래처가 성공적으로 일괄 등록되었습니다. (기존 중복 거래처는 제외됨)`);
        onClose();
        resetModal();
      }
    } catch (e: any) {
      setErrors(["일괄 등록 통신 중 시스템 오류가 발생했습니다."]);
    } finally {
      setLoading(false);
      setImportStatus("엑셀 파싱 및 데이터 검증 진행 중...");
    }
  };

  const resetModal = () => {
    setFileName(null);
    setParsedData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 엑셀 양식 다운로드 헬퍼
  const downloadTemplate = () => {
    const headers = Object.keys(HEADER_MAPPING);
    const sampleRow = {
      "상호명": "(주)이지테크",
      "거래처구분": "BUYER (또는 VENDOR)",
      "사업자번호": "123-45-67890",
      "대표자명": "홍길동",
      "대표번호": "02-1234-5678",
      "팩스번호": "02-1234-5679",
      "계산서이메일": "tax@eztech.com",
      "주소": "서울특별시 강남구 테헤란로 123",
      "대표담당자": "김철수",
      "담당자직급": "과장",
      "담당자연락처": "010-1234-5678",
      "담당자이메일": "chulsoo@eztech.com",
      "우대등급": "VIP",
      "여신한도": "50,000,000",
      "비고": "협력사 코드 99번"
    };

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "거래처 일괄등록 템플릿");
    XLSX.writeFile(wb, "거래처_일괄등록_양식.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">거래처 일괄등록 (EXCEL / CSV)</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">양식 파일에 맞추어 거래처 데이터를 한 번에 업로드합니다.</p>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); resetModal(); }}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent cursor-pointer text-slate-450"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 가이드 영역 */}
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 flex gap-3 text-xs">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-slate-600 leading-relaxed font-semibold">
              <p className="text-slate-800 font-extrabold text-xs">💡 업로드 양식 작성 안내</p>
              <p className="text-[11px]">
                일괄등록 엑셀 파일에는 반드시 지정된 헤더 행이 포함되어야 합니다. 아래 버튼을 눌러 정확한 템플릿 양식을 다운로드해 보세요.
              </p>
              <button 
                onClick={downloadTemplate}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-none font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow-sm"
              >
                📥 템플릿 양식 다운로드 (.xlsx)
              </button>
            </div>
          </div>

          {/* 드롭존 */}
          {!fileName && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                dragOver 
                  ? "border-emerald-500 bg-emerald-50/20" 
                  : "border-slate-200 hover:border-slate-350 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden" 
              />
              <UploadCloud className="w-10 h-10 text-slate-400" />
              <p className="text-xs font-bold text-slate-700">엑셀 또는 CSV 파일을 드래그하여 올려놓거나 클릭하세요</p>
              <p className="text-[10px] text-slate-400 font-semibold">지원 확장자: .xlsx, .xls, .csv (헤더 명칭 일치 필수)</p>
            </div>
          )}

          {/* 파일 정보 */}
          {fileName && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-700">{fileName}</span>
              </div>
              <button 
                onClick={resetModal}
                className="text-[10px] font-bold text-rose-500 border border-rose-100 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg cursor-pointer"
              >
                파일 취소
              </button>
            </div>
          )}

          {/* 로딩 표시 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-450 font-bold">{importStatus}</p>
            </div>
          )}

          {/* 에러 목록 */}
          {errors.length > 0 && (
            <div className="bg-rose-50/40 border border-rose-100/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-extrabold">
                <AlertCircle className="w-4 h-4" />
                양식 검증 실패 ({errors.length}건)
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-1 pl-5 list-disc text-[11px] text-slate-500 font-semibold">
                {errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            </div>
          )}

          {/* 프리뷰 테이블 */}
          {parsedData.length > 0 && errors.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-extrabold">
                <CheckCircle2 className="w-4 h-4" />
                업로드 대기 데이터 ({parsedData.length}건)
              </div>
              <div className="border border-slate-100 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse font-semibold">
                  <thead>
                    <tr className="bg-slate-50 text-slate-450 border-b border-slate-100">
                      <th className="p-2">구분</th>
                      <th className="p-2">상호명</th>
                      <th className="p-2">대표자</th>
                      <th className="p-2">사업자번호</th>
                      <th className="p-2">주소</th>
                      <th className="p-2">대표담당자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 text-slate-600">
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            row.type === 'VENDOR' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="p-2 text-slate-800 font-extrabold">{row.company_name}</td>
                        <td className="p-2">{row.representative || "-"}</td>
                        <td className="p-2 font-mono">{row.business_number || "-"}</td>
                        <td className="p-2 truncate max-w-[120px]">{row.address || "-"}</td>
                        <td className="p-2">{row.manager_name || "-"}</td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr className="text-slate-400 bg-slate-50/20">
                        <td colSpan={6} className="p-2 text-center font-bold">
                          외 {parsedData.length - 5}건의 데이터가 더 존재합니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => { onClose(); resetModal(); }}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-150 text-slate-550 rounded-xl font-bold text-xs bg-white cursor-pointer"
          >
            닫기
          </button>
          <button 
            disabled={parsedData.length === 0 || errors.length > 0 || loading}
            onClick={handleImportSubmit}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold text-xs border-none cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-650/10"
          >
            <Check className="w-3.5 h-3.5" />
            거래처 일괄 등록 시작
          </button>
        </div>

      </div>
    </div>
  );
}
