
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
        icon: "heroicons:home", // Cambiar de heroicons-outline:home
        href: "/dashboard",
    },
    {
        title: "Clientes",
        icon: "heroicons:users", // Cambiar de heroicons-outline:users
        href: "/customers",
    },
    {
        title: "Usuarios",
        icon: "heroicons:user-plus", // Cambiar de heroicons-outline:location-marker
        href: "/users",
    },
    {
        title: "Dispositivos",
        icon: "heroicons:wifi", // Cambiar de heroicons-outline:route
        href: "/devices",
    },
];