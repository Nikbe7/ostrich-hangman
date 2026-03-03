import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { ToastProvider } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Ostrich Hangman',
    description: 'Team Ostrich Hänga Gubbe',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="sv">
            <body className={inter.className}>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    )
}
