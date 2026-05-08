export function SettingsPanel({
  detectUrl,
  setDetectUrl,
  authorizeUrl,
  setAuthorizeUrl,
  intervalMs,
  setIntervalMs,
  health,
  healthError,
}) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Backend settings</h2>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label style={labelStyle}>
          Detect endpoint
          <input
            value={detectUrl}
            onChange={(event) => setDetectUrl(event.target.value)}
            placeholder="http://localhost:8000/detect"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Authorize endpoint
          <input
            value={authorizeUrl}
            onChange={(event) => setAuthorizeUrl(event.target.value)}
            placeholder="http://localhost:8000/authorize"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Detection interval (ms)
          <input
            type="number"
            min={300}
            step={100}
            value={intervalMs}
            onChange={(event) => setIntervalMs(Number(event.target.value) || 700)}
            style={inputStyle}
          />
        </label>
      </div>

      <div style={subPanelStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Health check</div>
        {health ? <pre style={preStyle}>{JSON.stringify(health, null, 2)}</pre> : <div style={mutedStyle}>No health data yet.</div>}
        {healthError ? <div style={{ ...mutedStyle, color: '#fca5a5', marginTop: 8 }}>{healthError}</div> : null}
      </div>

      <div style={subPanelStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Two-step flow</div>
        <pre style={preStyle}>{`1) POST /detect    -> returns target coordinates
2) POST /authorize -> returns authorized true/false`}</pre>
      </div>
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

const subPanelStyle = {
  marginTop: 16,
  borderRadius: 18,
  border: '1px solid #1e293b',
  background: '#020617',
  padding: 16,
};

const titleStyle = { margin: 0, fontSize: 20 };
const labelStyle = { display: 'grid', gap: 8, color: '#cbd5e1', fontSize: 14 };
const inputStyle = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid #334155',
  background: '#020617',
  color: '#e2e8f0',
  padding: '12px 14px',
};
const preStyle = { margin: 0, color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap' };
const mutedStyle = { color: '#94a3b8', fontSize: 14 };
