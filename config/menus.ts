
import { Icon } from "@iconify/react";

export interface MenuItemProps {
  title: string;
  icon: any;
  href?: string;
  child?: MenuItemProps[];
  megaMenu?: MenuItemProps[];
  multi_menu?: MenuItemProps[];
  nested?: MenuItemProps[];
  onClick?: () => void;
}

export const menusConfig: MenuItemProps[] = [
  {
    title: "Dashboard",
    icon: "heroicons-outline:home",
    href: "/dashboard",
  },
  {
    title: "Mapa GPS",
    icon: "heroicons-outline:map",
    href: "/gps/map",
  },
  {
    title: "Tracking",
    icon: "heroicons-outline:location-marker",
    href: "/gps/tracking",
  },
  {
    title: "Rutas",
    icon: "heroicons-outline:route",
    href: "/gps/routes",
  },
  {
    title: "Configuración",
    icon: "heroicons-outline:cog",
    href: "/settings",
  },
];