import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  onSignOut: () => void;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-[#007770]/10 rounded-2xl flex items-center justify-center mb-4 text-[#007770]">
        <Construction size={28} />
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">{title}</h1>
      <p className="text-slate-500 text-sm max-w-md">
        Esta dimensão está em desenvolvimento e ficará disponível em uma próxima etapa do projeto.
      </p>
      <button
        onClick={onSignOut}
        className="mt-8 text-[#007770] text-sm font-bold hover:underline"
      >
        Sair
      </button>
    </div>
  );
};
