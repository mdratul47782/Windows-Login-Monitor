import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory PC Login Monitor",
  description: "ফ্যাক্টরির পিসিতে লগইন ব্যর্থতার মনিটরিং ড্যাশবোর্ড",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
