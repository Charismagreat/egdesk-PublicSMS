'use client';

import React, { useState } from 'react';
import { BarChart, LineChart, PieChart, TrendingUp, DollarSign, Activity, FileText } from 'lucide-react';

interface ChartSpec {
  type: 'line' | 'bar' | 'pie' | 'metric';
  xAxisColumn: string;
  yAxisColumn: string;
  title: string;
  unit: string;
  centerLabel?: string; // 💡 도넛 차트 중앙에 표시할 커스텀 핵심 요약 라벨 문구
}

// 💰 금액 및 비율 포맷터 헬퍼 함수
function formatChartValue(val: number, unit: string = ''): string {
  const cleanUnit = (unit || '').trim();
  
  // 1. 비율(%) 표시일 경우 (소수점 2자리까지 표시를 기본)
  if (cleanUnit === '%') {
    return `${val.toFixed(2)}%`;
  }
  
  // 2. 원화일 경우 (단위가 '원'인 경우)
  if (cleanUnit === '원') {
    // 통화표시(원) 하지 않고 소수점 없이 천단위 콤마만 표시
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(val);
  }
  
  // 3. 외화일 경우 (단위가 있고 '원'이나 '%'가 아닌 경우)
  if (cleanUnit !== '') {
    const formattedNum = new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(val);
    
    // 통화 기호가 $, €, ¥, £ 등인 경우 앞에 붙이고 나머지는 뒤에 붙임
    const isSymbol = ['$', '€', '¥', '£', '₩'].includes(cleanUnit);
    if (isSymbol) {
      return `${cleanUnit}${formattedNum}`;
    } else {
      return `${formattedNum} ${cleanUnit}`;
    }
  }
  
  // 4. 단위가 없는 경우: 기본 천단위 콤마 포맷팅
  return new Intl.NumberFormat('ko-KR').format(val);
}

interface DBChartRendererProps {
  spec: ChartSpec;
  rows: any[];
  onSelectPart?: (partName: string) => void;
}

