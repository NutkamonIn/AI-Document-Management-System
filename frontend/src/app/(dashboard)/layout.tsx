'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  FileText, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Bot, 
  Menu, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatProvider } from '@/context/ChatContext';
import { AnnouncementModal } from '@/components/ui/announcement-modal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'เอกสารทั้งหมด', href: '/documents', icon: FileText },
    { name: 'ถาม-ตอบ AI Chat', href: '/chat', icon: MessageSquare },
    { name: 'การตั้งค่า', href: '/settings', icon: Settings },
  ];

  return (
    <ChatProvider>
      <AnnouncementModal />
      <div className="flex h-screen bg-gray-100 overflow-hidden w-full">
        {/* Backdrop Overlay บนมือถือ */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Component */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div>
            {/* Logo & Brand Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base leading-tight">AI Doc Hub</h1>
                  <p className="text-xs text-slate-400">Document Management</p>
                </div>
              </div>

              {/* ปุ่มกดปิดเมนูบนมือถือ */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-slate-400 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>AI Engine: Groq Cloud</span>
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gray-50">
          {/* Header Component */}
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-8 shrink-0">
            <div className="flex items-center gap-3">
              {/* ปุ่ม Hamburger เปิดเมนูบนมือถือ */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-gray-600"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {navigation.find((nav) => pathname.startsWith(nav.href))?.name || 'Dashboard'}
              </h2>
            </div>

            {/* User Profile Menu */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors outline-none cursor-pointer">
                  <Avatar className="h-8 w-8 bg-blue-600 text-white">
                    <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-700 leading-none">{session?.user?.name || 'ผู้ใช้งาน'}</p>
                    <p className="text-xs text-gray-500 mt-1">{session?.user?.email}</p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Dynamic Content */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
            {children}
          </main>
        </div>
      </div>
    </ChatProvider>
  );
}