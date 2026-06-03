import { Hourglass } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

interface YakindaPlaceholderProps {
  title: string;
  /** Sayfa başlığı altındaki açıklama. */
  description?: string;
}

/**
 * Henüz geliştirilmemiş yatırım sayfaları için "Yakında" yer tutucusu
 * (Faz 16b/16c'de gerçek sayfalar gelecek).
 */
export function YakindaPlaceholder({
  title,
  description,
}: YakindaPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
          <Hourglass className="size-7" />
        </div>
        <h2 className="mt-4 text-base font-medium">Bu özellik yakında geliyor</h2>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Bu sayfa Faz 16b/16c kapsamında geliştirilecek. Şimdilik yatırım
          araçlarınızı tanımlayabilirsiniz.
        </p>
      </Card>
    </div>
  );
}
