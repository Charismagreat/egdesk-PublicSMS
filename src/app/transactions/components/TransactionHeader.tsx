import React from "react";
import { ShoppingCart } from "lucide-react";

export function TransactionHeader() {
  return (
    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
      <ShoppingCart className="w-8 h-8 mr-3 text-orange-500" />
      거래 관리 AI
    </h1>
  );
}
