import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Bivaque — Next + shadcn/ui",description:"Protótipo experimental baseado na Rodada 72 aprovada."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>;}