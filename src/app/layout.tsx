import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copper Kettle Café | Order & Café Operations",
  description:
    "Order ahead, follow your coffee, and make café service flow. Premium café ordering system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
