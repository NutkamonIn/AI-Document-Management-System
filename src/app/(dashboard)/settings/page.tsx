'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Cpu, 
  HardDrive, 
  Trash2, 
  Loader2, 
  ShieldCheck,
  Zap,
  RefreshCw,
  Gauge,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PasswordStrengthCard } from '@/components/ui/password-strength-card';
import { useChatContext, AVAILABLE_AI_MODELS } from '@/context/ChatContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserStats {
  totalDocuments: number;
  totalStorageBytes: number;
  totalChunks: number;
  totalChatMessages: number;
}

interface AiQuotaUsage {
  provider: string;
  model: string;
  status: string;
  tokens: {
    remaining: number;
    used: number;
    limit: number;
    percentage: number;
    resetIn: string;
  };
  requests: {
    remaining: number;
    used: number;
    limit: number;
    percentage: number;
    resetIn: string;
  };
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const { selectedModel, setSelectedModel } = useChatContext();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [aiUsage, setAiUsage] = useState<AiQuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [fetchingAiUsage, setFetchingAiUsage] = useState(false);

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes, usageRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/stats'),
        fetch('/api/ai/usage'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setName(profileData.name || '');
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setAiUsage(usageData);
      }
    } catch (err) {
      console.error('Error fetching settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAiUsage = async () => {
    setFetchingAiUsage(true);
    try {
      const res = await fetch('/api/ai/usage');
      if (res.ok) {
        const data = await res.json();
        setAiUsage(data);
      }
    } catch (err) {
      console.error('Failed to refresh AI usage:', err);
    } finally {
      setFetchingAiUsage(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchData();
      const interval = setInterval(() => {
        refreshAiUsage();
      }, 3000);
      return () => clearInterval(interval);
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword) {
      if (!currentPassword) {
        setMessage({ type: 'error', text: 'กรุณาระบุรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setMessage({ type: 'error', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านใหม่ไม่ตรงกัน' });
        return;
      }
    }

    setUpdatingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'อัปเดตข้อมูลไม่สำเร็จ');
      }

      setMessage({ type: 'success', text: data.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      fetchData();
      updateSession();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleClearChatHistory = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการสนทนาทั้งหมด ข้อมูลที่ลบจะไม่สามารถกู้คืนได้')) return;

    setClearingChat(true);
    try {
      const res = await fetch('/api/user/stats', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ล้างประวัติไม่สำเร็จ');
      }
      alert('ล้างประวัติการสนทนาทั้งหมดเรียบร้อยแล้ว');
      fetchData();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setClearingChat(false);
    }
  };

  const getMeterColor = (percentageRemaining: number) => {
    if (percentageRemaining <= 10) return 'bg-red-500';
    if (percentageRemaining <= 25) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="w-full flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="w-full">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">การตั้งค่าระบบ</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">จัดการข้อมูลส่วนตัว การตั้งค่าโมเดล AI และตรวจสอบการใช้งานพื้นที่</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-full sm:max-w-md mb-6 bg-gray-200/70 p-1 rounded-xl">
            <TabsTrigger value="profile" className="text-xs sm:text-sm font-semibold">โปรไฟล์</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs sm:text-sm font-semibold">โมเดล AI</TabsTrigger>
            <TabsTrigger value="storage" className="text-xs sm:text-sm font-semibold">พื้นที่และระบบ</TabsTrigger>
          </TabsList>

          {/* TAB 1: โปรไฟล์และการรักษาความปลอดภัย */}
          <TabsContent value="profile" className="space-y-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> ข้อมูลโปรไฟล์ส่วนตัว
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">อัปเดตชื่อผู้ใช้งานและรหัสผ่านเข้าสู่ระบบ</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6 w-full max-w-xl">
                    {message && (
                      <div
                        className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium ${
                          message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {message.text}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs sm:text-sm">อีเมล (บัญชีผู้ใช้)</Label>
                      <Input id="email" value={profile?.email || ''} disabled className="bg-gray-100 text-gray-500 text-xs sm:text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs sm:text-sm">ชื่อผู้ใช้งาน</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ระบุชื่อผู้ใช้งาน"
                        required
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <hr className="my-4 border-gray-200" />

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-xs sm:text-sm">รหัสผ่านปัจจุบัน (กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน)</Label>
                      <PasswordInput
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-xs sm:text-sm">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษรภาษาอังกฤษ)</Label>
                      <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <PasswordStrengthCard password={newPassword} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword" className="text-xs sm:text-sm">ยืนยันรหัสผ่านใหม่</Label>
                      <PasswordInput
                        id="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      {confirmNewPassword && newPassword !== confirmNewPassword && (
                        <p className="text-xs text-red-500 font-medium">รหัสผ่านใหม่ไม่ตรงกัน</p>
                      )}
                    </div>

                    <Button type="submit" disabled={updatingProfile} className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm">
                      {updatingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
                        </>
                      ) : (
                        'บันทึกการเปลี่ยนแปลง'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" /> สิทธิ์การใช้งานระบบ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-xs sm:text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-500">บทบาทผู้ใช้ (Role):</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {profile?.role || 'USER'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm py-2">
                    <span className="text-gray-500">วันที่สร้างบัญชี:</span>
                    <span className="font-medium text-gray-800">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('th-TH') : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: ระบบ AI & RAG Engine */}
          <TabsContent value="ai" className="space-y-6 w-full">
            {/* AI Model Selection Card */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" /> การเลือกโมเดล AI ประมวลผล (Default Model)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">เลือกโมเดลหลักสำหรับใช้ตอบคำถาม และเปรียบเทียบจุดเด่นของแต่ละโมเดล</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                  {AVAILABLE_AI_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900 text-sm">{model.name}</h4>
                            {isSelected && (
                              <Badge className="bg-purple-600 text-white text-xs hover:bg-purple-600">
                                ใช้งานอยู่
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{model.description}</p>
                        </div>
                        <div className="mt-3 text-xs font-semibold text-purple-700 bg-purple-100/70 p-2.5 rounded-lg border border-purple-200/50">
                          {model.highlight}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" /> โควต้า Token คงเหลือ (Groq Cloud AI)
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">เช็กจำนวน Token และคำขอใช้งาน AI คงเหลือแบบ Real-time</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-2xs sm:text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Auto-Refresh ทุก 3 วินาที
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshAiUsage}
                    disabled={fetchingAiUsage}
                    className="text-xs border-gray-300 hover:bg-gray-100"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${fetchingAiUsage ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 w-full">
                {aiUsage && (() => {
                  const tokenRemPct = Number(((aiUsage.tokens.remaining / aiUsage.tokens.limit) * 100).toFixed(1));
                  const reqRemPct = Number(((aiUsage.requests.remaining / aiUsage.requests.limit) * 100).toFixed(1));

                  const tokenUsedPct = Number((100 - tokenRemPct).toFixed(1));
                  const reqUsedPct = Number((100 - reqRemPct).toFixed(1));

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                      {/* Token Quota Capacity Meter */}
                      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-xs sm:text-sm font-semibold">
                          <span className="text-blue-900 flex items-center gap-1.5">
                            <Gauge className="h-4 w-4 text-blue-600 shrink-0" /> 500,000 Tokens รายวันคงเหลือ
                          </span>
                          <span className="text-blue-700 font-mono">
                            {aiUsage.tokens.remaining.toLocaleString()} / {aiUsage.tokens.limit.toLocaleString()} Tokens
                          </span>
                        </div>

                        {/* Progress Bar representing Capacity Remaining */}
                        <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300/60 shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${getMeterColor(tokenRemPct)}`}
                            style={{ width: `${tokenRemPct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs font-medium text-blue-800 pt-1">
                          <span>ความจุคงเหลือ: <strong className="text-blue-950 font-bold">{tokenRemPct}%</strong> (ใช้ไปแล้ว {(aiUsage.tokens.used || 0).toLocaleString()} Tokens / {tokenUsedPct}%)</span>
                          <span>รีเซ็ตใน: <strong className="text-blue-900">{aiUsage.tokens.resetIn}</strong></span>
                        </div>
                      </div>

                      {/* Request Count Capacity Meter */}
                      <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-xs sm:text-sm font-semibold">
                          <span className="text-purple-900 flex items-center gap-1.5">
                            <Cpu className="h-4 w-4 text-purple-600 shrink-0" /> 14,400 คำขอรายวันคงเหลือ (Requests/Day)
                          </span>
                          <span className="text-purple-700 font-mono">
                            {aiUsage.requests.remaining.toLocaleString()} / {aiUsage.requests.limit.toLocaleString()} ครั้ง
                          </span>
                        </div>

                        {/* Progress Bar representing Capacity Remaining */}
                        <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300/60 shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${getMeterColor(reqRemPct)}`}
                            style={{ width: `${reqRemPct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs font-medium text-purple-800 pt-1">
                          <span>ความจุคงเหลือ: <strong className="text-purple-950 font-bold">{reqRemPct}%</strong> (ใช้ไปแล้ว {aiUsage.requests.used || 0} ครั้ง / {reqUsedPct}%)</span>
                          <span>รีเซ็ตใน: <strong className="text-purple-900">{aiUsage.requests.resetIn}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 w-full">
                  <div className="p-4 rounded-xl border border-gray-200 bg-white">
                    <span className="text-xs text-gray-500 font-medium">ผู้ให้บริการ AI (AI Provider)</span>
                    <p className="text-base font-bold text-gray-800 mt-1">Groq Cloud AI</p>
                    <span className="text-xs text-green-600 font-medium mt-1 inline-block">สตรีมมิ่งตอบเร็วที่สุด ~0.12s</span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-white">
                    <span className="text-xs text-gray-500 font-medium">โมเดลประมวลผลที่เลือกใช้งานอยู่</span>
                    <p className="text-base font-bold text-gray-800 mt-1">{selectedModel}</p>
                    <span className="text-xs text-blue-600 font-medium mt-1 inline-block">สแกนบริบทพร้อมอ้างอิงเอกสาร</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: พื้นที่จัดเก็บและการบำรุงรักษา */}
          <TabsContent value="storage" className="space-y-6 w-full">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-600" /> พื้นที่จัดเก็บและสถิติข้อมูล
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">สรุปปริมาณข้อมูล PDF และ Vector บน Neon Cloud Database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-600 font-medium">ไฟล์ PDF ทั้งหมด</span>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats?.totalDocuments || 0} ไฟล์</p>
                    <span className="text-xs text-blue-500 mt-1 block">
                      โหมดจัดเก็บ: Zero Local Storage (0 Bytes)
                    </span>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="text-xs text-green-600 font-medium">Vector Chunks ใน Neon Cloud</span>
                    <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats?.totalChunks || 0} Chunks</p>
                    <span className="text-xs text-green-500 mt-1 block">Neon PostgreSQL (pgvector)</span>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="text-xs text-purple-600 font-medium">ข้อความแชตทั้งหมด</span>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{stats?.totalChatMessages || 0} ข้อความ</p>
                    <span className="text-xs text-purple-500 mt-1 block">ในฐานข้อมูล Cloud Database</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/30 w-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold text-red-700 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" /> การจัดการบำรุงรักษา
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">คำสั่งดูแลและล้างข้อมูลส่วนเกินในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-red-100 shadow-sm w-full">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-xs sm:text-sm">ล้างประวัติการสนทนาทั้งหมด</h4>
                    <p className="text-xs text-gray-500 mt-0.5">ลบข้อความแชตเก่าใน PostgreSQL ทั้งหมด (ไฟล์ PDF ไม่ถูกลบ)</p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={clearingChat}
                    onClick={handleClearChatHistory}
                    className="text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 font-medium shrink-0"
                  >
                    {clearingChat ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> กำลังล้าง...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> ล้างประวัติแชต
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
