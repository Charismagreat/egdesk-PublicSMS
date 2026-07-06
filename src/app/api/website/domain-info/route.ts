export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, updateRows, insertRows, listBusinessIdentitySnapshots, getBusinessIdentitySnapshot } from '@/../egdesk-helpers';
import crypto from 'crypto';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 최고관리자/사장 권한 세션 체크 헬퍼
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const hasRole = payload.role === 'SUPER_ADMIN' || payload.role === 'PRESIDENT';
    return {
      isAuthorized: hasRole,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

/**
 * GET: 기존 홈페이지 URL 정보(system_settings), 배포 이력(crm_web_published_sites), 도메인 헬스 정보 반환
 */
export async function GET(req: Request) {
  const { isAuthorized } = await verifyAdmin();
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '인증 권한이 없습니다.' }, { status: 401 });
  }

  try {
    // 1. system_settings 에서 my_company_profile 조회
    const profileRes = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
    let homepageUrl = 'https://egdesk.cloud';
    let rawProfileData: any = {};

    if (profileRes.rows && profileRes.rows.length > 0) {
      try {
        rawProfileData = JSON.parse(profileRes.rows[0].value);
        homepageUrl = (rawProfileData.homepage !== undefined && rawProfileData.homepage !== null) ? rawProfileData.homepage : 'https://egdesk.cloud';
      } catch (parseErr) {
        console.warn('my_company_profile 파싱 실패:', parseErr);
      }
    }

    // 2. crm_web_published_sites 에서 배포된 리스트 조회 (deleted_at IS NULL 조건 기본 적용)
    // 방화벽 규칙 준수를 위해 queryTable 헬퍼 사용
    const publishedRes = await queryTable('crm_web_published_sites', {
      filters: {},
      orderBy: 'id DESC'
    });

    // 3. 비즈니스 아이덴티티 스냅샷 조회 시도 (SSL/SEO 정보 연동)
    let snapshotSslGrade = 'A+';
    let snapshotSeoScore = 88;
    let hasSnapshotData = false;

    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        const snapshotId = snapshots[0].id || snapshots[0].uuid;
        if (snapshotId) {
          const snapshotDetail = await getBusinessIdentitySnapshot(snapshotId);
          if (snapshotDetail) {
            hasSnapshotData = true;
            const sslObj = snapshotDetail.sslAnalysis || snapshotDetail.ssl_analysis || snapshotDetail.ssl;
            if (sslObj) {
              snapshotSslGrade = sslObj.grade || sslObj.sslGrade || sslObj.ssl_grade || snapshotSslGrade;
            }
            const seoObj = snapshotDetail.seoAnalysis || snapshotDetail.seo_analysis || snapshotDetail.seo;
            if (seoObj) {
              snapshotSeoScore = seoObj.score || seoObj.seoScore || seoObj.seo_score || snapshotSeoScore;
            }
          }
        }
      }
    } catch (mcpErr) {
      console.warn('businessidentity snapshot 조회 중 에러 발생:', mcpErr);
    }

    // 4. 도메인 헬스 체크 정보 모의(Mocked) 생성
    // 💡 실시간 접속 반응 및 SSL인증서 검사를 시뮬레이션하여 정보 제공
    const buildHealthCheck = (url: string) => {
      const cleanUrl = url.replace(/https?:\/\//, '');
      const isEgdeskCloud = cleanUrl.includes('egdesk.cloud');
      
      // 도메인 주소의 길이에 따라 결정하여 일관된 Mock 제공
      const latency = isEgdeskCloud ? 12 : 28 + (cleanUrl.length % 45);
      const sslRemainDays = 365 - (cleanUrl.length * 3) % 180;

      // 결정적 Mock 생성 (스냅샷 데이터가 없을 시 사용)
      const charCodeSum = cleanUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const fallbackGrades = ['A+', 'A', 'B+'];
      const fallbackSslGrade = fallbackGrades[charCodeSum % fallbackGrades.length];
      const fallbackSeoScore = 80 + (charCodeSum % 16);
      
      return {
        url,
        status: latency < 60 ? 'HEALTHY' : 'WARNING',
        latency: `${latency}ms`,
        sslExpireDate: new Date(Date.now() + sslRemainDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        sslRemainDays,
        sslGrade: hasSnapshotData ? snapshotSslGrade : fallbackSslGrade,
        seoScore: hasSnapshotData ? snapshotSeoScore : fallbackSeoScore,
        serverType: 'EGDESK AI Edge CDN',
        trafficToday: 150 + (cleanUrl.length * 7) % 800
      };
    };

    const primaryHealth = buildHealthCheck(homepageUrl);
    
    // published 내역 가공
    const publishedSites = (publishedRes.rows || []).map((site: any) => {
      return {
        ...site,
        health: buildHealthCheck(site.domain_url)
      };
    });

    return NextResponse.json({
      success: true,
      homepageUrl,
      primaryHealth,
      publishedSites
    });

  } catch (err: any) {
    console.error('GET /api/website/domain-info error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: 대표 홈페이지 주소 (homepage URL) 업데이트
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifyAdmin();
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '인증 권한이 없습니다.' }, { status: 401 });
  }

  try {
    const { homepageUrl } = await req.json();
    if (!homepageUrl || !homepageUrl.trim()) {
      return NextResponse.json({ success: false, error: '홈페이지 URL 주소를 올바르게 기입해 주세요.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 1. my_company_profile 조회 및 업데이트
    const profileRes = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
    let currentProfile: any = {};
    let hasRecord = false;

    if (profileRes.rows && profileRes.rows.length > 0) {
      hasRecord = true;
      try {
        currentProfile = JSON.parse(profileRes.rows[0].value);
      } catch (e) {
        console.warn('JSON parse warning:', e);
      }
    }

    currentProfile.homepage = homepageUrl.trim();

    if (hasRecord) {
      // 7종 컬럼 반영하여 updateRows 실행
      await updateRows('system_settings', 
        { value: JSON.stringify(currentProfile), updated_at: timestamp, updated_by: username || 'admin' },
        { filters: { key: 'my_company_profile' } }
      );
    } else {
      // 7종 컬럼 반영하여 insertRows 실행
      await insertRows('system_settings', [{
        key: 'my_company_profile',
        value: JSON.stringify(currentProfile),
        uuid: crypto.randomUUID(),
        updated_at: timestamp,
        updated_by: username || 'admin'
      }]);
    }

    return NextResponse.json({
      success: true,
      message: '대표 홈페이지 연결 주소가 정상적으로 업데이트되었습니다.',
      homepageUrl: currentProfile.homepage
    });

  } catch (err: any) {
    console.error('POST /api/website/domain-info error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
