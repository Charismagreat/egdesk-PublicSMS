import { queryTable, updateRows } from '../egdesk-helpers';

async function migrateCategories() {
  console.log('Migrating categories...');
  const result = await queryTable('products');
  const products = result.rows;

  for (const p of products) {
    let newCategory = '스토어용';
    if (['식사류', '안주류', '주류', '음료'].includes(p.category)) {
      newCategory = '테이블용';
    } else if (p.category === '예약상품' || p.category === '예약용') {
      newCategory = '예약용';
    } else {
      newCategory = '스토어용';
    }

    if (p.category !== newCategory) {
      console.log(`Updating ${p.name}: ${p.category} -> ${newCategory}`);
      await updateRows('products', { category: newCategory }, { filters: { id: p.id } });
    }
  }
  console.log('Migration complete!');
}

migrateCategories().catch(console.error);
