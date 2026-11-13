import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import { CartProvider } from "../context/CartContext";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

export const metadata: Metadata = {
  title: "AgroConnect | Marché Agricole Numérique de la RDC",
  description:
    "Place de marché agricole professionnelle en République Démocratique du Congo. Connecte producteurs ruraux, revendeurs urbains, fournisseurs d'intrants et acheteurs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-stone-50 text-stone-900">
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col bg-white">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
