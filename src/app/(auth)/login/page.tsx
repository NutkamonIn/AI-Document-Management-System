'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ</CardTitle>
        <CardDescription>ยินดีต้อนรับกลับมา กรอกอีเมลและรหัสผ่านเพื่อใช้งานในระบบ</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!error && registered && (
            <div className="rounded-lg bg-green-50 p-3.5 text-sm text-green-700 border border-green-200 font-medium">
              สมัครสมาชิกสำเร็จ โปรดเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3.5 text-sm text-red-700 border border-red-200 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
          <p className="text-center text-sm text-gray-600">
            ยังไม่มีบัญชีผู้ใช้งาน{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              สมัครสมาชิกใหม่
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Suspense fallback={<div className="text-center text-sm text-gray-500">กำลังโหลด...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}