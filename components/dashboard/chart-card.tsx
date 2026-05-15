import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Veri yoksa true verilir; grafik yerine boş durum gösterilir. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Boş durumda gösterilecek opsiyonel aksiyon (örn. sayfa bağlantısı). */
  emptyAction?: ReactNode;
  children: ReactNode;
}

/** Dashboard grafiklerini saran kart: başlık + içerik / boş durum. */
export function ChartCard({
  title,
  description,
  isEmpty = false,
  emptyMessage = "Bu dönemde veri yok.",
  emptyAction,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-2xl">
              <BarChart3 className="size-6" />
            </div>
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
