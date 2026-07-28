import React from 'react';
import { CreditCard, Check, ArrowUpRight } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon portion - EliteCaja Golden Vector Logo */}
      <div className="relative flex-shrink-0 flex items-center justify-center w-14 h-14 select-none">
        <svg
          className="w-full h-full filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* The absolute premium brushed gold/champagne gradient matching the image */}
            <linearGradient id="eliteCajaGold" x1="0" y1="160" x2="160" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8d6c1b" />
              <stop offset="15%" stopColor="#b38f2d" />
              <stop offset="30%" stopColor="#d5b45f" />
              <stop offset="50%" stopColor="#fbf0be" />
              <stop offset="65%" stopColor="#e1c374" />
              <stop offset="85%" stopColor="#b38f2d" />
              <stop offset="100%" stopColor="#805d12" />
            </linearGradient>
            
            {/* Soft shadow to separate overlapping layers */}
            <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.25"/>
            </filter>
          </defs>

          {/* Left crescent swoosh wrapping under and around the terminal from the image */}
          <path
            d="M 33,62 
               C 21,79 13,99 23,119 
               C 33,139 58,144 79,139 
               C 92,135 102,125 108,112"
            stroke="url(#eliteCajaGold)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right partial crescent swoosh that balances behind the arrow */}
          <path
            d="M 112,96
               C 117,86 119,74 115,62"
            stroke="url(#eliteCajaGold)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Paper roll representation on top of terminal */}
          <path
            d="M 64,19 
               L 95,19 
               C 95,19 91,27 82,25 
               C 74,23 66,27 64,26 
               L 64,19 Z"
            fill="url(#eliteCajaGold)"
          />

          {/* Terminal main bounding box (thick gold casework structure) */}
          <rect
            x="50"
            y="26"
            width="52"
            height="90"
            rx="11"
            stroke="url(#eliteCajaGold)"
            strokeWidth="6"
            fill="none"
          />

          {/* POS Display Screen inside terminal */}
          <rect
            x="59"
            y="35"
            width="34"
            height="24"
            rx="3"
            stroke="url(#eliteCajaGold)"
            strokeWidth="2.5"
            fill="none"
          />
          <line x1="64" y1="43" x2="88" y2="43" stroke="url(#eliteCajaGold)" strokeWidth="1.8" />
          <line x1="64" y1="49" x2="80" y2="49" stroke="url(#eliteCajaGold)" strokeWidth="1.8" />

          {/* Keyboard inputs / paper feed button detail */}
          <circle cx="63" cy="72" r="2.2" fill="url(#eliteCajaGold)" />
          <circle cx="76" cy="72" r="2.2" fill="url(#eliteCajaGold)" />
          <circle cx="89" cy="72" r="2.2" fill="url(#eliteCajaGold)" />
          
          <rect x="62" y="81" width="10" height="4.5" rx="1.2" fill="url(#eliteCajaGold)" />
          <rect x="76" y="81" width="15" height="4.5" rx="1.2" fill="url(#eliteCajaGold)" />
          
          {/* Elegant bottom slot mark or card reader touch points */}
          <rect x="71" y="93" width="10" height="4.5" rx="1" fill="url(#eliteCajaGold)" />

          {/* Big golden check mark that crosses the terminal, terminating in an arrowhead */}
          {/* It goes over the lower terminal body block */}
          <path
            d="M 34,95 
               L 60,121
               L 115,48"
            stroke="url(#eliteCajaGold)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#logoShadow)"
          />

          {/* Sharp North-East Arrowhead at the tip of the check icon to denote positive metrics and growth */}
          <path
            d="M 97,45 L 123,40 L 117,66 Z"
            fill="url(#eliteCajaGold)"
            stroke="url(#eliteCajaGold)"
            strokeWidth="3"
            strokeLinejoin="round"
            filter="url(#logoShadow)"
          />
        </svg>
      </div>

      {/* Text portion - matched exactly to the brand logo typography */}
      {showText && (
        <div className="flex flex-col justify-center select-none">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-[#0e2238] dark:text-white tracking-tight leading-none">
              Elite
            </span>
            <span className="text-3xl font-normal text-[#0e2238] dark:text-blue-100 tracking-tight leading-none ml-px">
              Caja
            </span>
          </div>
          <span className="text-[0.48rem] font-bold text-[#0e2238]/90 dark:text-blue-300 tracking-[0.22em] mt-1 whitespace-nowrap">
            SOLUCIÓN DE PUNTO DE VENTA
          </span>
        </div>
      )}
    </div>
  );
}
