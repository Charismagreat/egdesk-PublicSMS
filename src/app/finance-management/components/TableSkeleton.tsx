"use client";

import React from "react";

interface TableSkeletonProps {
  cols: number;
  rows: number;
}

export default function TableSkeleton({ cols, rows }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-50">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="p-4">
              <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
