'use client';

import { Check, X } from 'lucide-react';

interface PasswordStrengthCardProps {
  password: string;
}

export function PasswordStrengthCard({ password }: PasswordStrengthCardProps) {
  if (!password) return null;

  const isEnglishOnly = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password);
  const hasMinLength = password.length >= 8;
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const passedCount = [isEnglishOnly, hasMinLength, hasLowerCase, hasUpperCase, hasNumberOrSymbol].filter(Boolean).length;

  let strengthLabel = 'อ่อน';
  let strengthColor = 'bg-red-500 text-red-600';
  let widthPercent = 'w-1/3';

  if (!isEnglishOnly) {
    strengthLabel = 'ไม่อนุญาตภาษาไทย/อักขระพิเศษ Unicode';
    strengthColor = 'bg-red-500 text-red-600';
    widthPercent = 'w-1/4';
  } else if (passedCount <= 2) {
    strengthLabel = 'อ่อน';
    strengthColor = 'bg-red-500 text-red-600';
    widthPercent = 'w-1/3';
  } else if (passedCount <= 4) {
    strengthLabel = 'ปานกลาง';
    strengthColor = 'bg-yellow-500 text-yellow-600';
    widthPercent = 'w-2/3';
  } else {
    strengthLabel = 'แข็งแกร่ง';
    strengthColor = 'bg-green-500 text-green-600';
    widthPercent = 'w-full';
  }

  return (
    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3 mt-2 text-xs">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between font-medium">
          <span className="text-gray-500">ความแข็งแกร่งรหัสผ่าน:</span>
          <span className={`font-semibold ${strengthColor.split(' ')[1]}`}>{strengthLabel}</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-300 ${strengthColor.split(' ')[0]} ${widthPercent}`} />
        </div>
      </div>

      {/* Checklist Rules */}
      <div className="space-y-1.5 pt-1">
        <div className={`flex items-center gap-1.5 ${isEnglishOnly ? 'text-green-600 font-medium' : 'text-red-500'}`}>
          {isEnglishOnly ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>ตัวอักษรภาษาอังกฤษ/สัญลักษณ์มาตรฐานเท่านั้น (ห้ามใช้ภาษาไทย)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          {hasMinLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>ความยาวอย่างน้อย 8 ตัวอักษร</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          {hasLowerCase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>มีตัวพิมพ์เล็ก (a-z)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          {hasUpperCase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>มีตัวพิมพ์ใหญ่ (A-Z)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          {hasNumberOrSymbol ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>มีตัวเลข (0-9) หรือสัญลักษณ์พิเศษ (!@#$%^&*)</span>
        </div>
      </div>
    </div>
  );
}
