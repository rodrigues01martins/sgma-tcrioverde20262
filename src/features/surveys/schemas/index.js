import { ACTIVE_LEARNER_SCHEMA } from './activeLearner'
import { MENTOR_SCHEMA } from './mentor'
import { GUARDIAN_SCHEMA } from './guardian'
import { GRADUATE_SCHEMA } from './graduate'

export { ACTIVE_LEARNER_SCHEMA, MENTOR_SCHEMA, GUARDIAN_SCHEMA, GRADUATE_SCHEMA }

// Registro único dos 4 schemas — import/UI nunca referenciam um schema
// concreto diretamente, sempre por surveyType, para que adicionar/versionar
// um instrumento não exija tocar em código de import ou painel.
export const SURVEY_SCHEMAS = {
  ACTIVE_LEARNER: ACTIVE_LEARNER_SCHEMA,
  MENTOR: MENTOR_SCHEMA,
  GUARDIAN: GUARDIAN_SCHEMA,
  GRADUATE: GRADUATE_SCHEMA,
}

export function getSurveySchema(surveyType) {
  const schema = SURVEY_SCHEMAS[surveyType]
  if (!schema) throw new Error(`Tipo de pesquisa desconhecido: ${surveyType}`)
  return schema
}
