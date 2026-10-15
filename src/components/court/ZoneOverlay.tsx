import React from 'react';

interface ZoneOverlayProps {
  visible: boolean;
}

export const ZoneOverlay: React.FC<ZoneOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <g className="zone-overlay pointer-events-none select-none" opacity="0.12">
      {/* Top of key area */}
      <rect x="25" y="66" width="50" height="34" fill="#38bdf8" stroke="#38bdf8" strokeWidth="0.5" />
      <text x="50" y="85" textAnchor="middle" fontSize="3" fill="#ffffff" opacity="0.8">TOP</text>

      {/* Left Wing */}
      <rect x="0" y="24" width="30" height="42" fill="#3b82f6" stroke="#3b82f6" strokeWidth="0.5" />
      <text x="15" y="48" textAnchor="middle" fontSize="3" fill="#ffffff" opacity="0.8">LEFT WING</text>

      {/* Right Wing */}
      <rect x="70" y="24" width="30" height="42" fill="#a855f7" stroke="#a855f7" strokeWidth="0.5" />
      <text x="85" y="48" textAnchor="middle" fontSize="3" fill="#ffffff" opacity="0.8">RIGHT WING</text>

      {/* Left Corner */}
      <rect x="0" y="0" width="20" height="24" fill="#10b981" stroke="#10b981" strokeWidth="0.5" />
      <text x="10" y="14" textAnchor="middle" fontSize="2.5" fill="#ffffff" opacity="0.8">L-CORNER</text>

      {/* Right Corner */}
      <rect x="80" y="0" width="20" height="24" fill="#eab308" stroke="#eab308" strokeWidth="0.5" />
      <text x="90" y="14" textAnchor="middle" fontSize="2.5" fill="#ffffff" opacity="0.8">R-CORNER</text>

      {/* Paint Key */}
      <rect x="34" y="0" width="32" height="38" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
      <text x="50" y="22" textAnchor="middle" fontSize="3.5" fill="#ffffff" opacity="0.8">PAINT</text>
    </g>
  );
};
