import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI销售雷达",
  description: "AI-powered Sales Lead Analyzer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
