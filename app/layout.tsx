import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clubbify",
  description: "Student Retention Management through clubs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
