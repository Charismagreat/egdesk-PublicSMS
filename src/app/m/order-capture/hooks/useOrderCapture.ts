"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Customer, CaptureForm } from "../types";

export function useOrderCapture() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // CRM 단골 고객 실시간 매핑 상태
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const [form, setForm] = useState<CaptureForm>({
    customerName: '',
    customerPhone: '',
    productName: '', 
    status: '접수완료'
  });

  // Verify auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch('/api/operators');
        if (res.status === 401 || res.status === 403) {
          router.replace('/login');
        } else {
          setIsAuthenticated(true);
        }
      } catch (e) {
        router.replace('/login');
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [isAuthenticated]);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error("고객 목록 조회 실패:", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("캡처 이미지를 첨부해주세요!");
      return;
    }
    if (!form.customerName || !form.customerPhone) {
      alert("고객명과 연락처를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload File
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      setIsUploading(false);

      if (!uploadData.success) {
        alert("이미지 업로드에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      const attachmentUrl = uploadData.url;

      // 2. Submit Order
      const orderRes = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          productName: form.productName || '캡처 접수건',
          quantity: '1',
          totalPrice: '0',
          deliveryMethod: '상담/캡처',
          status: form.status,
          attachmentUrl: attachmentUrl
        })
      });

      const orderData = await orderRes.json();
      if (orderData.success) {
        setSuccess(true);
      } else {
        alert("접수 처리 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setFile(null);
    setPreview(null);
    setForm({
      customerName: '',
      customerPhone: '',
      productName: '',
      status: '접수완료'
    });
  };

  return {
    isLoadingAuth,
    isAuthenticated,
    file, setFile,
    preview, setPreview,
    isUploading,
    isSubmitting,
    success, setSuccess,
    customers, setCustomers,
    isCustomerModalOpen, setIsCustomerModalOpen,
    customerSearchTerm, setCustomerSearchTerm,
    form, setForm,
    fileInputRef,
    handleFileChange,
    removeFile,
    handleSubmit,
    resetForm
  };
}
