import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Dna, DollarSign, FileBadge, GitFork, Save, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BreedSelect, isCrossbred } from '../lib/breeds'
import { supabase } from '../lib/supabase'
import type { Animal, Farm } from '../types/database'

type Registration = { id: string; association: string; registration_number: string; registered_name: string | null; transfer_status: string | null }

export default function AnimalProfile({ farm }: { farm: Farm }) {
  const navigate=useNavigate()
  const { id } = useParams(), [animal, setAnimal] = useState<Animal | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([]), [message, setMessage] = useState(''), [lifetimeSold,setLifetimeSold]=useState(0)
  async function load() {
    const [{ data: current }, { data: regs }, {data:births}] = await Promise.all([
      supabase.from('animals').select('*').eq('id', id).eq('farm_id', farm.id).single(),
      supabase.from('registrations').select('*').eq('animal_id', id).eq('farm_id', farm.id).order('created_at'),
      supabase.from('birth_events').select('id').eq('female_animal_id',id).eq('farm_id',farm.id),
    ])
    setAnimal(current); setRegistrations(regs || [])
    const birthIds=(births||[]).map(row=>row.id)
    if(!birthIds.length){setLifetimeSold(0);return}
    const {data:groups}=await supabase.from('offspring_groups').select('id').in('birth_event_id',birthIds).eq('farm_id',farm.id)
    const groupIds=(groups||[]).map(row=>row.id)
    if(!groupIds.length){setLifetimeSold(0);return}
    const {data:sales}=await supabase.from('litter_pigs').select('sale_price').in('offspring_group_id',groupIds).eq('farm_id',farm.id).eq('status','sold')
    setLifetimeSold((sales||[]).reduce((total,row)=>total+Number(row.sale_price||0),0))
  }
  useEffect(() => { load() }, [id, farm.id])
  if (!animal) return <p>Loading animal profile…</p>
  async function save(e: FormEvent) {
    e.preventDefault(); setMessage(''); if (!animal) return
    const current = animal, archived=['sold','culled','deceased','archived'].includes(current.status), female=['sow','gilt'].includes(current.sex)
    const reproductiveStatus=female?(current.reproductive_status||'open'):null
    const { error } = await supabase.from('animals').update({ call_name: current.call_name, registered_name: current.registered_name || null, breed: current.breed || null, sex: current.sex, reproductive_status: reproductiveStatus, reproductive_due_date:reproductiveStatus==='bred'?(current.reproductive_due_date||null):null, status: current.status, status_date:archived?(current.status_date||new Date().toISOString().slice(0,10)):null, birth_date: current.birth_date || null, primary_id: current.primary_id || null, ear_notch: current.ear_notch || null, color_markings: current.color_markings || null, sire_name:current.sire_name||null, dam_name:current.dam_name||null, notes: current.notes || null, updated_at: new Date().toISOString() }).eq('id', current.id)
    setMessage(error?.message || 'Animal profile saved.')
  }
  async function remove(){
    if(!animal)return
    const current=animal
    if(!window.confirm(`Permanently delete ${current.call_name}? This is only for an animal entered in error. Linked identification, registration, reproduction, and litter records may also be deleted. This cannot be undone.`))return
    if(!window.confirm(`Final confirmation: permanently erase ${current.call_name}?`))return
    const{error}=await supabase.rpc('delete_animal_permanently',{p_animal_id:current.id})
    if(error)setMessage(error.message);else navigate('/animals',{replace:true})
  }
  const female=['sow','gilt'].includes(animal.sex)
  return <>
    <Link className="back-link" to="/animals"><ArrowLeft size={17}/> Back to animals</Link>
    <div className="page-head"><div><p className="eyebrow">FULL ANIMAL PROFILE</p><h1>{animal.call_name}</h1><p className="lead">{[animal.registered_name, animal.breed, animal.sex].filter(Boolean).join(' • ')}</p></div>{female?<Link className="button secondary" to={`/breeding?female=${animal.id}`}><Dna size={17}/> Open reproduction planner</Link>:<span className="pill">{animal.status}</span>}</div>
    {female&&<div className="stat-grid profile-stats"><div className="stat"><DollarSign/><strong>{currency(lifetimeSold)}</strong><span>Lifetime $ Sold</span></div></div>}
    <div className="profile-layout">
      <form className="panel form-grid" onSubmit={save}>
        <h2 className="full">Identification & details</h2>
        <Input label="Call name" value={animal.call_name} onChange={v=>setAnimal({...animal,call_name:v})}/>
        <Input label="Registered name" value={animal.registered_name || ''} onChange={v=>setAnimal({...animal,registered_name:v})}/>
        <Input label="Primary ID / ear tag" value={animal.primary_id || ''} onChange={v=>setAnimal({...animal,primary_id:v})}/>
        <Input label="Universal ear notch" value={animal.ear_notch || ''} onChange={v=>setAnimal({...animal,ear_notch:v})}/>
        <BreedSelect value={animal.breed||''} onChange={v=>setAnimal({...animal,breed:v})}/>
        <label>Sex/class<select value={animal.sex} onChange={e=>setAnimal({...animal,sex:e.target.value})}><option>sow</option><option>gilt</option><option>boar</option><option>barrow</option><option>piglet</option><option>unknown</option></select></label>
        <label>Status<select value={animal.status} onChange={e=>setAnimal({...animal,status:e.target.value})}><option>active</option><option>for_sale</option><option>sold</option><option>culled</option><option>deceased</option><option>archived</option></select></label>
        {['sold','culled','deceased','archived'].includes(animal.status)?<Input label="Status date" type="date" value={animal.status_date||''} onChange={v=>setAnimal({...animal,status_date:v||null})}/>:<div/>}
        <Input label="Birth date" type="date" value={animal.birth_date || ''} onChange={v=>setAnimal({...animal,birth_date:v})}/>
        {female?<label>Reproductive status<select value={animal.reproductive_status||'open'} onChange={e=>setAnimal({...animal,reproductive_status:e.target.value,reproductive_due_date:e.target.value==='bred'?animal.reproductive_due_date:null})}><option value="open">Open</option><option value="bred">Bred</option><option value="lactating_nursing">Lactating/Nursing</option></select></label>:<div/>}
        {female&&animal.reproductive_status==='bred'?<Input label="Due date" type="date" value={animal.reproductive_due_date||''} onChange={v=>setAnimal({...animal,reproductive_due_date:v||null})}/>:<div/>}
        <Input label="Color and markings" value={animal.color_markings || ''} onChange={v=>setAnimal({...animal,color_markings:v})}/><div/>
        <h2 className="full pedigree-heading"><GitFork size={20}/> Pedigree information</h2>
        <Input label="Sire" value={animal.sire_name||''} onChange={v=>setAnimal({...animal,sire_name:v})}/>
        <Input label="Dam" value={animal.dam_name||''} onChange={v=>setAnimal({...animal,dam_name:v})}/>
        <label className="full">Notes<textarea value={animal.notes || ''} onChange={e=>setAnimal({...animal,notes:e.target.value})}/></label>
        {message && <p className="notice full">{message}</p>}
        <div className="form-actions split-actions full"><button type="button" className="button danger" onClick={remove}><Trash2 size={16}/> Delete animal</button><button className="button primary"><Save size={16}/> Save profile</button></div>
      </form>
      <div>{!isCrossbred(animal.breed)&&<RegistrationPanel animal={animal} farm={farm} items={registrations} onSaved={load}/>}</div>
    </div>
  </>
}

