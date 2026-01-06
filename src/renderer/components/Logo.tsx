import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Card Shape */}
      <rect
        x="10"
        y="15"
        width="80"
        height="70"
        rx="12"
        fill="url(#logo-gradient)"
        className="drop-shadow-sm"
      />
      
      {/* Camera Lens / Card Stack Stylized */}
      <circle cx="50" cy="50" r="18" fill="white" fillOpacity="0.2" />
      <circle cx="50" cy="50" r="12" stroke="white" strokeWidth="4" />
      <circle cx="50" cy="50" r="4" fill="white" />
      
      {/* AI Sparkles */}
      <path
        d="M82 25L84.5 31L90.5 33.5L84.5 36L82 42L79.5 36L73.5 33.5L79.5 31L82 25Z"
        fill="#FFD700"
      />
      <path
        d="M18 65L19.5 69L23.5 70.5L19.5 72L18 76L16.5 72L12.5 70.5L16.5 69L18 65Z"
        fill="white"
        fillOpacity="0.6"
      />

      <defs>
        <linearGradient
          id="logo-gradient"
          x1="10"
          y1="15"
          x2="90"
          y2="85"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
