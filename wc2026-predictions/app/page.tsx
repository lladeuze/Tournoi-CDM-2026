import Link from 'next/link';
import {
  IconPronos,
  IconBall,
  IconCrown,
  IconLeagues,
} from './components/icons';

const features = [
  {
    Icon: IconPronos,
    title: 'Pronostique chaque match',
    text: 'Score exact, première équipe à marquer et premier buteur.',
  },
  {
    Icon: IconBall,
    title: 'Joue ton bonus ×2',
    text: 'Un bonus par phase pour doubler tes points sur le bon match.',
  },
  {
    Icon: IconCrown,
    title: 'Champion & trophées',
    text: 'Mise sur le vainqueur, le meilleur buteur, le ballon d’or…',
  },
  {
    Icon: IconLeagues,
    title: 'Ligues privées',
    text: 'Crée ta ligue, invite tes amis et comparez vos pronos.',
  },
];

export default function Home() {
  return (
    <main className="container hero">
      <section className="landing-hero">
        <span className="landing-badge">
          <span className="landing-dots">
            <i />
            <i />
            <i />
          </span>
          Coupe du Monde 2026
        </span>

        <h1>
          Tes pronos. Tes potes.
          <br />
          <span className="grad">Un seul champion.</span>
        </h1>

        <p className="landing-sub">
          Encode tes scores, choisis tes buteurs et grimpe au classement tout au
          long du tournoi.
        </p>

        <div className="landing-cta">
          <Link className="button" href="/login">
            Créer mon compte
          </Link>
          <Link className="button secondary" href="/leaderboard">
            Voir le classement
          </Link>
        </div>
      </section>

      <div className="grid" style={{ marginTop: 16 }}>
        {features.map(({ Icon, title, text }) => (
          <div key={title} className="card feature-tile">
            <span className="feature-ico">
              <Icon size={22} />
            </span>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
              <p className="small" style={{ margin: 0 }}>
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section
        className="card"
        style={{ textAlign: 'center', marginTop: 4 }}
      >
        <h2 style={{ marginTop: 0 }}>Prêt à jouer ?</h2>
        <p className="small" style={{ marginBottom: 18 }}>
          Crée ton compte en 30 secondes et rejoins la compétition.
        </p>
        <Link className="button" href="/login">
          Commencer maintenant
        </Link>
      </section>
    </main>
  );
}
