export default function ConfirmedPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Adresse email confirmée</h1>

        <p>
          Ton compte a été activé avec succès.
        </p>

        <p>
          Tu peux maintenant te connecter et commencer tes pronostics.
        </p>

        <a href="/login">
          <button>Se connecter</button>
        </a>
      </div>
    </main>
  );
}
