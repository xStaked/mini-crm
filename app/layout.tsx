import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini CRM - Prospect Registry",
  description: "CRM para evitar duplicidad de prospectos por RFC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
