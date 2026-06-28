import type { UserRole } from "@/lib/db/types";

/** Pagina principală în funcție de rol. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "operator":
      return "/operator";
    case "instructor":
      return "/instructor";
  }
}
