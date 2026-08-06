export const SWINE_GESTATION_DAYS = 114
export const SWINE_HEAT_MIN_DAYS = 18
export const SWINE_HEAT_MAX_DAYS = 21
export const SWINE_HEAT_CYCLE_DAYS = 19

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function heatWindow(lastHeat?: string | null, cycle = 1) {
  if (!lastHeat) return null
  return {
    start: addDays(lastHeat, SWINE_HEAT_MIN_DAYS * cycle),
    end: addDays(lastHeat, SWINE_HEAT_MAX_DAYS * cycle),
  }
}

export function projectedHeatDate(lastHeat?: string | null, cycle = 1) {
  return lastHeat ? addDays(lastHeat, SWINE_HEAT_CYCLE_DAYS * cycle) : null
}

export function targetBreedingDate(targetFarrowDate: string) {
  return addDays(targetFarrowDate, -SWINE_GESTATION_DAYS)
}

export function expectedFarrowDate(breedingDate: string) {
  return addDays(breedingDate, SWINE_GESTATION_DAYS)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function nowLocal() {
  const value = new Date()
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 16)
}
