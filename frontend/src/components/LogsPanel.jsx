export function LogsPanel({ logs }) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Activity</h2>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {logs.length === 0 ? (
          <div style={emptyStyle}>No logs yet.</div>
        ) : (
          logs.map((log, index) => (
            <div key={`${log}-${index}`} style={logStyle}>{log}</div>
          ))
        )}
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
const titleStyle = { margin: 0, fontSize: 20 };
const emptyStyle = { borderRadius: 18, border: '1px dashed #334155', padding: 16, color: '#94a3b8' };
const logStyle = { borderRadius: 16, border: '1px solid #1e293b', background: '#020617', padding: '10px 12px', color: '#cbd5e1', fontSize: 14 };
