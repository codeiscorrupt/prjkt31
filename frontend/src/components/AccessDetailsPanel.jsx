function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function studentName(student) {
  if (!student) return 'Authorized student';
  return `${student.prenom || ''} ${student.nom || ''}`.trim() || 'Authorized student';
}

export function AccessDetailsPanel({ student, authResult, compact = false }) {
  const person = student || authResult?.person || {};

  const rows = [
    ['Nom', person.nom],
    ['Prénom', person.prenom],
    ['Sexe', person.sexe],
    ['Filière', person.filiere],
  ];

  return (
    <section className={`access-details-panel ${compact ? 'compact' : ''}`}>
      <p className="panel-eyebrow">Identité vérifiée</p>
      <h2>{studentName(person)}</h2>
      <p className="access-message">
        Données normales affichées après reconnaissance faciale.
      </p>

      <div className="access-detail-list">
        {rows.map(([label, value]) => (
          <div className="access-detail-row" key={label}>
            <span>{label}</span>
            <strong>{valueOrDash(value)}</strong>
          </div>
        ))}
      </div>

      {authResult?.message && (
        <p className="access-backend-message">{authResult.message}</p>
      )}
    </section>
  );
}