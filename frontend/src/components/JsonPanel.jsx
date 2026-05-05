export function JsonPanel({ title, data, emptyText }) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>{title}</h2>
      <pre style={preStyle}>{data ? JSON.stringify(data, null, 2) : emptyText}</pre>
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
const preStyle = {
  marginTop: 16,
  maxHeight: 260,
  overflow: 'auto',
  borderRadius: 18,
  border: '1px solid #1e293b',
  background: '#020617',
  padding: 16,
  color: '#cbd5e1',
  fontSize: 12,
};
