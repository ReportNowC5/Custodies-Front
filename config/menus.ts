
import authService from "@/lib/services/auth.service";
import { Icon } from "@iconify/react";

export interface MenuItemProps {
    title: string;
    icon: any;
    href?: string;
    child?: MenuItemProps[];
    megaMenu?: MenuItemProps[];
    multi_menu?: MenuItemProps[];
    nested?: MenuItemProps[];
    isHeader?: boolean;
    onClick?: () => void;
}

export const menusConfig: MenuItemProps[] = [
    {
        title: "Dashboard",
        icon: "heroicons:home",
        href: "/dashboard",
    },
    {
        title: "Clientes",
        icon: "heroicons:users",
        href: "/customers",
    },
    {
        title: "Usuarios",
        icon: "heroicons:user-plus",
        href: "/users",
    },
    {
        title: "Dispositivos",
        icon: "heroicons:wifi",
        href: "/devices",
    }
];