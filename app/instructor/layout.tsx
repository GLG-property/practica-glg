import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";
import { TopBar } from "@/components/TopBar";
import { BottomNav, type NavItem } from "@/components/BottomNav";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "instructor") redirect("/login");

  const d = getDict(s.language_pref);
  const items: NavItem[] = [
    { href: "/instructor", label: d.nav.today, icon: <Icon name="home" size={22} /> },
    { href: "/instructor/students", label: d.nav.students, icon: <Icon name="users" size={22} /> },
    { href: "/instructor/profile", label: d.nav.profile, icon: <Icon name="settings" size={22} /> },
  ];

  return (
    <I18nProvider lang={s.language_pref}>
      <div className="min-h-screen pb-24">
        <TopBar title={d.appName} lang={s.language_pref} logoutLabel={d.nav.logout} />
        <div className="mx-auto w-full max-w-2xl px-4 py-4">{children}</div>
        <BottomNav items={items} />
      </div>
    </I18nProvider>
  );
}
