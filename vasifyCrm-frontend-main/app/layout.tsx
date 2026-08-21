
// import type React from "react";
// import type { Metadata } from "next";
// import { Inter, Poppins } from "next/font/google";
// import "./globals.css";
// import { AuthProvider } from "@/contexts/auth-context";
// import { CRMProvider } from "@/contexts/crm-context";

// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-inter",
// });

// const poppins = Poppins({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
//   display: "swap",
//   variable: "--font-poppins",
// });

// export const metadata: Metadata = {
//   title: "Renal ease CRM - Customer Relationship Management",
//   description:
//     "Professional CRM system for managing customers, leads, deals, and WhatsApp automation",
//   generator: "v0.app",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en" className={`${inter.variable} ${poppins.variable} antialiased`}>
//       <body className="min-h-screen bg-background text-foreground">
//         <AuthProvider>
//           <CRMProvider>{children}</CRMProvider>
//         </AuthProvider>
//       </body>
//     </html>
//   );
// }

//testing



import type React from "react";
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { CRMProvider } from "@/contexts/crm-context";
import { AppShell } from "@/components/app-shell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Vasifytech CRM - Customer Relationship Management",
  description:
    "Professional CRM system for managing customers, leads, deals, and WhatsApp automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} antialiased`}>
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          <CRMProvider>
            {/* AppShell decides whether to show sidebar or not */}
            <AppShell>{children}</AppShell>
          </CRMProvider>
        </AuthProvider>
      </body>
    </html>
  );
}