import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  /** Kartın altında gösterilecek bağlantı/aksiyon alanı. */
  footer?: ReactNode;
}

/**
 * Auth ekranları için cam efektli (glassmorphism) kart.
 * Tema duyarlıdır: açık modda beyaz, koyu modda koyu cam görünür.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="rounded-2xl border border-white/25 bg-card/85 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur-2xl sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Brand size="lg" iconOnly className="mb-4" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {children}

      {footer && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
