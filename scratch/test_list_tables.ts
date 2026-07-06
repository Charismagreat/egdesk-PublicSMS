import { listTables } from '../egdesk-helpers';

async function test() {
  try {
    const result = await listTables();
    console.log("listTables() 결과:", JSON.stringify(result, null, 2));
    console.log("Array.isArray(result):", Array.isArray(result));
  } catch (e: any) {
    console.error("에러 발생:", e.message);
  }
}

test();
