
export default function HelpPage() {
  return (
    <div className="page help-page">
      <div className="page-header">
        <h1>🕷️ Guida Spidey Budget Online</h1>
      </div>

      <section className="card">
        <h2>🏙️ Dashboard Spidey</h2>
        <p>La dashboard mostra il <strong>saldo attuale Spidey</strong>, il totale degli abbonamenti mensili, le rate dei debiti attivi e i movimenti recenti. Usa il calendario missioni per aggiungere appuntamenti personali.</p>
        <ul>
          <li>Il <strong>saldo</strong> è la somma di tutte le entrate meno le spese, rate e abbonamenti.</li>
          <li>Il pulsante <strong>Purge chiusure</strong> elimina le voci di chiusura mese dal ledger.</li>
        </ul>
      </section>

      <section className="card">
        <h2>💳 Operazioni & Movimenti</h2>
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
        <h2>📈 Report Mensili & Analisi</h2>
        <p>Il report circolare e la tabella di trend mostrano l'andamento mensile di <span style={{ color: 'var(--green)' }}>entrate</span> vs <span style={{ color: 'var(--red)' }}>spese</span> e impegni fssi. Puoi esportare i dati in CSV o stampare il report PDF.</p>
      </section>

      <section className="card">
        <h2>👾 Spidey Arcade District</h2>
        <p>Sezione videogiochi retrò 8-bit con quattro modalità di gioco: <strong>Platform Run con Spiderman Pixel</strong>, <strong>Web Catcher</strong>, <strong>Web Shooter Invaders</strong> e <strong>Spidey Sudoku</strong> per rilassarsi tra una gestione di budget e l'altra!</p>
      </section>
    </div>
  );
}