export default function DBChartRenderer({ spec, rows, onSelectPart }: DBChartRendererProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
        <Activity className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-bold text-slate-500">시각화할 데이터 행이 존재하지 않습니다.</p>
      </div>
    );
  }

  // 1. 데이터 클렌징 및 추출 (AI 스펙에 근거하여 매핑)
  const xKey = spec.xAxisColumn;
  const yKey = spec.yAxisColumn;

  // X축 및 Y축 데이터 맵핑
  const chartData = rows.map((r, i) => {
    let xVal = String(r[xKey] !== undefined && r[xKey] !== null ? r[xKey] : `데이터 ${i + 1}`);
    // 시각적 단순화를 위해 글자가 너무 길면 자름
    if (xVal.length > 12) xVal = xVal.substring(0, 10) + '..';

    let yVal = parseFloat(r[yKey]);
    if (isNaN(yVal)) yVal = 0;

    return { label: xVal, value: yVal };
  });

  // 데이터 수가 많을 경우 가독성을 위해 최대 15개로 제한 슬라이싱
  const maxItems = 15;
  const slicedData = chartData.slice(0, maxItems);

  const values = slicedData.map(d => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  // 2. 메트릭 타입 렌더링 (단일 합계값 등)
  if (spec.type === 'metric' || slicedData.length === 1) {
    const singleVal = slicedData[0]?.value || 0;
    const singleLabel = slicedData[0]?.label || spec.title;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-2xl text-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          {spec.title}
        </span>
        <div className="text-3xl font-black text-slate-800 tracking-tight">
          {formatChartValue(singleVal, spec.unit)}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 font-medium">대상 항목: {singleLabel}</p>
      </div>
    );
  }

  // 3. 도넛(원형) 차트 렌더링
  if (spec.type === 'pie') {
    const sum = values.reduce((a, b) => a + b, 0);
    let cumulativePercent = 0;

    // 그라데이션 컬러 팔레트 (아름답고 우아한 파스텔 라이트 테마 계열)
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
      '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7', '#6366f1'
    ];

    // 각 조각의 각도 및 좌표 계산
    const pieSlices = slicedData.map((d, i) => {
      const percentage = sum > 0 ? d.value / sum : 0;
      const startAngle = cumulativePercent * 360;
      const endAngle = (cumulativePercent + percentage) * 360;
      cumulativePercent += percentage;

      // 삼각함수로 각 좌표 구함
      const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
      };

      const [startX, startY] = getCoordinatesForPercent(startAngle / 360);
      const [endX, endY] = getCoordinatesForPercent(endAngle / 360);

      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      // SVG path용 데이터 D 조각 구성
      const pathData = [
        `M 0 0`,
        `L ${startX} ${startY}`,
        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `Z`
      ].join(' ');

      return {
        pathData,
        label: d.label,
        value: d.value,
        percent: (percentage * 100).toFixed(2), // 비율(%) 소수점 2자리 기본으로 설정
        color: colors[i % colors.length]
      };
    });

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-0 bg-transparent">
        {/* 원형 SVG 영역 */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <svg 
            viewBox="-1.2 -1.2 2.4 2.4" 
            width="192" 
            height="192" 
            className="w-full h-full"
          >
            {/* 도넛 차트 조각들 및 내부 배경 원을 그룹으로 감싸 SVG 내에서 물리적으로 회전 시킵니다 */}
            <g transform="rotate(-90)">
              {pieSlices.map((slice, i) => (
                <path
                  key={i}
                  d={slice.pathData}
                  fill={slice.color}
                  opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.4}
                  className="transition-all duration-300 hover:scale-105 cursor-pointer origin-center"
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
              {/* 내부를 하얗게 파서 도넛 차트로 형상화 */}
              <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
            </g>

            {/* 중앙 중심부 텍스트: 회전되지 않고 항상 똑바로 유지되어야 하므로 회전 그룹 바깥에 배치합니다 */}
            {/* XMLSerializer로 캡처할 때 외부 CSS가 무시되므로, 폰트 크기 및 정렬 기준을 명시적 인라인 스타일로 세팅합니다 */}
            <g className="pointer-events-none select-none">
              {hoveredIndex !== null ? (
                <>
                  <text
                    x="0"
                    y="-0.12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#94a3b8"
                    style={{
                      fontSize: '0.14px',
                      fontWeight: 900,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {pieSlices[hoveredIndex].label.length > 7 
                      ? pieSlices[hoveredIndex].label.substring(0, 6) + '..'
                      : pieSlices[hoveredIndex].label}
                  </text>
                  <text
                    x="0"
                    y="0.16"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#1e293b"
                    style={{
                      fontSize: '0.24px',
                      fontWeight: 900,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {pieSlices[hoveredIndex].percent}%
                  </text>
                </>
              ) : (
                <>
                  <text
                    x="0"
                    y="-0.12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#94a3b8"
                    style={{
                      fontSize: '0.13px',
                      fontWeight: 900,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {spec.centerLabel || '전체 누적'}
                  </text>
                  <text
                    x="0"
                    y="0.16"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#334155"
                    style={{
                      fontSize: '0.22px',
                      fontWeight: 900,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {sum >= 99.5 && sum <= 100.5 && spec.unit === '%' ? '100%' : formatChartValue(sum, spec.unit)}
                  </text>
                </>
              )}
            </g>
          </svg>
        </div>

        {/* 범례 리스트 (세로 스크롤 방지를 위해 높이 제한을 max-h-72로 넉넉하게 확장) */}
        <div className="flex-1 space-y-2 max-h-72 overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-indigo-500" />
            {spec.title}
          </h3>
          {pieSlices.map((slice, i) => (
            <div
              key={i}
              onClick={() => onSelectPart && onSelectPart(slice.label)}
              className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-all cursor-pointer ${
                hoveredIndex === i ? 'bg-indigo-50/70 text-indigo-755 font-bold' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              title={`${slice.label} 항목을 클릭하여 지능형 수정 타겟으로 지정`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-slate-600 truncate">{slice.label}</span>
              </div>
              <span className="text-slate-400 text-[10px] shrink-0 font-medium ml-2">
                {formatChartValue(slice.value, spec.unit)} ({slice.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. 막대그래프(Bar) 및 꺾은선그래프(Line) 렌더링
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const count = slicedData.length;
  const barGap = 15;
  const itemWidth = count > 0 ? (chartWidth - barGap * (count - 1)) / count : 0;

  return (
    <div className="p-0 bg-transparent space-y-3 relative">
      <h3 className="text-xs font-black text-slate-500 flex items-center gap-1.5">
        {spec.type === 'line' ? (
          <TrendingUp className="w-4 h-4 text-blue-500" />
        ) : (
          <BarChart className="w-4 h-4 text-indigo-500" />
        )}
        {spec.title}
      </h3>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight} className="min-w-[500px]">
          {/* 가로 가이드 점선 그리기 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const gridVal = minValue + (maxValue - minValue) * ratio;
            const displayVal = formatChartValue(gridVal, spec.unit);

            return (
              <g key={i} className="opacity-45">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[9px] font-bold"
                >
                  {displayVal}
                </text>
              </g>
            );
          })}

          {/* 막대 차트 (Bar) 그리기 */}
          {spec.type === 'bar' && slicedData.map((d, i) => {
            const x = paddingLeft + i * (itemWidth + barGap);
            const ratio = maxValue > minValue ? (d.value - minValue) / (maxValue - minValue) : 0;
            const barHeight = chartHeight * ratio;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={i}>
                {/* 호버 인식용 투명 감지 영역 */}
                <rect
                  x={x - barGap / 2}
                  y={paddingTop}
                  width={itemWidth + barGap}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                    setTooltipPos({ x: x + itemWidth / 2, y: y - 8 });
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* 실제 막대 그라데이션 기둥 */}
                <rect
                  x={x}
                  y={y}
                  width={itemWidth}
                  height={Math.max(barHeight, 2)}
                  rx="4"
                  fill="url(#barGrad)"
                  opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.55}
                  className="transition-all duration-300"
                />
                {/* 상단 값 표시 텍스트 */}
                {hoveredIndex === i && (
                  <text
                    x={x + itemWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#3b82f6"
                    className="text-[10px] font-black"
                  >
                    {formatChartValue(d.value, spec.unit)}
                  </text>
                )}
              </g>
            );
          })}

          {/* 꺾은선 차트 (Line) 그리기 */}
          {spec.type === 'line' && (() => {
            const points = slicedData.map((d, i) => {
              const x = paddingLeft + i * (itemWidth + barGap) + itemWidth / 2;
              const ratio = maxValue > minValue ? (d.value - minValue) / (maxValue - minValue) : 0;
              const y = paddingTop + chartHeight - chartHeight * ratio;
              return { x, y, val: d.value, label: d.label };
            });

            // 꺾은선 패스 D 데이터 생성
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

            return (
              <g>
                {/* 꺾은선 라인 */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 라인 하단 채워지는 그라데이션 영역 */}
                <path
                  d={`${pathData} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`}
                  fill="url(#lineAreaGrad)"
                  opacity="0.12"
                />
                {/* 각 꺾임 지점 점 노드 */}
                {points.map((p, i) => (
                  <g key={i}>
                    {/* 감지 영역 */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        setHoveredIndex(i);
                        setTooltipPos({ x: p.x, y: p.y - 8 });
                      }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    {/* 꺾임점 원 */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredIndex === i ? '6' : '4'}
                      fill={hoveredIndex === i ? '#4f46e5' : '#ffffff'}
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      className="transition-all duration-200"
                    />
                    {hoveredIndex === i && (
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        fill="#4f46e5"
                        className="text-[10px] font-black"
                      >
                        {formatChartValue(p.val, spec.unit)}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })()}

          {/* X축 레이블 문자들 */}
          {slicedData.map((d, i) => {
            const x = paddingLeft + i * (itemWidth + barGap) + itemWidth / 2;
            return (
              <text
                key={i}
                x={x}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fill={hoveredIndex === i ? '#4f46e5' : '#94a3b8'}
                className={`text-[9px] font-bold transition-colors cursor-pointer hover:fill-indigo-600 ${
                  hoveredIndex === i ? 'font-black' : ''
                }`}
                onClick={() => onSelectPart && onSelectPart(d.label)}
              >
                <title>{`${d.label} 항목을 클릭하여 지능형 수정 타겟으로 지정`}</title>
                {d.label}
              </text>
            );
          })}

          {/* 정의(그라데이션 등) 태그 패키지 */}
          <defs>
            {/* 막대용 그라데이션 */}
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            {/* 라인 하단 영역 채우기용 그라데이션 */}
            <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 데이터 개수 안내 */}
      {chartData.length > maxItems && (
        <p className="text-[10px] text-slate-400 text-right font-medium italic">
          * 시각화 편의를 위해 상위 {maxItems}개 항목만 표출 중입니다. (전체 레코드: {chartData.length}건)
        </p>
      )}
    </div>
  );
}
