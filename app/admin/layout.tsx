import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";
import { TopBar } from "@/components/TopBar";
import { BottomNav, type NavItem } from "@/components/BottomNav";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "admin") redirect("/login");

  const d = getDict(s.language_pref);
  const items: NavItem[] = [
    { href: "/admin", label: d.nav.dashboard, icon: <Icon name="dashboard" size={22} /> },
    { href: "/admin/groups", label: d.nav.groups, icon: <Icon name="report" size={22} /> },
    { href: "/admin/students", label: d.nav.students, icon: <Icon name="users" size={22} /> },
    { href: "/admin/cars", label: d.nav.cars, icon: <Icon name="car" size={22} /> },
    { href: "/admin/payments", label: d.nav.payments, icon: <Icon name="clock" size={22} /> },
  ];

  return (
    <I18nProvider lang={s.language_pref}>
      <div className="min-h-screen pb-24">
        <TopBar title={d.appName} lang={s.language_pref} logoutLabel={d.nav.logout} />
        <div className="mx-auto w-full max-w-4xl px-4 py-4">{children}</div>
        <BottomNav items={items} />
      </div>
    </I18nProvider>
  );
}
