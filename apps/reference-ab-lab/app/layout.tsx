import type { ReactNode } from "react";
import "./globals.css";
export const metadata = { title: "Bivaque · Laboratório de referências", description: "Experimento A/B com componentes reais da 21st.dev, sem o design system atual." };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
