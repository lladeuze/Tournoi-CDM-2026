import Link from 'next/link';

export default function Home() {
  return (
    <main className="container hero">
      <div className="card">
        <span className="badge">MVP prêt à importer sur GitHub</span>
        <h1>Pronostics Coupe du Monde 2026 entre potes</h1>
        <p className="small">Encode tes scores, choisis ton premier buteur et grimpe au classement.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          <Link className="button" href="/login">Créer un compte / se connecter</Link>
          <Link className="button" href="/leaderboard">Voir le classement</Link>
        </div>
      </div>
    </main>
  );
}
