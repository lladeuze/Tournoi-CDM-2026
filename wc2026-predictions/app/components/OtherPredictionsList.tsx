type OtherPrediction = {
  user_id: string;
  username: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_first_scoring_team_id: string | null;
  predicted_first_scorer: string | null;
};

/** Compact, mobile-friendly list of other players' predictions (replaces a wide table). */
export default function OtherPredictionsList({
  predictions,
  teamName,
}: {
  predictions: OtherPrediction[];
  teamName: (id: string | null) => string;
}) {
  if (predictions.length === 0) {
    return <p className="small">Aucun prono disponible pour cette ligue.</p>;
  }

  return (
    <div className="opred-list">
      {predictions.map((p) => (
        <div className="opred-item" key={p.user_id}>
          <span className="opred-name">{p.username || 'Joueur'}</span>
          <span className="opred-score">
            {p.predicted_home_score ?? '-'}–{p.predicted_away_score ?? '-'}
          </span>
          <span className="opred-meta">
            1ʳᵉ équipe : {teamName(p.predicted_first_scoring_team_id)} · 1ᵉʳ buteur :{' '}
            {p.predicted_first_scorer || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
