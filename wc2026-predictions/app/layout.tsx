import './globals.css';
import AppNav from './components/AppNav';
import { ToastProvider } from './components/Toast';
import Pwa from './components/Pwa';

export const metadata = {
  title: 'WC 2026 Predictions',
  description: 'Jeu de pronostics entre amis pour la Coupe du Monde 2026',
  appleWebApp: {
    capable: true,
    title: 'WC 2026',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#f3f6fc',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Sets the theme before first paint to avoid a flash of the wrong theme.
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('wc-theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ToastProvider>
          <AppNav />
          {children}
          <Pwa />
        </ToastProvider>
      </body>
    </html>
  );
}
