import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "BulkOrder Automation Platform",
  description:
    "Automate bulk order processing — from import to tracking, powered by intelligent matching and supplier automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex font-sans">
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            <div className="p-8">{children}</div>
          </main>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
