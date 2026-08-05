import type { Animal, BirthEvent, LitterPig, OffspringGroup, RegistryProfile, StudListing } from '../types/database'

export type RegistrationRecord = { association: string; registration_number: string; registered_name: string | null }

export type LitterExportData = {
  litter: OffspringGroup
  birth: BirthEvent
  dam: Animal
  sire: StudListing | null
  pigs: LitterPig[]
  profile: RegistryProfile | null
  damRegistration: RegistrationRecord | null
  breedingDate: string | null
}

function csvValue(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const contents = [headers, ...rows.map(row => headers.map(header => row[header]))]
    .map(row => row.map(csvValue).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ownerFields(profile: RegistryProfile | null) {
  return {
    'Owner name': profile?.owner_name || '',
    'Farm / business': profile?.business_name || '',
    Address: profile?.address_line_1 || '',
    City: profile?.city || '',
    State: profile?.state || '',
    ZIP: profile?.postal_code || '',
    Phone: profile?.phone || '',
    Email: profile?.email || '',
    'Herd mark': profile?.herd_mark || '',
    'Breeder / owner number': profile?.breeder_number || '',
  }
}

function safeName(value: string) {
  return value.trim().replaceAll(/[^a-zA-Z0-9]+/g, '-').replaceAll(/^-|-$/g, '') || 'litter'
}

export function exportNsrRegistration(data: LitterExportData) {
  const rows = data.pigs.map(pig => ({
    ...ownerFields(data.profile),
    Breed: data.litter.breed || data.dam.breed || '',
    'Dam name': data.dam.registered_name || data.dam.call_name,
    'Dam ear notch': data.dam.ear_notch || data.dam.primary_id || '',
    'Dam registration number': data.damRegistration?.registration_number || '',
    'Sire name': data.sire?.boar_name || '',
    'Sire ear notch': data.sire?.ear_notch || '',
    'Sire registration number': data.sire?.registration_number || '',
    'Litter number': data.litter.litter_number || data.litter.litter_notch || '',
    'Litter ear notch': data.litter.litter_notch || '',
    'Farrow date': data.litter.birth_date,
    Parity: data.litter.parity ?? '',
    TNB: data.birth.total_born,
    NBA: data.birth.born_alive,
    LBW: data.litter.litter_birth_weight ?? '',
    NAT: data.litter.number_after_transfer ?? '',
    NW: data.litter.number_weighed ?? '',
    LWW: data.litter.litter_weaning_weight ?? '',
    'Weaning date': data.litter.weaning_date || '',
    'Estrus date': data.litter.estrus_date || '',
    'Pig sequence': pig.sequence_number,
    'Pig class': pig.sex_class,
    'Individual notch': pig.individual_notch || '',
    'Full ear notch': [data.litter.litter_notch, pig.individual_notch].filter(Boolean).join('-'),
    'Pig registered name': pig.registered_name || pig.pig_name || '',
    'Pig registration number': pig.registration_number || '',
    'Teats left': pig.teat_count_left ?? '',
    'Teats right': pig.teat_count_right ?? '',
    'Birth weight': pig.birth_weight ?? '',
    'Weaning weight': pig.weaning_weight ?? '',
    Status: pig.status,
  }))
  downloadCsv(`NSR-registration-${safeName(data.litter.group_name)}.csv`, rows)
}

export function exportCpsLitterApplication(data: LitterExportData) {
  const rows = data.pigs.map(pig => ({
    ...ownerFields(data.profile),
    Breed: data.litter.breed || data.dam.breed || '',
    'Litter ear notch': data.litter.litter_notch || '',
    'Farrowing date': data.litter.birth_date,
    'Dam ear notch': data.dam.ear_notch || data.dam.primary_id || '',
    'Dam registration number': data.damRegistration?.registration_number || '',
    'Sire ear notch': data.sire?.ear_notch || '',
    'Sire registration number': data.sire?.registration_number || '',
    'Total born': data.birth.total_born,
    'Total born alive': data.birth.born_alive,
    'Pig sequence': pig.sequence_number,
    'Pig class': pig.sex_class,
    'Individual ear notch': pig.individual_notch || '',
    'Barrow marker': pig.sex_class === 'barrow' ? 'X' : '',
    'Date sold': pig.sale_date || '',
    'Sale price': pig.sale_price ?? '',
    'Purchaser name': pig.buyer_name || '',
    'Purchaser address': pig.buyer_address || '',
  }))
  downloadCsv(`CPS-litter-application-${safeName(data.litter.group_name)}.csv`, rows)
}

export function exportNsrBreedingCertificate(data: LitterExportData) {
  downloadCsv(`NSR-breeding-certificate-${safeName(data.litter.group_name)}.csv`, [{
    Date: new Date().toISOString().slice(0, 10),
    'This certifies that the sow': data.dam.registered_name || data.dam.call_name,
    'Sow registration number': data.damRegistration?.registration_number || '',
    'Was bred to my boar': data.sire?.boar_name || '',
    'Boar registration number': data.sire?.registration_number || '',
    'On this date': data.breedingDate || '',
    Signed: data.profile?.signature_name || data.profile?.owner_name || '',
    'Breeder number of boar owner': data.sire?.owner_number || data.profile?.breeder_number || '',
    Breed: data.litter.breed || data.dam.breed || '',
  }])
}

export function exportCpsBreedingCertificate(data: LitterExportData) {
  downloadCsv(`CPS-breeding-certificate-${safeName(data.litter.group_name)}.csv`, [{
    Breed: data.litter.breed || data.dam.breed || '',
    'Gilt / sow name': data.dam.registered_name || data.dam.call_name,
    'Gilt / sow registration number': data.damRegistration?.registration_number || '',
    'Name of owner of gilt / sow': data.profile?.owner_name || '',
    'Date gilt / sow bred': data.breedingDate || '',
    'Registration number of boar': data.sire?.registration_number || '',
    'Owner number of boar owner': data.sire?.owner_number || '',
    'Signature of owner of service sire': data.sire?.owner_name || '',
  }])
}
