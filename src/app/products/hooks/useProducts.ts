"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Product, ProductForm, HoverImage } from "../types";

export function useProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({
    name: '',
    price: '',
    url: '',
    description: '',
    main_image_url: '',
    detail_image_url: '',
    category: '스토어용',
    menu_category: '',
    isPriceTbd: false,
    available_methods: ['매장에서', '가져가기', '배달', '배송']
  });
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hoverImage, setHoverImage] = useState<HoverImage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  // 검색어 입력 시 페이지 번호 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/products');
      const json = await res.json();
      if (json.success) setData(json.products);
    } catch (e) {
      console.error('Failed to fetch products:', e);
    }
  };

  // 🕒 엑셀 일괄 업로드 처리 핸들러 (지능형 퍼지 매핑 탑재)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataVal = event.target?.result;
        if (!dataVal) return;

        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(dataVal, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (rawRows.length === 0) {
            alert('엑셀 시트에 데이터가 존재하지 않습니다.');
            setIsUploadingExcel(false);
            return;
          }

          const mappedProducts = rawRows.map((row: any) => {
            const nameVal = row['상품명'] || row['상품 이름'] || row['이름'] || row['productName'] || row['name'] || '';
            const priceVal = row['가격'] || row['단가'] || row['판매가'] || row['금액'] || row['price'] || '';
            const menuCategoryVal = row['카테고리'] || row['분류'] || row['메뉴분류'] || row['menuCategory'] || row['menu_category'] || '';
            const methodsVal = row['수령방식'] || row['수령 방식'] || row['배송수단'] || row['methods'] || '매장에서,가져가기,배달,배송';
            const descriptionVal = row['상세설명'] || row['설명'] || row['비고'] || row['description'] || '';
            const urlVal = row['쇼핑몰URL'] || row['쇼핑몰 링크'] || row['링크'] || row['url'] || '';

            return {
              name: nameVal,
              price: String(priceVal),
              menu_category: menuCategoryVal,
              available_methods: methodsVal,
              description: descriptionVal,
              url: urlVal,
              category: '스토어용', // 기본 스토어용
              is_coupon_excludable: 0
            };
          }).filter(p => p.name);

          if (mappedProducts.length === 0) {
            alert('필수 정보인 [상품명]이 기재된 유효한 행을 찾을 수 없습니다.');
            setIsUploadingExcel(false);
            return;
          }

          const resUpload = await apiFetch('/api/products/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: mappedProducts })
          });
          const jsonUpload = await resUpload.json();

          if (jsonUpload.success) {
            alert(`🎉 엑셀 일괄 등록 완료!\n수신 데이터: ${jsonUpload.totalReceived}개 중 ${jsonUpload.count}개의 상품이 신규 등록되었습니다.\n(중복된 동일 상품명의 데이터는 자동 스킵되었습니다.)`);
            fetchData();
          } else {
            alert('일괄 등록 실패: ' + (jsonUpload.error || '알 수 없는 오류'));
          }
        } catch (err: any) {
          console.error(err);
          alert('엑셀 파일 파싱 중 오류가 발생했습니다. 서식을 확인해 주세요.');
        } finally {
          setIsUploadingExcel(false);
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (eErr) {
      console.error(eErr);
      alert('파일 읽기 오류');
      setIsUploadingExcel(false);
    }
  };

  // 📄 표준 샘플 양식 다운로드 핸들러
  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx');

      const headers = ['상품명', '가격', '카테고리', '수령방식', '상세설명', '쇼핑몰URL'];
      const mockRows = [
        {
          '상품명': '이지써모 스포츠 텀블러 600ml',
          '가격': '19800',
          '카테고리': '리빙웨어',
          '수령방식': '매장에서,가져가기,배송',
          '상세설명': '이중진공 스테인리스 구조의 스포츠형 대용량 텀블러',
          '쇼핑몰URL': 'https://example.com/product/1'
        },
        {
          '상품명': '프리미엄 무선 저소음 키보드 K-30',
          '가격': '35000',
          '카테고리': '사무용품',
          '수령방식': '배송',
          '상세설명': '조용한 시저 스위치를 탑재한 슬림형 무선 키보드',
          '쇼핑몰URL': 'https://example.com/product/2'
        }
      ];

      const aoaData = [headers];
      mockRows.forEach((row) => {
        const rowData = headers.map((header) => row[header as keyof typeof row] ?? '');
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '상품일괄등록_샘플서식');

      XLSX.writeFile(workbook, '이지데스크_상품일괄등록_샘플양식.xlsx');
    } catch (err) {
      console.error('샘플 양식 다운로드 에러:', err);
      alert('템플릿 파일 생성에 실패했습니다.');
    }
  };

  const filteredData = data.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(query)) ||
      (t.menu_category && t.menu_category.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const addData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert('상품명은 필수입니다.');
    
    const isEditing = !!editTargetId;
    try {
      const res = await apiFetch('/api/products', { 
        method: isEditing ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTargetId,
          ...form,
          price: form.isPriceTbd ? '상담후결정' : form.price,
          available_methods: form.available_methods.join(',')
        }) 
      });
      
      const json = await res.json();
      if (json.success) { 
        setForm({
          name: '',
          price: '',
          url: '',
          description: '',
          main_image_url: '',
          detail_image_url: '',
          category: '스토어용',
          menu_category: '',
          isPriceTbd: false,
          available_methods: ['매장에서', '가져가기', '배달', '배송']
        }); 
        setEditTargetId(null);
        fetchData(); 
      } else {
        alert("저장 실패: " + json.error);
      }
    } catch (err) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const handleEditClick = (product: Product) => {
    const isPriceTbd = product.price === '상담후결정';
    setForm({
      name: product.name || '',
      price: isPriceTbd ? '' : (product.price || ''),
      url: product.url || '',
      description: product.description || '',
      main_image_url: product.main_image_url || '',
      detail_image_url: product.detail_image_url || '',
      category: product.category || '스토어용',
      menu_category: product.menu_category || '',
      isPriceTbd,
      available_methods: product.available_methods ? product.available_methods.split(',') : ['매장에서', '가져가기', '배달', '배송']
    });
    setEditTargetId(product.id);
  };

  const cancelEdit = () => {
    setForm({
      name: '',
      price: '',
      url: '',
      description: '',
      main_image_url: '',
      detail_image_url: '',
      category: '스토어용',
      menu_category: '',
      isPriceTbd: false,
      available_methods: ['매장에서', '가져가기', '배달', '배송']
    });
    setEditTargetId(null);
  };

  const deleteData = async (id: string) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch('/api/products?id=' + id, { method: 'DELETE' });
      if ((await res.json()).success) fetchData();
    } catch (e) {
      alert('삭제 중 네트워크 오류가 발생했습니다.');
    }
  };

  const toggleCouponExclude = async (productId: string, currentValue: number) => {
    const newValue = currentValue === 1 ? 0 : 1;
    
    // Optimistic UI update
    setData(prev => prev.map(p => p.id === productId ? { ...p, is_coupon_excludable: newValue } : p));
    
    try {
      const res = await apiFetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, is_coupon_excludable: newValue })
      });
      const json = await res.json();
      if (!json.success) {
        alert('쿠폰 적용 여부 변경에 실패했습니다: ' + json.error);
        fetchData();
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
      fetchData();
    }
  };

  const existingCategories = Array.from(new Set(data.map(p => p.menu_category).filter((x): x is string => !!x)));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'main_image_url' | 'detail_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setForm(prev => ({ ...prev, [field]: json.url }));
      } else {
        alert('업로드 실패: ' + json.error);
      }
    } catch (err) {
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    data,
    form, setForm,
    editTargetId,
    isUploading,
    hoverImage, setHoverImage,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    isUploadingExcel,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    filteredData,
    fetchData,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    handleEditClick,
    cancelEdit,
    deleteData,
    toggleCouponExclude,
    existingCategories,
    handleFileUpload
  };
}
