export function AuthorizationResultCard({ authState, authResult }) {
  const isPositive = authState === 'success' && authResult?.authorized;
  const isNegative = authState === 'denied' || authState === 'error';
  const accent = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#f59e0b';

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Authorization result</h2>

      <div style={{ ...heroStyle, borderColor: accent }}>
        <div style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: '0.14em' }}>
          {authState === 'loading'
            ? 'AUTHORIZING'
            : authState === 'success'
              ? 'AUTHORIZED'
              : authState === 'denied' || authState === 'error'
                ? 'DENIED'
                : 'IDLE'}
        </div>
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
          {authResult?.message || 'Waiting for authorization request.'}
        </div>
        {typeof authResult?.confidence === 'number' ? (
          <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 14 }}>
            Confidence: {Math.round(authResult.confidence * 100)}%
          </div>
        ) : null}
      </div>

      {authResult?.person ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {Object.entries(authResult.person).map(([key, value]) => (
            <div key={key} style={fieldStyle}>
              <div style={fieldKeyStyle}>{key}</div>
              <div>{String(value)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const panelStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 24,
  padding: 20,
  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
};
const titleStyle = { margin: 0, fontSize: 20 };
const heroStyle = { marginTop: 16, borderRadius: 18, border: '1px solid #334155', background: '#020617', padding: 16 };
const fieldStyle = { borderRadius: 18, border: '1px solid #1e293b', background: '#020617', padding: 14, color: '#e2e8f0' };
const fieldKeyStyle = { color: '#64748b', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', marginBottom: 6 };
