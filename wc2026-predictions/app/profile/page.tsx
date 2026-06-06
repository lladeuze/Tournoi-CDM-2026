'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
};

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
  predictions_count: number;
  exact_scores_count: number;
  correct_results_count: number;
  first_scorers_count: number;
};

type MatchInfo = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_at: string;
  status: string;
  phase: string;
};

type PredictionRow = {
  id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_first_scorer: string | null;
  double_bonus: boolean;
  points: number;
  exact_score: boolean;
  correct_result: boolean;
  first_scorer_correct: boolean;
  matches: MatchInfo | null;
};

const phaseLabels: Record<string, string> = {
  group_j1: 'Poules J1',
  group_j2: 'Poules J2',
  group_j3: 'Poules J3',
  round_of_32: '16es de finale',
  round_of_16: '8es de finale',
  quarter: 'Quarts de finale',
  semi: 'Demi-finales',
  final: 'Finale',
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setMessage(`Erreur utilisateur : ${userError.message}`);
      setLoading(false);
      return;
    }

    const user = userData.user;

    if (!user) {
      setMessage('Connecte-toi pour voir ton profil.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [
      { data: profileData, error: profileError },
      { data: leaderboardData, error: leaderboardError },
      { data: predictionsData, error: predictionsError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          `
          id,
          email,
          username,
          is_admin,
          created_at
        `
        )
        .eq('id', user.id)
        .single(),

      supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .order('exact_scores_count', { ascending: false })
        .order('correct_results_count', { ascending: false }),

      supabase
        .from('predictions')
        .select(
          `
          id,
          match_id,
          predicted_home_score,
          predicted_away_score,
          predicted_first_scorer,
          double_bonus,
          points,
          exact_score,
          correct_result,
          first_scorer_correct,
          matches (
            home_team,
            away_team,
            home_score,
            away_score,
            kickoff_at,
            status,
            phase
          )
        `
        )
        .eq('user_id', user.id),
    ]);

    if (profileError) {
      setMessage(`Erreur profil : ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (leaderboardError) {
      setMessage(`Erreur classement : ${leaderboardError.message}`);
      setLoading(false);
      return;
    }

    if (predictionsError) {
      setMessage(`Erreur pronostics : ${predictionsError.message}`);
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile);
    setUsername(profileData.username || '');

    const leaderboard = (leaderboardData || []) as LeaderboardRow[];
    const index = leaderboard.findIndex((row) => row.user_id === user.id);

    setRank(index >= 0 ? index + 1 : null);
    setMe(index >= 0 ? leaderboard[index] : null);

    const normalizedPredictions: PredictionRow[] = (predictionsData || []).map(
      (prediction: any) => ({
        id: prediction.id,
        match_id: prediction.match_id,
        predicted_home_score: prediction.predicted_home_score,
        predicted_away_score: prediction.predicted_away_score,
        predicted_first_scorer: prediction.predicted_first_scorer,
        double_bonus: prediction.double_bonus,
        points: prediction.points,
        exact_score: prediction.exact_score,
        correct_result: prediction.correct_result,
        first_scorer_correct: prediction.first_scorer_correct,
        matches: Array.isArray(prediction.matches)
          ? prediction.matches[0] || null
          : prediction.matches || null,
      })
    );

    setPredictions(normalizedPredictions);
    setLoading(false);
  }

  async function updateUsername() {
    if (!userId || !username.trim()) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
      })
      .eq('id', userId);

    if (error) {
      setMessage(`Erreur pseudo : ${error.message}`);
      return;
    }

    setMessage('Pseudo mis à jour.');
    await loadProfile();
  }

  async function updatePassword() {
    if (!newPassword || newPassword.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(`Erreur mot de passe : ${error.message}`);
      return;
    }

    setNewPassword('');
    setMessage('Mot de passe mis à jour.');
  }

  const bonusUsed = useMemo(() => {
    return predictions.filter((prediction) => prediction.double_bonus);
  }, [predictions]);

  const finishedPredictions = useMemo(() => {
    return predictions
      .filter((prediction) => prediction.matches?.status === 'finished')
      .sort((a, b) => {
        const dateA = new Date(a.matches?.kickoff_at || '').getTime();
        const dateB = new Date(b.matches?.kickoff_at || '').getTime();
        return dateB - dateA;
      });
  }, [predictions]);

  const bestPredictions = useMemo(() => {
    return [...finishedPredictions]
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [finishedPredictions]);

  return (
    <main className="container">
      <h1>👤 Mon profil</h1>

      {loading && <p className="small">Chargement du profil...</p>}
      {message && <p className="error">{message}</p>}

      {!loading && userId && (
        <>
          <div className="grid">
            <div className="card">
              <p className="small">Classement</p>
              <h2>{rank ? `#${rank}` : 'Non classé'}</h2>
            </div>

            <div className="card">
              <p className="small">Points</p>
              <h2>{me?.total_points ?? 0} pts</h2>
            </div>

            <div className="card">
              <p className="small">Scores exacts</p>
              <h2>{me?.exact_scores_count ?? 0}</h2>
            </div>

            <div className="card">
              <p className="small">Buteurs trouvés</p>
              <h2>{me?.first_scorers_count ?? 0}</h2>
            </div>
          </div>

          <div className="card">
            <h2>⚙️ Mon compte</h2>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <p className="small">Email</p>
                <strong>{profile?.email || '-'}</strong>
              </div>

              <div>
                <p className="small">Pseudo</p>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Ton pseudo"
                />
              </div>

              <div>
                <p className="small">Rôle</p>
                <strong>{profile?.is_admin ? 'Admin' : 'Joueur'}</strong>
              </div>

              <div>
                <p className="small">Date de création</p>
                <strong>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                    : '-'}
                </strong>
              </div>

              <button onClick={updateUsername}>Sauvegarder le pseudo</button>
            </div>

            <hr style={{ margin: '24px 0', opacity: 0.15 }} />

            <h3>Modifier mon mot de passe</h3>

            <div style={{ display: 'grid', gap: 12 }}>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nouveau mot de passe"
              />

              <button onClick={updatePassword}>Modifier le mot de passe</button>
            </div>
          </div>

          {/* Le reste de ta page reste identique */}
        </>
      )}
    </main>
  );
}
