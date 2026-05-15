import type { ReactNode } from "react";

/**
 * Auth ekranları layout'u: tam ekran mavi-mor gradient arkaplan,
 * dekoratif bulanık daireler ve ortalanmış içerik.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gradient-primary relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-4">
      {/* Dekoratif bulanık daireler */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-white/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-violet-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-72 -translate-x-1/2 rounded-full bg-indigo-300/20 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
