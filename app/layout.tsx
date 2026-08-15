import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashyFlash",
  description: "Create folders of flashcards and study them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
