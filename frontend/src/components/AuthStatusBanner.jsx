function getBannerConfig(authState, authResult, hasDetection) {
  if (authState === 'success' && authResult?.authorized) {
    return {
      title: 'TARGET RECOGNIZED',
      subtitle: authResult.message || 'Success',
      background: 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))',
      border: '1px solid rgba(134,239,172,0.6)',
      color: '#f0fdf4',
    };
  }

  if (authState === 'denied' || authState === 'error') {
    return {
      title: 'NOT AUTHORIZED',
      subtitle: authResult?.message || 'Access denied',
      background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))',
      border: '1px solid rgba(252,165,165,0.6)',
      color: '#fff1f2',
    };
  }

  if (authState === 'loading') {
    return {
      title: 'AUTHORIZING TARGET',
      subtitle: 'Scanning identity and waiting for backend response...',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.92), rgba(217,119,6,0.92))',
      border: '1px solid rgba(253,186,116,0.6)',
      color: '#fffbeb',
    };
  }

  if (hasDetection) {
    return {
      title: 'TARGET DETECTED',
      subtitle: 'Tracking target coordinates and preparing authorization request.',
      background: 'linear-gradient(135deg, rgba(14,165,233,0.92), rgba(37,99,235,0.92))',
      border: '1px solid rgba(125,211,252,0.6)',
      color: '#eff6ff',
    };
  }

  return {
    title: 'WAITING FOR TARGET',
    subtitle: 'Point the camera at a person to begin tracking.',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,41,59,0.88))',
    border: '1px solid rgba(148,163,184,0.35)',
    color: '#e2e8f0',
  };
}

export function AuthStatusBanner({ authState, authResult, hasDetection }) {
  const config = getBannerConfig(authState, authResult, hasDetection);

  return (
    <div style={{
      display: 'none',
      top: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      minWidth: 320,
      maxWidth: 'calc(100% - 32px)',
      padding: '14px 18px',
      borderRadius: 18,
      background: config.background,
      border: config.border,
      boxShadow: '0 20px 45px rgba(0,0,0,0.28)',
      backdropFilter: 'blur(14px)',
      color: config.color,
      zIndex: 3,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.16em' }}>{config.title}</div>
      <div style={{ marginTop: 6, fontSize: 14, opacity: 0.96 }}>{config.subtitle}</div>
    </div>
  );
}
