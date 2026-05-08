export function TargetSnapshotCard({ detection, authResult }) {
  const bbox = detection?.bbox;
  const person = authResult?.person;

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Target snapshot</h2>

      {!detection ? (
        <div style={emptyStyle}>No tracked target yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={cardStyle}>
            <div style={keyStyle}>Target id</div>
            <div style={valueStyle}>{detection.target_id || 'N/A'}</div>
          </div>
          <div style={cardStyle}>
            <div style={keyStyle}>Tracking state</div>
            <div style={valueStyle}>{detection.tracking_state || 'tracking'}</div>
          </div>
          <div style={cardStyle}>
            <div style={keyStyle}>Bounding box</div>
            <div style={valueStyle}>
              {bbox
                ? `x:${Math.round(bbox.x)} y:${Math.round(bbox.y)} w:${Math.round(bbox.width)} h:${Math.round(bbox.height)}`
                : 'N/A'}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={keyStyle}>Authorization</div>
            <div style={valueStyle}>{authResult ? authResult.message : 'Waiting for result...'}</div>
          </div>
          {person ? (
            <div style={cardStyle}>
              <div style={keyStyle}>Person</div>
              <div style={valueStyle}>{person.name || 'Unknown target'}</div>
            </div>
          ) : null}
        </div>
      )}
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
const emptyStyle = { marginTop: 16, borderRadius: 18, border: '1px dashed #334155', padding: 16, color: '#94a3b8' };
const cardStyle = { borderRadius: 18, border: '1px solid #1e293b', background: '#020617', padding: 14 };
const keyStyle = { color: '#64748b', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', marginBottom: 6 };
const valueStyle = { color: '#e2e8f0', fontSize: 14 };
