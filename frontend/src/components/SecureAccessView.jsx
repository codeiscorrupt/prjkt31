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

export function SecureAccessView({ token, student, authResult, apiBaseUrl, onLogout }) {
  const studentId = student?.id_etudiant || student?.id;
  const [data, setData] = useState({ profile: null, notes: [], identite: null, absences: [] });
  const [loading, setLoading] = useState(Boolean(token && studentId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !studentId) return;

    let active = true;
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const endpoints = [
          `${apiBaseUrl}/etudiant/${studentId}?token=${encodeURIComponent(token)}`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/notes?token=${encodeURIComponent(token)}`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/identite?token=${encodeURIComponent(token)}`,
          `${apiBaseUrl}/etudiant/${studentId}/sensible/absences?token=${encodeURIComponent(token)}`,
        ];

        const responses = await Promise.all(endpoints.map((url) => fetch(url, { headers })));
        const [profile, notes, identite, absences] = await Promise.all(
          responses.map((response) => response.ok ? response.json() : null)
        );

        if (!active) return;
        setData({
          profile: profile || student || {},
          notes: Array.isArray(notes) ? notes : [],
          identite: identite || null,
          absences: Array.isArray(absences) ? absences : [],
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
  }, [apiBaseUrl, student, studentId, token]);

  const profile = data.profile || student || {};
  const title = useMemo(() => `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Secure data', [profile]);

  return (
    <main className="secure-access-layout">
      <aside className="secure-left-rail">
        <div className="mini-camera-label">Live camera remains active</div>
        <AccessDetailsPanel student={profile} authResult={authResult} compact />
        <button className="secure-logout" type="button" onClick={onLogout}>Back to camera</button>
      </aside>

      <section className="secure-data-space">
        <p className="panel-eyebrow">Protected backend data</p>
        <h1>{title}</h1>
        <p className="secure-subtitle">The camera is cropped to the corner while backend data occupies the available space.</p>

        {loading && <div className="secure-loading">Loading protected data…</div>}
        {error && <div className="secure-error">{error}</div>}

        <div className="secure-grid">
          <DataCard title="Profile">
            <div className="secure-info-list">
              <div><span>Email</span><strong>{profile.email || '—'}</strong></div>
              <div><span>Program</span><strong>{profile.filiere || '—'}</strong></div>
              <div><span>Phone</span><strong>{profile.telephone || '—'}</strong></div>
              <div><span>Address</span><strong>{profile.adresse || '—'}</strong></div>
              <div><span>Birth date</span><strong>{formatDate(profile.date_naissance)}</strong></div>
            </div>
          </DataCard>

          <DataCard title="Identity">
            <div className="secure-info-list">
              <div><span>CNE</span><strong>{data.identite?.cne || '—'}</strong></div>
              <div><span>CIN</span><strong>{data.identite?.cin || '—'}</strong></div>
            </div>
          </DataCard>

          <DataCard title="Academic records">
            <MiniTable
              empty="No grades returned by the backend."
              rows={data.notes}
              columns={[
                { key: 'module', label: 'Module' },
                { key: 'note', label: 'Grade', render: (row) => row.note === undefined ? '—' : `${row.note}/20` },
                { key: 'session', label: 'Session' },
                { key: 'annee', label: 'Year' },
              ]}
            />
          </DataCard>

          <DataCard title="Attendance">
            <MiniTable
              empty="No absences returned by the backend."
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
