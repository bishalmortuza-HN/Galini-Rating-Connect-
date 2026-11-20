import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galini Rate & Connect",
  description: "Insurance quoting and carrier appetite workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
