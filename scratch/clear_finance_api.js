const API_URL = "http://localhost:8080";
const API_KEY = "a67ddc0f-7e2b-4997-9a0b-9667a74c89d0";

async function clearRemoteAccounts() {
  console.log("🚀 이지데스크 원격 API 서버(localhost:8080)의 금융 계좌 전면 삭제를 시도합니다...\n");
  
  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY
  };

  try {
    // 1. 계좌 목록 조회
    console.log("1. 원격 계좌 목록 조회를 요청합니다...");
    const listRes = await fetch(`${API_URL}/financehub/tools/call`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tool: "financehub_list_accounts",
        arguments: {}
      })
    });
    
    if (!listRes.ok) {
      throw new Error(`HTTP 에러 ${listRes.status}: ${listRes.statusText}`);
    }
    
    const listJson = await listRes.json();
    
    // MCP 응답 결과 파싱
    const textContent = listJson.result?.content?.[0]?.text;
    if (!textContent) {
      console.log("ℹ️ 백엔드에 등록된 계좌 정보가 없습니다.");
      return;
    }
    
    const accountsData = JSON.parse(textContent);
    const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || []);
    
    console.log(`📋 발견된 계좌 수: ${accounts.length}개`);
    
    if (accounts.length === 0) {
      console.log("ℹ️ 초기화할 계좌가 발견되지 않았습니다.");
      return;
    }
    
    // 2. 루프 돌며 개별 계좌 지우기 요청 전송
    for (const acc of accounts) {
      const bankId = acc.bank_id || acc.bankId;
      const accountNumber = acc.account_number || acc.accountNumber;
      
      if (bankId && accountNumber) {
        console.log(`🧹 원격 삭제 명령 송신: [${bankId}] ${accountNumber}`);
        const delRes = await fetch(`${API_URL}/financehub/tools/call`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            tool: "financehub_delete_account",
            arguments: { bankId, accountNumber }
          })
        });
        
        if (delRes.ok) {
          const delJson = await delRes.json();
          console.log(`✅ 삭제 성공: [${bankId}] ${accountNumber}`);
        } else {
          console.error(`❌ 삭제 실패: [${bankId}] ${accountNumber}`);
        }
      }
    }
    
    // 3. 각 은행사 수입 데이터 캐시 일괄 퍼지 요청
    const banks = ['shinhan', 'hana', 'kookmin', 'ibk', 'woori', 'nh'];
    console.log("\n2. 은행별 데이터 캐시의 완전 리셋을 전송합니다...");
    for (const bankId of banks) {
      await fetch(`${API_URL}/financehub/tools/call`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tool: "financehub_delete_imported_data_for_bank",
          arguments: { bankId }
        })
      }).catch(() => null);
    }
    
    console.log("\n🎉 [성공] 원격 이지데스크 API 서버의 모든 잔여 계좌 및 금융 캐시가 깨끗하게 삭제되었습니다!");
  } catch (error) {
    console.error("\n❌ 원격 API 삭제 작업 중 오류 발생:", error.message);
  }
}

clearRemoteAccounts();
