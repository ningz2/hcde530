import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MP2 Affinity Diagram Generator",
  description: "Privacy-first AI powered affinity diagram scaffolding for qualitative research."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
