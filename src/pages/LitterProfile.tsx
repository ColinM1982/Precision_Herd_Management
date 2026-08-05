import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Download, ExternalLink, Plus, Save, ShoppingCart, UserRoundPlus, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { exportCpsBreedingCertificate, exportCpsLitterApplication, exportNsrBreedingCertificate, exportNsrRegistration, type RegistrationRecord } from '../lib/exports'
import { formatDate } from '../lib/terminology'
import type { Animal, BirthEvent, Farm, LitterPig, OffspringGroup, RegistryProfile, StudListing } from '../types/database'

type LoadedLitter = OffspringGroup & { birth_event: BirthEvent & { female: Animal }; sire: StudListing | null }

export default function LitterProfile({farm}:{farm:Farm}) {
  const {id}=useParams(),[litter,setLitter]=useState<LoadedLitter|null>(null),[pigs,setPigs]=useState<LitterPig[]>([])
  const [profiles,setProfiles]=useState<RegistryProfile[]>([]),[registrations,setRegistrations]=useState<RegistrationRecord[]>([]),[breedingDate,setBreedingDate]=useState<string|null>(null)
  const [message,setMessage]=useState(''),[salePig,setSalePig]=useState<LitterPig|null>(null)
  async function load(){
    const {data:group}=await supabase.from('offspring_groups').select('*,birth_event:birth_events!offspring_groups_birth_event_id_fkey(*,female:animals!birth_events_female_animal_id_fkey(*)),sire:stud_listings!offspring_groups_sire_listing_id_fkey(*)').eq('id',id).eq('farm_id',farm.id).single()
    if(!group)return
    const damId=group.birth_event.female_animal_id
    const [pigRows,profileRows,regRows,breedingRows]=await Promise.all([
      supabase.from('litter_pigs').select('*').eq('offspring_group_id',id).eq('farm_id',farm.id).order('sequence_number'),
      supabase.from('farm_registry_profiles').select('*').eq('farm_id',farm.id),
      supabase.from('registrations').select('association,registration_number,registered_name').eq('farm_id',farm.id).eq('animal_id',damId),
      supabase.from('breeding_events').select('event_date').eq('farm_id',farm.id).eq('female_animal_id',damId).lte('event_date',`${group.birth_date}T23:59:59`).order('event_date',{ascending:false}).limit(1),
    ])
    setLitter(group as LoadedLitter);setPigs(pigRows.data||[]);setProfiles(profileRows.data||[]);setRegistrations(regRows.data||[]);setBreedingDate(breedingRows.data?.[0]?.event_date?.slice(0,10)||null)
  }
  useEffect(()=>{load()},[id,farm.id])
  if(!litter)return <p>Loading litter…</p>
  const current=litter,birth=current.birth_event,dam=birth.female

  async function saveHeader(e:FormEvent){
    e.preventDefault();setMessage('')
    const {error}=await supabase.from('offspring_groups').update({
      group_name:current.group_name,registry_association:current.registry_association||null,breed:current.breed||null,litter_notch:current.litter_notch||null,litter_number:current.litter_number||null,
      parity:current.parity||null,litter_birth_weight:current.litter_birth_weight||null,number_after_transfer:current.number_after_transfer||null,number_weighed:current.number_weighed||null,
      litter_weaning_weight:current.litter_weaning_weight||null,weaning_date:current.weaning_date||null,estrus_date:current.estrus_date||null,boar_group_name:current.boar_group_name||null,gilt_group_name:current.gilt_group_name||null,notes:current.notes||null,updated_at:new Date().toISOString(),
    }).eq('id',current.id)
    setMessage(error?.message||'Litter details saved.')
  }
  async function addPig(){
    const next=(pigs.at(-1)?.sequence_number||0)+1
    const {error}=await supabase.from('litter_pigs').insert({farm_id:farm.id,offspring_group_id:current.id,sequence_number:next,birth_date:current.birth_date,status:'alive'})
    if(error)setMessage(error.message);else{await supabase.from('birth_events').update({total_born:birth.total_born+1,born_alive:birth.born_alive+1}).eq('id',birth.id);setMessage('One litter-pig row added.');load()}
  }
  async function promote(pig:LitterPig){
    if(!window.confirm(`Move ${pig.pig_name||`pig #${pig.sequence_number}`} into Herd Animals?`))return
    const {data,error}=await supabase.rpc('promote_litter_pig_to_herd',{p_litter_pig_id:pig.id})
    setMessage(error?.message||'Pig moved to Herd Animals.');if(data)load()
  }
  function exportData(association:'NSR'|'CPS'){
    return {litter:current,birth,dam,sire:current.sire,pigs,profile:profiles.find(x=>x.association===association)||null,damRegistration:registrations.find(x=>x.association===association)||null,breedingDate}
  }

  return <>
    <Link className="back-link" to="/litters"><ArrowLeft size={17}/> Back to litters</Link>
    <div className="page-head"><div><p className="eyebrow">LITTER & OFFSPRING RECORD</p><h1>{litter.group_name}</h1><p className="lead">{dam.call_name} × {litter.sire?.boar_name||'Sire not recorded'} • Farrowed {formatDate(litter.birth_date)}</p></div><span className="pill">{litter.registry_association||'Unregistered'}</span></div>
    {message&&<p className="notice success-notice">{message}</p>}
    <div className="stat-grid"><Stat label="Total born" value={birth.total_born}/><Stat label="Born alive" value={birth.born_alive}/><Stat label="Stillborn" value={birth.stillborn}/><Stat label="Mummified" value={birth.mummified}/></div>

    <section className="panel export-panel"><div><h2>Registration exports</h2><p>CSV columns mirror the four supplied NSR/CPS forms for portal entry and recordkeeping.</p></div><div className="export-buttons"><button className="button secondary" onClick={()=>exportNsrRegistration(exportData('NSR'))}><Download/> NSR registration</button><button className="button secondary" onClick={()=>exportCpsLitterApplication(exportData('CPS'))}><Download/> CPS litter application</button><button className="button secondary" onClick={()=>exportNsrBreedingCertificate(exportData('NSR'))}><Download/> NSR breeding certificate</button><button className="button secondary" onClick={()=>exportCpsBreedingCertificate(exportData('CPS'))}><Download/> CPS breeding certificate</button></div></section>

    <form className="panel form-grid" onSubmit={saveHeader}>
      <h2 className="full">Litter details</h2>
      <Input label="Litter name" value={litter.group_name} onChange={v=>setLitter({...litter,group_name:v})}/><label>Association<select value={litter.registry_association||''} onChange={e=>setLitter({...litter,registry_association:e.target.value||null})}><option value="">Not selected</option><option>NSR</option><option>CPS</option><option>Other</option></select></label>
      <Input label="Breed" value={litter.breed||''} onChange={v=>setLitter({...litter,breed:v})}/><Input label="Litter ear notch" value={litter.litter_notch||''} onChange={v=>setLitter({...litter,litter_notch:v})}/><Input label="Litter number" value={litter.litter_number||''} onChange={v=>setLitter({...litter,litter_number:v})}/><Input label="Parity" type="number" min="1" value={litter.parity||''} onChange={v=>setLitter({...litter,parity:numberOrNull(v)})}/>
      <Input label="Litter birth weight (LBW)" type="number" min="0" step=".01" value={litter.litter_birth_weight||''} onChange={v=>setLitter({...litter,litter_birth_weight:numberOrNull(v)})}/><Input label="Number after transfer (NAT)" type="number" min="0" value={litter.number_after_transfer||''} onChange={v=>setLitter({...litter,number_after_transfer:numberOrNull(v)})}/><Input label="Number weighed (NW)" type="number" min="0" value={litter.number_weighed||''} onChange={v=>setLitter({...litter,number_weighed:numberOrNull(v)})}/><Input label="Litter weaning weight (LWW)" type="number" min="0" step=".01" value={litter.litter_weaning_weight||''} onChange={v=>setLitter({...litter,litter_weaning_weight:numberOrNull(v)})}/>
      <Input label="Weaning date" type="date" value={litter.weaning_date||''} onChange={v=>setLitter({...litter,weaning_date:v||null})}/><Input label="Estrus date" type="date" value={litter.estrus_date||''} onChange={v=>setLitter({...litter,estrus_date:v||null})}/><Input label="Boar group name" value={litter.boar_group_name||''} onChange={v=>setLitter({...litter,boar_group_name:v})}/><Input label="Gilt group name" value={litter.gilt_group_name||''} onChange={v=>setLitter({...litter,gilt_group_name:v})}/>
      <label className="full">Notes<textarea value={litter.notes||''} onChange={e=>setLitter({...litter,notes:e.target.value})}/></label><div className="form-actions full"><button className="button primary"><Save/> Save litter details</button></div>
    </form>

    <section className="panel pig-section"><div className="section-heading"><div><h2>Animals in this litter</h2><p>These records are separate from Herd Animals.</p></div><button className="button secondary" onClick={addPig}><Plus/> Add pig</button></div>
      <div className="pig-list">{pigs.map(pig=><PigEditor key={pig.id} pig={pig} litterNotch={litter.litter_notch} onSaved={load} onMessage={setMessage} onSale={()=>setSalePig(pig)} onPromote={()=>promote(pig)}/>)}</div>
    </section>
    {salePig&&<SaleModal pig={salePig} close={()=>setSalePig(null)} saved={text=>{setSalePig(null);setMessage(text);load()}}/>}
  </>
}

function PigEditor({pig,litterNotch,onSaved,onMessage,onSale,onPromote}:{pig:LitterPig;litterNotch:string|null;onSaved:()=>void;onMessage:(m:string)=>void;onSale:()=>void;onPromote:()=>void}){
  const [value,setValue]=useState(pig),[open,setOpen]=useState(false)
  async function save(){const{error}=await supabase.from('litter_pigs').update({pig_name:value.pig_name||null,sex_class:value.sex_class,individual_notch:value.individual_notch||null,registration_number:value.registration_number||null,registered_name:value.registered_name||null,teat_count_left:value.teat_count_left||null,teat_count_right:value.teat_count_right||null,birth_date:value.birth_date,birth_weight:value.birth_weight||null,weaning_date:value.weaning_date||null,weaning_weight:value.weaning_weight||null,status:value.status,status_date:value.status_date||null,notes:value.notes||null,updated_at:new Date().toISOString()}).eq('id',value.id);onMessage(error?.message||`Pig #${value.sequence_number} saved.`);if(!error)onSaved()}
  return <article className="pig-editor"><button className="pig-summary" onClick={()=>setOpen(!open)}><span className="pig-number">#{pig.sequence_number}</span><span><strong>{value.pig_name||`Litter pig ${pig.sequence_number}`}</strong><small>{[value.sex_class,[litterNotch,value.individual_notch].filter(Boolean).join('-'),value.status].filter(Boolean).join(' • ')}</small></span><span className="pig-row-actions"><ShoppingCart onClick={e=>{e.stopPropagation();onSale()}}/><UserRoundPlus onClick={e=>{e.stopPropagation();onPromote()}}/><ExternalLink className={open?'rotate':''}/></span></button>{open&&<div className="pig-edit-grid"><Input label="Pig name" value={value.pig_name||''} onChange={v=>setValue({...value,pig_name:v})}/><label>Sex / class<select value={value.sex_class} onChange={e=>setValue({...value,sex_class:e.target.value})}><option value="unknown">Unknown</option><option value="boar">Boar</option><option value="gilt">Gilt</option><option value="barrow">Barrow</option></select></label><Input label="Individual notch" value={value.individual_notch||''} onChange={v=>setValue({...value,individual_notch:v})}/><Input label="Birth date" type="date" value={value.birth_date} onChange={v=>setValue({...value,birth_date:v})}/><Input label="Birth weight" type="number" min="0" step=".01" value={value.birth_weight||''} onChange={v=>setValue({...value,birth_weight:numberOrNull(v)})}/><Input label="Weaning date" type="date" value={value.weaning_date||''} onChange={v=>setValue({...value,weaning_date:v||null})}/><Input label="Weaning weight" type="number" min="0" step=".01" value={value.weaning_weight||''} onChange={v=>setValue({...value,weaning_weight:numberOrNull(v)})}/><Input label="Teats - left" type="number" min="0" value={value.teat_count_left||''} onChange={v=>setValue({...value,teat_count_left:numberOrNull(v)})}/><Input label="Teats - right" type="number" min="0" value={value.teat_count_right||''} onChange={v=>setValue({...value,teat_count_right:numberOrNull(v)})}/><label>Status<select value={value.status} onChange={e=>setValue({...value,status:e.target.value})}><option>alive</option><option>stillborn</option><option>mummified</option><option>died</option><option>weaned</option><option>sold</option><option>retained</option><option>outcome_not_recorded</option></select></label><Input label="Status date" type="date" value={value.status_date||''} onChange={v=>setValue({...value,status_date:v||null})}/><Input label="Registered name" value={value.registered_name||''} onChange={v=>setValue({...value,registered_name:v})}/><Input label="Registration number" value={value.registration_number||''} onChange={v=>setValue({...value,registration_number:v})}/><label className="full">Notes<textarea value={value.notes||''} onChange={e=>setValue({...value,notes:e.target.value})}/></label><div className="pig-buttons full"><button className="button secondary" type="button" onClick={onSale}><ShoppingCart/> Sale info</button><button className="button secondary" type="button" onClick={onPromote} disabled={!!value.herd_animal_id}><UserRoundPlus/> {value.herd_animal_id?'Already in herd':'Move to Herd'}</button><button className="button primary" type="button" onClick={save}><Save/> Save pig</button></div></div>}</article>
}

function SaleModal({pig,close,saved}:{pig:LitterPig;close:()=>void;saved:(m:string)=>void}){const[date,setDate]=useState(pig.sale_date||''),[price,setPrice]=useState(pig.sale_price?.toString()||''),[buyer,setBuyer]=useState(pig.buyer_name||''),[address,setAddress]=useState(pig.buyer_address||''),[error,setError]=useState('');async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('litter_pigs').update({sale_date:date||null,sale_price:numberOrNull(price),buyer_name:buyer||null,buyer_address:address||null,status:date?'sold':pig.status,status_date:date||pig.status_date,updated_at:new Date().toISOString()}).eq('id',pig.id);if(error)setError(error.message);else saved(`Sale information saved for pig #${pig.sequence_number}.`)}return <Modal title={`Sale information - pig #${pig.sequence_number}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Sale date" type="date" value={date} onChange={setDate}/><Input label="Sale price" type="number" min="0" step=".01" value={price} onChange={setPrice}/><Input label="Buyer name" value={buyer} onChange={setBuyer}/><Input label="Buyer address" value={address} onChange={setAddress}/>{error&&<p className="error full">{error}</p>}<div className="form-actions full"><button className="button secondary" type="button" onClick={close}>Cancel</button><button className="button primary">Save sale</button></div></form></Modal>}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){return <div className="modal-backdrop"><section className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={close}><X/></button></header>{children}</section></div>}
function Input({label,onChange,type='text',...props}:{label:string;onChange:(v:string)=>void;type?:string;[key:string]:unknown}){return <label>{label}<input type={type} {...props} onChange={e=>onChange(e.target.value)}/></label>}
function Stat({label,value}:{label:string;value:number}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>}
function numberOrNull(value:string){return value===''?null:Number(value)}
