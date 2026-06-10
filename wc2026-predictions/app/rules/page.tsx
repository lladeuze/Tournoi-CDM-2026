export default function RulesPage() {
  return (
    <main className="container">
      <h1>Règlement</h1>

      <div className="card">
        <h2>Pronostics des matchs</h2>

        <p>
          Chaque participant peut pronostiquer le score exact de chaque match,
          la première équipe qui marque ainsi que le premier buteur.
        </p>

        <ul>
          <li>Bon résultat (victoire, nul ou défaite) : <strong>3 points</strong></li>
          <li>Score exact : <strong>5 points</strong></li>
          <li>Première équipe qui marque : <strong>2 points</strong></li>
          <li>Premier buteur trouvé : <strong>4 points</strong></li>
        </ul>

        <p className="small">
          Les points du score exact remplacent ceux du bon résultat. Un score
          exact rapporte donc 5 points, et non 5 + 3.
        </p>

        <p className="small">
          Le maximum possible sur un match sans bonus est de 11 points :
          score exact, première équipe qui marque et premier buteur.
        </p>
      </div>

      <div className="card">
        <h2>Bonus x2</h2>

        <p>
          Chaque joueur dispose d’un bonus x2 par phase autorisée. Ce bonus
          permet de doubler le total des points obtenus sur un match.
        </p>

        <ul>
          <li>Le bonus doit être activé avant le coup d’envoi.</li>
          <li>Un seul bonus peut être utilisé par phase.</li>
          <li>Le bonus est disponible jusqu’aux quarts de finale inclus.</li>
          <li>Le bonus n’est pas disponible pour les demi-finales et la finale.</li>
          <li>Une fois le match commencé, le bonus est verrouillé.</li>
        </ul>

        <p className="small">
          Exemple : un pronostic à 11 points avec bonus x2 rapporte 22 points.
        </p>
      </div>

      <div className="card">
        <h2>Pronostic Champion du Monde</h2>

        <h3>Champion initial</h3>

        <p>
          Chaque joueur peut sélectionner un champion du monde avant la fin de
          la première journée des phases de groupes.
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
          Si le premier choix est correct, les 20 points sont conservés, même si
          un deuxième choix a été effectué par la suite.
        </p>
      </div>

      <div className="card">
        <h2>Classement</h2>

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
        <h2>Verrouillage des pronostics</h2>

        <ul>
          <li>
            Les pronostics sont modifiables jusqu’au coup d’envoi du match.
          </li>

          <li>
            Une fois le match commencé, le score, la première équipe qui marque,
            le premier buteur et le bonus sont définitivement verrouillés.
          </li>

          <li>
            Les organisateurs se réservent le droit de corriger toute erreur
            technique exceptionnelle.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Coupe du Monde 2026</h2>

        <p>
          L’objectif principal est de s’amuser et de suivre la compétition dans
          une ambiance conviviale.
        </p>

        <p>
          Bonne chance à tous et que le meilleur pronostiqueur l’emporte ! 
        </p>
      </div>
    </main>
  );
}
