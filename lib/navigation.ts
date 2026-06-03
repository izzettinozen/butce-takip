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
  PieChart,
  ArrowLeftRight,
  Coins,
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
    label: "Yatırım",
    items: [
      { title: "Yatırım Portföyü", href: "/yatirim-portfoyu", icon: PieChart },
      {
        title: "Yatırım İşlemleri",
        href: "/yatirim-islemleri",
        icon: ArrowLeftRight,
      },
      { title: "Yatırım Araçları", href: "/yatirim-araclari", icon: Coins },
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

/** Alt mobil çubuğun ilk 4 hızlı öğesi (5. buton "Menü"dür). */
export const primaryNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Giderler", href: "/giderler", icon: Receipt },
  { title: "Gelirler", href: "/gelirler", icon: TrendingUp },
  { title: "Raporlar", href: "/raporlar", icon: BarChart3 },
];

/**
 * Mobil "Menü" bottom sheet'inin içeriği — alt çubuğa sığmayan
 * sayfalar. Tanımlar/Planlama navGroups'tan türetilir, Ayarlar
 * ayrı "Diğer" grubunda.
 */
export const bottomSheetGroups: NavGroup[] = [
  navGroups.find((g) => g.label === "Yatırım")!,
  navGroups.find((g) => g.label === "Tanımlar")!,
  navGroups.find((g) => g.label === "Planlama")!,
  {
    label: "Diğer",
    items: [{ title: "Ayarlar", href: "/ayarlar", icon: Settings }],
  },
];
