import {
  LayoutDashboard,
  Receipt,
  Tags,
  ListTree,
  TrendingUp,
  Wallet,
  CalendarRange,
  CreditCard,
  Target,
  Repeat,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sol menü / alt menü için gruplu navigasyon yapılandırması. */
export const navGroups: NavGroup[] = [
  {
    label: "Genel",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Giderler", href: "/giderler", icon: Receipt },
      { title: "Gelirler", href: "/gelirler", icon: TrendingUp },
      { title: "Raporlar", href: "/raporlar", icon: BarChart3 },
    ],
  },
  {
    label: "Tanımlar",
    items: [
      { title: "Gider Türleri", href: "/gider-turleri", icon: Tags },
      { title: "Gider Kalemleri", href: "/gider-kalemleri", icon: ListTree },
      { title: "Gelir Türleri", href: "/gelir-turleri", icon: Wallet },
      { title: "Ödeme Türleri", href: "/odeme-turleri", icon: CreditCard },
      { title: "Dönemler", href: "/donemler", icon: CalendarRange },
    ],
  },
  {
    label: "Planlama",
    items: [
      { title: "Bütçe Hedefleri", href: "/butce-hedefleri", icon: Target },
      {
        title: "Tekrarlayan Giderler",
        href: "/tekrarlayan-giderler",
        icon: Repeat,
      },
    ],
  },
];

/** Tüm navigasyon öğelerinin düz listesi. */
export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** Alt mobil menüde gösterilecek öncelikli öğeler. */
export const primaryNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Giderler", href: "/giderler", icon: Receipt },
  { title: "Gelirler", href: "/gelirler", icon: TrendingUp },
  { title: "Raporlar", href: "/raporlar", icon: BarChart3 },
  { title: "Ayarlar", href: "/ayarlar", icon: Settings },
];
