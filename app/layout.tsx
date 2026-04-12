import type { Metadata } from "next"
import { DM_Mono } from "next/font/google"
import "./globals.css"

/* Fuentes — Satoshi no está en Google Fonts, usamos Next Font local
   o la alternativa Epilogue (similar sans bold) + DM Mono */
const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "PresupAI",
    template: "%s | PresupAI",
  },
  description:
    "Sistema SaaS de Control Presupuestal con IA para CRP Radios — CC231",
  keywords: ["presupuesto", "control presupuestal", "CRP Radios", "dashboard"],
  authors: [{ name: "CRP Radios" }],
  robots: "noindex, nofollow", // Aplicación interna
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${dmMono.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Satoshi desde Fontshare (CDN rápido y gratuito) */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,800,500,400&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-satoshi: 'Satoshi', system-ui, sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
