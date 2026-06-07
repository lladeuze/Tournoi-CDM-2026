export default function RulesPage() {
  return (
    <main className="container">
      <h1>📋 Règlement</h1>

      <div className="card">
        <h2>🎯 Pronostics des matchs</h2>

        <p>
          Chaque participant peut pronostiquer le score exact de chaque match
          ainsi que le premier buteur.
        </p>

        <ul>
          <li>Bon résultat (victoire, nul ou défaite) : <strong>1 point</strong></li>
          <li>Score exact : <strong>3 points</strong></li>
          <li>Premier buteur trouvé : <strong>1 point</strong></li>
        </ul>

        <p className="small">
          Les points du score exact remplacent ceux du bon résultat.
        </p>
      </div>

      <div className="card">
        <h2>🔥 Bonus x2</h2>

        <p>
          Chaque joueur dispose d’un bonus lui permettant de doubler les points
          d’un match.
        </p>

        <ul>
          <li>Le bonus doit être activé avant le coup d’envoi.</li>
          <li>Un seul bonus peut être utilisé par match.</li>
          <li>Une fois le match commencé, le bonus est verrouillé.</li>
        </ul>
      </div>

      <div className="card">
        <h2>🏆 Pronostic Champion du Monde</h2>

        <h3>Champion initial</h3>

        <p>
          Chaque joueur doit sélectionner un champion avant la fin de la première
          journée des phases de groupes.
        </p>

        <ul>
          <li>Champion correct : <strong>+20 points</strong></li>
        </ul>

        <h3>Champion après les groupes</h3>

        <p>
          Une deuxième sélection est possible entre la fin des groupes et le
          début de la phase à élimination directe.
        </p>

        <ul>
          <li>Champion correct : <strong>+10 points</strong></li>
        </ul>

        <p className="small">
          Si votre premier choix est correct, vous obtenez toujours les 20
          points, même si vous avez changé d’avis par la suite.
        </p>
      </div>

      <div className="card">
        <h2>📊 Classement</h2>

        <p>
          Le classement général est calculé à partir de l’ensemble des points
          obtenus durant la compétition.
        </p>

        <p>En cas d’égalité, les critères suivants sont utilisés :</p>

        <ol>
          <li>Nombre de scores exacts</li>
          <li>Nombre de bons résultats</li>
          <li>Nombre de premiers buteurs trouvés</li>
        </ol>
      </div>

      <div className="card">
        <h2>🔒 Verrouillage des pronostics</h2>

        <ul>
          <li>
            Les pronostics sont modifiables jusqu’au coup d’envoi du match.
          </li>

          <li>
            Une fois le match commencé, le score, le buteur et le bonus sont
            définitivement verrouillés.
          </li>

          <li>
            Les organisateurs se réservent le droit de corriger toute erreur
            technique exceptionnelle.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>⚽ Coupe du Monde 2026</h2>

        <p>
          L’objectif principal est de s’amuser et de suivre la compétition dans
          une ambiance conviviale.
        </p>

        <p>
          Bonne chance à tous et que le meilleur pronostiqueur l’emporte ! 🏆
        </p>
      </div>
    </main>
  );
}
