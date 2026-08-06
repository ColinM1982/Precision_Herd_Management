export const BREED_GROUPS = [
  { label: 'General', breeds: ['Crossbred'] },
  { label: 'NSR', breeds: ['Duroc', 'Hampshire', 'Landrace', 'Yorkshire'] },
  { label: 'CPS', breeds: ['Chester White', 'Poland China', 'Spot', 'Hereford', 'Tamworth'] },
] as const

export function BreedSelect({ value, onChange, label = 'Breed' }: { value: string; onChange: (value: string) => void; label?: string }) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value)}><option value="">Select breed...</option>{BREED_GROUPS.map(group => <optgroup label={group.label} key={group.label}>{group.breeds.map(breed => <option value={breed} key={breed}>{breed}</option>)}</optgroup>)}</select></label>
}

export function isCrossbred(value?: string | null) {
  return value?.trim().toLowerCase() === 'crossbred'
}
