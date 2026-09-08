import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700', '800'] });

export const metadata = {
  title: 'RNCR — Registre National de Contrôle Routier',
  description: "Vérification et enregistrement des engins roulants",
  manifest: '/manifest.json',
  icons: {
    icon: '/icone.svg',
    apple: '/icone.svg',
  },
};

export const viewport = {
  themeColor: '#14293F',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="tricolore" />
        {children}
      </body>
    </html>
  );
}
