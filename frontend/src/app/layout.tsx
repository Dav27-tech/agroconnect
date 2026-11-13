import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroConnect | Marché Agricole Numérique de la RDC",
  description:
    "Place de marché agricole professionnelle en République Démocratique du Congo. Connecte producteurs, revendeurs, fournisseurs d'intrants et acheteurs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  );
}
