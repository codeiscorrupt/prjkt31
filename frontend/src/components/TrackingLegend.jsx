export function TrackingLegend({ detectState, authState, targetId }) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Flow state</h2>
      <div style={gridStyle}>
        <div style={itemStyle}>
          <div style={labelStyle}>Detection request</div>
          <div style={valueStyle}>{detectState}</div>
        </div>
        <div style={itemStyle}>
          <div style={labelStyle}>Authorization request</div>
          <div style={valueStyle}>{authState}</div>
        </div>
        <div style={itemStyle}>
          <div style={labelStyle}>Current target</div>
          <div style={valueStyle}>{targetId || 'None'}</div>
        </div>
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
const gridStyle = { display: 'grid', gap: 12, marginTop: 16 };
const itemStyle = { borderRadius: 18, border: '1px solid #1e293b', background: '#020617', padding: 14 };
const labelStyle = { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' };
const valueStyle = { fontSize: 15, color: '#e2e8f0', marginTop: 6, fontWeight: 700 };
