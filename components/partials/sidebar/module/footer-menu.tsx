import React from "react";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logout, Users, UserSign } from "@/components/svg";
import { authService } from "@/lib/services/auth.service";
import { useState, useEffect } from "react";
import { User } from "@/lib/types/auth";
import Image from "next/image";
const FooterMenu = () => {
    const [user, setUser] = useState<User | null>(null);
    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        };
        loadUser();
    }, []);
    return (
        <div className="space-y-5 flex flex-col items-center justify-center pb-6">
            <button
                onClick={() => authService.logout()}
                className="w-11 h-11  mx-auto text-default-500 flex items-center justify-center  rounded-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
            >
                <Logout className=" h-8 w-8" />
            </button>
            <div>
                {user?.avatar ? (
                    //  <Image
                    //    src={user?.avatar}
                    //    alt={user?.name ?? ""}
                    //    width={36}
                    //    height={36}
                    //    className="rounded-full"
                    //  />
                    <Avatar>
                        <AvatarImage src={user?.avatar} alt={user?.name ?? ""} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                ) : (

                    <Avatar>
                        <AvatarImage src="https://avatar.iran.liara.run/public/6" alt={user?.name ?? ""} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </div>
    );
};
export default FooterMenu;
