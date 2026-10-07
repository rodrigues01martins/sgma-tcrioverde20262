// Testes da fórmula da Visita In Loco — executar com `npm test`
// (node --test, sem dependências adicionais).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apurarVisita, calcularParecer, validarFinalizacao } from './apuracao.js'
import { ITENS, FATOR_POR_STATUS } from './config.js'

// Todos os 22 itens com o mesmo status, sobrescrevendo alguns.
function itensCom(padrao, sobrescritas = {}) {
  const itens = {}
  for (const item of ITENS) itens[item.id] = { status: padrao, observacao: 'ok' }
  for (const [id, status] of Object.entries(sobrescritas)) itens[id] = { status, observacao: 'ok' }
  return itens
}

test('existem 22 itens e 9 críticos', () => {
  assert.equal(ITENS.length, 22)
  assert.deepEqual(
    ITENS.filter(i => i.critico).map(i => i.id),
    ['item_1_1', 'item_3_1', 'item_3_3', 'item_4_1', 'item_4_2', 'item_5_1', 'item_5_2', 'item_5_3', 'item_5_4'],
  )
})

test('Cenário 1 — 22 Conforme: 100% e Regular sem Ressalvas', () => {
  const r = apurarVisita(itensCom('conforme'))
  assert.equal(r.percentualGlobal, 100)
  assert.equal(r.parecer, 'regular_sem_ressalvas')
  assert.equal(r.classificacao, 'conforme')
})

test('Cenário 2 — maioria Conforme, sem Não Conforme, ≥90%, sem crítico parcial: Regular sem Ressalvas', () => {
  const r = apurarVisita(itensCom('conforme', { item_1_2: 'conforme_parcialmente', item_6_3: 'conforme_parcialmente' }))
  assert.ok(r.percentualGlobal >= 90)
  assert.equal(r.quantidadeNaoConforme, 0)
  assert.equal(r.criticosParciais, 0)
  assert.equal(r.parecer, 'regular_sem_ressalvas')
})

test('Cenário 3 — ≥90% com item NÃO crítico Não Conforme: Regular com Ressalvas', () => {
  const r = apurarVisita(itensCom('conforme', { item_1_2: 'nao_conforme' }))
  assert.ok(r.percentualGlobal >= 90)
  assert.equal(r.parecer, 'regular_com_ressalvas')
})

test('Cenário 4 — ≥90% com item CRÍTICO Conforme Parcialmente: Regular com Ressalvas', () => {
  const r = apurarVisita(itensCom('conforme', { item_1_1: 'conforme_parcialmente' }))
  assert.ok(r.percentualGlobal >= 90)
  assert.equal(r.criticosParciais, 1)
  assert.equal(r.parecer, 'regular_com_ressalvas')
})

test('Cenário 5 — exemplo do enunciado (14 C, 4 CP, 2 NC, 2 N/A) = 80%: Regular com Ressalvas', () => {
  const r = apurarVisita(itensCom('conforme', {
    item_1_2: 'nao_conforme', item_2_1: 'nao_conforme',
    item_2_2: 'nao_se_aplica', item_2_3: 'nao_se_aplica',
    item_3_2: 'conforme_parcialmente', item_3_4: 'conforme_parcialmente',
    item_3_5: 'conforme_parcialmente', item_6_1: 'conforme_parcialmente',
  }))
  assert.equal(r.quantidadeConforme, 14)
  assert.equal(r.itensAplicaveis, 20)
  assert.equal(r.percentualGlobal, 80)
  assert.equal(r.criticosNaoConformes, 0)
  assert.equal(r.classificacao, 'satisfatoria_com_ressalvas')
  assert.equal(r.parecer, 'regular_com_ressalvas')
})

test('Cenário 6 — percentual < 75% sem crítico Não Conforme: Irregular', () => {
  const naoCriticos = Object.fromEntries(ITENS.filter(i => !i.critico).map(i => [i.id, 'nao_conforme']))
  const r = apurarVisita(itensCom('conforme', naoCriticos))
  assert.equal(r.criticosNaoConformes, 0)
  assert.ok(r.percentualGlobal < 75)
  assert.equal(r.classificacao, 'nao_conforme')
  assert.equal(r.parecer, 'irregular')
})

test('Cenário 7 — percentual alto com item crítico Não Conforme: Irregular', () => {
  const r = apurarVisita(itensCom('conforme', { item_5_1: 'nao_conforme' }))
  assert.ok(r.percentualGlobal >= 90)
  assert.equal(r.criticosNaoConformes, 1)
  assert.equal(r.parecer, 'irregular')
})

