import { useEffect, useMemo, useState } from 'react';
import { AccessDetailsPanel } from './AccessDetailsPanel.jsx';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function DataCard({ title, children, className = '' }) {
  return (
    <article className={`secure-data-card ${className}`.trim()}>
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
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function fetchJson(url, headers, signal) {
  const response = await fetch(url, { headers, signal });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `HTTP ${response.status}`);
  }

  return payload;
}

export function SecureAccessView({ token, student, pin, authResult, apiBaseUrl, onLogout }) {
  const studentId = student?.id_etudiant || student?.id;
  const [data, setData] = useState({
    profile: null,
    notes: [],
    identite: null,
    absences: [],
    seance: null,
  });
  const [loading, setLoading] = useState(Boolean(token && studentId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !studentId) return;

    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError('');

      const headers = {
        Authorization: `Bearer ${token}`,
        'X-Pin': pin,
      };

      const urls = {
        profile: `${apiBaseUrl}/etudiant/${studentId}`,
        notes: `${apiBaseUrl}/etudiant/${studentId}/sensible/notes`,
        identite: `${apiBaseUrl}/etudiant/${studentId}/sensible/identite`,
        absences: `${apiBaseUrl}/etudiant/${studentId}/sensible/absences`,
        seance: `${apiBaseUrl}/etudiant/seance?id_etudiant=${encodeURIComponent(studentId)}`,
      };

      try {
        const results = await Promise.allSettled(
          Object.entries(urls).map(async ([key, url]) => [key, await fetchJson(url, headers, controller.signal)])
        );

        if (controller.signal.aborted) return;

        const nextData = {
          profile: student || {},
          notes: [],
          identite: null,
          absences: [],
          seance: null,
        };
        const failures = [];

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const [key, value] = result.value;
            if (key === 'notes') nextData.notes = Array.isArray(value) ? value : [];
            else if (key === 'absences') nextData.absences = Array.isArray(value) ? value : [];
            else if (key === 'seance') nextData.seance = value?.seance || null;
            else nextData[key] = value || null;
          } else {
            failures.push(result.reason?.message || 'Request failed');
          }
        }

        setData(nextData);
        setError(failures.length ? `Some protected data could not be loaded: ${failures[0]}` : '');
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load protected data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [apiBaseUrl, pin, student, studentId, token]);

  const profile = data.profile || student || {};
  const title = useMemo(() => `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Secure data', [profile]);

  return (
    <main className="secure-access-layout">
      <aside className="secure-left-rail" aria-label="Camera and authorization details">
        <pre>
          <br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
        </pre>

        {/* <div className="mini-camera-label">Caméra active</div>
        <AccessDetailsPanel student={profile} authResult={authResult} compact />
        <button className="secure-logout" type="button" onClick={onLogout}>Retour caméra</button> */}

        <DataCard title="Prochaine séance" className="secure-data-card-wide">
            {data.seance ? (
              <div className="secure-info-list">
                <div><span>Module</span><strong>{data.seance.module || '—'}</strong></div>
                <div><span>Salle</span><strong>{data.seance.salle || '—'}</strong></div>
                <div><span>Date</span><strong>{formatDate(data.seance.date_seance)}</strong></div>
                <div>
                  <span>Heure</span>
                  <strong>{(data.seance.heure_debut || '—') + ' → ' + (data.seance.heure_fin || '—')}</strong>
                </div>
              </div>
            ) : (
              <p className="empty-data">Aucune séance enregistrée.</p>
            )}
          </DataCard>
      </aside>

      <section className="secure-data-space">
        <header className="secure-page-header">
          <div className="secure-title-block">
            <p className="panel-eyebrow">Données protégées</p>
            <h1>{title}</h1>
            <p className="secure-subtitle">Accès validé par reconnaissance faciale et PIN gestuel.</p>
          </div>

          <button className="secure-mobile-back" type="button" onClick={onLogout}>
            <span aria-hidden="true">←</span>
            Retour
          </button>
        </header>

        {loading && <div className="secure-loading">Chargement des données protégées…</div>}
        {error && <div className="secure-error">{error}</div>}

        <div className="secure-grid">
          <DataCard title="Profil">
            <div className="secure-info-list">
              <div><span>Nom</span><strong>{profile.nom || '—'}</strong></div>
              <div><span>Prénom</span><strong>{profile.prenom || '—'}</strong></div>
              <div><span>Sexe</span><strong>{profile.sexe || '—'}</strong></div>
              <div><span>Filière</span><strong>{profile.filiere || '—'}</strong></div>
              <div><span>Date de Naissance</span><strong>{profile.date_naissance || '—'}</strong></div>
            </div>
          </DataCard>

          <DataCard title="Identité">
            <div className="secure-info-list">
              <div><span>CNE</span><strong>{data.identite?.cne || '—'}</strong></div>
              <div><span>CIN</span><strong>{data.identite?.cin || '—'}</strong></div>
            </div>
          </DataCard>

          <DataCard title="Notes" className="secure-data-card-wide">
            <MiniTable
              empty="Aucune note trouvée."
              rows={data.notes}
              columns={[
                { key: 'module', label: 'Module' },
                { key: 'note', label: 'Note', render: (row) => row.note === undefined ? '—' : `${row.note}/20` },
                { key: 'session', label: 'Session' },
                { key: 'annee', label: 'Année' },
              ]}
            />
          </DataCard>

          <DataCard title="Absences" className="secure-data-card-wide">
            <MiniTable
              empty="Aucune absence trouvée."
              rows={data.absences}
              columns={[
                { key: 'module', label: 'Module', render: (row) => row.seance?.module || '—' },
                { key: 'date', label: 'Date', render: (row) => formatDate(row.seance?.date_seance) },
                { key: 'justified', label: 'Justifiée', render: (row) => row.justifie ? 'Oui' : 'Non' },
              ]}
            />
          </DataCard>
        </div>
      </section>
    </main>
  );
}
