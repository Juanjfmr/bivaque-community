import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title: "Bivaque — Laboratório shadcn/ui", description:"Exploração de componentes oficiais shadcn/ui com módulos demonstrativos do Bivaque."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body className="antialiased">{children}</body></html>}
