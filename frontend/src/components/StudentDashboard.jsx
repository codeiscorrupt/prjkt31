// components/StudentDashboard.jsx
import { useEffect, useState, useCallback } from 'react';

// 🔹 Inline styles for layout & structure
const STYLES = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '24px',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #334155',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
  },
  logoutBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #334155',
  },
  infoLabel: { color: '#94a3b8' },
  infoValue: { fontWeight: 500, color: '#f1f5f9' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #334155',
    color: '#94a3b8',
    fontWeight: 600,
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #334155',
    color: '#e2e8f0',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    padding: '16px',
    color: '#fca5a5',
    marginBottom: '20px',
  },
  photo: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #38bdf8',
    margin: '0 auto 16px',
    display: 'block',
    background: '#0f172a',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  badgeSuccess: { background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' },
  badgeWarn: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
  badgeDanger: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
};

// 🔹 CSS for pseudo-selectors (injected once)
const DASHBOARD_STYLES = `
  @keyframes dashboardFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .dashboard-container { animation: dashboardFadeIn 0.3s ease-out; }
  .logout-btn:hover { background: #dc2626 !important; }
  .card:hover { transform: translateY(-2px); transition: transform 0.2s; }
  .photo-upload-btn:hover { background: #7dd3fc !important; }
`;

