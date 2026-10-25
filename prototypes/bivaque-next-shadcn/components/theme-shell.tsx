"use client";
import * as React from "react";
import { ThemeProvider } from "next-themes";

/** System default per ADR-20261020; class-based dark styles supplied by shadcn tokens. */
export function ThemeShell({children}:{children:React.ReactNode}){
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="bivaque-shadcn-theme">{children}</ThemeProvider>;
}
