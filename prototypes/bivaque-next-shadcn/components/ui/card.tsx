import * as React from "react";
import {cn} from "@/lib/utils";
export function Card({className,...props}:React.ComponentProps<"article">){return <article data-slot="card" className={cn("rounded-xl border border-[var(--stroke)] bg-[var(--panel)] overflow-hidden",className)} {...props}/>;}