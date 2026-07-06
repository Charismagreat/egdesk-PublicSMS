const payload = {
  customerName: "테이블 1번",
  customerPhone: "000-0000-0000",
  productName: "모듬 감자튀김",
  quantity: "1",
  totalPrice: "12000",
  deliveryMethod: "매장에서",
  shippingAddress: "",
  customerMemo: "모듬 감자튀김 1개",
  status: "결제대기"
};

fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
