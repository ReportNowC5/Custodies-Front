import type { Metadata } from 'next'
import './assets/scss/globals.scss'

export const metadata: Metadata = {
  title: 'Custodias ReportNow',
  description: 'Sistema de gestión de custodias y reportes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children; // Solo retornar children, sin html/body
}