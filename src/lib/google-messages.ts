import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * Google 메시지 웹 자동화 클래스
 */
export class GoogleMessagesAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private currentHeadless: boolean | null = null;
  public deviceId: string;
  public storagePath: string;
  public userDataDir: string;

  constructor(deviceId: string = 'default') {
    // 세션 구분을 위해 번호의 대시와 띄어쓰기를 없앤 순수 영숫자 식별자 사용
    this.deviceId = deviceId.replace(/[^0-9a-zA-Z]/g, '') || 'default';
    this.storagePath = path.join(process.cwd(), 'storage', `google-messages-auth-${this.deviceId}.json`);
    this.userDataDir = path.join(process.cwd(), 'storage', `playwright-profile-${this.deviceId}`);
  }

  /**
   * 브라우저 초기화 및 세션 로드
   */
  async init(headless: boolean = true) {
    // 기존 컨텍스트가 있지만 모드가 다른 경우 (예: headless -> headful) 닫고 다시 시작
    if (this.context && this.currentHeadless !== headless) {
      await this.close();
    }

    if (this.context) {
      try {
        // 컨텍스트가 연결되어 있고 페이지가 살아있는지 확인
        if (this.page && !this.page.isClosed()) {
          return;
        }
        console.log(`[GoogleMessages-${this.deviceId}] 기존 브라우저 세션이 끊겼거나 페이지가 닫혔습니다. 재시작 중...`);
        await this.close();
      } catch (e) {
        await this.close();
      }
    }

    // 저장소 디렉토리 생성
    const storageDir = path.dirname(this.storagePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    // Windows 환경에서 지정 기기 프로필을 사용 중인 좀비 프로세스 핀포인트 강제 사살 (SingletonLock 점유 해제)
    if (process.platform === 'win32') {
      try {
        console.log(`[GoogleMessages-${this.deviceId}] Windows 좀비 Playwright 브라우저 프로세스 저격 소탕 가드 기동...`);
        const { execSync } = require('child_process');
        
        // 1순위: PowerShell을 활용한 프로필 파라미터 매칭 좀비 사살 (일반 크롬 보호)
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"CommandLine like '%playwright-profile-${this.deviceId}%'\\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`;
        execSync(psCommand, { stdio: 'ignore' });
        console.log(`[GoogleMessages-${this.deviceId}] 1순위 좀비 프로세스 저격 소탕 완료.`);
      } catch (procErr: any) {
        // 2순위: WMIC 기반 Fallback 프로세스 종료 기동
        try {
          const { execSync } = require('child_process');
          const wmicCommand = `wmic process where "CommandLine like '%playwright-profile-${this.deviceId}%'" call terminate`;
          execSync(wmicCommand, { stdio: 'ignore' });
          console.log(`[GoogleMessages-${this.deviceId}] 2순위 WMIC Fallback 프로세스 종료 성공.`);
        } catch (wmicErr) {
          console.log(`[GoogleMessages-${this.deviceId}] 좀비 프로세스 소탕 가드 건너뜀 (프로세스 미존재 혹은 권한 제한).`);
        }
      }
    }

    // Windows 환경에서 비정상 종료 시 남아있는 프로필 Lock 파일 제거 시도
    const lockFile = path.join(this.userDataDir, 'SingletonLock');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log(`[GoogleMessages-${this.deviceId}] 이전 세션의 SingletonLock 파일을 정리했습니다.`);
      } catch (e) {
        console.log(`[GoogleMessages-${this.deviceId}] SingletonLock 파일 제거 실패 (프로세스가 아직 점유 중일 수 있습니다)`);
      }
    }

    const launchOptions = { 
      headless: headless !== undefined ? headless : (this.currentHeadless ?? true),
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage', // 공유 메모리 부족 방지 (중요)
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-notifications',
        '--mute-audio',
        '--disable-features=site-per-process', // OOM 방지
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding'
      ] 
    };

    try {
      // 시스템에 설치된 실제 Chrome을 우선 사용 시도 (안정성 및 드라이버 호환성 매우 높음)
      this.context = await chromium.launchPersistentContext(this.userDataDir, { 
        ...launchOptions, 
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });
      console.log(`[GoogleMessages-${this.deviceId}] System Chrome 런칭 성공 (Persistent Context).`);
    } catch (chromeErr: any) {
      console.log(`[GoogleMessages-${this.deviceId}] System Chrome 런칭 실패, 기본 Chromium으로 폴백합니다.`, chromeErr.message);
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        ...launchOptions,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });
    }

    this.currentHeadless = headless;

    // 첫 번째 빈 페이지 활용 또는 새 페이지 생성
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    this.page.setDefaultTimeout(60000);

    // 메모리 절약을 위한 리소스 차단 (OOM 크래시 방지)
    await this.page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 페이지 충돌 리스너 추가
    this.page.on('crash', () => {
      console.error('[GoogleMessages] 페이지가 충돌했습니다 (Page crashed)');
      this.close();
    });

    // 기본 주소로 접속 (이미 로그인된 경우 대화 목록으로 바로 이동됨)
    await this.page!.goto('https://messages.google.com/web', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 웰컴 페이지가 뜨는 경우 '로그인' 버튼 클릭
    try {
      const loginButton = await this.page!.waitForSelector('a:has-text("로그인"), button:has-text("로그인")', { timeout: 5000 });
      if (loginButton) {
        console.log('[GoogleMessages] 웰컴 페이지 감지, 로그인 버튼 클릭 중...');
        await loginButton.click();
      }
    } catch (e) {
      // 웰컴 페이지가 아니면 무시하고 진행
    }

    // 웰컴 페이지나 로그인 유도 페이지인 경우만 처리
    try {
      if (this.page!.url().includes('welcome')) {
        const pairButton = await this.page!.$('button:has-text("기기 페어링"), a:has-text("기기 페어링"), [aria-label*="기기 페어링"]');
        if (pairButton) {
          await pairButton.click();
        } else {
          const loginButton = await this.page!.$('a:has-text("로그인"), button:has-text("로그인")');
          if (loginButton) await loginButton.click();
        }
        await this.page!.waitForLoadState('domcontentloaded');
      }

      // "여기에서 사용" 또는 "기기 페어링 해제" 관련 팝업 확인
      const useHereButton = await this.page!.$('button:has-text("여기에서 사용"), button:has-text("Use here")');
      if (useHereButton) {
        console.log('[GoogleMessages] "여기에서 사용" 버튼 클릭 중...');
        await useHereButton.click();
      }
    } catch (err) {
      // 무시
    }
  }

  /**
   * QR 코드 스캔을 위한 헤드풀 브라우저 실행
   */
  async setupConnection() {
    try {
      console.log('[GoogleMessages] 연동 프로세스 시작...');
      await this.init(false); // UI가 보이도록 실행
      
      if (!this.page) throw new Error('브라우저 페이지를 초기화하지 못했습니다.');
      
      console.log('[GoogleMessages] 연동 상태 대기 중 (120초)...');
      
      // 로그인이 완료될 때까지 대기 (채팅 시작 버튼 또는 대화 목록이 보이면 성공)
      // 이미 페어링된 경우 즉시 성공 처리됨
      try {
        await this.page.waitForSelector('input[placeholder*="시작"], button:has-text("시작"), [aria-label*="시작"], .conversation-list, [role="grid"]', { timeout: 120000 });
      } catch (waitErr) {
        throw new Error('연동 확인 시간이 초과되었습니다. 브라우저 창에서 QR 스캔을 완료했는지 확인해 주세요.');
      }
      
      // Persistent context에서는 IndexedDB와 로컬스토리지가 자동 저장되므로 별도의 storageState 저장이 필요하지 않습니다.
      console.log('[GoogleMessages] 연동 성공 및 세션 저장 완료!');
      return { success: true };
    } catch (err: any) {
      console.error('[GoogleMessages] setupConnection 오류:', err);
      // 브라우저가 열리지 않는 경우 등을 대비해 에러 메시지 세분화
      const errorMessage = err.message || '알 수 없는 오류가 발생했습니다.';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 연동(로그인) 상태 확인
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      if (!this.page || this.page.isClosed()) {
        await this.init(true);
      }
      // Check if logged in elements are visible with a short timeout
      await this.page!.waitForSelector(
        'input[placeholder*="시작"], button:has-text("시작"), [aria-label*="시작"], .conversation-list, [role="grid"]',
        { timeout: 3000, state: 'visible' }
      );
      return true;
    } catch (err) {
      return false; // Timeout means not logged in (e.g. on QR code screen)
    }
  }

  /**
   * 메시지 발송
   */
  async sendSMS(phoneNumber: string, message: string) {
    try {
      if (!this.page || this.page.isClosed()) await this.init(true);
      
      console.log(`[GoogleMessages] 메시지 발송 시작: ${phoneNumber}`);

      // 치명적 오류 확인 헬퍼
      const isFatal = (err: any) => err?.message?.includes('closed') || err?.message?.includes('crash') || err?.message?.includes('navigation');

      // 1. '채팅 시작' / '대화 시작' 버튼 탐색
      try {
        const startChatButton = this.page!.locator('[data-e2e-start-button], button:has-text("시작"), a:has-text("시작")').first();
        await startChatButton.waitFor({ state: 'visible', timeout: 3000 });
        await startChatButton.click({ timeout: 2000 });
      } catch (e: any) {
        console.log('[GoogleMessages] 시작 버튼 클릭 실패, 단축키 진입 시도');
        await this.page!.keyboard.press('Enter');
      }
      
      // 2. 전화번호 입력창 입력
      await this.page!.waitForTimeout(500);
      const searchInput = await this.page!.locator('[data-e2e-contact-input], input[placeholder*="이름"], input[placeholder*="번호"]').first();
      await searchInput.focus({ timeout: 2000 }).catch(() => {});
      await searchInput.fill(phoneNumber);
      await this.page!.waitForTimeout(500);
      
      // 2-1. 번호 입력 후 검색 결과 확정 (send-to-button 클릭 또는 Enter)
      try {
        const sendToBtn = this.page!.locator('[data-e2e-send-to-button], [data-e2e-contact-row]').first();
        await sendToBtn.waitFor({ state: 'visible', timeout: 2000 });
        await sendToBtn.click();
      } catch (e) {
        console.log('[GoogleMessages] 보내기 버튼 탐색 실패, Enter로 대체');
        await this.page!.keyboard.press('Enter');
        await this.page!.waitForTimeout(500);
        await this.page!.keyboard.press('Enter');
      }
      
      // 3. 메시지 입력창 대기 및 입력
      const msgInput = await this.page!.waitForSelector('textarea, div[role="textbox"][contenteditable="true"]', { timeout: 5000 });
      await msgInput.focus();
      
      // 빠른 fill() 시도 후 실패시 타이핑
      try {
        await msgInput.fill(message, { timeout: 2000 });
      } catch (e) {
        await this.page!.keyboard.type(message, { delay: 20 });
      }

      // 4. 전송 (Enter)
      await this.page!.waitForTimeout(500);
      await this.page!.keyboard.press('Enter');
      
      // 5. 전송 완료 확인을 위한 최소 대기 (3초 -> 1.5초)
      await this.page!.waitForTimeout(1500);
      
      console.log(`[GoogleMessages] 발송 명령 완료: ${phoneNumber}`);
      return { success: true };
    } catch (err: any) {
      console.error('[GoogleMessages] 발송 오류:', err.message || err);
      
      const isFatalError = err?.message && (
        err.message.includes('Target closed') || 
        err.message.includes('Session closed') || 
        err.message.includes('Execution context was destroyed')
      );
      
      if (isFatalError) {
        console.log('[GoogleMessages] 치명적 오류로 세션 초기화');
        await this.close();
      }
      return { success: false, error: err.message || err };
    }
  }

  /**
   * 연락처 스크래핑 (동기화)
   */
  async syncContacts() {
    try {
      if (!this.page || this.page.isClosed()) await this.init(true);
      
      console.log('[GoogleMessages] 연락처 동기화 스크래핑 시작...');

      // 1. 초기 상태로 돌아가기 (ESC 여러 번)
      await this.page!.keyboard.press('Escape');
      await this.page!.waitForTimeout(300);
      await this.page!.keyboard.press('Escape');
      await this.page!.waitForTimeout(500);

      // 2. '채팅 시작' 메뉴 진입 (Enter)
      await this.page!.keyboard.press('Enter');
      await this.page!.waitForTimeout(2000);

      // 3. 연락처 목록을 스크롤하며 데이터 수집
      const contacts = await this.page!.evaluate(async () => {
        const result = new Map<string, string>(); // phone -> name
        
        // 스크롤할 컨테이너 찾기
        let scrollContainer = document.querySelector('mws-contact-list, [role="listbox"], [role="grid"], .contact-picker-list, c-wiz');
        if (!scrollContainer) {
          const divs = Array.from(document.querySelectorAll('div'));
          scrollContainer = divs.find(d => d.scrollHeight > d.clientHeight && d.innerText.includes('010')) || document.body;
        }

        // 스크롤하며 데이터 추출
        for (let i = 0; i < 5; i++) {
          // 그냥 현재 화면의 모든 텍스트를 추출하여 휴리스틱하게 파싱
          const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
          let tempName = '';
          for (const line of lines) {
            const phoneRegex = /(?:010|\+82\s?10)[-.\s]?(\d{3,4})[-.\s]?(\d{4})/;
            const match = line.match(phoneRegex);
            if (match) {
              const phone = `010-${match[1]}-${match[2]}`;
              // 이전 줄이 짧은 텍스트이고 번호가 아니면 이름으로 추정
              const name = (tempName && tempName.length < 20 && !tempName.includes('010') && !tempName.includes('휴대전화')) ? tempName : phone;
              result.set(phone, name);
            }
            tempName = line;
          }



          // 스크롤 다운
          if (scrollContainer) {
            scrollContainer.scrollTop += 800;
          }
          // 대기
          await new Promise(r => setTimeout(r, 800));
        }

        return Array.from(result.entries()).map(([phone, name]) => ({ phone, name }));
      });

      console.log(`[GoogleMessages] 연락처 ${contacts.length}개 추출 완료.`);
      
      // 원래 화면으로 복귀
      await this.page!.keyboard.press('Escape');
      await this.page!.waitForTimeout(300);
      
      return { success: true, contacts };
    } catch (err: any) {
      console.error('[GoogleMessages] 연락처 스크래핑 오류:', err.message || err);
      return { success: false, error: err.message || err };
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.currentHeadless = null;
    }
  }
}

// Next.js 개발 환경에서 Hot Reload 시 인스턴스가 여러 개 생성되어
// 기존 브라우저 프로세스가 폴더 잠금을 유지하는 현상(EBUSY)을 방지하기 위한 글로벌 캐싱 맵 처리
const globalForGM = globalThis as unknown as { 
  automations: Map<string, GoogleMessagesAutomation> 
};

if (!globalForGM.automations) {
  globalForGM.automations = new Map<string, GoogleMessagesAutomation>();
}

export const getGmAutomation = (deviceId: string = 'default') => {
  const cleanId = deviceId.replace(/[^0-9a-zA-Z]/g, '') || 'default';
  if (!globalForGM.automations.has(cleanId)) {
    globalForGM.automations.set(cleanId, new GoogleMessagesAutomation(cleanId));
  }
  return globalForGM.automations.get(cleanId)!;
};

// 하위 호환성을 완벽히 유지하기 위한 기본(default) 기기 인스턴스 바인딩
export const gmAutomation = getGmAutomation('default');
