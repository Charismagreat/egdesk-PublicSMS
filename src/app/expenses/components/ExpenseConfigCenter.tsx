"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Save, Sparkles, Upload, FileText, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { getByteLength } from "../utils";
import { ExpenseSettings, DbExpenseCategory, DbExpenseTag } from "../types";

export interface ExpenseConfigCenterProps {
  settings: ExpenseSettings;
  handleSaveSettings: (updatedSettings: ExpenseSettings) => Promise<void>;
  isSavingSettings: boolean;
  dbCategories: DbExpenseCategory[];
  handleAddCategory: (main: string, mid: string, sub: string) => Promise<{ success: boolean; error?: string }>;
  handleBulkAddCategories: (categories: any[]) => Promise<{ success: boolean; addedCount?: number; message?: string; error?: string }>;
  handleDeleteCategory: (id: string) => Promise<void>;
  dbTags: DbExpenseTag[];
  handleAddTag: (name: string, scope?: string) => Promise<{ success: boolean; error?: string }>;
  handleDeleteTag: (id: string) => Promise<void>;
  dbDepartments: any[];
  dbEmployees: any[];
  dbProjects: any[];
  handleAddDepartment: (name: string) => Promise<{ success: boolean; error?: string }>;
  handleDeleteDepartment: (id: string) => Promise<void>;
  handleAddEmployee: (name: string) => Promise<{ success: boolean; error?: string }>;
  handleDeleteEmployee: (id: string) => Promise<void>;
  handleAddProject: (name: string) => Promise<{ success: boolean; error?: string }>;
  handleDeleteProject: (id: string) => Promise<void>;
}

