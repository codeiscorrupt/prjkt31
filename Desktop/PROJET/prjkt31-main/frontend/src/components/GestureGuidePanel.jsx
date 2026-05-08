const steps = [
  { title: 'Open hand, then close', type: 'openClose' },
  { title: 'Cursor pops up', type: 'cursorPop' },
  { title: 'Move closed hand', type: 'moveHand' },
  { title: 'Cursor follows left/right', type: 'cursorMove' },
  { title: 'Closed hand, then open', type: 'openClick' },
  { title: 'Cursor click animation', type: 'cursorClick' },
];

function GloveHand({ type }) {
  const showCursor = type === 'cursorPop' || type === 'cursorMove' || type === 'cursorClick';
  const moving = type === 'moveHand';
  const closing = type === 'openClose';
  const opening = type === 'openClick';

  return (
    <svg className={`guide-svg guide-svg-${type}`} viewBox="0 0 154 102" role="img" aria-label={type}>
      <defs>
        <filter id={`soft-${type}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="4" floodOpacity="0.35" />
        </filter>
      </defs>

      {showCursor ? (
        <g className="guide-cursor-group">
          {type === 'cursorMove' && <path className="guide-dashed" d="M28 50 C55 24 89 76 126 42" />}
          <path className="guide-pc-cursor" d="M48 20 L102 66 L76 72 L67 94 Z" />
          {type === 'cursorClick' && <circle className="guide-click-ring" cx="67" cy="65" r="25" />}
        </g>
      ) : (
        <g className={moving ? 'guide-hand-moving' : ''} filter={`url(#soft-${type})`}>
          <rect className="guide-glove-palm" x="50" y="42" width="50" height="42" rx="20" />
          {[0, 1, 2, 3].map((finger) => (
            <rect
              key={finger}
              className={`guide-glove-finger ${closing ? 'closing' : ''} ${opening ? 'opening' : ''}`}
              x={38 + finger * 17}
              y="14"
              width="14"
              height="44"
              rx="7"
              style={{ animationDelay: `${finger * 0.06}s` }}
            />
          ))}
          <rect className="guide-glove-thumb" x="86" y="52" width="35" height="14" rx="7" transform="rotate(-28 86 52)" />
          <path className="guide-glove-cut" d="M54 65 C66 73 82 73 96 65" />
        </g>
      )}
    </svg>
  );
}

export function GestureGuidePanel({ active }) {
  return (
    <aside className="gesture-guide-panel">
      <p className="panel-eyebrow">PIN gesture guide</p>
      <h2>How to enter the PIN</h2>
      <p className="guide-copy">Use the glove-style hand movement. The pointer behaves like a PC cursor.</p>
      <div className="guide-grid">
        {steps.map((step) => (
          <article className="guide-card" key={step.type}>
            <GloveHand type={step.type} />
            <strong>{step.title}</strong>
          </article>
        ))}
      </div>
      <div className={`guide-status ${active ? 'active' : ''}`}>{active ? 'Gesture tracking active' : 'Waiting for access'}</div>
    </aside>
  );
}
