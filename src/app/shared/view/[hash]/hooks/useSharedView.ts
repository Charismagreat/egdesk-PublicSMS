"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from "react";
import { SharedViewData } from "../types";

export function useSharedView(params: Promise<{ hash: string }>) {
  // Next.js 15의 비동기 params 획득 대응
  const resolvedParams = React.use(params);
  const hash = resolvedParams.hash;

  // 상태 변수 정의
  const [data, setData] = useState<SharedViewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 클라이언트 단의 실시간 전체 텍스트 검색 필터
  const [filterQuery, setFilterQuery] = useState<string>("");
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // 데이터 패치
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/shared-views?hash=${hash}`);
      const result = await res.json();
      
      if (result.success) {
        setData({
          friendlyTableName: result.friendlyTableName,
          allowCsvDownload: result.allowCsvDownload,
          columnMappings: result.columnMappings,
          rows: result.rows,
          total: result.total
        });
        
        // 정렬 정보의 기본 초기값은 스키마 맵핑의 첫 번째 물리적 컬럼
        if (result.columnMappings && result.columnMappings.length > 0) {
          setSortColumn(result.columnMappings[0].physical);
        }
      } else {
        setError(result.error || "데이터를 불러오는 데 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      setError("서버와의 연결이 매끄럽지 않거나, 유효하지 않은 공유 해시입니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hash) {
      fetchData();
    }
  }, [hash]);

  // 👥 클라이언트 사이드 부드러운 메모리 정렬 (Sorting)
  const sortedRows = useMemo(() => {
    if (!data || !data.rows) return [];
    if (!sortColumn) return data.rows;
    
    const sorted = [...data.rows];
    sorted.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // 숫자 타입과 일반 텍스트 타입 비교 분기
      const isNumA = typeof aVal === "number";
      const isNumB = typeof bVal === "number";
      
      if (isNumA && isNumB) {
        return sortDirection === "ASC" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
      
      const compare = String(aVal).localeCompare(String(bVal), "ko");
      return sortDirection === "ASC" ? compare : -compare;
    });
    return sorted;
  }, [data, sortColumn, sortDirection]);

  // 👥 실시간 로컬 전체 검색 필터링 (부드러운 스캔 효과)
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return sortedRows;
    const query = filterQuery.toLowerCase();
    
    return sortedRows.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(query)
      );
    });
  }, [sortedRows, filterQuery]);

  // 🔄 정렬 방향/컬럼 변경 핸들러
  const handleSort = (physicalCol: string) => {
    if (sortColumn === physicalCol) {
      setSortDirection(prev => prev === "ASC" ? "DESC" : "ASC");
    } else {
      setSortColumn(physicalCol);
      setSortDirection("DESC");
    }
  };

  // 💾 엑셀 한글 로컬 안전 다운로드 유틸 (Excel .xlsx 포맷 전환)
  const handleDownloadExcel = async () => {
    if (!data) return;
    try {
      const XLSX = await import("xlsx");
      const headers = data.columnMappings.map(col => col.friendly);
      const physicals = data.columnMappings.map(col => col.physical);
      
      const aoaData = [headers];

      filteredRows.forEach(row => {
        const rowData = physicals.map(colName => {
          const val = row[colName];
          if (val === null || val === undefined) return "";
          
          const valStr = String(val);
          const colNameLower = colName.toLowerCase();
          
          // 계좌번호, 카드번호, 승인번호, 전화번호 등 식별성 성격의 컬럼 또는 9자리 이상의 숫자로만 구성된 긴 문자열의 경우 지수 표현식 방지를 위해 접두사 `'` 추가
          const isIdentifierKey = colNameLower.includes("number") || 
                                  colNameLower.includes("card") || 
                                  colNameLower.includes("account") || 
                                  colNameLower.includes("phone") || 
                                  colNameLower.includes("tel") || 
                                  colNameLower.includes("appr") || 
                                  colNameLower.includes("serial") ||
                                  colNameLower.includes("id");

          if ((isIdentifierKey && /^\d+$/.test(valStr) && valStr.length > 5) || (/^\d+$/.test(valStr) && valStr.length >= 9)) {
            return `'${valStr}`;
          }
          return val;
        });
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, data.friendlyTableName ? data.friendlyTableName.substring(0, 31) : "ShareTable");
      XLSX.writeFile(workbook, `${data.friendlyTableName || "table"}_공유_장부_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
    }
  };

  return {
    hash,
    data,
    isLoading,
    error,
    filterQuery,
    setFilterQuery,
    sortColumn,
    sortDirection,
    filteredRows,
    fetchData,
    handleSort,
    handleDownloadExcel
  };
}
