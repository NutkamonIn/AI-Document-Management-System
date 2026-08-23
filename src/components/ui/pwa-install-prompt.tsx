'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. ลงทะเบียน Service Worker สภาพแวดล้อม PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    // 2. ตรวจสอบระบบปฏิบัติการ iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    // ตรวจสอบว่าแอปถูกติดตั้งในโหมด Standalone อยู่แล้วหรือไม่
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 3. ดักจับอีเวนต์ beforeinstallprompt สำหรับ Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (ios && !isStandalone) {
      const iosDismissed = localStorage.getItem('pwa_ios_dismissed');
      if (!iosDismissed) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIos) {
      localStorage.setItem('pwa_ios_dismissed', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shrink-0">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm leading-tight">ติดตั้ง AI Doc Hub บนมือถือ</h4>
              <p className="text-xs text-slate-300 mt-0.5">ใช้งานเสมือนแอปพลิเคชันบนสมาร์ตโฟน</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIosGuide ? (
          <div className="p-3 bg-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed border border-slate-700">
            <span className="font-semibold text-blue-400 block mb-1">ขั้นตอนติดตั้งสำหรับ iOS Safari:</span>
            1. แตะปุ่มแชร์ <Share className="inline-block h-3.5 w-3.5 mx-0.5 text-blue-400" /> ด้านล่างเบราว์เซอร์
            <br />
            2. เลื่อนลงและเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              ไว้ทีหลัง
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              ติดตั้งแอปทันที
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
