export default function ConfirmedPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>✅ Adresse email confirmée</h1>

        <p>
          Votre compte a été activé avec succès.
        </p>

        <p>
          Vous pouvez maintenant vous connecter et commencer vos pronostics.
        </p>

        <a href="/login">
          <button>Se connecter</button>
        </a>
      </div>
    </main>
  );
}
