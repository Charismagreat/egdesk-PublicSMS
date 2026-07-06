"use client";

import React from "react";
import { useKnowledgeAi } from "./hooks/useKnowledgeAi";
import { Header } from "./components/Header";
import { SecurityReview } from "./components/SecurityReview";
import { IngestHub } from "./components/IngestHub";
import { AssetTypesModal } from "./components/AssetTypesModal";
import { AssetList } from "./components/AssetList";
import { DocumentDetail } from "./components/DocumentDetail";
import { ChatBot } from "./components/ChatBot";
import { AutopilotModal } from "./components/AutopilotModal";
import { Compass } from "lucide-react";
import { EasyBotInstructionCard } from "./components/EasyBotInstructionCard";

export default function KnowledgeAiDashboard() {
  const {
    documents,
    isLoading,
    selectedDoc,
    setSelectedDoc,
    assetTypes,
    isAssetTypesLoading,
    isTypeVaultOpen,
    setIsTypeVaultOpen,
    newAssetTypeName,
    setNewAssetTypeName,
    vaultError,
    setVaultError,
    currentUser,
    setCurrentUser,
    currentRole,
    setCurrentRole,
    currentDept,
    setCurrentDept,
    uploadTitle,
    setUploadTitle,
    uploadType,
    setUploadType,
    uploadFile,
    setUploadFile,
    isUploading,
    uploadProgress,
    autopilotAnimScore,
    setAutopilotAnimScore,
    showAutopilotModal,
    setShowAutopilotModal,
    autopilotResult,
    chatInput,
    setChatInput,
    chatMessages,
    isRecording,
    cadZoom,
    setCadZoom,
    cadPan,
    setCadPan,
    isPlayingAudio,
    setIsPlayingAudio,
    audioProgress,
    uploadMode,
    setUploadMode,
    directContent,
    setDirectContent,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    editMetadata,
    setEditMetadata,
    editSecurityLevel,
    setEditSecurityLevel,
    handleCreateAssetType,
    handleDeleteAssetType,
    handleDowngradeSecurity,
    handleApproveDocument,
    handleFileUpload,
    handleUpdateDocument,
    handleDeleteDocument,
    handleSendChat,
    handleMicClick,
    handleCadMouseDown,
    handleCadMouseMove,
    handleCadMouseUp,
  } = useKnowledgeAi();

  return (
    <div className="w-full space-y-6 pb-20 min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="지식 관리 AI: 사내 매뉴얼, 비정형 텍스트 데이터를 RAG 학습용 벡터 데이터로 적재하고 훈련시킵니다.">
      {/* 1. 상단 타이틀 및 권한 제어 */}
      <Header
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentDept={currentDept}
        setCurrentDept={setCurrentDept}
      />

      {/* 2. 최고관리자 전용 Zero-Trust 보안 심사 피드 */}
      <SecurityReview
        documents={documents}
        currentRole={currentRole}
        handleDowngradeSecurity={handleDowngradeSecurity}
      />

      {/* 이지봇 자율 대행 작동 지침 설정 영역 */}
      <EasyBotInstructionCard currentRole={currentRole} />

      {/* 3. 대시보드 3단 격자 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* [좌측 4열]: 문서 리스트 및 비정형 업로드 폼 */}
        <div className="lg:col-span-4 space-y-6">
          <IngestHub
            uploadTitle={uploadTitle}
            setUploadTitle={setUploadTitle}
            uploadType={uploadType}
            setUploadType={setUploadType}
            uploadFile={uploadFile}
            setUploadFile={setUploadFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            assetTypes={assetTypes}
            isAssetTypesLoading={isAssetTypesLoading}
            currentRole={currentRole}
            currentUser={currentUser}
            setVaultError={setVaultError}
            setIsTypeVaultOpen={setIsTypeVaultOpen}
            handleFileUpload={handleFileUpload}
            uploadMode={uploadMode}
            setUploadMode={setUploadMode}
            directContent={directContent}
            setDirectContent={setDirectContent}
          />

          <AssetList
            isLoading={isLoading}
            documents={documents}
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
          />
        </div>

        {/* [중앙 5열]: 비정형 데이터 특화 프리뷰어 및 본문 */}
        <div className="lg:col-span-5 space-y-6">
          <DocumentDetail
            selectedDoc={selectedDoc}
            handleApproveDocument={handleApproveDocument}
            cadZoom={cadZoom}
            setCadZoom={setCadZoom}
            cadPan={cadPan}
            setCadPan={setCadPan}
            handleCadMouseDown={handleCadMouseDown}
            handleCadMouseMove={handleCadMouseMove}
            handleCadMouseUp={handleCadMouseUp}
            isPlayingAudio={isPlayingAudio}
            setIsPlayingAudio={setIsPlayingAudio}
            audioProgress={audioProgress}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            editContent={editContent}
            setEditContent={setEditContent}
            editMetadata={editMetadata}
            setEditMetadata={setEditMetadata}
            editSecurityLevel={editSecurityLevel}
            setEditSecurityLevel={setEditSecurityLevel}
            handleUpdateDocument={handleUpdateDocument}
            handleDeleteDocument={handleDeleteDocument}
            assetTypes={assetTypes}
          />
        </div>

        {/* [우측 3열]: AI 지식 비서 RAG 챗봇 및 비즈니스 은하수 노드 맵 */}
        <div className="lg:col-span-3 space-y-6 font-mono">
          <ChatBot
            currentRole={currentRole}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            isRecording={isRecording}
            documents={documents}
            setSelectedDoc={setSelectedDoc}
            handleSendChat={handleSendChat}
            handleMicClick={handleMicClick}
          />

          {/* Semantic Knowledge Map (비즈니스 지식 은하수) */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[280px]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-500 animate-spin-slow" />
                비즈니스 지식 은하수 맵
              </h2>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden flex items-center justify-center select-none">
              <svg width="100%" height="100%" className="absolute">
                <circle cx="100" cy="90" r="70" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                <circle cx="100" cy="90" r="45" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />

                <line x1="100" y1="90" x2="60" y2="50" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="100" y1="90" x2="140" y2="50" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="100" y1="90" x2="50" y2="120" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="100" y1="90" x2="150" y2="125" stroke="#cbd5e1" strokeWidth="1" />

                <circle
                  cx="100"
                  cy="90"
                  r="8"
                  fill="#3b82f6"
                  className="animate-ping"
                  style={{ transformOrigin: "100px 90px" }}
                />
                <circle cx="100" cy="90" r="6" fill="#2563eb" />

                <circle
                  cx="60"
                  cy="50"
                  r="5"
                  fill="#f43f5e"
                  className="cursor-pointer font-bold"
                  onClick={() => {
                    const d = documents.find((doc) => doc.doc_type.includes("도면") || doc.doc_type === "CAD_BLUEPRINT");
                    if (d) setSelectedDoc(d);
                  }}
                />
                <text x="35" y="42" fill="#e11d48" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  BATTERY_CAD(A)
                </text>

                <circle
                  cx="140"
                  cy="50"
                  r="5"
                  fill="#f43f5e"
                  className="cursor-pointer font-bold"
                  onClick={() => {
                    const d = documents.find(
                      (doc) =>
                        doc.doc_type.includes("녹음") ||
                        doc.doc_type.includes("영상") ||
                        doc.doc_type === "AUDIO_RECORDING"
                    );
                    if (d) setSelectedDoc(d);
                  }}
                />
                <text x="125" y="42" fill="#e11d48" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  M&A_STRATEGY(A)
                </text>

                <circle
                  cx="50"
                  cy="120"
                  r="5"
                  fill="#d97706"
                  className="cursor-pointer font-bold"
                  onClick={() => {
                    const d = documents.find((doc) => doc.doc_type.includes("보고서") || doc.doc_type === "REPORT");
                    if (d) setSelectedDoc(d);
                  }}
                />
                <text x="20" y="132" fill="#b45309" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  SALES_Q2(B)
                </text>

                <circle
                  cx="150"
                  cy="125"
                  r="5"
                  fill="#059669"
                  className="cursor-pointer font-bold"
                  onClick={() => {
                    const d = documents.find((doc) => doc.doc_type.includes("품의서") || doc.doc_type === "PROPOSAL");
                    if (d) setSelectedDoc(d);
                  }}
                />
                <text x="135" y="137" fill="#047857" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  GAS_BILL(C)
                </text>
              </svg>
              <div className="absolute bottom-2 left-2 text-[8px] text-slate-400 font-mono">
                * 각 노드 클릭 시 관제 및 분석 연동
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI Autopilot 자동 결재 채점 게이지 팝업 모달 */}
      <AutopilotModal
        showAutopilotModal={showAutopilotModal}
        setShowAutopilotModal={setShowAutopilotModal}
        autopilotResult={autopilotResult}
        autopilotAnimScore={autopilotAnimScore}
        setAutopilotAnimScore={setAutopilotAnimScore}
      />

      {/* 5. 최고관리자용 자산 종류 편집 모달 */}
      <AssetTypesModal
        isTypeVaultOpen={isTypeVaultOpen}
        setIsTypeVaultOpen={setIsTypeVaultOpen}
        vaultError={vaultError}
        setVaultError={setVaultError}
        newAssetTypeName={newAssetTypeName}
        setNewAssetTypeName={setNewAssetTypeName}
        assetTypes={assetTypes}
        handleCreateAssetType={handleCreateAssetType}
        handleDeleteAssetType={handleDeleteAssetType}
      />
    </div>
  );
}