export function StudentDashboard({ 
  token,           // Sensitive token from PIN verification
  studentId,       // Student ID (from authResult.person.id_etudiant)
  apiBaseUrl = '/api', // Base API URL
  onLogout,        // Callback to return to camera view
}) {
  const [data, setData] = useState({
    profile: null,
    notes: null,
    identite: null,
    absences: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // 🔹 Fetch all student data on mount
  useEffect(() => {
    if (!token || !studentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch in parallel
        const [profileRes, notesRes, identiteRes, absencesRes] = await Promise.all([
          fetch(`${apiBaseUrl}/etudiant/${studentId}?token=${encodeURIComponent(token)}`, { headers }),
          fetch(`${apiBaseUrl}/etudiant/${studentId}/sensible/notes?token=${encodeURIComponent(token)}`, { headers }),
          fetch(`${apiBaseUrl}/etudiant/${studentId}/sensible/identite?token=${encodeURIComponent(token)}`, { headers }),
          fetch(`${apiBaseUrl}/etudiant/${studentId}/sensible/absences?token=${encodeURIComponent(token)}`, { headers }),
        ]);

        // Handle responses
        const profile = profileRes.ok ? await profileRes.json() : null;
        const notes = notesRes.ok ? await notesRes.json() : [];
        const identite = identiteRes.ok ? await identiteRes.json() : null;
        const absences = absencesRes.ok ? await absencesRes.json() : [];

        setData({ profile, notes, identite, absences });
      } catch (err) {
        setError(err.message || 'Failed to load student data');
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, studentId, apiBaseUrl]);

  // 🔹 Handle photo upload
  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !token || !studentId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${apiBaseUrl}/etudiant/${studentId}/photo?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }

      // Refresh profile to show new photo URL
      const updatedProfile = await (await fetch(
        `${apiBaseUrl}/etudiant/${studentId}?token=${encodeURIComponent(token)}`
      )).json();
      
      setData(prev => ({ ...prev, profile: updatedProfile }));
    } catch (err) {
      setError(err.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  }, [token, studentId, apiBaseUrl]);

  // 🔹 Format helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getGradeBadge = (note) => {
    if (note >= 16) return { text: 'Excellent', style: STYLES.badgeSuccess };
    if (note >= 12) return { text: 'Bien', style: STYLES.badge };
    if (note >= 10) return { text: 'Passable', style: STYLES.badgeWarn };
    return { text: 'Échec', style: STYLES.badgeDanger };
  };

  // 🔹 Loading state
  if (loading) {
    return (
      <>
        <style>{DASHBOARD_STYLES}</style>
        <div style={STYLES.container} className="dashboard-container">
          <div style={STYLES.loading}>🔄 Loading your dashboard...</div>
        </div>
      </>
    );
  }

  // 🔹 Error state
  if (error && !data.profile) {
    return (
      <>
        <style>{DASHBOARD_STYLES}</style>
        <div style={STYLES.container} className="dashboard-container">
          <div style={STYLES.header}>
            <h1 style={STYLES.title}>Student Dashboard</h1>
            <button style={STYLES.logoutBtn} onClick={onLogout}>← Back</button>
          </div>
          <div style={STYLES.error}>❌ {error}</div>
          <button style={STYLES.logoutBtn} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </>
    );
  }

  const profile = data.profile || {};
  const photoUrl = profile.photo_url 
    ? `${apiBaseUrl}${profile.photo_url}` 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nom || 'S')}+${encodeURIComponent(profile.prenom || 'T')}&background=38bdf8&color=fff&size=128`;

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>
      <div style={STYLES.container} className="dashboard-container">
        {/* Header */}
        <div style={STYLES.header}>
          <h1 style={STYLES.title}>Welcome, {profile.prenom} {profile.nom}</h1>
          <button className="logout-btn" style={STYLES.logoutBtn} onClick={onLogout}>
            ← Back to Camera
          </button>
        </div>

        {error && <div style={STYLES.error}>⚠️ {error}</div>}

        {/* Main Grid */}
        <div style={STYLES.grid}>
          
          {/* 👤 Profile Card */}
          <div style={STYLES.card} className="card">
            <h2 style={STYLES.cardTitle}>👤 Personal Information</h2>
            <img src={photoUrl} alt="Profile" style={STYLES.photo} />
            
            {/* Photo Upload */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <label className="photo-upload-btn" style={{
                ...STYLES.submitBtn,
                display: 'inline-block',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}>
                {uploading ? 'Uploading...' : '📷 Update Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Email</span>
              <span style={STYLES.infoValue}>{profile.email || 'N/A'}</span>
            </div>
            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Program</span>
              <span style={STYLES.infoValue}>{profile.filiere || 'N/A'}</span>
            </div>
            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Phone</span>
              <span style={STYLES.infoValue}>{profile.telephone || 'N/A'}</span>
            </div>
            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Address</span>
              <span style={STYLES.infoValue}>{profile.adresse || 'N/A'}</span>
            </div>
            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Birth Date</span>
              <span style={STYLES.infoValue}>{formatDate(profile.date_naissance)}</span>
            </div>
            <div style={STYLES.infoRow}>
              <span style={STYLES.infoLabel}>Gender</span>
              <span style={STYLES.infoValue}>{profile.sexe || 'N/A'}</span>
            </div>
          </div>

          {/* 🆔 Identity Documents (Sensitive) */}
          {data.identite && (
            <div style={STYLES.card} className="card">
              <h2 style={STYLES.cardTitle}>🆔 Identity Documents</h2>
              <div style={STYLES.infoRow}>
                <span style={STYLES.infoLabel}>CNE</span>
                <span style={STYLES.infoValue}>{data.identite.cne || 'Not provided'}</span>
              </div>
              <div style={STYLES.infoRow}>
                <span style={STYLES.infoLabel}>CIN</span>
                <span style={STYLES.infoValue}>{data.identite.cin || 'Not provided'}</span>
              </div>
            </div>
          )}

          {/* 📊 Grades Table */}
          <div style={{ ...STYLES.card, gridColumn: '1 / -1' }} className="card">
            <h2 style={STYLES.cardTitle}>📊 Academic Records</h2>
            {data.notes?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={STYLES.table}>
                  <thead>
                    <tr>
                      <th style={STYLES.th}>Module</th>
                      <th style={STYLES.th}>Grade</th>
                      <th style={STYLES.th}>Session</th>
                      <th style={STYLES.th}>Year</th>
                      <th style={STYLES.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.notes.map((note, idx) => {
                      const badge = getGradeBadge(note.note);
                      return (
                        <tr key={idx}>
                          <td style={STYLES.td}>{note.module || 'N/A'}</td>
                          <td style={STYLES.td}><strong>{note.note ?? 'N/A'}/20</strong></td>
                          <td style={STYLES.td}>{note.session || 'N/A'}</td>
                          <td style={STYLES.td}>{note.annee || 'N/A'}</td>
                          <td style={STYLES.td}>
                            <span style={badge.style}>{badge.text}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>No grades recorded yet.</p>
            )}
          </div>

          {/* 📅 Absences (Sensitive) */}
          <div style={{ ...STYLES.card, gridColumn: '1 / -1' }} className="card">
            <h2 style={STYLES.cardTitle}>📅 Attendance Record</h2>
            {data.absences?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={STYLES.table}>
                  <thead>
                    <tr>
                      <th style={STYLES.th}>Date</th>
                      <th style={STYLES.th}>Module</th>
                      <th style={STYLES.th}>Type</th>
                      <th style={STYLES.th}>Justified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.absences.map((abs, idx) => (
                      <tr key={idx}>
                        <td style={STYLES.td}>{formatDate(abs.date)}</td>
                        <td style={STYLES.td}>{abs.module || 'N/A'}</td>
                        <td style={STYLES.td}>{abs.type || 'N/A'}</td>
                        <td style={STYLES.td}>
                          {abs.justified ? (
                            <span style={STYLES.badgeSuccess}>✓ Yes</span>
                          ) : (
                            <span style={STYLES.badgeDanger}>✗ No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>Perfect attendance! 🎉</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}