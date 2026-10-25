import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva,type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utils";
const buttonVariants=cva("inline-flex items-center justify-center gap-2 rounded-[10px] px-4 min-h-11 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] disabled:pointer-events-none disabled:opacity-50",{
 variants:{variant:{default:"bg-[var(--brasa)] text-[var(--on-brasa)] hover:brightness-95",secondary:"bg-[var(--soft)] text-[var(--ink)] hover:brightness-95",outline:"border border-[var(--stroke)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--soft)]",ghost:"text-[var(--ink)] hover:bg-[var(--soft)]"},size:{default:"min-h-11",icon:"size-11 px-0",sm:"min-h-10 px-3"}},defaultVariants:{variant:"default",size:"default"}
});
export function Button({className,variant,size,asChild=false,...props}:React.ComponentProps<"button">&VariantProps<typeof buttonVariants>&{asChild?:boolean}){const Comp=asChild?Slot:"button";return <Comp data-slot="button" className={cn(buttonVariants({variant,size,className}))} {...props}/>;}