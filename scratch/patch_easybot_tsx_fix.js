const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/EasyBot.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. partnersList 상태 선언에 any[] 추가
code = code.replace(
  'const [partnersList, setPartnersList] = useState([]);',
  'const [partnersList, setPartnersList] = useState<any[]>([]);'
);

// 2. handlePartnerChange 파라미터 타입 추가
code = code.replace(
  'const handlePartnerChange = (selectedId) => {',
  'const handlePartnerChange = (selectedId: string) => {'
);

// 3. catch (err) -> catch (err: any) 수정
// FinancialStatementPreviewMessage 내에 2개의 catch가 있습니다.
// useEffect 내의 catch (err) 및 handleConfirmSubmit 내의 catch (err)
// 정확히 치환합니다.
code = code.replace(
  `    } catch (err) {
      console.error('재무제표 태그 파싱 실패:', err);
    }`,
  `    } catch (err: any) {
      console.error('재무제표 태그 파싱 실패:', err);
    }`
);

code = code.replace(
  `    } catch (err) {
      alert('서버 등록 통신 오류: ' + err.message);
    }`,
  `    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    }`
);

// 4. partnersList.map 파라미터 타입 추가
code = code.replace(
  '            {partnersList.map((p) => (',
  '            {partnersList.map((p: any) => ('
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully fixed EasyBot.tsx type errors!');
