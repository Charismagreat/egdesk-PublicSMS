import { InventoryItem, InventoryLog } from '../types';

// 3대 재고 자산 평가 동적 연산기 (이동평균 / FIFO / LIFO)
export const calculateValuation = (
  item: InventoryItem,
  logs: InventoryLog[],
  method: 'moving_average' | 'fifo' | 'lifo'
): { unitPrice: number; totalValue: number } => {
  // 해당 품목의 모든 로그 이력을 시간순(과거순)으로 정렬
  const itemLogs = logs
    .filter(log => log.itemId === item.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 기초 재고가 있는 경우 최초 입고 배치 설정
  let batches: { quantity: number; price: number }[] = [];
  
  // 이 품목이 최초 기초 재고를 갖고 등록되었는지 확인
  const hasInitialLog = itemLogs.some(log => log.note?.includes('기초') || log.note?.includes('최초'));
  
  if (!hasInitialLog && item.stock > 0) {
    batches.push({ quantity: item.stock, price: item.price });
  }

  // 모든 로그를 돌며 입출고 배치 소진 연산
  itemLogs.forEach(log => {
    if (log.changeType === 'in') {
      batches.push({ quantity: log.quantity, price: log.price });
    } else if (log.changeType === 'out') {
      let outQty = log.quantity;
      if (method === 'lifo') {
        // 후입선출: 가장 최근 입고 배치부터 차감 (뒤에서부터)
        for (let i = batches.length - 1; i >= 0 && outQty > 0; i--) {
          const take = Math.min(batches[i].quantity, outQty);
          batches[i].quantity -= take;
          outQty -= take;
        }
      } else {
        // 선입선출 및 이동평균: 오래된 입고 배치부터 차감 (앞에서부터)
        for (let i = 0; i < batches.length && outQty > 0; i++) {
          const take = Math.min(batches[i].quantity, outQty);
          batches[i].quantity -= take;
          outQty -= take;
        }
      }
      batches = batches.filter(b => b.quantity > 0);
    }
  });

  const totalVal = batches.reduce((sum, b) => sum + (b.quantity * b.price), 0);

  if (method === 'moving_average') {
    // 이동평균법 가중 연산
    let avgPrice = item.price;
    let curQty = 0;
    
    if (!hasInitialLog && item.stock > 0) {
      curQty = item.stock;
      avgPrice = item.price;
    }

    itemLogs.forEach(log => {
      if (log.changeType === 'in') {
        avgPrice = ((curQty * avgPrice) + (log.quantity * log.price)) / (curQty + log.quantity);
        curQty += log.quantity;
      } else if (log.changeType === 'out') {
        curQty = Math.max(0, curQty - log.quantity);
      }
    });
    return {
      unitPrice: Math.round(avgPrice),
      totalValue: Math.round(item.stock * avgPrice)
    };
  }

  return {
    unitPrice: item.stock > 0 ? Math.round(totalVal / item.stock) : 0,
    totalValue: Math.round(totalVal)
  };
};
