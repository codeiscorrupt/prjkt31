export function ControlButton({ children, primary = false, ...props }) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 16,
        padding: '12px 16px',
        border: primary ? 'none' : '1px solid #334155',
        background: primary ? '#f8fafc' : '#0f172a',
        color: primary ? '#0f172a' : '#e2e8f0',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
