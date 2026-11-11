import React from "react";
import {cn} from "@/lib/utils";
export const Avatar=({className,...p}:React.HTMLAttributes<HTMLSpanElement>)=><span {...p} className={cn("relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-secondary text-foreground",className)}/>;
export const AvatarImage=({className,src,...p}:React.ImgHTMLAttributes<HTMLImageElement>)=>src?<img {...p} src={src} className={cn("absolute inset-0 h-full w-full object-cover",className)}/>:null;
export const AvatarFallback=({className,...p}:React.HTMLAttributes<HTMLSpanElement>)=><span {...p} className={cn("flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-primary",className)}/>;
