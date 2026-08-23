'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  ShieldAlert,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getRemainingHoursText } from '@/lib/utils/date';

interface DocumentItem {
  id: string;
  name: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

interface BatchFileItem {
  id: string;
  file: File;
  status: 'WAITING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export default function DocumentsPage() {
  const { status: sessionStatus } = useSession();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-File Drag & Drop Batch Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchFileItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchDocuments();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleProcessDocument = async (docId: string) => {
    setProcessingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ประมวลผล RAG ไม่สำเร็จ');
      }
      fetchDocuments();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการประมวลผล: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${docName}" ?`)) return;

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ลบเอกสารไม่สำเร็จ');
      }
      fetchDocuments();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการลบ: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // เพิ่มไฟล์ลงคิว Batch Upload
  const addFilesToQueue = (files: FileList | File[]) => {
    setError('');
    const newItems: BatchFileItem[] = [];
    const fileArray = Array.from(files);

    for (const f of fileArray) {
      if (f.type !== 'application/pdf') {
        setError('รองรับเฉพาะไฟล์ PDF เท่านั้น');
        continue;
      }
      newItems.push({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        status: 'WAITING',
      });
    }

    if (newItems.length > 0) {
      setBatchQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeFromQueue = (id: string) => {
    if (isBatchProcessing) return;
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isBatchProcessing) return;
    setBatchQueue([]);
  };

  // ประมวลผลอัปโหลดคิว Batch Upload ทีละไฟล์
  const startBatchUpload = async () => {
    if (batchQueue.length === 0 || isBatchProcessing) return;

    setIsBatchProcessing(true);
    setError('');

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];

      setBatchQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'UPLOADING' } : q))
      );

      const formData = new FormData();
      formData.append('file', item.file);

      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'อัปโหลดล้มเหลว');
        }

        setBatchQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'COMPLETED' } : q))
        );
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'FAILED', error: err.message } : q))
        );
      }
    }

    setIsBatchProcessing(false);
    fetchDocuments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1 w-fit border-0">
            <CheckCircle2 className="h-3 w-3" /> พร้อมใช้งาน
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 flex items-center gap-1 w-fit border-0">
            <Loader2 className="h-3 w-3 animate-spin" /> กำลังประมวลผล RAG อัตโนมัติ
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 flex items-center gap-1 w-fit border-0">
            <AlertCircle className="h-3 w-3" /> ผิดพลาด
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 flex items-center gap-1 w-fit border-0">
            <Clock className="h-3 w-3" /> รอการประมวลผล
          </Badge>
        );
    }
  };

  const completedCount = batchQueue.filter((q) => q.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-[2560px] mx-auto">
      {/* Retention Policy Information Card */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold block text-sm mb-0.5 text-amber-950">นโยบายการจัดเก็บเอกสารอัตโนมัติ (Auto Retention Policy 2 วัน):</span>
          เพื่อไม่ให้สิ้นเปลืองพื้นที่จัดเก็บในเครื่อง เอกสารทั้งหมดจะประมวลผล RAG ขึ้นระบบ Cloud DB และมีอายุการจัดเก็บในระบบอัตโนมัติ <strong>2 วัน (48 ชั่วโมง)</strong> เมื่อครบกำหนด ระบบจะทำการลบไฟล์และรูปภาพออกจากเครื่องและฐานข้อมูลให้อัตโนมัติทันที
        </div>
      </div>

      {/* Multi-File Drag & Drop Upload Dropzone Card */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-dashed border-2 transition-all duration-200 bg-white ${
          isDragging
            ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20 scale-[1.005]'
            : 'border-gray-300'
        }`}
      >
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 border border-blue-100 shadow-2xs">
            <Upload className="h-7 w-7" />
          </div>

          <h3 className="text-lg font-bold text-gray-800">
            {isDragging ? 'วางไฟล์ PDF เพื่อเพิ่มลงคิวอัปโหลด' : 'ลากไฟล์ PDF มาวาง หรือ เลือกไฟล์เพื่ออัปโหลดหลายไฟล์ (Multi-File Upload)'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            รองรับการเลือกและลากวางหลายไฟล์พร้อมกัน (Drag & Drop) ระบบจะทำการสกัดข้อความภาษาไทยและรูปภาพประกอบขึ้น Neon Cloud DB ให้อัตโนมัติ
          </p>

          {error && <div className="mt-3 text-sm text-red-600 font-medium">{error}</div>}

          <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
            <Button 
              type="button" 
              disabled={isBatchProcessing} 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm text-xs sm:text-sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              เลือกไฟล์ PDF (เลือกได้หลายไฟล์)
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isBatchProcessing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Batch Upload Queue Modal / Card */}
      {batchQueue.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" /> คิวอัปโหลดและประมวลผล RAG แบบกลุ่ม ({completedCount} / {batchQueue.length} ไฟล์)
              </CardTitle>
              <span className="text-xs text-gray-500 mt-1 block">
                {isBatchProcessing ? 'กำลังประมวลผลอัปโหลดทีละไฟล์ขึ้น Neon Cloud DB...' : 'ตรวจสอบรายการไฟล์ก่อนกดเริ่มอัปโหลด'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isBatchProcessing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearQueue}
                  className="text-xs text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                  ล้างคิวทั้งหมด
                </Button>
              )}
              <Button
                size="sm"
                disabled={isBatchProcessing || completedCount === batchQueue.length}
                onClick={startBatchUpload}
                className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> เริ่มอัปโหลดทั้งหมด ({batchQueue.length} ไฟล์)
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto bg-white rounded-xl border border-gray-200">
              {batchQueue.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="font-semibold text-gray-800 truncate">{item.file.name}</span>
                    <span className="text-gray-400 text-2xs shrink-0">({formatFileSize(item.file.size)})</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'WAITING' && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        รอการอัปโหลด
                      </Badge>
                    )}
                    {item.status === 'UPLOADING' && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> กำลังสกัดข้อมูล RAG...
                      </Badge>
                    )}
                    {item.status === 'COMPLETED' && (
                      <Badge className="bg-green-100 text-green-700 border-0 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> เสร็จสมบูรณ์
                      </Badge>
                    )}
                    {item.status === 'FAILED' && (
                      <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> ล้มเหลว ({item.error || 'ผิดพลาด'})
                      </Badge>
                    )}

                    {!isBatchProcessing && item.status === 'WAITING' && (
                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">เอกสารทั้งหมด ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              ยังไม่มีเอกสารในระบบ ลองลากไฟล์ PDF มาวางเพื่อเริ่มอัปโหลด
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อเอกสาร</TableHead>
                  <TableHead>ขนาดไฟล์</TableHead>
                  <TableHead>สถานะ RAG</TableHead>
                  <TableHead>ระยะเวลาจัดเก็บคงเหลือ</TableHead>
                  <TableHead className="text-center">การประมวลผล AI</TableHead>
                  <TableHead className="text-center">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-[400px]">{doc.name}</span>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell>{renderStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-mono">
                        {getRemainingHoursText(doc.createdAt)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {doc.status !== 'COMPLETED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === doc.id || doc.status === 'PROCESSING'}
                          onClick={() => handleProcessDocument(doc.id)}
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 font-medium"
                        >
                          {processingId === doc.id || doc.status === 'PROCESSING' ? (
                            <>
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              กำลังประมวลผล...
                            </>
                          ) : (
                            'ทำซ้ำ RAG'
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-green-600 font-semibold">เสร็จสิ้นอัตโนมัติ</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deletingId === doc.id}
                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        className="text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 font-medium transition-colors"
                        title="ลบเอกสารออกจากระบบ"
                      >
                        {deletingId === doc.id ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            กำลังลบ...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-3.5 w-3.5 text-red-600" />
                            ลบเอกสาร
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}