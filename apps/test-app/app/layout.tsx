import {Inter} from 'next/font/google'
import './globals.css'
import {SEOAnalyzer} from "@/app/blogs/_components/seo/SEOAnalyzer";

const inter = Inter({subsets: ['latin']})

export default function RootLayout({children}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={inter.className}>
        {children}
        <div style={{display: "flex", justifyContent: "center"}}>
            <div style={{maxWidth: "800px",}}>
                <SEOAnalyzer/>
            </div>
        </div>
        </body>
        </html>
    )
}