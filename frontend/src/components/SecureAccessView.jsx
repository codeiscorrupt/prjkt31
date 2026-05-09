import { useEffect, useMemo, useState } from 'react';
import { AccessDetailsPanel } from './AccessDetailsPanel.jsx';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function DataCard({ title, children }) {
  return (
    <article className="secure-data-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function MiniTable({ columns, rows, empty }) {
  if (!rows?.length) return <p className="empty-data">{empty}</p>;
  return (
    <div className="mini-table-wrap">
      <table className="mini-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SecureAccessView({ token, student, pin, authResult, apiBaseUrl, onLogout }) {
  const studentId = student?.id_etudiant || student?.id;
const [data, setData] = useState({profile: null , notes: [] , identite: null , absences: [] , seance: null,});
  const [loading, setLoading] = useState(Boolean(token && studentId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !studentId) return;

    let active = true;
    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          'X-Pin': pin,
        };

        const endpoints = [
          `${apiBaseUrl}/etudiant/${studentId}`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/notes`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/identite`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/absences`,
          `${apiBaseUrl}/etudiant/seance?id_etudiant=${encodeURIComponent(studentId)}`,
        ];

        const responses = await Promise.all(
          endpoints.map((url) => fetch(url, { headers }))
        );

        const failedResponse = responses.find((response) => !response.ok);

        if (failedResponse) {
          const errorPayload = await failedResponse.json().catch(() => ({}));
          throw new Error(
            errorPayload.detail ||
            errorPayload.message ||
            `HTTP ${failedResponse.status}`
          );
        }

        const [profile, notes, identite, absences, seanceData] = await Promise.all(
          responses.map((response) => response.json())
        );

        if (!active) return;

        setData({
          profile: profile || student || {},
          notes: Array.isArray(notes) ? notes : [],
          identite: identite || null,
          absences: Array.isArray(absences) ? absences : [],
          seance: seanceData?.seance || null,
        });
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load protected data');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [apiBaseUrl, pin, student, studentId, token]);

  const profile = data.profile || student || {};
  const title = useMemo(() => `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Secure data', [profile]);

  return (
    <main className="secure-access-layout">
      <aside className="secure-left-rail">
        <div className="mini-camera-label">Caméra active</div>
        <AccessDetailsPanel student={profile} authResult={authResult} compact />
        <button className="secure-logout" type="button" onClick={onLogout}>Back to camera</button>
      </aside>

      <section className="secure-data-space">
        <div className="secure-mobile-topbar">
          <p className="panel-eyebrow">Données protégées</p>
          <button className="secure-mobile-back" type="button" onClick={onLogout}>
            Retour caméra
          </button>
        </div>

        <p className="panel-eyebrow">Données protégées</p>
        <h1>{title}</h1>
        <p className="secure-subtitle">Accès validé par reconnaissance faciale et PIN gestuel.</p>
        {loading && <div className="secure-loading">Loading protected data…</div>}
        {error && <div className="secure-error">{error}</div>}

        <div className="secure-grid">
        <DataCard title="Profil">
          <div className="secure-info-list">
            <div><span>Nom</span><strong>{profile.nom || '—'}</strong></div>
            <div><span>Prénom</span><strong>{profile.prenom || '—'}</strong></div>
            <div><span>Sexe</span><strong>{profile.sexe || '—'}</strong></div>
            <div><span>Filière</span><strong>{profile.filiere || '—'}</strong></div>
          </div>
        </DataCard>

          <DataCard title="Identité">
            <div className="secure-info-list">
              <div><span>CNE</span><strong>{data.identite?.cne || '—'}</strong></div>
              <div><span>CIN</span><strong>{data.identite?.cin || '—'}</strong></div>
            </div>
          </DataCard>

          <DataCard title="Prochaine séance">
            {data.seance ? (
              <div className="secure-info-list">
                <div><span>Module</span><strong>{data.seance.module || '—'}</strong></div>
                <div><span>Salle</span><strong>{data.seance.salle || '—'}</strong></div>
                <div><span>Date</span><strong>{formatDate(data.seance.date_seance)}</strong></div>
                <div>
                  <span>Heure</span>
                  <strong>
                    {(data.seance.heure_debut || '—') + ' → ' + (data.seance.heure_fin || '—')}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="empty-data">Aucune séance enregistrée.</p>
            )}
          </DataCard>

          <DataCard title="Notes">
            <MiniTable
              empty="Aucune note trouvée."
              rows={data.notes}
              columns={[
                { key: 'module', label: 'Module' },
                { key: 'note', label: 'Grade', render: (row) => row.note === undefined ? '—' : `${row.note}/20` },
                { key: 'session', label: 'Session' },
                { key: 'annee', label: 'Year' },
              ]}
            />
          </DataCard>

          <DataCard title="Absences">
            <MiniTable
              empty="Aucune absence trouvée."
              rows={data.absences}
              columns={[
                { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
                { key: 'module', label: 'Module' },
                { key: 'type', label: 'Type' },
                { key: 'justified', label: 'Justified', render: (row) => row.justified ? 'Yes' : 'No' },
              ]}
            />
          </DataCard>
        </div>
      </section>
    </main>
  );
}
