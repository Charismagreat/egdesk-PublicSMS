import { NextResponse } from "next/server";
import { queryTable } from "../../../../../egdesk-helpers";

/**
 * GET: 기본 자금 흐름 예측 시계열 데이터 및 제품 원가 정보 제공 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 제품 기초 데이터 조회
    const productsRes = await queryTable("crm_finance_products", {});
    const dbProducts = productsRes.rows || [];

    // 2. DB에서 수금/지출 대장 조회
    const forecastRes = await queryTable("crm_finance_forecasts", {});
    const forecastList = (forecastRes.rows || []).map((item: any) => ({
      id: item.id,
      date: item.date,
      type: item.type,
      title: item.title,
      partnerName: item.partnerName,
      amount: Number(item.amount || 0),
      isOverdue: item.isOverdue === 1,
      contact: item.contact || ""
    }));

    // 3. 기초 현금 잔액
    let baseBalance = 62500000;
    const today = new Date("2026-06-07");
    const cashflowForecast = [];

    // 향후 90일간의 흐름 시뮬레이션 생성
    for (let i = 0; i <= 90; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      let expectedIn = 0;
      let expectedOut = 0;

      // 예상 트랜잭션 매핑
      forecastList.forEach((item) => {
        if (item.date === dateStr) {
          if (item.type === "IN") {
            expectedIn += item.amount;
          } else {
            expectedOut += item.amount;
          }
        }
      });

      // 현금 흐름 가감
      baseBalance = baseBalance + expectedIn - expectedOut;

      // 시나리오 오차 범위 시뮬레이션 (낙관/비관)
      const pessimisticOffset = i * -150000; 
      const optimisticOffset = i * 120000;

      cashflowForecast.push({
        date: dateStr,
        expectedIn,
        expectedOut,
        balanceNormal: baseBalance,
        balanceOptimistic: Math.max(0, baseBalance + optimisticOffset),
        balancePessimistic: Math.max(0, baseBalance + pessimisticOffset),
      });
    }

    // 마진 계산
    const productMargins = dbProducts.map((prod: any) => {
      const rawMaterialCost = Number(prod.rawMaterialCost || 0);
      const laborCost = Number(prod.laborCost || 0);
      const expenseCost = Number(prod.expenseCost || 0);
      const sellingPrice = Number(prod.sellingPrice || 0);

      const costTotal = rawMaterialCost + laborCost + expenseCost;
      const profit = sellingPrice - costTotal;
      const marginRate = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

      return {
        productId: prod.productId,
        productName: prod.productName,
        rawMaterialCost,
        laborCost,
        expenseCost,
        sellingPrice,
        costTotal,
        profit,
        marginRate,
      };
    });

    return NextResponse.json({
      success: true,
      currentBalance: 62500000,
      cashflowForecast,
      productMargins,
      forecastList,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 사용자가 입력한 시뮬레이션 조건에 따라 원가와 자금 흐름 재연산
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exchangeRate, materialRate, laborRate } = body;

    // 1. DB에서 제품 기초 데이터 및 수금/지출 대장 조회
    const productsRes = await queryTable("crm_finance_products", {});
    const dbProducts = productsRes.rows || [];

    const forecastRes = await queryTable("crm_finance_forecasts", {});
    const forecastList = (forecastRes.rows || []).map((item: any) => ({
      id: item.id,
      date: item.date,
      type: item.type,
      title: item.title,
      partnerName: item.partnerName,
      amount: Number(item.amount || 0),
      isOverdue: item.isOverdue === 1,
      contact: item.contact || ""
    }));

    // 2. 기준치 정의 및 비율 계산
    const baseExchangeRate = 1300; // 기준 환율
    const exchangeFactor = exchangeRate ? exchangeRate / baseExchangeRate : 1.0;
    const matFactor = materialRate ? 1 + materialRate / 100 : 1.0;
    const laborFactor = laborRate ? 1 + laborRate / 100 : 1.0;

    // 3. 제품별 원가 구조 재연산
    const updatedMargins = dbProducts.map((prod: any) => {
      const baseRawMaterial = Number(prod.rawMaterialCost || 0);
      const baseLabor = Number(prod.laborCost || 0);
      const expenseCost = Number(prod.expenseCost || 0);
      const sellingPrice = Number(prod.sellingPrice || 0);

      const newRawMaterial = Math.round(baseRawMaterial * exchangeFactor * matFactor);
      const newLabor = Math.round(baseLabor * laborFactor);
      const costTotal = newRawMaterial + newLabor + expenseCost;
      const profit = sellingPrice - costTotal;
      const marginRate = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

      return {
        productId: prod.productId,
        productName: prod.productName,
        rawMaterialCost: newRawMaterial,
        laborCost: newLabor,
        expenseCost,
        sellingPrice,
        costTotal,
        profit,
        marginRate,
      };
    });

    // 4. 자금 흐름 변동 재시뮬레이션
    let baseBalance = 62500000;
    const today = new Date("2026-06-07");
    const cashflowForecast = [];

    for (let i = 0; i <= 90; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      let expectedIn = 0;
      let expectedOut = 0;

      forecastList.forEach((item) => {
        if (item.date === dateStr) {
          if (item.type === "IN") {
            expectedIn += item.amount;
          } else {
            // 원자재 발주 대금
            if (item.title.includes("원자재") || item.title.includes("발주")) {
              expectedOut += Math.round(item.amount * matFactor * exchangeFactor);
            } 
            // 임직원 급여
            else if (item.title.includes("급여") || item.title.includes("인건비")) {
              expectedOut += Math.round(item.amount * laborFactor);
            } else {
              expectedOut += item.amount;
            }
          }
        }
      });

      baseBalance = baseBalance + expectedIn - expectedOut;

      const pessimisticOffset = i * -180000; 
      const optimisticOffset = i * 100000;

      cashflowForecast.push({
        date: dateStr,
        expectedIn,
        expectedOut,
        balanceNormal: baseBalance,
        balanceOptimistic: Math.max(0, baseBalance + optimisticOffset),
        balancePessimistic: Math.max(0, baseBalance + pessimisticOffset),
      });
    }

    return NextResponse.json({
      success: true,
      productMargins: updatedMargins,
      cashflowForecast,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
