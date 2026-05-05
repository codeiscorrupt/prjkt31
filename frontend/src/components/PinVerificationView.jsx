// components/PinVerificationView.jsx
import { useCallback } from 'react';

// 🔹 Inline styles for layout & structure
const STYLES = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '24px',
    animation: 'pinFadeIn 0.2s ease-out',
  },
  card: {
    background: '#1e293b',
    borderRadius: '20px',
    padding: '40px 32px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    transition: 'transform 0.2s',
  },
  cardSuccess: {
    background: 'linear-gradient(135deg, #065f46, #047857)',
  },
  backBtn: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: '#334155',
    border: 'none',
    borderRadius: '10px',
    width: '40px',
    height: '40px',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    transition: 'background 0.2s',
  },
  title: {
    margin: '0 0 12px',
    color: '#f1f5f9',
    fontSize: '26px',
    fontWeight: 600,
  },
  studentInfo: {
    color: '#94a3b8',
    marginBottom: '28px',
    lineHeight: 1.5,
    fontSize: '15px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '8px',
  },
  label: {
    color: '#cbd5e1',
    fontWeight: 500,
    fontSize: '15px',
  },
  input: {
    padding: '16px',
    fontSize: '28px',
    textAlign: 'center',
    letterSpacing: '12px',
    border: '2px solid #475569',
    borderRadius: '12px',
    background: '#0f172a',
    color: 'white',
    outline: 'none',
    transition: 'all 0.2s',
  },
  error: {
    color: '#f87171',
    margin: 0,
    fontSize: '14px',
    minHeight: '20px',
  },
  submitBtn: {
    padding: '16px',
    background: '#38bdf8',
    color: '#020617',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '17px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  hint: {
    color: '#64748b',
    margin: '24px 0 0',
    fontSize: '13px',
  },
  checkmark: {
    width: '70px',
    height: '70px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 24px',
    fontSize: '40px',
    color: 'white',
    fontWeight: 'bold',
  },
  successText: {
    color: '#d1fae5',
    marginBottom: '28px',
  },
  successBtn: {
    background: 'white',
    color: '#065f46',
    padding: '14px 32px',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

// 🔹 CSS for pseudo-selectors & keyframes (injected once)
const PIN_STYLES = `
  @keyframes pinFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .pin-back-btn:hover { background: #475569 !important; }
  .pin-input:focus { border-color: #38bdf8 !important; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important; }
  .pin-input:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
  .pin-submit:hover:not(:disabled) { background: #7dd3fc !important; transform: translateY(-1px); }
  .pin-submit:disabled { background: #475569 !important; cursor: not-allowed !important; transform: none !important; }
  .pin-success-btn:hover { background: #f1f5f9 !important; }
`;

export function PinVerificationView({
  student,
  pin,
  pinBusy,
  pinError,
  onPinChange,
  onPinSubmit,
  onBack,
}) {
  return (
    <>
      <style>{PIN_STYLES}</style>
      <div style={STYLES.overlay}>
        <div style={STYLES.card}>
          <button className="pin-back-btn" style={STYLES.backBtn} onClick={onBack} aria-label="Back to camera">←</button>
          
          <h2 style={STYLES.title}>Verify Your Identity</h2>
          
          {student && (
            <p style={STYLES.studentInfo}>
              Welcome, <strong style={{ color: '#e2e8f0' }}>{student.nom} {student.prenom}</strong><br />
              <small>{'Student'}</small>
            </p>
          )}

          <form 
            style={STYLES.form}
            onSubmit={(e) => { e.preventDefault(); onPinSubmit(); }}
          >
            <label style={STYLES.label}>Enter your 3-digit PIN</label>
            <input
              className="pin-input"
              style={STYLES.input}
              type="password"
              inputMode="numeric"
              pattern="[0-9]{3}"
              maxLength={3}
              placeholder="•••"
              value={pin}
              onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
              disabled={pinBusy}
              autoFocus
            />
            
            {pinError && <p style={STYLES.error}>{pinError}</p>}
            
            <button 
              type="submit" 
              className="pin-submit"
              style={STYLES.submitBtn}
              disabled={pin.length !== 3 || pinBusy}
            >
              {pinBusy ? 'Verifying...' : 'Verify PIN'}
            </button>
          </form>

          <p style={STYLES.hint}><small>💡 Contact your institution if you forgot your PIN</small></p>
        </div>
      </div>
    </>
  );
}

export function PinSuccessView({ onContinue }) {
  return (
    <>
      <style>{PIN_STYLES}</style>
      <div style={STYLES.overlay}>
        <div style={{ ...STYLES.card, ...STYLES.cardSuccess }}>
          <div style={STYLES.checkmark}>✓</div>
          <h2 style={{ ...STYLES.title, color: 'white' }}>Access Granted</h2>
          <p style={STYLES.successText}>Your identity has been verified securely.</p>
          <button className="pin-success-btn" style={STYLES.successBtn} onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}