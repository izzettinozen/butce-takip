import { redirect } from "next/navigation";

/**
 * Kök rota. Middleware oturum kontrolü yapar:
 * oturum yoksa /login'e, varsa buradan /dashboard'a yönlendirilir.
 */
export default function RootPage() {
  redirect("/dashboard");
}
