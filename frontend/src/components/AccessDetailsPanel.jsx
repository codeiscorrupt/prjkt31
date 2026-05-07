function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function studentName(student) {
  if (!student) return 'Authorized user';
  return `${student.prenom || ''} ${student.nom || ''}`.trim() || student.nom || student.email || 'Authorized user';
}

export function AccessDetailsPanel({ student, authResult, compact = false }) {
  const person = student || authResult?.person || {};
  const rows = [
    ['ID', person.id_etudiant || person.id],
    ['Full name', studentName(person)],
    ['Email', person.email],
    ['Program', person.filiere],
    ['Phone', person.telephone],
    ['Status', authResult?.authorized ? 'Authorized' : 'Waiting'],
  ];

  return (
    <section className={`access-details-panel ${compact ? 'compact' : ''}`}>
      <p className="panel-eyebrow">Identity verified</p>
      <h2>{studentName(person)}</h2>
      <p className="access-message">These details come from the backend authorization response.</p>
      <div className="access-detail-list">
        {rows.map(([label, value]) => (
          <div className="access-detail-row" key={label}>
            <span>{label}</span>
            <strong>{valueOrDash(value)}</strong>
          </div>
        ))}
      </div>
      {authResult?.message && <p className="access-backend-message">{authResult.message}</p>}
    </section>
  );
}
