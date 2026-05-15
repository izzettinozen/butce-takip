import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Opsiyonel çağrı-aksiyon (CTA) butonu. */
  action?: ReactNode;
}

/** Veri yokken gösterilen minimal boş durum bileşeni. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-7" />
      </div>
      <h2 className="mt-4 text-base font-medium">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
