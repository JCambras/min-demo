import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Min — Your practice, simplified.",
  description: "Workflow orchestration for Registered Investment Advisors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
