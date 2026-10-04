import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const APP_URL = 'https://neon-hockey-mu.vercel.app';
const APP_TITLE = 'NEON HOCKEY: CHARACTER ARENA | 無料で遊べる超高速サイバーネオン・エアホッケー';
const APP_DESCRIPTION = '個性豊かな18人のキャラクターと挑む本格サイバーネオン・エアホッケーアーケード！1vs1や白熱の2vs2タッグバトル、カオスなマルチボールやビリヤード・カーリングモードも搭載。ブラウザですぐに無料で遊べます。';

export const viewport: Viewport = {
  themeColor: '#060914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_TITLE,
    template: '%s | NEON HOCKEY: CHARACTER ARENA',
  },
  description: APP_DESCRIPTION,
  applicationName: 'NEON HOCKEY: CHARACTER ARENA',
  keywords: [
    'エアホッケー',
    'ネオンホッケー',
    'エアホッケー 無料',
    'ブラウザゲーム',
    '無料ゲーム',
    '2人対戦',
    '2vs2',
    'ビリヤード',
    'カーリング',
    'サイバーパンク',
    'エアホッケーゲーム',
    'アーケードゲーム',
    'オンラインゲーム',
    'Air Hockey Game',
    'Neon Hockey',
  ],
  authors: [{ name: 'NEON HOCKEY Production' }],
  creator: 'NEON HOCKEY Production',
  publisher: 'NEON HOCKEY Production',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: APP_URL,
    siteName: 'NEON HOCKEY: CHARACTER ARENA',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'NEON HOCKEY: CHARACTER ARENA - 超高速サイバーネオン・エアホッケー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Schema.org structured data (WebApplication / VideoGame)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'NEON HOCKEY: CHARACTER ARENA',
    url: APP_URL,
    description: APP_DESCRIPTION,
    genre: ['Arcade', 'Sports Game', 'Action'],
    playMode: 'MultiPlayer',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    inLanguage: 'ja',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
    },
    image: `${APP_URL}/ogp.png`,
  };

  return (
    <html lang="ja">
      <head>
        {/* Google Analytics ※全ページ共通計測タグ */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GNTX973GET"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GNTX973GET');
          `}
        </Script>

        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-[#02030a] text-slate-100 antialiased selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}
