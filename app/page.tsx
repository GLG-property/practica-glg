import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/routes";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(homePathForRole(session.role));
}
