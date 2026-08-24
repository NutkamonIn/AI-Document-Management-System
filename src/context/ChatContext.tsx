'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface DocumentItem {
  id: string;
  name: string;
  status: string;
}

export interface AiModelOption {
  id: string;
  name: string;
  highlight: string;
  description: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  _count?: {
    messages: number;
  };
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B (Recommended)',
    highlight: 'จุดเด่น: คิดวิเคราะห์เชิงลึก รวดเร็วสูงสุด ตอบภาษาไทยแม่นยำที่สุด',
    description: 'โมเดลขนาดใหญ่ 120B รวดเร็ว แม่นยำ เหมาะสำหรับตอบคำถามและสรุปเอกสาร',
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound',
    highlight: 'จุดเด่น: รวดเร็ว ฉับไว เหมาะกับการถามตอบทั่วไป',
    description: 'โมเดลสมดุลสำหรับถามตอบทั่วไป',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    highlight: 'จุดเด่น: สปีดเร็วที่สุดระดับมิลลิวินาที ตอบกลับทันที',
    description: 'โมเดลเน้นความรวดเร็วระดับมิลลิวินาที ตอบกลับทันที',
  },
  {
    id: 'qwen/qwen3.6-27b',
    name: 'Qwen 3.6 27B',
    highlight: 'จุดเด่น: ถนัดภาษาเอเชีย เข้าใจศัพท์เฉพาะทาง',
    description: 'โมเดลเก่งภาษาไทยและภาษาเอเชีย เข้าใจบริบทศัพท์เฉพาะทาง',
  },
];

export type TokenStatusType = 'NORMAL' | 'LOW' | 'EXHAUSTED';

