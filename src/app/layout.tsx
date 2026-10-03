import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fair Drop | First come, first served",
  description: "A limited-seat ticket sale with a live FCFS line, ticket caps per account, and protected inventory holds.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
