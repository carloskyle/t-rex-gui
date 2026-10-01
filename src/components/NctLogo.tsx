import React from 'react';
import logoSrc from '../nct-branco.png';

interface NctLogoProps {
  className?: string;
  subtitle?: string;
}

export const NctLogo: React.FC<NctLogoProps> = ({
  className = 'h-8',
  subtitle,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src={logoSrc}
        alt="NCT Informática"
        className="h-full w-auto object-contain"
        draggable={false}
      />

      {subtitle && (
        <div className="flex flex-col border-l border-slate-700/80 pl-3 leading-tight">
          <span className="text-[11px] font-bold tracking-wider text-slate-100 uppercase font-sans">
            NCT Informática
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-tight">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
