import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'WC 2026 Predictions',
  description: 'Jeu de pronostics entre amis pour la Coupe du Monde 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <nav className="nav">
          <Link className="brand" href="/">
            🏆 WC 2026 Predictions
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div className="nav-links">
              <Link href="/matches">Matchs</Link>
              <Link href="/predictions">Mes pronos</Link>
              <Link href="/leaderboard">Classement</Link>
              <Link href="/profile">Profil</Link>
              <Link href="/admin">Admin</Link>
            </div>

            <Link href="/login">Connexion</Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
