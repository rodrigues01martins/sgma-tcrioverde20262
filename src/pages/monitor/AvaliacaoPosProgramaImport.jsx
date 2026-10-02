import SurveyCsvDropzone from '../../components/monitor/surveys/SurveyCsvDropzone'
import { GRADUATE_SCHEMA } from '../../features/surveys/schemas'

// ============================================================
// FORMULÁRIOS → AVALIAÇÃO PÓS-PROGRAMA (seção 7)
// ============================================================
// Fonte única: Egresso. Metodologicamente NÃO é pesquisa de satisfação
// (seção 1) — é avaliação de resultados pós-programa, por isso vive numa
// página própria, separada de Indicadores de Satisfação.
export default function AvaliacaoPosProgramaImport() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
          Avaliação Pós-Programa — Importação
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
          Importe o arquivo CSV exportado do Microsoft Forms com as respostas de egressos do Programa.
        </p>
      </div>

      <SurveyCsvDropzone schema={GRADUATE_SCHEMA} />
    </div>
  )
}