export default function ExpenseConfigCenter({
  settings,
  handleSaveSettings,
  isSavingSettings,
  dbCategories,
  handleAddCategory,
  handleBulkAddCategories,
  handleDeleteCategory,
  dbTags,
  handleAddTag,
  handleDeleteTag,
  dbDepartments,
  dbEmployees,
  dbProjects,
  handleAddDepartment,
  handleDeleteDepartment,
  handleAddEmployee,
  handleDeleteEmployee,
  handleAddProject,
  handleDeleteProject,
}: ExpenseConfigCenterProps) {
  const [activeConfigTab, setActiveConfigTab] = useState<'budget' | 'category' | 'tag' | 'org'>('budget');
  const [tempSettings, setTempSettings] = useState<ExpenseSettings | null>(null);

  // 로컬 폼 입력 상태
  const [newMainCat, setNewMainCat] = useState<string>("판매비와관리비");
  const [newMidCat, setNewMidCat] = useState<string>("");
  const [newSubCat, setNewSubCat] = useState<string>("");
  const [newTagName, setNewTagName] = useState<string>("");
  const [newTagScope, setNewTagScope] = useState<string>("global");
  const [newDeptName, setNewDeptName] = useState<string>("");
  const [newEmpName, setNewEmpName] = useState<string>("");
  const [newProjName, setNewProjName] = useState<string>("");

  // 제출 대기 로더 상태
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);
  const [isSubmittingProj, setIsSubmittingProj] = useState(false);
  const [isExcelUploading, setIsExcelUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setTempSettings(settings);
    }
  }, [settings]);

  const handleTempSettingChange = (key: keyof ExpenseSettings, value: any) => {
    if (tempSettings) {
      setTempSettings({
        ...tempSettings,
        [key]: value
      });
    }
  };

  const onAddCategoryClick = async () => {
    if (!newMidCat.trim() || !newSubCat.trim()) {
      alert("중분류와 소분류 명칭을 모두 입력해 주세요.");
      return;
    }
    setIsSubmittingCat(true);
    const result = await handleAddCategory(newMainCat, newMidCat.trim(), newSubCat.trim());
    setIsSubmittingCat(false);
    if (result.success) {
      alert("신규 계정 과목이 안전하게 추가되었습니다.");
      setNewMidCat("");
      setNewSubCat("");
    } else {
      alert("등록 실패: " + result.error);
    }
  };

  const downloadExcelSample = () => {
    try {
      const sampleData = [
        { "대분류": "판매비와관리비", "중분류": "복리후생비", "소분류": "직원야근식대" },
        { "대분류": "판매비와관리비", "중분류": "여비교통비", "소분류": "시내교통비" },
        { "대분류": "제조/물류원가", "중분류": "소모품비", "소분류": "물류부박스구매" }
      ];
      
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "계정과목_양식");
      
      ws["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 20 }
      ];
      
      XLSX.writeFile(wb, "계정과목_일괄등록_양식.xlsx");
    } catch (e) {
      console.error("샘플 다운로드 오류:", e);
      alert("엑셀 샘플 파일을 생성하는 과정에서 오류가 발생했습니다.");
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    setIsExcelUploading(true);
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        
        if (!data || data.length === 0) {
          alert("업로드된 엑셀 파일 내에 등록할 데이터 행이 존재하지 않습니다.");
          setIsExcelUploading(false);
          return;
        }
        
        const firstRow = data[0];
        if (!("대분류" in firstRow) || !("중분류" in firstRow) || !("소분류" in firstRow)) {
          alert("엑셀 양식이 올바르지 않습니다. 헤더 컬럼 이름이 '대분류', '중분류', '소분류' 인지 확인해주세요.");
          setIsExcelUploading(false);
          return;
        }
        
        const mappedCategories = data.map((row: any) => ({
          main_category: String(row["대분류"] || "").trim(),
          mid_category: String(row["중분류"] || "").trim(),
          sub_category: String(row["소분류"] || "").trim()
        })).filter(
          cat => cat.main_category && cat.mid_category && cat.sub_category
        );
        
        if (mappedCategories.length === 0) {
          alert("엑셀 파일 내에 누락이 없는 유효한 계정과목 데이터가 존재하지 않습니다.");
          setIsExcelUploading(false);
          return;
        }
        
        const result = await handleBulkAddCategories(mappedCategories);
        if (result.success) {
          alert(`🎉 엑셀 일괄 추가 성공!\n총 ${result.addedCount}건의 신규 계정과목이 등록되었습니다.${result.message ? `\n(${result.message})` : ""}`);
        } else {
          alert("엑셀 일괄 등록 실패: " + result.error);
        }
      } catch (err: any) {
        console.error("엑셀 파일 파싱 오류:", err);
        alert("엑셀 파일을 분석하는 중 에러가 발생했습니다. 올바른 파일 규격인지 점검해주세요.");
      } finally {
        setIsExcelUploading(false);
        if (e.target) {
          e.target.value = "";
        }
      }
    };
    
    reader.onerror = () => {
      alert("파일을 로드하는 중 오류가 발생했습니다.");
      setIsExcelUploading(false);
    };
    
    reader.readAsBinaryString(file);
  };

  const onAddTagClick = async () => {
    if (!newTagName.trim()) {
      alert("추가할 태그 명칭을 입력해 주세요.");
      return;
    }
    setIsSubmittingTag(true);
    const result = await handleAddTag(newTagName.trim(), newTagScope);
    setIsSubmittingTag(false);
    if (result.success) {
      alert("태그가 추가되었습니다.");
      setNewTagName("");
      setNewTagScope("global");
    } else {
      alert("등록 실패: " + result.error);
    }
  };

  const onAddDeptClick = async () => {
    if (!newDeptName.trim()) return;
    setIsSubmittingDept(true);
    const result = await handleAddDepartment(newDeptName.trim());
    setIsSubmittingDept(false);
    if (result.success) {
      setNewDeptName("");
    } else {
      alert("부서 등록 실패: " + result.error);
    }
  };

  const onAddEmpClick = async () => {
    if (!newEmpName.trim()) return;
    setIsSubmittingEmp(true);
    const result = await handleAddEmployee(newEmpName.trim());
    setIsSubmittingEmp(false);
    if (result.success) {
      setNewEmpName("");
    } else {
      alert("사원 등록 실패: " + result.error);
    }
  };

  const onAddProjClick = async () => {
    if (!newProjName.trim()) return;
    setIsSubmittingProj(true);
    const result = await handleAddProject(newProjName.trim());
    setIsSubmittingProj(false);
    if (result.success) {
      setNewProjName("");
    } else {
      alert("프로젝트 등록 실패: " + result.error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
      <h2 className="text-lg font-black text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-2 gap-2 text-left">
        <div className="flex items-center text-slate-850">
          <AlertTriangle className="w-5 h-5 mr-2 text-rose-500 animate-bounce" />
          지출 환경 설정
        </div>
        
        {/* 탭 컨트롤 */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 self-end">
          <button
            type="button"
            onClick={() => setActiveConfigTab('budget')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none ${
              activeConfigTab === 'budget' ? 'bg-white text-rose-655 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            🚨 예산 알림
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('category')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none ${
              activeConfigTab === 'category' ? 'bg-white text-rose-655 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            📂 계정 과목
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('tag')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none ${
              activeConfigTab === 'tag' ? 'bg-white text-rose-655 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            🏷️ 태그
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('org')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none ${
              activeConfigTab === 'org' ? 'bg-white text-rose-655 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            🏢 조직 및 사업
          </button>
        </div>
      </h2>

      {/* 🚨 1. 예산 알림 탭 */}
      {activeConfigTab === 'budget' && tempSettings && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-150">
            <span className="text-xs font-black text-slate-705">예산 한도액 알림 가동</span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={tempSettings.is_alert_enabled === 1}
                onChange={() => handleTempSettingChange('is_alert_enabled', tempSettings.is_alert_enabled === 1 ? 0 : 1)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">월별 지출 제한 한도 (원화 ₩) *</label>
              <input 
                type="number"
                data-easybot-hint="월별 지출 제한 한도: 한 달 동안 사용할 총 지출 예산을 원화(₩) 단위로 입력합니다. 누적 지출이 설정한 경보 임계치에 도달하면 경보 문자가 자동 발송됩니다."
                value={tempSettings.monthly_budget}
                onChange={e => handleTempSettingChange('monthly_budget', Number(e.target.value))}
                disabled={tempSettings.is_alert_enabled === 0}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-black text-xs bg-white disabled:bg-slate-100 disabled:text-slate-450 focus:ring-2 focus:ring-rose-500 transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">경보 수신 연락처 (점주 번호) *</label>
              <input 
                type="text"
                data-easybot-hint="경보 수신 연락처: 예산 초과 경보 SMS를 수신할 담당자 또는 관리자(점주)의 휴대전화 번호를 입력합니다. 예: 010-1234-5678"
                placeholder="예: 010-1234-5678"
                value={tempSettings.alert_phone}
                onChange={e => handleTempSettingChange('alert_phone', e.target.value)}
                disabled={tempSettings.is_alert_enabled === 0}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white disabled:bg-slate-100 disabled:text-slate-450 focus:ring-2 focus:ring-rose-500 transition-all text-slate-800 font-mono"
              />
            </div>

            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-extrabold text-slate-500">지출 소모율 경보 임계 기준치 (%) *</label>
                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded">{tempSettings.alert_threshold_percent}%</span>
              </div>
              <input 
                type="range"
                min="50"
                max="100"
                step="5"
                value={tempSettings.alert_threshold_percent}
                onChange={e => handleTempSettingChange('alert_threshold_percent', Number(e.target.value))}
                disabled={tempSettings.is_alert_enabled === 0}
                className="w-full accent-rose-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>

            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-extrabold text-slate-500">🚨 경보 문자 템플릿 문구 *</label>
                <span className="text-[9px] text-slate-455 font-bold">지원 변수: {"{경보임계율}"}, {"{경보금액}"}, {"{누적지출}"}, {"{월예산}"}</span>
              </div>
              <textarea 
                data-easybot-hint="경보 문자 템플릿 문구: 예산 소모율이 임계치를 초과할 때 발송할 SMS/LMS의 내용입니다. {경보임계율}, {경보금액}, {누적지출}, {월예산}과 같은 예약어 변수들을 본문에 포함하면, 발송 시점의 실제 수치로 자동 변환되어 발송됩니다. 한글 기준 80바이트 초과 시 장문 메시지(LMS)로 처리됩니다."
                value={tempSettings.alert_sms_template}
                onChange={e => handleTempSettingChange('alert_sms_template', e.target.value)}
                disabled={tempSettings.is_alert_enabled === 0}
                rows={4}
                className="w-full border border-slate-250 rounded-xl p-3 outline-none font-semibold text-xs bg-white disabled:bg-slate-100 disabled:text-slate-455 focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 resize-none leading-relaxed"
              />
              
              {tempSettings.is_alert_enabled === 1 && (
                <div className="flex justify-between items-center mt-1.5 px-1 animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all border ${
                      getByteLength(tempSettings.alert_sms_template) <= 80 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {getByteLength(tempSettings.alert_sms_template) <= 80 ? '단문 SMS' : '장문 LMS'}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-500">
                      {getByteLength(tempSettings.alert_sms_template)} / 80 Byte
                    </span>
                  </div>
                  {getByteLength(tempSettings.alert_sms_template) > 80 && (
                    <span className="text-[9px] text-amber-600 font-extrabold flex items-center">
                      <AlertCircle className="w-3 h-3 mr-0.5 shrink-0 text-amber-500" />
                      80Byte 초과 시 장문(LMS) 발송 및 요금 추가
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button 
              type="button"
              onClick={() => handleSaveSettings(tempSettings)}
              disabled={isSavingSettings || tempSettings.is_alert_enabled === 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-805 text-white rounded-xl font-bold text-xs shadow-md hover:opacity-95 disabled:bg-slate-350 disabled:shadow-none transition-all cursor-pointer border-none flex items-center"
            >
              <Save className="w-3.5 h-3.5 mr-2" />
              {isSavingSettings ? "설정 저장 중..." : "경보 설정 적용하기"}
            </button>
          </div>
        </div>
      )}

      {/* 📂 2. 계정 과목 관리 탭 */}
      {activeConfigTab === 'category' && (
        <div className="space-y-4 animate-fade-in text-xs text-left">
          <div 
            data-easybot-hint="계정 과목 3단계 수동 추가: 지출 결의 시 선택할 대분류(판매비와관리비, 제조/물류원가 등), 중분류(여비교통비, 복리후생비 등), 그리고 구체적인 비목인 소분류(시내교통비, 직원식대 등)를 조합하여 신규 계정 과목을 수동으로 등록합니다."
            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
          >
            <h3 className="font-extrabold text-slate-800 text-[11px] flex items-center">
              <Sparkles className="w-3 h-3 text-rose-500 mr-1.5 animate-pulse" />
              ➕ 신규 계정 과목 3단계 추가
            </h3>
            <div className="flex flex-col sm:flex-row items-end gap-2 w-full">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <label className="block text-[9px] font-bold text-slate-455 mb-0.5">대분류</label>
                <select
                  value={newMainCat}
                  onChange={e => setNewMainCat(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg px-2 py-1.5 outline-none font-bold text-[11px] bg-white text-slate-700 cursor-pointer h-[32px]"
                >
                  <option value="판매비와관리비">판매비와관리비</option>
                  <option value="제조/물류원가">제조/물류원가</option>
                  <option value="영업외비용">영업외비용</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <label className="block text-[9px] font-bold text-slate-455 mb-0.5">중분류</label>
                <input
                  type="text"
                  placeholder="예: 복리후생비"
                  value={newMidCat}
                  onChange={e => setNewMidCat(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg px-2.5 py-1.5 outline-none font-bold text-[11px] bg-white text-slate-850 h-[32px]"
                />
              </div>
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <label className="block text-[9px] font-bold text-slate-455 mb-0.5">소분류 (최종 비목)</label>
                <input
                  type="text"
                  placeholder="예: 직원식대"
                  value={newSubCat}
                  onChange={e => setNewSubCat(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg px-2.5 py-1.5 outline-none font-bold text-[11px] bg-white text-slate-850 h-[32px]"
                />
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onAddCategoryClick}
                  disabled={isSubmittingCat || !newMidCat.trim() || !newSubCat.trim()}
                  className="w-full sm:w-auto px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-black text-[10px] shadow-sm cursor-pointer disabled:bg-slate-300 border-none transition-all flex items-center justify-center h-[32px]"
                >
                  {isSubmittingCat ? "추가 중..." : "➕ 계정 추가"}
                </button>
              </div>
            </div>
          </div>

          <div 
            data-easybot-hint="엑셀 계정 과목 일괄 등록: 여러 개의 계정 과목을 한 번에 등록하고 싶을 때 사용합니다. '양식 다운로드' 버튼을 클릭하여 제공되는 엑셀 템플릿(.xlsx)에 대분류, 중분류, 소분류를 기록한 뒤 파일을 이곳에 업로드하면 대량의 계정이 즉시 일괄 추가됩니다."
            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-[11px] flex items-center">
                <Upload className="w-3.5 h-3.5 text-rose-500 mr-1.5" />
                📤 엑셀 계정 과목 일괄 등록
              </h3>
              <button
                type="button"
                onClick={downloadExcelSample}
                className="text-[9px] font-black text-rose-500 bg-rose-55 hover:bg-rose-100 border border-rose-200 px-2 py-1.5 rounded-lg cursor-pointer transition-all flex items-center shadow-2xs border-none"
              >
                <FileText className="w-2.5 h-2.5 mr-1" />
                📥 양식 다운로드
              </button>
            </div>

            <div className="border border-dashed border-slate-250 hover:border-rose-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center space-y-2 transition-colors relative cursor-pointer group shadow-2xs min-h-[90px]">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isExcelUploading}
              />
              {isExcelUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                  <span className="text-[10px] font-bold text-slate-500">엑셀 파일을 처리하고 있습니다...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                    엑셀 파일을 드래그하거나 클릭하여 업로드
                  </span>
                  <span className="text-[8.5px] text-slate-400 font-medium">
                    * 대분류, 중분류, 소분류 헤더와 데이터가 들어있는 엑셀 파일만 지원합니다.
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-500 text-[10px] pl-1">현재 등록된 계정 과목 목록 ({dbCategories.length}건)</h3>
            <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
              {dbCategories.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold">등록된 계정과목이 없습니다.</div>
              ) : (
                dbCategories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="inline-flex px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[8px] font-bold border border-slate-200 mr-1.5">
                        {cat.main_category}
                      </span>
                      <span className="text-slate-400 font-bold text-[9px] mr-1">{cat.mid_category} 〉</span>
                      <span className="text-slate-850 font-black text-[10px]">{cat.sub_category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                      title="계정 과목 영구 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ 3. 통합 공통 태그 관리 탭 */}
      {activeConfigTab === 'tag' && (
        <div className="space-y-4 animate-fade-in text-xs text-left">
          <div 
            data-easybot-hint="통합 공통 태그 등록: 시스템 전반(지출, 재고 등)에 공통으로 표시할 커스텀 태그를 생성합니다. 예를 들어 특정 프로젝트명, 부서명, 공급처 형태, 특별 이벤트 등을 입력하고 등록하면 지출 및 재고 수불부 작성 시 라벨로 부착하여 전사 통합 다차원 분석에 활용할 수 있습니다."
            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
          >
            <h3 className="font-extrabold text-slate-800 text-[11px] flex items-center">
              <Sparkles className="w-3 h-3 text-rose-500 mr-1.5 animate-pulse" />
              ➕ 통합 공통 태그 등록
            </h3>
            <div className="flex flex-col sm:flex-row items-end gap-2 w-full">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <label className="block text-[9px] font-bold text-slate-455 mb-0.5">태그명</label>
                <input
                  type="text"
                  placeholder="예: SC팀, 마케팅본부, 정기점검"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-850 h-[32px]"
                />
              </div>
              <div className="w-full sm:w-[130px] shrink-0">
                <label className="block text-[9px] font-bold text-slate-455 mb-0.5">적용 범위</label>
                <select
                  value={newTagScope}
                  onChange={e => setNewTagScope(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg px-2 py-1.5 outline-none font-bold text-xs bg-white text-slate-700 cursor-pointer h-[32px]"
                >
                  <option value="global">전사 공통</option>
                  <option value="expense">지출 전용</option>
                  <option value="inventory">재고 전용</option>
                </select>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onAddTagClick}
                  disabled={isSubmittingTag || !newTagName.trim()}
                  className="w-full sm:w-auto px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-black text-[10px] shadow-sm cursor-pointer disabled:bg-slate-300 border-none transition-all h-[32px] flex items-center justify-center"
                >
                  {isSubmittingTag ? "등록 중..." : "태그 등록"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-500 text-[10px] pl-1">등록된 태그 ({dbTags.length}개)</h3>
            <div className="flex flex-wrap gap-2 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
              {dbTags.length === 0 ? (
                <div className="w-full text-center text-slate-400 font-bold py-4">등록된 태그가 없습니다.</div>
              ) : (
                dbTags.map(tag => (
                  <div key={tag.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-3xs">
                    <span>#{tag.name}</span>
                    <span className="text-[8px] px-1 py-0.2 bg-slate-200/60 text-slate-500 rounded font-normal">
                      {tag.scope === 'expense' ? '지출' : tag.scope === 'inventory' ? '재고' : '공통'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-slate-400 hover:text-rose-500 font-black ml-1 cursor-pointer bg-transparent border-none p-0 text-[11px]"
                      title="태그 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏢 4. 조직 및 사업 관리 탭 */}
      {activeConfigTab === 'org' && (
        <div className="space-y-5 animate-fade-in text-xs text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 부서 관리 */}
            <div 
              data-easybot-hint="사내 부서 관리: 지출 전표 결의 시 지출 주체가 되는 기업 내부의 공식 부서들을 등록 및 삭제합니다. 이곳에 등록한 부서들은 지출 보고서 필터나 부서별 예산 분석 통계의 기준이 됩니다."
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
            >
              <h3 className="font-extrabold text-slate-800 text-[10.5px] border-b pb-1.5">🏢 사내 부서 관리</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="부서명 입력"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  className="flex-1 border border-slate-250 rounded-lg px-2 py-1 outline-none font-bold text-[10.5px] bg-white"
                />
                <button
                  type="button"
                  onClick={onAddDeptClick}
                  disabled={isSubmittingDept || !newDeptName.trim()}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[9.5px] border-none cursor-pointer disabled:opacity-40"
                >
                  등록
                </button>
              </div>
              <div className="max-h-[140px] overflow-y-auto bg-white border rounded-lg divide-y divide-slate-100">
                {dbDepartments.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-[9px] font-bold">등록된 부서 없음</div>
                ) : (
                  dbDepartments.map(d => (
                    <div key={d.id} className="flex justify-between items-center p-2 hover:bg-slate-50">
                      <span className="font-extrabold text-[10px] text-slate-700">{d.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(d.id)}
                        className="text-slate-400 hover:text-rose-500 font-bold border-none bg-transparent cursor-pointer text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 임직원 관리 */}
            <div 
              data-easybot-hint="사내 임직원 명단 관리: 법인카드 사용자나 지출 결의를 상신하는 직원들의 이름을 관리합니다. 등록된 임직원은 지출 결의자 또는 영수증 사용자 필드에서 선택할 수 있게 됩니다."
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
            >
              <h3 className="font-extrabold text-slate-800 text-[10.5px] border-b pb-1.5">👥 임직원 명단 관리</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="사원명 입력"
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  className="flex-1 border border-slate-250 rounded-lg px-2 py-1 outline-none font-bold text-[10.5px] bg-white"
                />
                <button
                  type="button"
                  onClick={onAddEmpClick}
                  disabled={isSubmittingEmp || !newEmpName.trim()}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[9.5px] border-none cursor-pointer disabled:opacity-40"
                >
                  등록
                </button>
              </div>
              <div className="max-h-[140px] overflow-y-auto bg-white border rounded-lg divide-y divide-slate-100">
                {dbEmployees.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-[9px] font-bold">등록된 사원 없음</div>
                ) : (
                  dbEmployees.map(e => (
                    <div key={e.id} className="flex justify-between items-center p-2 hover:bg-slate-50">
                      <span className="font-extrabold text-[10px] text-slate-700">{e.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(e.id)}
                        className="text-slate-400 hover:text-rose-500 font-bold border-none bg-transparent cursor-pointer text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 프로젝트 관리 */}
            <div 
              data-easybot-hint="프로젝트 및 사업명 관리: 특정 목적으로 임시 발족되거나 특별 정산이 필요한 프로젝트성 사업명을 등록합니다. 각 지출 결의 시 이 사업명을 매핑해 두면 차후 프로젝트별 원가 분석 시 대단히 유용합니다."
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
            >
              <h3 className="font-extrabold text-slate-800 text-[10.5px] border-b pb-1.5">🚀 프로젝트 사업명 관리</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="사업명 입력"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="flex-1 border border-slate-250 rounded-lg px-2 py-1 outline-none font-bold text-[10.5px] bg-white"
                />
                <button
                  type="button"
                  onClick={onAddProjClick}
                  disabled={isSubmittingProj || !newProjName.trim()}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[9.5px] border-none cursor-pointer disabled:opacity-40"
                >
                  등록
                </button>
              </div>
              <div className="max-h-[140px] overflow-y-auto bg-white border rounded-lg divide-y divide-slate-100">
                {dbProjects.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-[9px] font-bold">등록된 프로젝트 없음</div>
                ) : (
                  dbProjects.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2 hover:bg-slate-50">
                      <span className="font-extrabold text-[10px] text-slate-700">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(p.id)}
                        className="text-slate-400 hover:text-rose-500 font-bold border-none bg-transparent cursor-pointer text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
