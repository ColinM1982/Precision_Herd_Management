import { useEffect, useState } from 'react'
import { Baby, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/terminology'
import type { Farm, OffspringGroup } from '../types/database'

export default function Litters({farm}:{farm:Farm}) {
  const [litters,setLitters]=useState<OffspringGroup[]>([])
  async function load(){
    const [{data:groups},{data:pigs}] = await Promise.all([
      supabase.from('offspring_groups').select('*,birth_event:birth_events!offspring_groups_birth_event_id_fkey(*,female:animals!birth_events_female_animal_id_fkey(*)),sire:stud_listings!offspring_groups_sire_listing_id_fkey(*)').eq('farm_id',farm.id).order('birth_date',{ascending:false}),
      supabase.from('litter_pigs').select('offspring_group_id').eq('farm_id',farm.id),
    ])
    const counts=(pigs||[]).reduce<Record<string,number>>((all,row)=>({...all,[row.offspring_group_id]:(all[row.offspring_group_id]||0)+1}),{})
    setLitters((groups||[]).map(group=>({...group,pig_count:counts[group.id]||0})) as OffspringGroup[])
  }
  useEffect(()=>{load()},[farm.id])
  return <>
    <div className="page-head"><div><p className="eyebrow">SEPARATE OFFSPRING RECORDS</p><h1>Litters</h1></div></div>
    <p className="lead">Litter pigs stay here until you deliberately move an individual animal into the managed herd.</p>
    {litters.length?<div className="litter-grid">{litters.map(litter=>{
      const birth=litter.birth_event
      return <Link to={`/litters/${litter.id}`} className="litter-card" key={litter.id}>
        <div className="litter-icon"><Baby/></div><div className="litter-card-main"><span className="pill">{litter.registry_association||'Unregistered'}</span><h2>{litter.group_name}</h2><p>{birth?.female?.call_name||'Dam not recorded'} × {litter.sire?.boar_name||'Sire not recorded'}</p><div className="litter-metrics"><span><strong>{litter.pig_count||0}</strong> pig records</span><span><strong>{birth?.born_alive??'—'}</strong> born alive</span><span><strong>{formatDate(litter.birth_date)}</strong> farrowed</span></div></div><ChevronRight/>
      </Link>
    })}</div>:<section className="empty"><div><Baby/></div><h2>No litters recorded</h2><p>Use Add litter / farrowing under Reproduction for any sow or gilt.</p></section>}
  </>
}
