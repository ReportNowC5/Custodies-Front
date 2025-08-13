import type { Metadata } from 'next'
import './assets/scss/globals.scss' // Ruta correcta a los estilos globales

export const metadata: Metadata = {
  title: 'Custodias ReportNow',
  description: 'Sistema de gestión de custodias y reportes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  )
}