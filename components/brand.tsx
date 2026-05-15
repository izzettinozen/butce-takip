import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  /** İkon ve yazı boyutu. */
  size?: "sm" | "md" | "lg";
  /** Sadece ikon gösterilsin mi? */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { box: "size-8", icon: "size-4", text: "text-base" },
  md: { box: "size-10", icon: "size-5", text: "text-xl" },
  lg: { box: "size-14", icon: "size-7", text: "text-2xl" },
};

/** Uygulama logosu: gradient ikon kutusu + "Bütçe Takip" yazısı. */
export function Brand({ className, size = "md", iconOnly = false }: BrandProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-md shadow-indigo-500/30",
          s.box,
        )}
      >
        <Wallet className={s.icon} aria-hidden />
      </div>
      {!iconOnly && (
        <span className={cn("font-semibold tracking-tight", s.text)}>
          Bütçe Takip
        </span>
      )}
    </div>
  );
}
