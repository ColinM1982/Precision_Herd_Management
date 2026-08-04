import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, FileBadge, GitFork, Save } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Animal, Farm } from '../types/database'

type Registration = { id: string; association: string; registration_number: string; registered_name: string | null; transfer_status: string | null }

export default function AnimalProfile({ farm }: { farm: Farm }) {
  const { id } = useParams(), [animal, setAnimal] = useState<Animal | null>(null), [herd, setHerd] = useState<Animal[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([]), [message, setMessage] = useState('')
  async function load() {
    const [{ data: current }, { data: animals }, { data: regs }] = await Promise.all([
      supabase.from('animals').select('*').eq('id', id).eq('farm_id', farm.id).single(),
      supabase.from('animals').select('*').eq('farm_id', farm.id).order('call_name'),
      supabase.from('registrations').select('*').eq('animal_id', id).eq('farm_id', farm.id).order('created_at'),
    ])
    setAnimal(current); setHerd(animals || []); setRegistrations(regs || [])
  }
  useEffect(() => { load() }, [id, farm.id])
  if (!animal) return <p>Loading animal profile…</p>
  async function save(e: FormEvent) {
    e.preventDefault(); setMessage(''); if (!animal) return
    const current = animal
    const { error } = await supabase.from('animals').update({ call_name: current.call_name, registered_name: current.registered_name || null, breed: current.breed || null, sex: current.sex, reproductive_status: current.reproductive_status || null, status: current.status, birth_date: current.birth_date || null, primary_id: current.primary_id || null, color_markings: current.color_markings || null, sire_id: current.sire_id || null, dam_id: current.dam_id || null, notes: current.notes || null, updated_at: new Date().toISOString() }).eq('id', current.id)
    setMessage(error?.message || 'Animal profile saved.')
  }
  const sire = herd.find(x => x.id === animal.sire_id), dam = herd.find(x => x.id === animal.dam_id)
  return <>
    <Link className="back-link" to="/animals"><ArrowLeft size={17}/> Back to animals</Link>
    <div className="page-head"><div><p className="eyebrow">FULL ANIMAL PROFILE</p><h1>{animal.call_name}</h1><p className="lead">{[animal.registered_name, animal.breed, animal.sex].filter(Boolean).join(' • ')}</p></div><span className="pill">{animal.status}</span></div>
    <div className="profile-layout">
      <form className="panel form-grid" onSubmit={save}>
        <h2 className="full">Identification & details</h2>
        <Input label="Call name" value={animal.call_name} onChange={v=>setAnimal({...animal,call_name:v})}/>
        <Input label="Registered name" value={animal.registered_name || ''} onChange={v=>setAnimal({...animal,registered_name:v})}/>
        <Input label="Primary ID / ear tag" value={animal.primary_id || ''} onChange={v=>setAnimal({...animal,primary_id:v})}/>
        <Input label="Breed" value={animal.breed || ''} onChange={v=>setAnimal({...animal,breed:v})}/>
        <label>Sex/class<select value={animal.sex} onChange={e=>setAnimal({...animal,sex:e.target.value})}><option>sow</option><option>gilt</option><option>boar</option><option>barrow</option><option>piglet</option><option>unknown</option></select></label>
        <label>Status<select value={animal.status} onChange={e=>setAnimal({...animal,status:e.target.value})}><option>active</option><option>for_sale</option><option>sold</option><option>culled</option><option>deceased</option><option>archived</option></select></label>
        <Input label="Birth date" type="date" value={animal.birth_date || ''} onChange={v=>setAnimal({...animal,birth_date:v})}/>
        <Input label="Reproductive status" value={animal.reproductive_status || ''} onChange={v=>setAnimal({...animal,reproductive_status:v})}/>
        <Input label="Color and markings" value={animal.color_markings || ''} onChange={v=>setAnimal({...animal,color_markings:v})}/>
        <div/>
        <label>Sire in your herd<select value={animal.sire_id || ''} onChange={e=>setAnimal({...animal,sire_id:e.target.value || null})}><option value="">Outside/unknown sire</option>{herd.filter(x=>x.id!==animal.id && ['boar'].includes(x.sex)).map(x=><option value={x.id} key={x.id}>{x.call_name}</option>)}</select></label>
        <label>Dam in your herd<select value={animal.dam_id || ''} onChange={e=>setAnimal({...animal,dam_id:e.target.value || null})}><option value="">Outside/unknown dam</option>{herd.filter(x=>x.id!==animal.id && ['sow','gilt'].includes(x.sex)).map(x=><option value={x.id} key={x.id}>{x.call_name}</option>)}</select></label>
        <label className="full">Notes<textarea value={animal.notes || ''} onChange={e=>setAnimal({...animal,notes:e.target.value})}/></label>
        {message && <p className="notice full">{message}</p>}
        <div className="form-actions full"><button className="button primary"><Save size={16}/> Save profile</button></div>
      </form>
      <div>
        <section className="panel pedigree-card"><h2><GitFork size={20}/> Pedigree</h2><div><span>Sire</span><strong>{sire?.call_name || animal.sire_name || 'Not recorded'}</strong></div><div><span>Dam</span><strong>{dam?.call_name || animal.dam_name || 'Not recorded'}</strong></div></section>
        <RegistrationPanel animal={animal} farm={farm} items={registrations} onSaved={load}/>
      </div>
    </div>
  </>
}

function RegistrationPanel({animal,farm,items,onSaved}:{animal:Animal;farm:Farm;items:Registration[];onSaved:()=>void}) {
  const [association,setAssociation]=useState('NSR'),[number,setNumber]=useState(''),[error,setError]=useState('')
  async function add(e:FormEvent){e.preventDefault();const {error}=await supabase.from('registrations').insert({animal_id:animal.id,farm_id:farm.id,association,registration_number:number,registered_name:animal.registered_name,transfer_status:'recorded'});if(error)setError(error.message);else{setNumber('');setError('');onSaved()}}
  return <section className="panel"><h2><FileBadge size={20}/> Registrations</h2>{items.map(x=><div className="record-row" key={x.id}><strong>{x.association}</strong><span>{x.registration_number}</span></div>)}<form onSubmit={add} className="mini-form"><label>Association<select value={association} onChange={e=>setAssociation(e.target.value)}><option>NSR</option><option>CPS</option><option>ABA</option><option>Other</option></select></label><Input label="Registration number" value={number} onChange={setNumber} required/><button className="button secondary">Add registration</button>{error&&<p className="error">{error}</p>}</form></section>
}

function Input({label,onChange,type='text',...props}:{label:string;onChange:(v:string)=>void;type?:string;[key:string]:unknown}){return <label>{label}<input type={type} {...props} onChange={e=>onChange(e.target.value)}/></label>}
