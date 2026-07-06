export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * POST: 업로드된 이미지 분석 시뮬레이션
 * - 파티션 높이, 독립성 판별, 현판 존재 여부
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entrance_image, layout_image } = body;

    if (!entrance_image && !layout_image) {
      return NextResponse.json({ success: false, error: '분석할 공간 이미지(entrance_image 또는 layout_image)가 필요합니다.' }, { status: 400 });
    }

    console.log('[R&D Space Vision AI] 이미지 분석 시뮬레이션 가동...');

    // 분석 시간 체감을 위해 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 무작위 보완필요 요소를 포함하여 실감나는 결과 생성
    // 데모 편의상, 특정 이미지를 업로드할 때 가변적인 결과가 나오도록 시뮬레이션
    const isEntranceValid = entrance_image ? (Math.random() > 0.15) : true;
    const isPartitionValid = layout_image ? (Math.random() > 0.4) : true; // 파티션 실패 비율을 좀 더 높여 보완 조치를 체험하게 함

    const estimatedHeight = isPartitionValid
      ? (1.22 + Math.random() * 0.15).toFixed(2) // 1.22m ~ 1.37m (적격)
      : (0.95 + Math.random() * 0.15).toFixed(2); // 0.95m ~ 1.10m (부적격)

    const signageStatus = isEntranceValid ? 'PASS' : 'FAIL';
    const partitionStatus = isPartitionValid ? 'PASS' : 'FAIL';
    
    let overallStatus: '합격' | '보완필요' | '부적격' = '합격';
    let summaryNotes = '모든 공간 요건이 기업부설연구소 설립 및 유지 기준(KOITA)에 적합합니다.';

    if (signageStatus === 'FAIL' || partitionStatus === 'FAIL') {
      overallStatus = (signageStatus === 'FAIL' && partitionStatus === 'FAIL') ? '부적격' : '보완필요';
      
      const reasons = [];
      if (signageStatus === 'FAIL') reasons.push('출입구 현판 미부착/문구 미확인');
      if (partitionStatus === 'FAIL') reasons.push(`파티션 높이 미달 (측정치: ${estimatedHeight}m, 기준: 1.2m 이상)`);
      
      summaryNotes = `일부 물적 기준이 미달되었습니다. [보완 사항: ${reasons.join(', ')}]. 조치 후 재점검 바랍니다.`;
    }

    // 바운딩 박스 영역 정보 제공 (프론트엔드 오버레이용)
    const detections = [];
    if (entrance_image) {
      detections.push({
        label: "R&D Center Signboard (현판)",
        confidence: 0.96,
        box: [120, 240, 280, 310], // ymin, xmin, ymax, xmax
        status: signageStatus
      });
    }
    if (layout_image) {
      detections.push({
        label: "Office Partition (경계 칸막이)",
        confidence: 0.89,
        box: [280, 50, 480, 720],
        estimated_height_m: Number(estimatedHeight),
        status: partitionStatus
      });
      detections.push({
        label: "R&D Dedicated Workspace (연구 전용 좌석)",
        confidence: 0.94,
        box: [350, 100, 550, 680],
        status: "PASS"
      });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        check_date: new Date().toISOString().slice(0, 10),
        signage_status: signageStatus,
        partition_status: partitionStatus,
        overall_status: overallStatus,
        estimated_partition_height_m: Number(estimatedHeight),
        inspector_notes: summaryNotes,
        detections
      }
    });

  } catch (error: any) {
    console.error('Vision AI 분석 중 오류 발생:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
