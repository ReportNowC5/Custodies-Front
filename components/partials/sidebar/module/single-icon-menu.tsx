"use client";
import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { translate } from "@/lib/utils";
const SingleIconMenu = ({ index, activeIndex, item, locationName, trans }: {
  index: number;
  activeIndex: number | null;
  item: any;
  locationName: string;
  trans: any;
}) => {
  const { icon, title, href } = item;
  // compute finalHref with optional language prefix based on current pathname
  // (client-only hook is safe because this is a client component)
  const pathname = typeof window !== "undefined" ? window.location.pathname : undefined;
  const pathSegments = (pathname === null || pathname === void 0 ? void 0 : pathname.split("/")) || [];
  const langCandidate = pathSegments[1];
  const hasLang = langCandidate && ["en", "es"].includes(langCandidate);
  const finalHref = href && href.startsWith("/") && hasLang ? `/${langCandidate}${href}` : href;
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {href ? (
              <Link
                href={finalHref}
                className={cn(
                  "h-12 w-12 mx-auto rounded-md  transition-all duration-300 flex flex-col items-center justify-center cursor-pointer relative",
                  {
                    "bg-primary/10  text-primary": locationName === href,
                    "text-default-500 dark:text-default-400 hover:bg-primary/10  hover:text-primary ":
                      locationName !== href,
                  }
                )}
              >
                <Icon icon={icon} className="w-8 h-8" />
              </Link>
            ) : (
              <button
                className={cn(
                  "h-12 w-12 mx-auto rounded-md transition-all duration-300 flex flex-col items-center justify-center cursor-pointer relative  ",
                  {
                    "bg-primary/10 dark:bg-primary dark:text-primary-foreground  text-primary data-[state=delayed-open]:bg-primary/10 ":
                      activeIndex === index,
                    " text-default-500 dark:text-default-400 data-[state=delayed-open]:bg-primary/10  data-[state=delayed-open]:text-primary":
                      activeIndex !== index,
                  }
                )}
              >
                <Icon icon={icon} className="w-6 h-6" />
              </button>
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className=" capitalize">
            {translate(title, trans)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

export default SingleIconMenu;
