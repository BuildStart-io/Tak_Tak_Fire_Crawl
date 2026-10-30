import React from 'react';

/**
 * TakTak Jobs Official Brand Logo
 * Matches the exact green speed-chat briefcase icon & typography
 */
export default function TakTakLogo({ size = 'medium' }) {
  const isLarge = size === 'large';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* TakTak Green Speed Briefcase Icon */}
      <svg 
        width={isLarge ? 48 : 38} 
        height={isLarge ? 48 : 38} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Speed lines on left */}
        <path d="M12 28H38" stroke="#00a854" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M5 45H32" stroke="#00a854" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M10 62H35" stroke="#00a854" strokeWidth="6.5" strokeLinecap="round" />

        {/* Main circular chat bubble */}
        <circle cx="58" cy="45" r="34" fill="#00a854" />
        
        {/* Chat bubble tail */}
        <path d="M36 65L24 75L44 68Z" fill="#00a854" />

        {/* White Briefcase inside */}
        {/* Handle */}
        <path 
          d="M50 33C50 30.8 51.8 29 54 29H62C64.2 29 66 30.8 66 33V35H50V33Z" 
          stroke="#ffffff" 
          strokeWidth="3" 
          fill="none" 
        />
        {/* Briefcase Body */}
        <rect x="42" y="35" width="32" height="23" rx="4.5" fill="#ffffff" />
        {/* Center line */}
        <path d="M42 45H74" stroke="#00a854" strokeWidth="2.5" />
        {/* Center Lock / Buckle */}
        <rect x="55" y="42" width="6" height="6.5" rx="1.5" fill="#00a854" />
      </svg>

      {/* Typography: TakTak (Dark Navy) + Jobs (Green) */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.05' }}>
        <span style={{ 
          fontSize: isLarge ? '21px' : '17px', 
          fontWeight: '900', 
          color: '#0c1e38', 
          letterSpacing: '-0.5px' 
        }}>
          TakTak
        </span>
        <span style={{ 
          fontSize: isLarge ? '21px' : '17px', 
          fontWeight: '900', 
          color: '#00a854', 
          letterSpacing: '-0.5px' 
        }}>
          Jobs
        </span>
      </div>
    </div>
  );
}
