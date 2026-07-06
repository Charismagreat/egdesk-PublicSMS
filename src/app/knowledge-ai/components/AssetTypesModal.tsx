import React from "react";
import { X, Settings, AlertCircle, Plus, Trash2 } from "lucide-react";
import { AssetType } from "../types";

interface AssetTypesModalProps {
  isTypeVaultOpen: boolean;
  setIsTypeVaultOpen: (val: boolean) => void;
  vaultError: string | null;
  setVaultError: (val: string | null) => void;
  newAssetTypeName: string;
  setNewAssetTypeName: (val: string) => void;
  assetTypes: AssetType[];
  handleCreateAssetType: (e: React.FormEvent) => void;
  handleDeleteAssetType: (id: string) => void;
}

export function AssetTypesModal({
  isTypeVaultOpen,
  setIsTypeVaultOpen,
  vaultError,
  setVaultError,
  newAssetTypeName,
  setNewAssetTypeName,
  assetTypes,
  handleCreateAssetType,
  handleDeleteAssetType,
}: AssetTypesModalProps) {
  if (!isTypeVaultOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in select-none">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl relative">
        <button
          onClick={() => {
            setIsTypeVaultOpen(false);
            setVaultError(null);
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-800"
          id="btn-close-vault-modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-md font-bold text-slate-850 flex items-center gap-1.5">
            <Settings className="w-5 h-5 text-indigo-500 animate-spin-slow" />
            동적 자산 분류 Vault (최고관리자 전용)
          </h3>
          <p className="text-xs text-slate-400 mt-1">사내 지식 자산의 분류 카테고리를 실시간 신설/제거합니다.</p>
        </div>

        {/* 에러 경고 배너 피드백 */}
        {vaultError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs flex items-start gap-1.5 font-sans animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{vaultError}</span>
          </div>
        )}

        {/* 신규 자산 추가 폼 */}
        <form onSubmit={handleCreateAssetType} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAssetTypeName}
            onChange={(e) => setNewAssetTypeName(e.target.value)}
            placeholder="신규 자산 분류명 기입... (예: 기밀특허)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-mono"
            id="input-new-asset-type-name"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            id="btn-add-asset-type"
          >
            <Plus className="w-4 h-4" /> 추가
          </button>
        </form>

        {/* 저장된 분류 리스트 (삭제 버튼 및 무결성 락 작동) */}
        <div className="max-h-56 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 scrollbar-thin">
          {assetTypes.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between text-xs font-mono hover:bg-slate-50 transition-all group"
            >
              <span className="text-slate-800 font-bold font-sans">{item.type_name}</span>

              {/* 삭제 버튼 (사용량 락 기반 자동 통제) */}
              <button
                type="button"
                onClick={() => handleDeleteAssetType(item.id)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all"
                title="해당 자산 분류 영구 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setIsTypeVaultOpen(false);
            setVaultError(null);
          }}
          className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-98"
          id="btn-close-vault-save"
        >
          닫기 및 변경 사항 반영
        </button>
      </div>
    </div>
  );
}
