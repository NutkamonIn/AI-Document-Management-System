'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  FileText, 
  Check, 
  Filter, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  AlertCircle,
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useChatContext, AVAILABLE_AI_MODELS } from '@/context/ChatContext';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

export default function ChatPage() {
  const {
    messages = [],
    input = '',
    setInput,
    loading = false,
    historyLoading = false,
    sessionId = null,
    sessions = [],
    availableDocuments = [],
    selectedDocumentIds = [],
    selectedModel = 'groq/compound',
    tokenStatus = 'NORMAL',
    setSelectedModel,
    toggleDocumentSelection,
    selectAllDocuments,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession,
    sendMessage,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleStartRename = (sId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (sId: string) => {
    if (editingTitle.trim()) {
      renameSession(sId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleDeleteSession = (sId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้องแชต "${title}" ? (ประวัติในห้องนี้จะถูกลบอย่างถาวร)`)) {
      deleteSession(sId);
    }
  };

  const handleSelectSessionMobile = (sId: string) => {
    switchSession(sId);
    setMobileSidebarOpen(false);
  };

  const docsList = availableDocuments || [];
  const selectedIds = selectedDocumentIds || [];
  const currentModelObj = AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_AI_MODELS[0];

  return (
    <div className="flex h-full flex-1 w-full max-w-[2560px] mx-auto gap-3 relative overflow-hidden min-h-0">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-2xs"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Chat Threads Sidebar (Ultrawide Responsive) */}
      <div
        className={`
          bg-white border border-gray-200 rounded-2xl flex flex-col transition-all duration-300 shrink-0 shadow-xs z-40
          fixed md:static inset-y-0 left-0 h-full max-h-full
          ${mobileSidebarOpen ? 'translate-x-0 w-72 m-2 shadow-2xl z-50' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'md:w-64 ultrawide:w-80' : 'md:w-14'}
        `}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
          {(sidebarOpen || mobileSidebarOpen) ? (
            <Button
              onClick={() => {
                createNewSession();
                setMobileSidebarOpen(false);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างห้องแชตใหม่</span>
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={createNewSession}
              title="สร้างห้องแชตใหม่"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex text-gray-500 hover:text-gray-800 shrink-0"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-800 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Threads List */}
        {(sidebarOpen || mobileSidebarOpen) && (
          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 text-xs">
            <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1 block">
              ประวัติห้องแชต ({sessions.length})
            </span>

            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs">
                ยังไม่มีห้องแชตเก่า
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === sessionId;
                const isEditing = editingSessionId === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSessionMobile(s.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200 shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleSaveRename(s.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(s.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white border border-blue-400 rounded px-1 text-xs text-gray-800 focus:outline-none"
                        />
                      ) : (
                        <span className="truncate">{s.title || 'การสนทนาใหม่'}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex md:opacity-0 md:group-hover:opacity-100 items-center gap-1 shrink-0 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(s.id, s.title, e)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="เปลี่ยนชื่อหัวข้อ"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, s.title, e)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="ลบห้องแชตนี้"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Chat Conversation Area (Ultrawide Full Canvas) */}
      <div className="flex-1 flex flex-col justify-between relative min-w-0 w-full h-full min-h-0">
        {/* Top Bar: Scope Selector & Mobile Sidebar Toggle */}
        <div className="px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl mb-2 shadow-xs shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto">
            {/* Mobile Sidebar Toggle Button */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-gray-600 h-8 w-8 shrink-0"
              title="เปิดดูประวัติห้องแชต"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 mr-1 shrink-0">
              <Filter className="h-3.5 w-3.5 text-blue-600" />
              <span>ขอบเขตเอกสาร:</span>
            </div>

            {docsList.length === 0 ? (
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                ยังไม่มีเอกสารที่ประมวลผลเสร็จสิ้นในระบบ
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={selectAllDocuments}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                    selectedIds.length === 0
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  ทุกเอกสาร ({docsList.length})
                </button>

                {docsList.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDocumentSelection && toggleDocumentSelection(doc.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <FileText className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">{doc.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {docsList.length === 0 && (
            <Link href="/documents">
              <Button size="sm" variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                <Upload className="mr-1.5 h-3 w-3" /> อัปโหลด PDF
              </Button>
            </Link>
          )}
        </div>

        {/* Messages Stream Container (Ultrawide Spacious Layout) */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-4 space-y-4 sm:space-y-6">
          {historyLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-600 text-white shrink-0 mt-1">
                    <AvatarFallback><Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[92%] sm:max-w-[85%] lg:max-w-[80%] 2xl:max-w-[75%] space-y-2 min-w-0 ${msg.role === 'user' ? 'items-end ml-auto' : ''}`}>
                  <div
                    className={`p-3.5 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md ml-auto text-left'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          กำลังแต่งคำตอบ...
                        </span>
                      )
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Source Citation Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-2xs sm:text-xs text-gray-500 font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" /> แหล่งอ้างอิง:
                      </span>
                      {msg.sources.map((src, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-2xs sm:text-xs">
                          {src}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-slate-800 text-white shrink-0 mt-1">
                    <AvatarFallback><User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2 sm:gap-3 items-center">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-600 text-white">
                <AvatarFallback><Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></AvatarFallback>
              </Avatar>
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>AI กำลังค้นหาข้อมูลและสรุปคำตอบ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Token Status Warning Banners */}
        {tokenStatus === 'EXHAUSTED' && (
          <div className="mb-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-pulse shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>คุณ Token หมดแล้ว (ระบบจะรีเซ็ตโควต้าใหม่ให้อัตโนมัติทุก 07:00 น.)</span>
            </div>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="text-xs bg-white text-red-700 border-red-300 hover:bg-red-100">
                เช็กโควต้า
              </Button>
            </Link>
          </div>
        )}

        {tokenStatus === 'LOW' && (
          <div className="mb-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>คุณเหลือ Token น้อยแล้ว (โปรดใช้งานอย่างประหยัดจนกว่าจะถึงเวลา 07:00 น.)</span>
            </div>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100">
                เช็กโควต้า
              </Button>
            </Link>
          </div>
        )}

        {/* Input Box Component - Pinned firmly at bottom with Model Selector & Strengths */}
        <div className="shrink-0 pt-2 pb-1 bg-gray-50 z-10 w-full">
          <Card className="border-t border-gray-200 rounded-2xl shadow-md bg-white">
            <CardContent className="p-2.5 sm:p-3 space-y-2">
              <form onSubmit={sendMessage} className="flex gap-2 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput && setInput(e.target.value)}
                  placeholder={
                    tokenStatus === 'EXHAUSTED'
                      ? 'คุณ Token หมดแล้ว สามารถส่งคำถามใหม่ได้หลังเวลา 07:00 น.'
                      : selectedIds.length > 0
                      ? `ถามเกี่ยวกับ ${selectedIds.length} เอกสารที่เลือกไว้...`
                      : 'พิมพ์คำถามเกี่ยวกับเอกสารของคุณที่นี่...'
                  }
                  className="flex-1 border-0 focus-visible:ring-0 shadow-none text-xs sm:text-sm"
                  disabled={loading || historyLoading || tokenStatus === 'EXHAUSTED'}
                />
                <Button type="submit" size="icon" disabled={loading || historyLoading || !input.trim() || tokenStatus === 'EXHAUSTED'} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {/* Bottom Bar: AI Model Selector & Strengths Highlight */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-2xs sm:text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-semibold text-gray-700 shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>โมเดล AI:</span>
                  </div>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel && setSelectedModel(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {AVAILABLE_AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-gray-500 font-medium truncate max-w-[280px] sm:max-w-[480px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-100">
                  {currentModelObj.highlight}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
