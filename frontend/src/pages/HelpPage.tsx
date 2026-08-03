
export default function HelpPage() {
  return (
    <div className="page help-page">
      <div className="page-header">
        <h1>❓ Guida Budget Club</h1>
      </div>

      <section className="card">
        <h2>🏠 Dashboard</h2>
        <p>La dashboard mostra il <strong>saldo attuale</strong>, il totale degli abbonamenti mensili, le rate dei debiti attivi e i movimenti recenti. Usa il calendario per aggiungere appuntamenti personali.</p>
        <ul>
          <li>Il <strong>saldo</strong> è la somma di tutte le entrate meno le spese, rate e abbonamenti.</li>
          <li>Il pulsante <strong>Purge chiusure</strong> elimina le voci di chiusura mese dal ledger.</li>
        </ul>
      </section>

      <section className="card">
        <h2>💳 Operazioni</h2>
        <p>Gestisci tutti i movimenti finanziari:</p>
        <ul>
          <li><strong>🟢 Entrata</strong>: qualsiasi importo ricevuto (stipendio, rimborso, ecc.)</li>
          <li><strong>🔴 Spesa</strong>: qualsiasi uscita (acquisto, bolletta, ecc.)</li>
          <li><strong>🟡 Debito</strong>: rata mensile fissa con durata definita (mutuo, prestito, ecc.)</li>
          <li><strong>🟠 Flexia</strong>: importo variabile mensile da carta flex/revolving</li>
          <li><strong>🔵 Abbonamento</strong>: costo mensile ricorrente fisso (Netflix, palestra, ecc.)</li>
        </ul>
      </section>

      <section className="card">
        <h2>📈 Report</h2>
        <p>Il grafico a barre mostra l'andamento mensile di <span style={{ color: '#00ff88' }}>entrate</span> vs <span style={{ color: '#ff4444' }}>spese</span>. La tabella sotto riporta il dettaglio numerico per ogni mese.</p>
      </section>

      <section className="card">
        <h2>🔐 Autenticazione</h2>
        <p>Il sistema usa autenticazione HTTP Basic. Le credenziali sono conservate in modo sicuro nel browser. Per cambiare password usa il link nell'email di reset.</p>
      </section>

      <section className="card">
        <h2>📅 Calendario</h2>
        <p>Clicca su un giorno nel calendario per selezionarlo, poi inserisci la descrizione dell'appuntamento e premi <strong>+ Aggiungi</strong>. Gli appuntamenti sono visibili come punti evidenziati nel calendario.</p>
      </section>
    </div>
  );
}

