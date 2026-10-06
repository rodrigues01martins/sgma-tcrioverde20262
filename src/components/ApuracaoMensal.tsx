import React from 'react';
import { Header } from './Header';

interface ApuracaoMensalProps {
  onGoHome: () => void;
  onSignOut: () => void;
}

export const ApuracaoMensal: React.FC<ApuracaoMensalProps> = ({ onGoHome, onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header
        showExportButton={false}
        onGoHome={onGoHome}
        onExportCSV={() => {}}
        onSignOut={onSignOut}
      />

      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h2 style={{
            fontSize: '26px', fontWeight: 700, lineHeight: '32px',
            color: 'var(--text-primary)', fontFamily: 'var(--font-family)',
            letterSpacing: '-0.01em',
          }}>
            Apuração Mensal
          </h2>
        </div>
      </div>
    </div>
  );
};
