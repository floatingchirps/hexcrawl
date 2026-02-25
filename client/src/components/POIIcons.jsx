import React from 'react';

// Simple SVG icons for each POI type - ink/line-art style
const ICONS = {
  // Settlement
  Town: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="3" y="9" width="14" height="9" />
      <polygon points="3,9 10,3 17,9" />
      <rect x="7" y="13" width="4" height="5" />
      <line x1="10" y1="3" x2="10" y2="1" />
    </svg>
  ),
  Village: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="2" y="10" width="7" height="8" />
      <polygon points="2,10 5.5,5 9,10" />
      <rect x="11" y="11" width="7" height="7" />
      <polygon points="11,11 14.5,6 18,11" />
    </svg>
  ),
  City: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="1" y="7" width="18" height="11" />
      <rect x="3" y="10" width="3" height="8" />
      <rect x="8.5" y="7" width="3" height="11" />
      <rect x="14" y="10" width="3" height="8" />
      <polygon points="1,7 10,2 19,7" />
    </svg>
  ),
  Hamlet: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="5" y="11" width="10" height="7" />
      <polygon points="5,11 10,6 15,11" />
      <line x1="5" y1="15" x2="3" y2="17" />
      <line x1="15" y1="15" x2="17" y2="17" />
    </svg>
  ),
  Outpost: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="5" y="5" width="10" height="13" />
      <rect x="3" y="3" width="3" height="4" />
      <rect x="14" y="3" width="3" height="4" />
      <line x1="5" y1="11" x2="15" y2="11" />
    </svg>
  ),
  Fort: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="3" y="5" width="14" height="13" />
      <line x1="3" y1="5" x2="3" y2="2" /><line x1="6" y1="5" x2="6" y2="2" />
      <line x1="9" y1="5" x2="9" y2="2" /><line x1="12" y1="5" x2="12" y2="2" />
      <line x1="15" y1="5" x2="15" y2="2" /><line x1="17" y1="5" x2="17" y2="2" />
      <line x1="3" y1="2" x2="17" y2="2" />
    </svg>
  ),
  Castle: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="4" y="6" width="12" height="12" />
      <rect x="2" y="3" width="4" height="5" />
      <rect x="14" y="3" width="4" height="5" />
      <rect x="8" y="3" width="4" height="5" />
      <rect x="8" y="14" width="4" height="4" />
    </svg>
  ),
  // Religious
  Shrine: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="10" y1="2" x2="10" y2="18" />
      <line x1="5" y1="7" x2="15" y2="7" />
    </svg>
  ),
  Temple: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="3" y="9" width="14" height="9" />
      <line x1="2" y1="9" x2="18" y2="9" />
      <line x1="5" y1="9" x2="5" y2="18" />
      <line x1="10" y1="9" x2="10" y2="18" />
      <line x1="15" y1="9" x2="15" y2="18" />
      <polygon points="3,9 10,3 17,9" />
      <line x1="10" y1="3" x2="10" y2="1" />
    </svg>
  ),
  Monastery: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="2" y="8" width="16" height="10" />
      <polygon points="2,8 10,3 18,8" />
      <line x1="10" y1="3" x2="10" y2="0" />
      <line x1="8" y1="1" x2="12" y2="1" />
      <circle cx="10" cy="12" r="2" />
    </svg>
  ),
  'Standing Stones': ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="4" y="5" width="3" height="13" rx="1" />
      <rect x="10" y="7" width="3" height="11" rx="1" />
      <rect x="14" y="4" width="3" height="14" rx="1" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  Cemetery: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="6" y1="4" x2="6" y2="12" />
      <line x1="3" y1="7" x2="9" y2="7" />
      <line x1="14" y1="4" x2="14" y2="12" />
      <line x1="11" y1="7" x2="17" y2="7" />
      <rect x="7" y="11" width="6" height="7" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  // Structure
  Tower: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="6" y="4" width="8" height="14" />
      <line x1="6" y1="4" x2="6" y2="2" /><line x1="8" y1="4" x2="8" y2="2" />
      <line x1="10" y1="4" x2="10" y2="2" /><line x1="12" y1="4" x2="12" y2="2" />
      <line x1="14" y1="4" x2="14" y2="2" />
      <line x1="6" y1="2" x2="14" y2="2" />
      <circle cx="10" cy="11" r="1.5" />
    </svg>
  ),
  Windmill: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="8" y="10" width="4" height="8" />
      <polygon points="8,10 12,10 10,5" />
      <line x1="10" y1="7" x2="10" y2="2" />
      <line x1="10" y1="7" x2="15" y2="9" />
      <line x1="10" y1="7" x2="5" y2="9" />
      <line x1="10" y1="7" x2="8" y2="12" />
    </svg>
  ),
  Lighthouse: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <polygon points="8,18 12,18 11,4 9,4" />
      <rect x="7" y="2" width="6" height="4" />
      <line x1="7" y1="4" x2="4" y2="3" />
      <line x1="13" y1="4" x2="16" y2="3" />
      <line x1="10" y1="2" x2="10" y2="0" />
    </svg>
  ),
  Bridge: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M2,14 Q10,8 18,14" />
      <line x1="2" y1="14" x2="2" y2="18" />
      <line x1="18" y1="14" x2="18" y2="18" />
      <line x1="7" y1="11" x2="7" y2="14" />
      <line x1="13" y1="11" x2="13" y2="14" />
      <line x1="2" y1="14" x2="18" y2="14" />
    </svg>
  ),
  Ruins: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="3" y1="18" x2="3" y2="8" /><line x1="3" y1="8" x2="6" y2="8" />
      <line x1="9" y1="18" x2="9" y2="5" /><line x1="9" y1="5" x2="13" y2="5" />
      <line x1="13" y1="18" x2="13" y2="11" /><line x1="13" y1="11" x2="17" y2="11" />
      <line x1="17" y1="18" x2="17" y2="11" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  Mine: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M5,18 L5,12 Q5,8 10,8 Q15,8 15,12 L15,18" />
      <line x1="3" y1="18" x2="17" y2="18" />
      <polygon points="7,12 10,6 13,12" />
      <line x1="10" y1="6" x2="10" y2="3" />
    </svg>
  ),
  // Natural
  Cave: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M2,18 Q2,10 10,8 Q18,10 18,18" />
      <path d="M5,18 Q5,14 10,13 Q15,14 15,18" />
      <line x1="2" y1="18" x2="18" y2="18" />
      <line x1="7" y1="8" x2="6" y2="5" /><line x1="10" y1="8" x2="10" y2="5" />
      <line x1="13" y1="8" x2="14" y2="5" />
    </svg>
  ),
  'Hot Spring': ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <ellipse cx="10" cy="14" rx="7" ry="3" />
      <path d="M7,11 Q8,8 7,5" /><path d="M10,11 Q11,8 10,5" /><path d="M13,11 Q14,8 13,5" />
    </svg>
  ),
  Waterfall: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="3" y1="2" x2="17" y2="2" />
      <path d="M6,2 L8,18" /><path d="M10,2 L10,18" /><path d="M14,2 L12,18" />
      <path d="M3,18 Q10,15 17,18" />
    </svg>
  ),
  'Ancient Tree': ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="10" y1="18" x2="10" y2="9" />
      <circle cx="10" cy="6" r="5" />
      <line x1="10" y1="12" x2="7" y2="15" />
      <line x1="10" y1="12" x2="13" y2="15" />
    </svg>
  ),
  Cliff: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M2,18 L2,5 L10,5 L10,10 L18,10 L18,18" />
      <line x1="2" y1="18" x2="18" y2="18" />
      <line x1="4" y1="7" x2="6" y2="9" /><line x1="12" y1="12" x2="14" y2="14" />
    </svg>
  ),
  // Dungeon
  'Dungeon Entrance': ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M5,18 L5,10 Q5,6 10,6 Q15,6 15,10 L15,18" />
      <line x1="3" y1="18" x2="17" y2="18" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="18" x2="3" y2="6" />
      <line x1="17" y1="18" x2="17" y2="6" />
    </svg>
  ),
  Lair: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M2,18 Q3,12 6,10 Q10,8 14,10 Q17,12 18,18" />
      <path d="M6,10 L5,6 L8,8" />
      <path d="M14,10 L15,6 L12,8" />
      <path d="M10,8 L10,4" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  Tomb: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="4" y="8" width="12" height="10" />
      <path d="M4,8 Q4,3 10,3 Q16,3 16,8" />
      <line x1="10" y1="3" x2="10" y2="1" />
      <line x1="8" y1="2" x2="12" y2="2" />
      <line x1="8" y1="12" x2="12" y2="12" />
      <line x1="10" y1="10" x2="10" y2="14" />
    </svg>
  ),
  Portal: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <ellipse cx="10" cy="10" rx="6" ry="8" />
      <ellipse cx="10" cy="10" rx="3" ry="5" />
      <line x1="4" y1="18" x2="16" y2="18" />
      <line x1="4" y1="18" x2="4" y2="12" />
      <line x1="16" y1="18" x2="16" y2="12" />
    </svg>
  ),
  // Other
  Campsite: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <polygon points="10,3 2,17 18,17" />
      <line x1="10" y1="3" x2="10" y2="17" />
      <ellipse cx="10" cy="17" rx="4" ry="1.5" />
      <line x1="7" y1="17" x2="5" y2="19" />
      <line x1="13" y1="17" x2="15" y2="19" />
    </svg>
  ),
  Battlefield: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <line x1="3" y1="3" x2="17" y2="17" strokeWidth="1.8" />
      <line x1="17" y1="3" x2="3" y2="17" strokeWidth="1.8" />
      <circle cx="10" cy="10" r="2" />
    </svg>
  ),
  Shipwreck: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M3,14 Q10,18 17,14" />
      <path d="M5,14 L6,8 L14,8 L15,14" />
      <line x1="10" y1="8" x2="10" y2="3" />
      <line x1="7" y1="6" x2="13" y2="6" />
    </svg>
  ),
  Obelisk: ({ size = 20, color = '#3D2B1F' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
      <polygon points="9,2 11,2 13,18 7,18" />
      <line x1="6" y1="18" x2="14" y2="18" />
    </svg>
  ),
};

export default function POIIcon({ type, size = 20, color = '#3D2B1F' }) {
  const Icon = ICONS[type];
  if (!Icon) {
    // Default fallback
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.2">
        <circle cx="10" cy="10" r="7" />
        <line x1="10" y1="6" x2="10" y2="10" />
        <circle cx="10" cy="13" r="0.8" fill={color} />
      </svg>
    );
  }
  return <Icon size={size} color={color} />;
}

export { ICONS };
