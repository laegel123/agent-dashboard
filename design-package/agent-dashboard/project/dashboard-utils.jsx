// Shared helpers for the dashboard (icons, format utilities, status meta)
window.DashUtils = (() => {
  const fmtTok = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : n.toString();
  const fmt$ = (n) => '$' + n.toFixed(2);

  const Icon = ({ name, size = 14, ...rest }) => {
    const paths = {
      pause:   'M5 4h3v12H5zM12 4h3v12h-3z',
      play:    'M5 3l13 7-13 7z',
      check:   'M4 10l4 4 8-9',
      x:       'M4 4l12 12M16 4L4 16',
      retry:   'M3 10a7 7 0 0 1 12-5l2-2v6h-6l2.4-2.4a5 5 0 0 0-8.4 3.4M17 10a7 7 0 0 1-12 5l-2 2v-6h6l-2.4 2.4a5 5 0 0 0 8.4-3.4',
      chat:    'M3 4h14v10H8l-5 4z',
      search:  'M8 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM13 13l4 4',
      plus:    'M10 4v12M4 10h12',
      branch:  'M5 3v14M5 7a3 3 0 0 0 3 3h2a3 3 0 0 1 3 3v1',
      gear:    'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0-3v1.5M10 14.5V16M3.5 10H5M15 10h1.5M5.5 5.5l1 1M13.5 13.5l1 1M5.5 14.5l1-1M13.5 6.5l1-1',
      dots:    'M5 10h.01M10 10h.01M15 10h.01',
      arrow:   'M4 10h12M11 5l5 5-5 5',
      file:    'M5 3h7l3 3v11H5z',
      bolt:    'M11 2L4 11h5l-1 7 7-9h-5l1-7z',
    };
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
        <path d={paths[name]} />
      </svg>
    );
  };

  // Pulsing dot for running state
  const StatusDot = ({ status, size = 8 }) => {
    const s = window.STATUS_META[status];
    return (
      <span style={{
        width: size, height: size, borderRadius: size / 2,
        background: s.fg, flex: '0 0 auto', position: 'relative',
        boxShadow: status === 'running' ? `0 0 0 ${size / 2}px ${s.bg}` : 'none',
        animation: status === 'running' ? 'pulse-dot 2.2s ease-out infinite' : 'none',
      }} />
    );
  };

  return { fmtTok, fmt$, Icon, StatusDot };
})();
