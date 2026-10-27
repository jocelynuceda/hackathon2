export type Palette = {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
}

export type SagaSummary = {
  id: string
  order: number
  title: string
  subtitle: string
  synopsis: string
  stageCount: number
  totalDistanceNm: number
  firstIsland: string
  lastIsland: string
  palette: Palette
}

export type StageMetricKey = 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat'

export type StageMetric = {
  key: StageMetricKey
  label: string
  value: number
  unit: string
}

export type SagaStage = {
  id: string
  order: number
  slug: string
  title: string
  narrative: string[]
  island: { id: string; name: string; x: number; y: number }
  palette: Palette
  metrics: StageMetric[]
}

export type SagaStory = {
  saga: SagaSummary & { intro: string }
  map: { width: number; height: number }
  stages: SagaStage[]
}
