import React from "react";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings } from "@/components/svg";
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
      <button className="w-11 h-11  mx-auto text-default-500 flex items-center justify-center  rounded-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground">
        <Settings className=" h-8 w-8" />
      </button>
      <div>
        {user?.avatar && (
          <Image
            src={user?.avatar}
            alt={user?.name ?? ""}
            width={36}
            height={36}
            className="rounded-full"
          />
        )}
      </div>
    </div>
  );
};
export default FooterMenu;
