"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Users,
  Building2,
  ClipboardList,
  FileText,
  Wallet,
  Settings,
  LayoutDashboard,
  ClipboardCheck,
  LogOut,
  User,
} from "lucide-react";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "トラック",
    url: "/trucks",
    icon: Truck,
  },
  {
    title: "従業員",
    url: "/employees",
    icon: Users,
  },
  {
    title: "得意先",
    url: "/customers",
    icon: Building2,
  },
  {
    title: "日報",
    url: "/reports",
    icon: ClipboardList,
  },
  {
    title: "請求書",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "給料明細",
    url: "/payrolls",
    icon: Wallet,
  },
  {
    title: "確認事項",
    url: "/checklist",
    icon: ClipboardCheck,
  },
  {
    title: "設定",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Truck className="h-6 w-6" />
          <span className="font-bold text-lg">運送管理</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.url)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {session?.user && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="truncate">{session.user.name || session.user.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
