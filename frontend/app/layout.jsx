import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata = {
  title: {
    default: 'GroksBlog — Premium News & Insights',
    template: '%s | GroksBlog',
  },

  description:
    'Cutting-edge news, analysis, and insights on technology, AI, politics, and more.',

  keywords: [
    'news',
    'technology',
    'AI',
    'politics',
    'business',
    'insights',
  ],

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },

  metadataBase: new URL('https://groksblog.com'),

  openGraph: {
    title: 'GroksBlog — Premium News & Insights',
    description:
      'Breaking updates in AI, Technology, Business, and World Affairs.',
    siteName: 'GroksBlog',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'GroksBlog',
      },
    ],
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'GroksBlog',
    description:
      'Breaking updates in AI, Technology, Business, and World Affairs.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable} font-body`}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-dm-sans)',
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}