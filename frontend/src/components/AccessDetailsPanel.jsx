import { useEffect, useMemo, useState } from 'react';
import { APP_CONFIG } from '../config/appConfig.js';

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

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

function studentName(student) {
  if (!student) return 'Authorized student';
  return `${student.prenom || ''} ${student.nom || ''}`.trim() || 'Authorized student';
}

async function fetchJson(url, headers, signal) {
  const response = await fetch(url, { headers, signal });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `HTTP ${response.status}`);
  }

  return payload;
}



export function AccessDetailsPanel({ student, authResult, token, apiBaseUrl= APP_CONFIG.apiBaseUrl, compact = false }) {
  const person = student || authResult?.person || {};
  const studentId = student?.id_etudiant || student?.id;
  const [seance, setSeance] = useState(null);

  const rows = [
    ['Filière', person.filiere],
  ];

  const [loading, setLoading] = useState(Boolean(token && studentId));
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      setLoading(true);
      setError('');

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const urls = {
        seance: `${apiBaseUrl}/etudiant/seance?id_etudiant=${encodeURIComponent(studentId)}`,
      };

      try {
        const data = await fetchJson(urls.seance, headers, controller.signal);
        
        if (controller.signal.aborted) return;
        
        // ✅ Store exactly what the API returns under .seance
        setSeance(data?.seance || null);
        setError('');
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load session data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [apiBaseUrl, student, studentId, token]);


  return (
    <section className={`access-details-panel ${compact ? 'compact' : ''}`}>
      <p className="panel-eyebrow">Bonjour</p>
      <h2>{studentName(person)}</h2>
      <p className="access-message">
        Votre Prochaine Seance Est:
      </p>

      <div className="access-detail-row">
        {seance ? (
          <div className="secure-info-list">
            <div><span>Module</span><strong>{seance.module || '—'}</strong></div>
            <div><span>Salle</span><strong>{seance.salle || '—'}</strong></div>
            <div><span>Date</span><strong>{formatDate(seance.date_seance)}</strong></div>
            <div>
              <span>Heure</span>
              <strong>{(seance.heure_debut || '—') + ' → ' + (seance.heure_fin || '—')}</strong>
            </div>
          </div>
        ) : (
          <p className="empty-data">Aucune séance enregistrée.</p>
        )}
      </div>
      <br></br>

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