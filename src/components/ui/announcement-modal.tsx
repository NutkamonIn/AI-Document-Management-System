'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Clock, Zap, HardDrive, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AnnouncementModal() {
  const [isOpen, setIsOpen] = useState(true);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
            <ShieldAlert className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold">ประกาศสำคัญและคำแนะนำการใช้งานระบบ</h3>
            <p className="text-xs text-blue-100 mt-0.5">โปรดอ่านนโยบายและข้อควรระวังสำคัญก่อนเริ่มใช้งาน</p>
          </div>
        </div>

        {/* Modal Content Items */}
        <div className="p-6 space-y-4 overflow-y-auto text-sm text-gray-700 leading-relaxed flex-1">
          {/* Item 1 */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950 text-sm">1. นโยบายลบเอกสารอัตโนมัติ 2 วัน (Auto Retention 48 ชม.)</h4>
              <p className="text-xs text-amber-900 mt-1">
                เอกสารทั้งหมดที่อัปโหลดและประมวลผล RAG ขึ้นระบบ Neon Cloud Database จะมีอายุการจัดเก็บอัตโนมัติ <strong>2 วัน (48 ชั่วโมง)</strong> เมื่อครบกำหนดระบบจะทำการลบข้อมูลออกให้อัตโนมัติทันที
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-950 text-sm">2. โควต้าการใช้งาน AI (500,000 Tokens / วัน)</h4>
              <p className="text-xs text-blue-900 mt-1">
                โควต้ารายวันจะรีเซ็ตใหม่เต็ม 100% ทุกวันในเวลา <strong>07:00 น. (เช้า)</strong> หากโควต้าใกล้หมดจะมีแถบเตือนสีส้ม/สีแดงแจ้งเตือนเหนือช่องแชตโดยอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
            <HardDrive className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-green-950 text-sm">3. ระบบจัดเก็บแบบ Zero Local Storage (ไม่รกเครื่อง)</h4>
              <p className="text-xs text-green-900 mt-1">
                ไฟล์ PDF จะประมวลผลสกัดเนื้อหาและรูปภาพขึ้น Neon Cloud Database จากหน่วยความจำโดยตรง ไม่มีการบันทึกไฟล์ขยะลงดิสก์ในเครื่องคอมพิวเตอร์ของคุณ
              </p>
            </div>
          </div>

          {/* Item 4 */}
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
            <ImageIcon className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-purple-950 text-sm">4. การสกัดรูปภาพประกอบจากไฟล์ PDF</h4>
              <p className="text-xs text-purple-900 mt-1">
                รูปภาพประกอบจาก PDF (เช่น กราฟ แผนภูมิ) จะถูกสกัดและเก็บขึ้น Neon Cloud DB เพื่อนำมาแสดงโชว์ในกล่องตอบกลับแชตของ AI ให้อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Countdown Close Button */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            {countdown > 0 ? `โปรดอ่านข้อความ (${countdown} วินาที)` : 'สามารถกดปุ่มเข้าใช้งานได้แล้ว'}
          </span>
          <Button
            onClick={() => setIsOpen(false)}
            disabled={countdown > 0}
            className={`transition-all duration-300 font-semibold text-xs px-5 py-2 rounded-xl ${
              countdown > 0
                ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
            }`}
          >
            {countdown > 0 ? (
              <>
                <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                รับทราบและเข้าสู่ระบบ ({countdown})
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                รับทราบและเข้าสู่ระบบ
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
