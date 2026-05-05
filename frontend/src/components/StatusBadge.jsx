const styles = {
  idle: { background: '#e2e8f0', color: '#334155' },
  requesting: { background: '#fef3c7', color: '#92400e' },
  streaming: { background: '#dcfce7', color: '#166534' },
  stopped: { background: '#e2e8f0', color: '#334155' },
  detecting: { background: '#dbeafe', color: '#1d4ed8' },
  loading: { background: '#fef3c7', color: '#92400e' },
  success: { background: '#dcfce7', color: '#166534' },
  denied: { background: '#fee2e2', color: '#991b1b' },
  error: { background: '#fee2e2', color: '#991b1b' },
};

export function StatusBadge({ label, value }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 700,
        ...(styles[value] || styles.idle),
      }}
    >
      {label}: {value}
    </span>
  );
}
