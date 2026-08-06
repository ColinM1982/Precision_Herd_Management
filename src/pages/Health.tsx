import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ChevronDown, HeartPulse, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, today } from '../lib/terminology'
import type { Animal, Farm, HealthTreatment } from '../types/database'

export default function Health({farm}:{farm:Farm}){
  const[animals,setAnimals]=useState<Animal[]>([]),[treatments,setTreatments]=useState<HealthTreatment[]>([]),[show,setShow]=useState(false),[selectedAnimal,setSelectedAnimal]=useState('')
  async function load(){const[{data:a},{data:t}]=await Promise.all([supabase.from('animals').select('*').eq('farm_id',farm.id).order('call_name'),supabase.from('health_treatments').select('*').eq('farm_id',farm.id).order('treatment_date',{ascending:false})]);setAnimals(a||[]);setTreatments(t||[])}
  useEffect(()=>{load()},[farm.id])
  const byAnimal=useMemo(()=>treatments.reduce<Record<string,HealthTreatment[]>>((all,row)=>{(all[row.animal_id]??=[]).push(row);return all},{}),[treatments])
  function add(animalId=''){setSelectedAnimal(animalId);setShow(true)}
  return <>
    <div className="page-head"><div><p className="eyebrow">HERD HEALTH & TREATMENT HISTORY</p><h1>Health</h1></div><button className="button primary" onClick={()=>add()}><Plus size={17}/> Add treatment</button></div>
    <p className="lead">Every herd animal is listed with its treatment count and most recent treatment. Expand a row for the complete treatment history.</p>
    <div className="table-wrap health-table"><table><thead><tr><th>Animal</th><th>Status</th><th>Most recent treatment</th><th>Reason</th><th>Treatments</th><th></th></tr></thead><tbody>{animals.map(animal=>{const history=byAnimal[animal.id]||[],latest=history[0];return <HealthRow key={animal.id} animal={animal} history={history} latest={latest} add={()=>add(animal.id)}/>})}</tbody></table></div>
    {!animals.length&&<section className="empty"><div><HeartPulse/></div><h2>No herd animals entered</h2><p>Add an animal before recording treatment information.</p></section>}
    {show&&<TreatmentModal farm={farm} animals={animals} initialAnimal={selectedAnimal} close={()=>setShow(false)} saved={()=>{setShow(false);load()}}/>}
  </>
}

function HealthRow({animal,history,latest,add}:{animal:Animal;history:HealthTreatment[];latest?:HealthTreatment;add:()=>void}){
  const[open,setOpen]=useState(false)
  return <><tr><td><Link to={`/animals/${animal.id}`}><strong>{animal.call_name}</strong></Link><small>{[animal.breed,animal.sex].filter(Boolean).join(' • ')}</small></td><td><span className="pill">{animal.status.replaceAll('_',' ')}</span></td><td>{latest?`${formatDate(latest.treatment_date)} — ${latest.product_name}`:'No treatments'}</td><td>{latest?.condition_reason||'—'}</td><td>{history.length}</td><td><div className="row-actions"><button className="text-button" onClick={add}>Add</button><button className="icon-button" aria-label="Expand treatment history" onClick={()=>setOpen(!open)}><ChevronDown className={open?'rotated':''}/></button></div></td></tr>{open&&<tr className="expanded-row"><td colSpan={6}>{history.length?<div className="treatment-history">{history.map(item=><div key={item.id}><strong>{formatDate(item.treatment_date)} — {item.product_name}</strong><span>{[item.condition_reason,item.dosage,item.route].filter(Boolean).join(' • ')}</span><small>{[item.administered_by&&`Given by ${item.administered_by}`,item.withdrawal_end_date&&`Withdrawal through ${formatDate(item.withdrawal_end_date)}`,item.response].filter(Boolean).join(' • ')}</small>{item.notes&&<p>{item.notes}</p>}</div>)}</div>:<p className="muted">No treatment information recorded.</p>}</td></tr>}</>
}

function TreatmentModal({farm,animals,initialAnimal,close,saved}:{farm:Farm;animals:Animal[];initialAnimal:string;close:()=>void;saved:()=>void}){
  const blank={animal_id:initialAnimal,treatment_date:today(),condition_reason:'',product_name:'',dosage:'',route:'',administered_by:'',withdrawal_end_date:'',response:'',notes:''}
  const[v,setV]=useState(blank),[error,setError]=useState('');const field=(key:keyof typeof blank,value:string)=>setV({...v,[key]:value})
  async function submit(event:FormEvent){event.preventDefault();const{error}=await supabase.from('health_treatments').insert({...v,farm_id:farm.id,condition_reason:v.condition_reason||null,dosage:v.dosage||null,route:v.route||null,administered_by:v.administered_by||null,withdrawal_end_date:v.withdrawal_end_date||null,response:v.response||null,notes:v.notes||null});if(error)setError(error.message);else saved()}
  return <div className="modal-backdrop"><section className="modal"><header><h2>Add treatment record</h2><button className="icon-button" onClick={close}><X/></button></header><form className="form-grid" onSubmit={submit}><label>Animal<select required value={v.animal_id} onChange={e=>field('animal_id',e.target.value)}><option value="">Select animal...</option>{animals.map(animal=><option value={animal.id} key={animal.id}>{animal.call_name} — {animal.status}</option>)}</select></label><Input label="Treatment date" type="date" value={v.treatment_date} onChange={x=>field('treatment_date',x)} required/><Input label="Condition / reason" value={v.condition_reason} onChange={x=>field('condition_reason',x)}/><Input label="Product / medication" value={v.product_name} onChange={x=>field('product_name',x)} required/><Input label="Dosage" value={v.dosage} onChange={x=>field('dosage',x)}/><Input label="Route" value={v.route} onChange={x=>field('route',x)} placeholder="Oral, IM, SQ..."/><Input label="Administered by" value={v.administered_by} onChange={x=>field('administered_by',x)}/><Input label="Withdrawal end date" type="date" value={v.withdrawal_end_date} onChange={x=>field('withdrawal_end_date',x)}/><Input label="Response / outcome" value={v.response} onChange={x=>field('response',x)}/><div/><label className="full">Notes<textarea value={v.notes} onChange={e=>field('notes',e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<div className="form-actions full"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">Save treatment</button></div></form></section></div>
}
function Input({label,onChange,type='text',...props}:{label:string;onChange:(v:string)=>void;type?:string;[key:string]:unknown}){return <label>{label}<input type={type} {...props} onChange={e=>onChange(e.target.value)}/></label>}
