'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  IconLeagues,
  IconRules,
  IconAdmin,
  IconLogout,
  IconChevronRight,
  IconUser,
} from '@/app/components/icons';
import { SkeletonCards } from '@/app/components/Skeleton';
import EmptyState from '@/app/components/EmptyState';
import { useToast } from '@/app/components/Toast';

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
  const toast = useToast();
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
        .maybeSingle(),

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

    if (!profileData) {
      setMessage(
        "Profil introuvable. Ton compte existe, mais aucune ligne n'a été trouvée dans la table profiles."
      );
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

    const currentProfile: Profile = {
      id: profileData.id,
      email: profileData.email,
      username: profileData.username,
      is_admin: profileData.is_admin,
      created_at: profileData.created_at,
    };

    setProfile(currentProfile);
    setUsername(currentProfile.username || '');

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
      toast.error(`Erreur pseudo : ${error.message}`);
      return;
    }

    toast.success('Pseudo mis à jour ✓');
    await loadProfile();
  }

  async function updatePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(`Erreur mot de passe : ${error.message}`);
      return;
    }

    setNewPassword('');
    toast.success('Mot de passe mis à jour ✓');
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
      <h1>Mon profil</h1>

      {loading && (
        <div style={{ marginTop: 16 }}>
          <SkeletonCards count={3} />
        </div>
      )}

      {!loading && !userId && (
        <div className="card">
          <EmptyState
            icon={<IconUser size={32} />}
            title="Tu n’es pas connecté"
          >
            Connecte-toi pour voir ton profil, tes pronos et ton classement.
          </EmptyState>
          <Link href="/login">
            <button type="button" style={{ width: '100%' }}>
              Se connecter / créer un compte
            </button>
          </Link>
        </div>
      )}

      {!loading && message && userId && <p className="error">{message}</p>}

      {!loading && userId && (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="label">Classement</div>
              <div className="value">{rank ? `#${rank}` : '—'}</div>
            </div>

            <div className="stat-tile">
              <div className="label">Points</div>
              <div className="value">{me?.total_points ?? 0}</div>
            </div>

            <div className="stat-tile">
              <div className="label">Scores exacts</div>
              <div className="value">{me?.exact_scores_count ?? 0}</div>
            </div>

            <div className="stat-tile">
              <div className="label">Buteurs</div>
              <div className="value">{me?.first_scorers_count ?? 0}</div>
            </div>
          </div>

          <div className="card hub-menu">
            <Link href="/leagues" className="hub-item">
              <IconLeagues size={20} />
              <span>Mes ligues</span>
              <IconChevronRight size={18} />
            </Link>

            <Link href="/rules" className="hub-item">
              <IconRules size={20} />
              <span>Règlement</span>
              <IconChevronRight size={18} />
            </Link>

            {profile?.is_admin && (
              <Link href="/admin" className="hub-item">
                <IconAdmin size={20} />
                <span>Administration</span>
                <IconChevronRight size={18} />
              </Link>
            )}

            <button
              type="button"
              className="hub-item hub-logout"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
            >
              <IconLogout size={20} />
              <span>Déconnexion</span>
              <IconChevronRight size={18} />
            </button>
          </div>

          <div className="card">
            <h2>Mon compte</h2>

            <div style={{ display: 'grid', gap: 14 }}>
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

            <div style={{ display: 'grid', gap: 14 }}>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nouveau mot de passe"
              />

              <button onClick={updatePassword}>Modifier le mot de passe</button>
            </div>
          </div>

          <div className="card">
            <h2>Mes bonus utilisés</h2>

            {bonusUsed.length === 0 ? (
              <p className="small">Aucun bonus utilisé pour le moment.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {bonusUsed.map((prediction) => (
                  <div
                    key={prediction.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <strong>
                      {prediction.matches?.home_team || 'Équipe domicile'} -{' '}
                      {prediction.matches?.away_team || 'Équipe extérieur'}
                    </strong>

                    <p className="small" style={{ marginBottom: 0 }}>
                      {phaseLabels[prediction.matches?.phase || ''] ||
                        prediction.matches?.phase ||
                        'Phase inconnue'}{' '}
                      · {prediction.points} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Mes meilleurs pronostics</h2>

            {bestPredictions.length === 0 ? (
              <p className="small">Aucun match terminé pour le moment.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {bestPredictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background:
                        prediction.points >= 11
                          ? 'rgba(34,197,94,0.14)'
                          : 'var(--surface-2)',
                      border:
                        prediction.points >= 11
                          ? '1px solid rgba(34,197,94,0.7)'
                          : '1px solid var(--border)',
                    }}
                  >
                    <strong>
                      {prediction.matches?.home_team || 'Équipe domicile'} -{' '}
                      {prediction.matches?.away_team || 'Équipe extérieur'}
                    </strong>

                    <p className="small">
                      Prono : {prediction.predicted_home_score} -{' '}
                      {prediction.predicted_away_score}
                      {' · '}
                      Résultat : {prediction.matches?.home_score ?? '-'} -{' '}
                      {prediction.matches?.away_score ?? '-'}
                    </p>

                    <p style={{ margin: 0, fontWeight: 900 }}>
                      {prediction.points >= 11 ? 'PERFECT · ' : ''}
                      +{prediction.points} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Historique de mes pronostics</h2>

            {finishedPredictions.length === 0 ? (
              <p className="small">Aucun historique disponible.</p>
            ) : (
              <div className="hist-list">
                {finishedPredictions.map((prediction) => (
                  <div className="hist-item" key={prediction.id}>
                    <div style={{ minWidth: 0 }}>
                      <strong>
                        {prediction.matches?.home_team || 'Domicile'} -{' '}
                        {prediction.matches?.away_team || 'Extérieur'}
                      </strong>
                      <div className="small" style={{ marginTop: 2 }}>
                        Prono {prediction.predicted_home_score}–
                        {prediction.predicted_away_score} · Résultat{' '}
                        {prediction.matches?.home_score ?? '-'}–
                        {prediction.matches?.away_score ?? '-'}
                        {prediction.first_scorer_correct ? ' · buteur ✓' : ''}
                        {prediction.double_bonus ? ' · bonus ×2' : ''}
                      </div>
                    </div>

                    <span
                      className={
                        prediction.points >= 11 ? 'badge perfect' : 'badge'
                      }
                      style={{ flexShrink: 0 }}
                    >
                      {prediction.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
