"use client";

import React from "react";
import { MessageSquare } from "lucide-react";

// 커스텀 훅 및 모달 컴포넌트 임포트
import { useSms } from "@/hooks/useSms";
import SmsTestSendModal from "@/components/sms/SmsTestSendModal";
import SmsTemplateEditModal from "@/components/sms/SmsTemplateEditModal";
import SmsDeviceAddModal from "@/components/sms/SmsDeviceAddModal";

// 격리 신설한 5종 프레젠테이션 컴포넌트 임포트
import { AiPanel } from "./components/AiPanel";
import { MessageForm } from "./components/MessageForm";
import { TargetSelector } from "./components/TargetSelector";
import { DeviceHub } from "./components/DeviceHub";
import { TemplateLibrary } from "./components/TemplateLibrary";

export default function SmsPage() {
  const {
    message, setMessage,
    messageBytes, messageType,
    isConnected,
    isPairing,
    smsDevices,
    selectedDeviceId, setSelectedDeviceId,
    newDevicePhone, setNewDevicePhone,
    newDeviceName, setNewDeviceName,
    showAddDeviceModal, setShowAddDeviceModal,
    isAddingDevice,
    customers,
    selectedIds,
    targetMode, setTargetMode,
    excelCustomers,
    selectedExcelIds,
    fileInputRef,
    isAd, setIsAd,
    adHeader, setAdHeader,
    adFooter, setAdFooter,
    optOutPhone, setOptOutPhone,
    spamRisk,
    adTemplates,
    selectedTemplateId,
    products,
    selectedProductId, setSelectedProductId,
    messageTemplates, setMessageTemplates,
    editingTemplate, setEditingTemplate,
    isSending,
    sendProgress,
    showTestModal, setShowTestModal,
    testPhone, setTestPhone,
    testDeviceId, setTestDeviceId,
    aiPrompt, setAiPrompt,
    isAiLoading,
    aiError,
    dbSearchQuery, setDbSearchQuery,
    dbCurrentPage, setDbCurrentPage,
    dbItemsPerPage, setDbItemsPerPage,
    excelSearchQuery, setExcelSearchQuery,
    excelCurrentPage, setExcelCurrentPage,
    excelItemsPerPage, setExcelItemsPerPage,
    filteredDbCustomers, totalDbPages, startDbIndex, endDbIndex, paginatedDbCustomers,
    filteredExcelCustomers, totalExcelPages, startExcelIndex, endExcelIndex, paginatedExcelCustomers,
    fetchCustomers,
    loadDevicesAndStatus,
    handleUpdateDeviceLimit,
    handleAiGenerate,
    handlePairing,
    handleAddDevice,
    handleDeleteDevice,
    toggleSelectAll,
    toggleSelect,
    handleExcelUpload,
    handleDeleteSelectedExcel,
    downloadSampleExcel,
    insertVariable,
    saveAdTemplate,
    loadAdTemplate,
    deleteAdTemplate,
    saveProduct,
    deleteProduct,
    generateFinalMessage,
    handleTestSend,
    handleSend
  } = useSms();

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800" data-easybot-hint="무료 문자 발송 AI: SMS/LMS 발송, AI 본문 생성 및 수신 고객 관리를 수행하는 통합 메시징 센터입니다.">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
        <MessageSquare className="w-8 h-8 text-purple-500 mr-3" />
        무료 문자 발송 AI
      </h1>

      {/* PC 전용 3열 고정 레이아웃 (반응형 접두사 디톡스 적용) */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          
          {/* AI Panel (AiPanel 컴포넌트로 분리) */}
          <AiPanel
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            isAiLoading={isAiLoading}
            aiError={aiError}
            onAiGenerate={handleAiGenerate}
          />

          {/* 메시지 작성 센터 (MessageForm 컴포넌트로 분리) */}
          <MessageForm
            message={message}
            setMessage={setMessage}
            messageBytes={messageBytes}
            messageType={messageType}
            isConnected={isConnected}
            products={products}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            deleteProduct={deleteProduct}
            saveProduct={saveProduct}
            insertVariable={insertVariable}
            isAd={isAd}
            setIsAd={setIsAd}
            adHeader={adHeader}
            setAdHeader={setAdHeader}
            adFooter={adFooter}
            setAdFooter={setAdFooter}
            optOutPhone={optOutPhone}
            setOptOutPhone={setOptOutPhone}
            selectedTemplateId={selectedTemplateId}
            adTemplates={adTemplates}
            loadAdTemplate={loadAdTemplate}
            deleteAdTemplate={deleteAdTemplate}
            saveAdTemplate={saveAdTemplate}
            generateFinalMessage={generateFinalMessage}
            spamRisk={spamRisk}
            messageTemplates={messageTemplates}
            setMessageTemplates={setMessageTemplates}
            isSending={isSending}
            sendProgress={sendProgress}
            selectedDeviceId={selectedDeviceId}
            setTestDeviceId={setTestDeviceId}
            setShowTestModal={setShowTestModal}
            handleSend={handleSend}
          />

          {/* 발송 대상 선택 영역 (TargetSelector 컴포넌트로 분리) */}
          <TargetSelector
            targetMode={targetMode}
            setTargetMode={setTargetMode}
            dbSearchQuery={dbSearchQuery}
            setDbSearchQuery={setDbSearchQuery}
            excelSearchQuery={excelSearchQuery}
            setExcelSearchQuery={setExcelSearchQuery}
            fetchCustomers={fetchCustomers}
            paginatedDbCustomers={paginatedDbCustomers}
            selectedIds={selectedIds}
            toggleSelectAll={toggleSelectAll}
            toggleSelect={toggleSelect}
            dbItemsPerPage={dbItemsPerPage}
            setDbItemsPerPage={setDbItemsPerPage}
            dbCurrentPage={dbCurrentPage}
            setDbCurrentPage={setDbCurrentPage}
            filteredDbCustomers={filteredDbCustomers}
            totalDbPages={totalDbPages}
            startDbIndex={startDbIndex}
            endDbIndex={endDbIndex}
            downloadSampleExcel={downloadSampleExcel}
            fileInputRef={fileInputRef}
            handleExcelUpload={handleExcelUpload}
            paginatedExcelCustomers={paginatedExcelCustomers}
            selectedExcelIds={selectedExcelIds}
            excelItemsPerPage={excelItemsPerPage}
            setExcelItemsPerPage={setExcelItemsPerPage}
            excelCurrentPage={excelCurrentPage}
            setExcelCurrentPage={setExcelCurrentPage}
            filteredExcelCustomers={filteredExcelCustomers}
            totalExcelPages={totalExcelPages}
            startExcelIndex={startExcelIndex}
            endExcelIndex={endExcelIndex}
            handleDeleteSelectedExcel={handleDeleteSelectedExcel}
          />
        </div>

        {/* 우측 3번째 열 (기기관리 및 개인 템플릿 모음) */}
        <div className="space-y-6">
          {/* 발송 기기 멀티 허브 (DeviceHub 컴포넌트로 분리) */}
          <DeviceHub
            setShowAddDeviceModal={setShowAddDeviceModal}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            smsDevices={smsDevices}
            isPairing={isPairing}
            handlePairing={handlePairing}
            handleDeleteDevice={handleDeleteDevice}
            handleUpdateDeviceLimit={handleUpdateDeviceLimit}
          />
          
          {/* 내 템플릿 모음 (TemplateLibrary 컴포넌트로 분리) */}
          <TemplateLibrary
            messageTemplates={messageTemplates}
            setMessageTemplates={setMessageTemplates}
            setEditingTemplate={setEditingTemplate}
            setMessage={setMessage}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3대 분리된 모달 컴포넌트 렌더링 영역 */}
      {/* ============================================================ */}

      {/* SmsTestSendModal: 테스트 문자 미리보기 및 전송 모달 */}
      <SmsTestSendModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        testPhone={testPhone}
        setTestPhone={setTestPhone}
        testDeviceId={testDeviceId}
        setTestDeviceId={setTestDeviceId}
        smsDevices={smsDevices}
        isSending={isSending}
        handleTestSend={handleTestSend}
      />

      {/* SmsTemplateEditModal: 템플릿 작성 및 편집 모달 */}
      <SmsTemplateEditModal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        editingTemplate={editingTemplate}
        setEditingTemplate={setEditingTemplate}
        messageTemplates={messageTemplates}
        setMessageTemplates={setMessageTemplates}
      />

      {/* SmsDeviceAddModal: 발송 기기 추가 모달 */}
      <SmsDeviceAddModal
        isOpen={showAddDeviceModal}
        onClose={() => setShowAddDeviceModal(false)}
        newDeviceName={newDeviceName}
        setNewDeviceName={setNewDeviceName}
        newDevicePhone={newDevicePhone}
        setNewDevicePhone={setNewDevicePhone}
        isAddingDevice={isAddingDevice}
        handleAddDevice={handleAddDevice}
      />

    </div>
  );
}
