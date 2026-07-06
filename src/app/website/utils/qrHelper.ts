/**
 * Canvas 엘리먼트에 이지데스크 스타일의 QR 코드를 그리고, 그 결과 이미지의 Data URL을 반환합니다.
 * @param canvas 렌더링을 진행할 HTMLCanvasElement
 * @param primaryColor 현재 설정된 시그니처 기본 색상 테마 키
 */
export function generateQRCodeCanvas(
  canvas: HTMLCanvasElement,
  primaryColor: string
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 150x150 크기로 QR 코드 그리기
  ctx.clearRect(0, 0, 150, 150);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 150, 150);

  // 현재 테마 색상에 맞춘 채우기 색상 지정
  ctx.fillStyle =
    primaryColor === "slate" ? "#1e293b" :
    primaryColor === "indigo" ? "#4f46e5" :
    primaryColor === "emerald" ? "#059669" :
    primaryColor === "rose" ? "#e11d48" :
    primaryColor === "amber" ? "#d97706" :
    primaryColor === "violet" ? "#7c3aed" : "#0891b2";

  // 좌상단 포지션 모듈
  ctx.fillRect(10, 10, 35, 35);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 15, 25, 25);
  ctx.fillStyle =
    primaryColor === "slate" ? "#1e293b" :
    primaryColor === "indigo" ? "#4f46e5" :
    primaryColor === "emerald" ? "#059669" :
    primaryColor === "rose" ? "#e11d48" :
    primaryColor === "amber" ? "#d97706" :
    primaryColor === "violet" ? "#7c3aed" : "#0891b2";
  ctx.fillRect(20, 20, 15, 15);

  // 우상단 포지션 모듈
  ctx.fillRect(105, 10, 35, 35);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(110, 15, 25, 25);
  ctx.fillStyle =
    primaryColor === "slate" ? "#1e293b" :
    primaryColor === "indigo" ? "#4f46e5" :
    primaryColor === "emerald" ? "#059669" :
    primaryColor === "rose" ? "#e11d48" :
    primaryColor === "amber" ? "#d97706" :
    primaryColor === "violet" ? "#7c3aed" : "#0891b2";
  ctx.fillRect(115, 20, 15, 15);

  // 좌하단 포지션 모듈
  ctx.fillRect(10, 105, 35, 35);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 110, 25, 25);
  ctx.fillStyle =
    primaryColor === "slate" ? "#1e293b" :
    primaryColor === "indigo" ? "#4f46e5" :
    primaryColor === "emerald" ? "#059669" :
    primaryColor === "rose" ? "#e11d48" :
    primaryColor === "amber" ? "#d97706" :
    primaryColor === "violet" ? "#7c3aed" : "#0891b2";
  ctx.fillRect(20, 115, 15, 15);

  // 중앙 및 무작위 패턴 채우기
  ctx.fillStyle = "#1e293b";
  const dotPattern = [
    [5, 5], [7, 6], [8, 9], [6, 12], [12, 5], [13, 8], [9, 13], [14, 14],
    [6, 7], [10, 6], [11, 10], [5, 13], [13, 6], [7, 14], [14, 11], [9, 9]
  ];
  dotPattern.forEach(([x, y]) => {
    ctx.fillRect(x * 8 + 15, y * 8 + 15, 6, 6);
  });

  // EG 중앙 로고 미니 플레이트 장식
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(60, 60, 30, 30);
  
  ctx.fillStyle =
    primaryColor === "slate" ? "#1e293b" :
    primaryColor === "indigo" ? "#4f46e5" :
    primaryColor === "emerald" ? "#059669" :
    primaryColor === "rose" ? "#e11d48" :
    primaryColor === "amber" ? "#d97706" :
    primaryColor === "violet" ? "#7c3aed" : "#0891b2";
  ctx.fillRect(64, 64, 22, 22);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("EG", 68, 80);

  return canvas.toDataURL("image/png");
}
