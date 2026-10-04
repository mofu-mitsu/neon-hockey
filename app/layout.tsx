import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NEON HOCKEY: CHARACTER ARENA',
  description: '個性豊かなキャラクターたちと挑むサイバーネオン・エアホッケーアーケード。1vs1や白熱の2vs2タッグバトル、カオスなダブルパックなど多彩なモードを搭載。',
  openGraph: {
    title: 'NEON HOCKEY: CHARACTER ARENA',
    description: '個性豊かなキャラクターたちと挑むサイバーネオン・エアホッケーアーケード。1vs1や白熱の2vs2タッグバトル、カオスなダブルパックなど多彩なモードを搭載。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEON HOCKEY: CHARACTER ARENA',
    description: '個性豊かなキャラクターたちと挑むサイバーネオン・エアホッケーアーケード。1vs1や白熱の2vs2タッグバトル、カオスなダブルパックなど多彩なモードを搭載。',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
