import {
  BarChart3,
  CalendarDays,
  House,
  Settings,
  Shield,
  Tv,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    label: "Geral",
    items: [{ label: "Início", href: "/dashboard", icon: House }],
  },
  {
    label: "Gestão Desportiva",
    items: [
      { label: "Jogadores", href: "/jogadores", icon: Users },
      { label: "Equipas", href: "/equipas", icon: Shield },
      { label: "Jogos", href: "/jogos", icon: CalendarDays },
    ],
  },
  {
    label: "Análise",
    items: [
      { label: "Estatísticas", href: "/estatisticas", icon: BarChart3 },
      { label: "TV do Clube", href: "/tv", icon: Tv },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Administração", href: "/administracao", icon: Settings }],
  },
];

export const pageTitles = Object.fromEntries(
  navigationSections.flatMap((section) => section.items.map((item) => [item.href, item.label])),
);