test('Cenário 8 — Não se Aplica fica fora do denominador', () => {
  const r = apurarVisita(itensCom('conforme', { item_1_2: 'nao_se_aplica', item_6_4: 'nao_se_aplica' }))
  assert.equal(r.quantidadeNaoSeAplica, 2)
  assert.equal(r.itensAplicaveis, 20)
  assert.equal(r.percentualGlobal, 100) // seria 90,9% se N/A contasse como zero
  assert.equal(r.percentuaisSecoes.secao_1, 100)
})

test('Cenário 9 — seção inteira Não se Aplica: percentual da seção null (nunca 0%)', () => {
  const r = apurarVisita(itensCom('conforme', { item_4_1: 'nao_se_aplica', item_4_2: 'nao_se_aplica' }))
  assert.equal(r.percentuaisSecoes.secao_4, null)
  assert.notEqual(r.percentuaisSecoes.secao_4, 0)
  assert.equal(r.percentualGlobal, 100)
})

test('Cenário 10 — Conforme Parcialmente vale 0,50', () => {
  assert.equal(FATOR_POR_STATUS.conforme_parcialmente, 0.5)
  const r = apurarVisita(itensCom('conforme', { item_1_2: 'conforme_parcialmente' }))
  assert.equal(r.percentuaisSecoes.secao_1, 75) // (1 + 0,5) / 2
  assert.equal(apurarVisita(itensCom('conforme_parcialmente')).percentualGlobal, 50)
})

test('global é calculado sobre os itens, não pela média das seções', () => {
  // Seção 1: 2 itens, 1 NC → 50%. Demais seções 100%. Média das seções = 92,9%;
  // sobre os itens = 21/22 = 95,45%.
  const r = apurarVisita(itensCom('conforme', { item_1_2: 'nao_conforme' }))
  assert.equal(r.percentuaisSecoes.secao_1, 50)
  assert.ok(Math.abs(r.percentualGlobal - (21 * 100) / 22) < 1e-9)
})

test('limites exatos: 90% e 75%', () => {
  assert.equal(calcularParecer({ percentualGlobal: 90, quantidadeNaoConforme: 0, criticosNaoConformes: 0, criticosParciais: 0 }), 'regular_sem_ressalvas')
  assert.equal(calcularParecer({ percentualGlobal: 75, quantidadeNaoConforme: 1, criticosNaoConformes: 0, criticosParciais: 0 }), 'regular_com_ressalvas')
  assert.equal(calcularParecer({ percentualGlobal: 74.99, quantidadeNaoConforme: 1, criticosNaoConformes: 0, criticosParciais: 0 }), 'irregular')
})

test('rascunho parcial: itens sem status não contam', () => {
  const r = apurarVisita({ item_1_1: { status: 'conforme' } })
  assert.equal(r.itensAvaliados, 1)
  assert.equal(r.percentualGlobal, 100)
  assert.equal(r.percentuaisSecoes.secao_2, null)
})

function registroCompleto() {
  return {
    visita: { data: '2026-10-07', horaInicio: '08:00', horaTermino: '11:30', representanteOsc: 'Fulano' },
    vistoriador: { uid: 'u1', nome: 'Vistoriador' },
    itens: itensCom('conforme'),
    conclusao: { resumoAchados: 'x', recomendacoes: 'y', prazoSaneamentoDias: 15 },
  }
}

test('validação — registro completo pode ser finalizado', () => {
  assert.deepEqual(validarFinalizacao(registroCompleto()), [])
})

test('validação — observação obrigatória, inclusive em Não se Aplica', () => {
  const reg = registroCompleto()
  reg.itens.item_2_2 = { status: 'nao_se_aplica', observacao: '  ' }
  const erros = validarFinalizacao(reg)
  assert.equal(erros.length, 1)
  assert.match(erros[0].mensagem, /justifique a não aplicabilidade/)
})

test('validação — status ausente, término antes do início e prazo inválido', () => {
  const reg = registroCompleto()
  delete reg.itens.item_7_2
  reg.visita.horaTermino = '07:00'
  reg.conclusao.prazoSaneamentoDias = 1.5
  const campos = validarFinalizacao(reg).map(e => e.campo)
  assert.ok(campos.includes('item_7_2.status'))
  assert.ok(campos.includes('horaTermino'))
  assert.ok(campos.includes('prazoSaneamentoDias'))
})

test('validação — data inexistente é recusada', () => {
  const reg = registroCompleto()
  reg.visita.data = '2026-02-30'
  assert.ok(validarFinalizacao(reg).some(e => e.campo === 'data'))
})