function RegistrationPanel({animal,farm,items,onSaved}:{animal:Animal;farm:Farm;items:Registration[];onSaved:()=>void}) {
  const [association,setAssociation]=useState('NSR'),[number,setNumber]=useState(''),[error,setError]=useState('')
  async function add(e:FormEvent){e.preventDefault();const {error}=await supabase.from('registrations').insert({animal_id:animal.id,farm_id:farm.id,association,registration_number:number,registered_name:animal.registered_name,transfer_status:'recorded'});if(error)setError(error.message);else{setNumber('');setError('');onSaved()}}
  return <section className="panel"><h2><FileBadge size={20}/> Registrations</h2>{items.map(x=><div className="record-row" key={x.id}><strong>{x.association}</strong><span>{x.registration_number}</span></div>)}<form onSubmit={add} className="mini-form"><label>Association<select value={association} onChange={e=>setAssociation(e.target.value)}><option>NSR</option><option>CPS</option><option>ABA</option><option>Other</option></select></label><Input label="Registration number" value={number} onChange={setNumber} required/><button className="button secondary">Add registration</button>{error&&<p className="error">{error}</p>}</form></section>
}

function currency(value:number){return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(value)}
function Input({label,onChange,type='text',...props}:{label:string;onChange:(v:string)=>void;type?:string;[key:string]:unknown}){return <label>{label}<input type={type} {...props} onChange={e=>onChange(e.target.value)}/></label>}
