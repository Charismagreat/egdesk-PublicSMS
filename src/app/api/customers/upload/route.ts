import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { csvText } = await req.json();

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json({ success: false, error: '유효한 CSV 데이터가 없습니다.' }, { status: 400 });
    }

    // Parse CSV lines
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const parsedContacts = new Map<string, string>(); // phone -> name

    // Extract phones and names heuristically
    const phoneRegex = /(?:010|\+82\s?10)[-.\s]?(\d{3,4})[-.\s]?(\d{4})/;
    
    for (const line of lines) {
      // Split line by commas or tabs to check columns
      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
      
      let phone = '';
      let name = '';

      for (const col of cols) {
        const match = col.match(phoneRegex);
        if (match) {
          phone = `010-${match[1]}-${match[2]}`;
        } else if (!name && col.length > 0 && col.length < 20 && !col.includes('전화') && !col.includes('연락처')) {
          name = col;
        }
      }

      // Fallback: search entire line if columns didn't match well
      if (!phone) {
        const match = line.match(phoneRegex);
        if (match) {
          phone = `010-${match[1]}-${match[2]}`;
          // Get text before or after the phone number
          const withoutPhone = line.replace(match[0], '').replace(/[,;\t]/g, ' ').trim();
          const parts = withoutPhone.split(' ').filter(p => p.length > 0);
          if (parts.length > 0) {
            name = parts[0].substring(0, 20); // First word
          }
        }
      }

      if (phone && !name) name = phone;

      if (phone) {
        parsedContacts.set(phone, name);
      }
    }

    if (parsedContacts.size === 0) {
      return NextResponse.json({ success: false, error: 'CSV 파일에서 전화번호를 찾을 수 없습니다.' });
    }

    // Deduplicate against existing DB
    let existingPhones = new Set<string>();
    try {
      const existing = await queryTable('customers');
      if (existing.rows && existing.rows.length > 0) {
        existing.rows.forEach((row: any) => {
          if (row.phone) existingPhones.add(row.phone);
        });
      }
    } catch (e) {
      console.warn("기존 고객 목록 조회 실패:", e);
    }

    const newRows: any[] = [];
    for (const [phone, name] of parsedContacts.entries()) {
      if (!existingPhones.has(phone)) {
        newRows.push({
          name: name,
          phone: phone,
          tags: '엑셀업로드',
          created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
        });
      }
    }

    if (newRows.length > 0) {
      await insertRows('customers', newRows);
    }

    return NextResponse.json({ 
      success: true, 
      count: newRows.length,
      totalParsed: parsedContacts.size
    });

  } catch (error: any) {
    console.error('CSV Upload API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
