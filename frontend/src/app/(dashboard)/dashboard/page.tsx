'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, MessageSquare, CheckCircle2, Cpu, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useChatContext, AVAILABLE_AI_MODELS } from '@/context/ChatContext';

interface DocumentItem {
  id: string;
  name: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedModel } = useChatContext();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<'ONLINE' | 'OFFLINE' | 'LOADING'>('LOADING');
  const [aiProviderName, setAiProviderName] = useState<string>('Groq Cloud AI');

  // ดึงข้อมูลเอกสารทั้งหมดและเช็กสถานะ AI Engine แบบ Real-time
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    const checkAiHealth = async () => {
      try {
        const res = await fetch('/api/ai/health');
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE');
          if (data.provider) setAiProviderName(data.provider);
        } else {
          setAiStatus('OFFLINE');
        }
      } catch {
        setAiStatus('OFFLINE');
      }
    };

    fetchStats();
    checkAiHealth();
  }, []);

  const totalDocs = documents.length;
  const completedDocs = documents.filter((d) => d.status === 'COMPLETED').length;

  const activeModelObj = AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_AI_MODELS[0];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">ยินดีต้อนรับกลับมา, {session?.user?.name || 'ผู้ใช้งาน'}</h1>
        <p className="text-blue-100 mt-1">พร้อมค้นหาและจัดการเอกสารด้วย AI หรือยัง</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">
              <FileText className="mr-2 h-4 w-4" /> อัปโหลดเอกสาร
            </Button>
          </Link>
          <Link href="/chat">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">
              <MessageSquare className="mr-2 h-4 w-4" /> ถาม AI จากเอกสาร
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">เอกสารทั้งหมด</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : totalDocs}
            </div>
            <p className="text-xs text-gray-500 mt-1">ไฟล์ PDF ในระบบของคุณ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">พร้อมใช้งาน (RAG Ready)</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : completedDocs}
            </div>
            <p className="text-xs text-gray-500 mt-1">เอกสารที่ประมวลผล Vector แล้ว</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">โมเดล AI ที่เลือกใช้</CardTitle>
            <Zap className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-gray-900 truncate" title={activeModelObj.name}>
              {activeModelObj.name}
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1 truncate" title={activeModelObj.highlight}>
              {activeModelObj.highlight}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">AI Engine Provider</CardTitle>
            <Cpu className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-800">{aiProviderName}</div>
            {aiStatus === 'LOADING' ? (
              <p className="text-xs text-gray-400 font-medium mt-1">กำลังตรวจสอบ...</p>
            ) : aiStatus === 'ONLINE' ? (
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" />
                พร้อมใช้งาน (ONLINE)
              </p>
            ) : (
              <p className="text-xs text-red-600 font-medium mt-1">ไม่พร้อมใช้งาน</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents Quick List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">เอกสารล่าสุดของคุณ</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              ยังไม่มีเอกสารในระบบ <Link href="/documents" className="text-blue-600 underline font-medium">คลิกอัปโหลดเอกสาร PDF แรกของคุณ</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                      <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    doc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status === 'COMPLETED' ? 'พร้อมใช้งาน' : 'รอประมวลผล'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}