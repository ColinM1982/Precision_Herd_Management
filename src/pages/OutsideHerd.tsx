import { useEffect, useState } from 'react'
import { Archive, Baby, ChevronRight, PiggyBank } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/terminology'
import type { Animal, Farm, LitterPig, OffspringGroup } from '../types/database'

type ArchivedPig = LitterPig & { litter: { group_name: string; birth_date: string } | null }
type ArchivedLitter = OffspringGroup & { birth_event: { female: { call_name:string } | null } | null; sire: { boar_name:string } | null; pig_count?:number }

const animalArchiveStatuses = ['sold','culled','deceased','archived']
const litterArchiveStatuses = ['sold','culled','deceased','died','archived','stillborn','mummified']

function displayStatus(status:string){return status.replaceAll('_',' ')}

export default function OutsideHerd({farm}:{farm:Farm}){
  const [animals,setAnimals]=useState<Animal[]>([]),[pigs,setPigs]=useState<ArchivedPig[]>([]),[litters,setLitters]=useState<ArchivedLitter[]>([]),[loading,setLoading]=useState(true)
  async function load(){
    setLoading(true)
    const [animalRows,pigRows,litterRows,litterPigRows]=await Promise.all([
      supabase.from('animals').select('*').eq('farm_id',farm.id).in('status',animalArchiveStatuses).order('status_date',{ascending:false,nullsFirst:false}).order('call_name'),
      supabase.from('litter_pigs').select('*,litter:offspring_groups!litter_pigs_offspring_group_id_fkey(group_name,birth_date)').eq('farm_id',farm.id).in('status',litterArchiveStatuses).is('herd_animal_id',null).order('status_date',{ascending:false,nullsFirst:false}).order('sequence_number'),
      supabase.from('offspring_groups').select('*,birth_event:birth_events!offspring_groups_birth_event_id_fkey(female:animals!birth_events_female_animal_id_fkey(call_name)),sire:stud_listings!offspring_groups_sire_listing_id_fkey(boar_name)').eq('farm_id',farm.id).not('archived_at','is',null).order('archived_at',{ascending:false}),
      supabase.from('litter_pigs').select('offspring_group_id').eq('farm_id',farm.id),
    ])
    const counts=(litterPigRows.data||[]).reduce<Record<string,number>>((all,row)=>({...all,[row.offspring_group_id]:(all[row.offspring_group_id]||0)+1}),{})
    setAnimals(animalRows.data||[]);setPigs((pigRows.data||[]) as ArchivedPig[]);setLitters((litterRows.data||[]).map(row=>({...row,pig_count:counts[row.id]||0})) as ArchivedLitter[]);setLoading(false)
  }
  useEffect(()=>{load()},[farm.id])
  return <>
    <div className="page-head"><div><p className="eyebrow">PERMANENT HISTORY OUTSIDE THE ACTIVE HERD</p><h1>Outside the Herd</h1></div></div>
    <p className="lead">Sold, culled, deceased, and archived records remain here for history and reporting. Open an animal and change its status to Active or For Sale to return it to Herd Animals.</p>
    {loading?<p>Loading archived records…</p>:<>
      <section className="panel archive-section"><div className="section-heading"><div><h2><PiggyBank size={21}/> Herd-animal history</h2><p>Animals previously managed in the herd.</p></div><span className="archive-count">{animals.length}</span></div>
        {animals.length?<div className="archive-list">{animals.map(animal=><Link className="archive-row" to={`/animals/${animal.id}`} key={animal.id}><div className="archive-icon"><Archive/></div><div><strong>{animal.call_name}</strong><small>{[animal.registered_name,animal.breed,animal.sex,animal.primary_id].filter(Boolean).join(' • ')}</small></div><div className="archive-status"><span className="pill">{displayStatus(animal.status)}</span><small>{animal.status_date?formatDate(animal.status_date):'Date not recorded'}</small></div><ChevronRight/></Link>)}</div>:<p className="muted archive-empty">No herd animals are outside the herd.</p>}
      </section>
      <section className="panel archive-section"><div className="section-heading"><div><h2><Baby size={21}/> Litter-pig history</h2><p>Litter pigs with a completed outcome that were not moved into Herd Animals.</p></div><span className="archive-count">{pigs.length}</span></div>
        {pigs.length?<div className="archive-list">{pigs.map(pig=><Link className="archive-row" to={`/litters/${pig.offspring_group_id}`} key={pig.id}><div className="archive-icon"><Baby/></div><div><strong>{pig.pig_name||`Pig #${pig.sequence_number}`}</strong><small>{pig.litter?.group_name||'Litter'} • {[pig.sex_class,pig.individual_notch&&`notch ${pig.individual_notch}`].filter(Boolean).join(' • ')}</small></div><div className="archive-status"><span className="pill">{displayStatus(pig.status)}</span><small>{pig.status_date?formatDate(pig.status_date):'Date not recorded'}</small></div><ChevronRight/></Link>)}</div>:<p className="muted archive-empty">No litter pigs are outside the herd.</p>}
      </section>
      <section className="panel archive-section"><div className="section-heading"><div><h2><Archive size={21}/> Archived litters</h2><p>Completed litters retained with every pig record and registration export.</p></div><span className="archive-count">{litters.length}</span></div>
        {litters.length?<div className="archive-list">{litters.map(litter=><Link className="archive-row" to={`/litters/${litter.id}`} key={litter.id}><div className="archive-icon"><Baby/></div><div><strong>{litter.group_name}</strong><small>{litter.birth_event?.female?.call_name||'Dam not recorded'} × {litter.sire?.boar_name||'Sire not recorded'} • {litter.pig_count||0} pig records • Farrowed {formatDate(litter.birth_date)}</small></div><div className="archive-status"><span className="pill">Archived litter</span><small>{litter.archived_at?formatDate(litter.archived_at):'Date not recorded'}</small></div><ChevronRight/></Link>)}</div>:<p className="muted archive-empty">No completed litters have been archived.</p>}
      </section>
    </>}
  </>
}