interface ChatContextType {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  historyLoading: boolean;
  sessionId: string | null;
  sessions: ChatSessionItem[];
  availableDocuments: DocumentItem[];
  selectedDocumentIds: string[];
  selectedModel: string;
  tokenStatus: TokenStatusType;
  tokenStatusMessage: string;
  setSelectedModel: (modelId: string) => void;
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: () => void;
  clearDocumentSelection: () => void;
  fetchAvailableDocuments: () => Promise<void>;
  checkTokenUsage: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  switchSession: (targetSessionId: string) => Promise<void>;
  deleteSession: (targetSessionId: string) => Promise<void>;
  renameSession: (targetSessionId: string, newTitle: string) => Promise<void>;
  sendMessage: (e?: React.FormEvent) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);

  const [selectedModel, setSelectedModelState] = useState<string>('openai/gpt-oss-120b');
  const [tokenStatus, setTokenStatus] = useState<TokenStatusType>('NORMAL');
  const [tokenStatusMessage, setTokenStatusMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selected_ai_model');
      if (savedModel && AVAILABLE_AI_MODELS.some((m) => m.id === savedModel)) {
        setSelectedModelState(savedModel);
      }
    }
  }, []);

  const setSelectedModel = (modelId: string) => {
    setSelectedModelState(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_ai_model', modelId);
    }
  };

  const [availableDocuments, setAvailableDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const checkTokenUsage = async () => {
    try {
      const res = await fetch(`/api/ai/usage?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const remainingTokens = data.tokens?.remaining ?? 500000;
        const remainingRequests = data.requests?.remaining ?? 14400;

        if (remainingTokens <= 100 || remainingRequests <= 0) {
          setTokenStatus('EXHAUSTED');
          setTokenStatusMessage('คุณ Token หมดแล้ว (ระบบจะรีเซ็ตโควต้าใหม่ให้อัตโนมัติทุก 07:00 น.)');
        } else if (remainingTokens <= 75000 || data.tokens?.percentage <= 15) {
          setTokenStatus('LOW');
          setTokenStatusMessage('คุณเหลือ Token น้อยแล้ว (โปรดใช้งานอย่างประหยัดจนกว่าจะถึงเวลา 07:00 น.)');
        } else {
          setTokenStatus('NORMAL');
          setTokenStatusMessage('');
        }
      }
    } catch (err) {
      console.error('Error checking token usage:', err);
    }
  };

  const fetchAvailableDocuments = async () => {
    try {
      const res = await fetch(`/api/documents?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const completedDocs = data.filter((d: any) => d.status === 'COMPLETED');
        setAvailableDocuments(completedDocs);
      }
    } catch (err) {
      console.error('Error loading documents for chat:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/chat/sessions?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
    }
  };

  const loadSessionHistory = async (targetSessionId?: string) => {
    setHistoryLoading(true);
    try {
      const url = targetSessionId
        ? `/api/chat/history?sessionId=${targetSessionId}&_t=${Date.now()}`
        : `/api/chat/history?_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);

        if (data.messages && data.messages.length > 0) {
          const formattedMessages: Message[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sources: Array.isArray(m.sources) ? m.sources : [],
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: 'สวัสดีครับ ผมคือผู้ช่วย AI ประจำเอกสารของคุณ สามารถเลือกสโคปเอกสาร เลือกโมเดล AI และพิมพ์ถามคำถามที่ต้องการได้เลยครับ',
            },
          ]);
        }
        return data.sessionId;
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
    return null;
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'การสนทนาใหม่' }),
      });

      if (res.ok) {
        const newSession = await res.json();
        setSessionId(newSession.id);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'สวัสดีครับ เริ่มต้นห้องแชตใหม่เรียบร้อย สามารถพิมพ์ถามคำถามเกี่ยวกับเอกสารของคุณได้เลยครับ',
          },
        ]);
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to create new chat session:', err);
    }
  };

  const switchSession = async (targetSessionId: string) => {
    if (targetSessionId === sessionId) return;
    await loadSessionHistory(targetSessionId);
  };

  const deleteSession = async (targetSessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${targetSessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const remainingSessions = sessions.filter((s) => s.id !== targetSessionId);
        setSessions(remainingSessions);

        if (sessionId === targetSessionId) {
          if (remainingSessions.length > 0) {
            await loadSessionHistory(remainingSessions[0].id);
          } else {
            await createNewSession();
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const renameSession = async (targetSessionId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${targetSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === targetSessionId ? { ...s, title: newTitle } : s))
        );
      }
    } catch (err) {
      console.error('Failed to rename chat session:', err);
    }
  };

  useEffect(() => {
    loadSessionHistory();
    fetchAvailableDocuments();
    checkTokenUsage();
    fetchSessions();

    const syncInterval = setInterval(() => {
      fetchAvailableDocuments();
      fetchSessions();
      checkTokenUsage();
    }, 3000);

    const handleFocus = () => {
      fetchAvailableDocuments();
      fetchSessions();
      checkTokenUsage();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const selectAllDocuments = () => {
    setSelectedDocumentIds([]);
  };

  const clearDocumentSelection = () => {
    setSelectedDocumentIds([]);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await loadSessionHistory();
    }

    const userQuery = input;
    setInput('');
    setLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          selectedDocumentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          selectedModel: selectedModel,
          sessionId: currentSessionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errText = errorData.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI';

        // ป้องกัน False Positive: ตั้งเป็น EXHAUSTED เฉพาะเมื่อ HTTP Status คือ 429 จริงๆ เท่านั้น
        if (res.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('insufficient_quota')) {
          setTokenStatus('EXHAUSTED');
          setTokenStatusMessage('คุณ Token หมดแล้ว (ระบบจะรีเซ็ตโควต้าใหม่ให้อัตโนมัติทุก 07:00 น.)');
        } else {
          checkTokenUsage();
        }
        throw new Error(errText);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        };

        setMessages((prev) => [...prev, aiMsg]);
        checkTokenUsage();
        fetchSessions();
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('ไม่สามารถอ่าน Stream จากเซิร์ฟเวอร์ได้');

      const decoder = new TextDecoder();
      const aiMessageId = (Date.now() + 1).toString();
      let fullAnswer = '';
      let extractedSources: string[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          sources: [],
        },
      ]);

      setLoading(false);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'metadata') {
              if (data.sources) extractedSources = data.sources;
              if (data.sessionId) setSessionId(data.sessionId);
            } else if (data.type === 'token' && data.content) {
              fullAnswer += data.content;
            }
          } catch {}
        }

        const cleanedAnswer = fullAnswer
          .replace(/^<think>[\s\S]*?<\/think>/gi, '')
          .replace(/^(?:We need to|Let's|The document mentions|Provide summary|We have many)[\s\S]*?(?=\n\n|\n[#\*\-]|สรุป|ขออภัย|เรียน|โครงการ)/i, '')
          .trimStart();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: cleanedAnswer, sources: extractedSources }
              : msg
          )
        );
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.type === 'token' && data.content) {
            fullAnswer += data.content;
          }
        } catch {}
      }

      checkTokenUsage();
      fetchSessions();
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('rate_limit_exceeded') || errMsg.includes('insufficient_quota')) {
        setTokenStatus('EXHAUSTED');
        setTokenStatusMessage('คุณ Token หมดแล้ว (ระบบจะรีเซ็ตโควต้าใหม่ให้อัตโนมัติทุก 07:00 น.)');
      } else {
        checkTokenUsage();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `ขออภัยครับ เกิดข้อผิดพลาด: ${errMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        setInput,
        loading,
        historyLoading,
        sessionId,
        sessions,
        availableDocuments,
        selectedDocumentIds,
        selectedModel,
        tokenStatus,
        tokenStatusMessage,
        setSelectedModel,
        toggleDocumentSelection,
        selectAllDocuments,
        clearDocumentSelection,
        fetchAvailableDocuments,
        checkTokenUsage,
        fetchSessions,
        createNewSession,
        switchSession,
        deleteSession,
        renameSession,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
