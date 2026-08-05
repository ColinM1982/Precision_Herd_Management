import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Baby, CalendarClock, CheckCircle2, Dna, Flame, Plus, Syringe, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { expectedFarrowDate, formatDate, heatWindow, nowLocal, targetBreedingDate, today } from '../lib/terminology'
import type { Animal, BreedingEvent, Farm, HeatEvent, MatingPlan, PregnancyCheck, StudListing } from '../types/database'

type ActionKind = 'heat'|'plan'|'sync'|'breed'|'check'|'litter'|null

export default function Reproduction({farm}:{farm:Farm}) {
  const [search] = useSearchParams()
  const [females,setFemales] = useState<Animal[]>([]), [boars,setBoars] = useState<StudListing[]>([])
  const [heats,setHeats] = useState<HeatEvent[]>([]), [plans,setPlans] = useState<MatingPlan[]>([])
  const [breedings,setBreedings] = useState<BreedingEvent[]>([]), [checks,setChecks] = useState<PregnancyCheck[]>([])
  const [action,setAction] = useState<{kind:ActionKind;female:Animal|null}>({kind:null,female:null})
  const [message,setMessage] = useState('')

  async function load() {
    const [f,b,h,p,be,pc] = await Promise.all([
      supabase.from('animals').select('*').eq('farm_id',farm.id).in('sex',['sow','gilt']).eq('status','active').order('call_name'),
      supabase.from('stud_listings').select('*').eq('farm_id',farm.id).order('boar_name'),
      supabase.from('heat_events').select('*').eq('farm_id',farm.id).order('observed_date',{ascending:false}),
      supabase.from('mating_plans').select('*,female:animals!mating_plans_female_animal_id_fkey(call_name),sire:stud_listings!mating_plans_selected_stud_listing_id_fkey(boar_name,stud_name)').eq('farm_id',farm.id).order('created_at',{ascending:false}),
      supabase.from('breeding_events').select('*').eq('farm_id',farm.id).order('event_date',{ascending:false}),
      supabase.from('pregnancy_checks').select('*').eq('farm_id',farm.id).order('check_date',{ascending:false}),
    ])
    setFemales(f.data||[]); setBoars(b.data||[]); setHeats(h.data||[])
    setPlans((p.data||[]) as MatingPlan[]); setBreedings(be.data||[]); setChecks(pc.data||[])
  }
  useEffect(()=>{load()},[farm.id])
  useEffect(()=>{
    const id=search.get('female'), female=females.find(item=>item.id===id)
    if(female) document.getElementById(`female-${female.id}`)?.scrollIntoView({behavior:'smooth',block:'center'})
  },[females,search])

  const latestHeat = (id:string) => heats.find(item=>item.female_animal_id===id)
  const currentPlan = (id:string) => plans.find(item=>item.female_animal_id===id&&!['farrowed','cancelled','open'].includes(item.status))
  const latestBreeding = (id:string) => breedings.find(item=>item.female_animal_id===id)
  const latestCheck = (id:string) => checks.find(item=>item.female_animal_id===id)
  const schedule = useMemo(()=>females.map(female=>({
    female,
    heat: latestHeat(female.id),
    plan: currentPlan(female.id),
    breeding: latestBreeding(female.id),
    check: latestCheck(female.id),
  })).sort((a,b)=>(a.plan?.target_breeding_date||heatWindow(a.heat?.observed_date)?.start||'9999').localeCompare(b.plan?.target_breeding_date||heatWindow(b.heat?.observed_date)?.start||'9999')),[females,heats,plans,breedings,checks])

  function open(kind:Exclude<ActionKind,null>,female:Animal){setAction({kind,female});setMessage('')}
  function saved(text:string){setMessage(text);setAction({kind:null,female:null});load()}

  return <>
    <div className="page-head"><div><p className="eyebrow">SOW-CENTERED PLANNING</p><h1>Reproduction</h1></div></div>
    <p className="lead">Track heat history, target dates, matings, pregnancy checks, and farrowing directly for each gilt or sow. Breeding cycles are no longer required.</p>
    {message&&<p className="notice success-notice">{message}</p>}
    <section className="panel schedule-panel">
      <div className="section-heading"><div><h2>Schedule overview</h2><p>Most current information and future planning in one view.</p></div><CalendarClock/></div>
      {schedule.length?<div className="table-wrap borderless"><table className="schedule-table"><thead><tr><th>Sow / gilt</th><th>Last heat</th><th>Next heat window</th><th>Target breeding</th><th>Target / expected farrow</th><th>Boar</th><th>Status</th></tr></thead><tbody>{schedule.map(row=>{
        const window=heatWindow(row.heat?.observed_date), expected=row.breeding?expectedFarrowDate(row.breeding.event_date.slice(0,10)):null
        return <tr key={row.female.id}><td><strong>{row.female.call_name}</strong><small>{row.female.sex}</small></td><td>{formatDate(row.heat?.observed_date)}</td><td>{window?`${formatDate(window.start)} - ${formatDate(window.end)}`:'Add a heat'}</td><td>{formatDate(row.plan?.target_breeding_date)}</td><td>{formatDate(expected||row.plan?.target_farrow_date)}</td><td>{row.plan?.sire?.boar_name||boars.find(x=>x.id===row.breeding?.stud_listing_id)?.boar_name||'Not selected'}</td><td><span className="pill">{row.check?.result||row.plan?.status||'tracking'}</span></td></tr>
      })}</tbody></table></div>:<p className="muted">Add a sow or gilt in Herd Animals to begin planning.</p>}
    </section>

    <div className="female-list">{females.map(female=>{
      const heat=latestHeat(female.id), window=heatWindow(heat?.observed_date), plan=currentPlan(female.id), breeding=latestBreeding(female.id), check=latestCheck(female.id)
      return <article className="female-card" id={`female-${female.id}`} key={female.id}>
        <header><div><span className="pill">{female.sex}</span><h2>{female.call_name}</h2><p>{[female.registered_name,female.breed,female.ear_notch].filter(Boolean).join(' • ')||'Registration details not entered'}</p></div><span className="status-badge">{check?.result||plan?.status||female.reproductive_status||'Tracking'}</span></header>
        <div className="female-timeline">
          <TimelineItem label="Last heat" value={formatDate(heat?.observed_date)} detail={heat?.notes||'Observation history'} />
          <TimelineItem label="Next heat" value={window?`${formatDate(window.start)} - ${formatDate(window.end)}`:'Not projected'} detail={heat?'18-21 day projection':'Record the last heat to project cycles'} />
          <TimelineItem label="Target breeding" value={formatDate(plan?.target_breeding_date)} detail={plan?.sire?.boar_name||'Select a boar in the plan'} />
          <TimelineItem label="Farrowing" value={formatDate(breeding?expectedFarrowDate(breeding.event_date.slice(0,10)):plan?.target_farrow_date)} detail={breeding?'114 days from recorded breeding':'Target date'} />
        </div>
        {heat&&<div className="future-heats"><strong>Future heat planning</strong>{[1,2,3].map(cycle=>{const range=heatWindow(heat.observed_date,cycle);return <span key={cycle}>{cycle===1?'Next':`Cycle ${cycle}`}: {range&&`${formatDate(range.start)} - ${formatDate(range.end)}`}</span>})}</div>}
        <div className="female-actions"><button onClick={()=>open('heat',female)}><Flame/> Add heat</button><button onClick={()=>open('plan',female)}><CalendarClock/> Plan mating</button><button onClick={()=>open('sync',female)}><Syringe/> Sync record</button><button onClick={()=>open('breed',female)}><Dna/> Record breeding</button><button onClick={()=>open('check',female)}><CheckCircle2/> Pregnancy check</button><button className="farrow-action" onClick={()=>open('litter',female)}><Baby/> Add litter / farrowing</button></div>
      </article>
    })}</div>
    {!females.length&&<section className="empty"><div><Dna/></div><h2>No breeding females entered</h2><p>Add a sow or gilt under Animals. She will automatically appear here.</p></section>}

    {action.kind&&action.female&&<ActionModal kind={action.kind} female={action.female} farm={farm} boars={boars} plans={plans.filter(x=>x.female_animal_id===action.female?.id)} lastHeat={latestHeat(action.female.id)} close={()=>setAction({kind:null,female:null})} saved={saved}/>} 
  </>
}

function TimelineItem({label,value,detail}:{label:string;value:string;detail:string}){return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}

function ActionModal({kind,female,farm,boars,plans,lastHeat,close,saved}:{kind:Exclude<ActionKind,null>;female:Animal;farm:Farm;boars:StudListing[];plans:MatingPlan[];lastHeat?:HeatEvent;close:()=>void;saved:(m:string)=>void}){
  if(kind==='heat')return <HeatModal female={female} farm={farm} close={close} saved={saved}/>
  if(kind==='plan')return <PlanModal female={female} farm={farm} boars={boars} lastHeat={lastHeat} close={close} saved={saved}/>
  if(kind==='sync')return <SyncModal female={female} farm={farm} plans={plans} close={close} saved={saved}/>
  if(kind==='breed')return <BreedModal female={female} farm={farm} boars={boars} plans={plans} close={close} saved={saved}/>
  if(kind==='check')return <CheckModal female={female} farm={farm} plans={plans} close={close} saved={saved}/>
  return <LitterModal female={female} farm={farm} boars={boars} plans={plans} close={close} saved={saved}/>
}

function HeatModal({female,farm,close,saved}:{female:Animal;farm:Farm;close:()=>void;saved:(m:string)=>void}){
  const[date,setDate]=useState(today()),[standing,setStanding]=useState(true),[source,setSource]=useState('observed'),[notes,setNotes]=useState(''),[error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('heat_events').insert({farm_id:farm.id,female_animal_id:female.id,observed_date:date,standing_heat:standing,source,notes:notes||null});if(error)setError(error.message);else{const range=heatWindow(date);saved(`Heat saved for ${female.call_name}. Next projected window: ${formatDate(range?.start)} - ${formatDate(range?.end)}.`)}}
  return <Modal title={`Add heat - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Observed date" type="date" value={date} onChange={setDate} required/><label>Observation type<select value={source} onChange={e=>setSource(e.target.value)}><option value="observed">Observed naturally</option><option value="projected_confirmed">Projected and confirmed</option><option value="hormone_induced">Hormone induced</option></select></label><label className="check-label"><input type="checkbox" checked={standing} onChange={e=>setStanding(e.target.checked)}/> Standing heat observed</label><div/><label className="full">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save heat"/></form></Modal>
}

function PlanModal({female,farm,boars,lastHeat,close,saved}:{female:Animal;farm:Farm;boars:StudListing[];lastHeat?:HeatEvent;close:()=>void;saved:(m:string)=>void}){
  const[farrow,setFarrow]=useState(''),[boar,setBoar]=useState(''),[name,setName]=useState(`${female.call_name} mating plan`),[objectives,setObjectives]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState('')
  const breedDate=farrow?targetBreedingDate(farrow):'', projected=lastHeat?heatWindow(lastHeat.observed_date):null
  async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('mating_plans').insert({farm_id:farm.id,female_animal_id:female.id,plan_name:name||`${female.call_name} plan`,target_farrow_date:farrow,target_breeding_date:breedDate,selected_stud_listing_id:boar||null,status:'planned',objectives:objectives||null,notes:notes||null});if(error)setError(error.message);else saved(`Plan saved for ${female.call_name}. Target breeding date: ${formatDate(breedDate)}.`)}
  return <Modal title={`Plan mating - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Plan name" value={name} onChange={setName}/><Input label="Target farrow date" type="date" value={farrow} onChange={setFarrow} required/><label>Target breeding date<input value={breedDate} readOnly placeholder="Calculated at 114 days"/></label><label>Selected boar<select value={boar} onChange={e=>setBoar(e.target.value)}><option value="">Decide later</option>{boars.map(x=><option value={x.id} key={x.id}>{x.boar_name} - {x.stud_name}</option>)}</select></label>{projected&&<p className="notice full">Current next-heat projection: {formatDate(projected.start)} - {formatDate(projected.end)}. Compare this window with the calculated target breeding date.</p>}<label className="full">Breeding objectives<textarea value={objectives} onChange={e=>setObjectives(e.target.value)}/></label><label className="full">Planning notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save plan"/></form></Modal>
}

function SyncModal({female,farm,plans,close,saved}:{female:Animal;farm:Farm;plans:MatingPlan[];close:()=>void;saved:(m:string)=>void}){
  const[date,setDate]=useState(nowLocal()),[plan,setPlan]=useState(plans[0]?.id||''),[protocol,setProtocol]=useState('Matrix synchronization'),[product,setProduct]=useState('Matrix'),[dose,setDose]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('synchronization_events').insert({farm_id:farm.id,breeding_cycle_id:null,female_animal_id:female.id,mating_plan_id:plan||null,event_date:new Date(date).toISOString(),protocol_name:protocol,product_name:product,dose:dose||null,notes:notes||null});if(error)setError(error.message);else saved(`Synchronization record saved for ${female.call_name}.`)}
  return <Modal title={`Synchronization - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Date and time" type="datetime-local" value={date} onChange={setDate}/><PlanSelect plans={plans} value={plan} onChange={setPlan}/><Input label="Protocol" value={protocol} onChange={setProtocol}/><Input label="Product" value={product} onChange={setProduct}/><Input label="Dose" value={dose} onChange={setDose}/><div/><label className="full">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save record"/></form></Modal>
}

function BreedModal({female,farm,boars,plans,close,saved}:{female:Animal;farm:Farm;boars:StudListing[];plans:MatingPlan[];close:()=>void;saved:(m:string)=>void}){
  const[date,setDate]=useState(nowLocal()),[plan,setPlan]=useState(plans[0]?.id||''),[boar,setBoar]=useState(plans[0]?.selected_stud_listing_id||''),[service,setService]=useState('1'),[method,setMethod]=useState('artificial_insemination'),[batch,setBatch]=useState(''),[technician,setTechnician]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState('')
  function choosePlan(id:string){setPlan(id);const selected=plans.find(x=>x.id===id);if(selected?.selected_stud_listing_id)setBoar(selected.selected_stud_listing_id)}
  async function submit(e:FormEvent){e.preventDefault();const eventDate=new Date(date).toISOString();const{error}=await supabase.from('breeding_events').insert({farm_id:farm.id,breeding_cycle_id:null,female_animal_id:female.id,mating_plan_id:plan||null,stud_listing_id:boar||null,event_date:eventDate,service_number:Number(service),method,semen_batch:batch||null,technician:technician||null,notes:notes||null});if(!error&&plan)await supabase.from('mating_plans').update({status:'bred',actual_breeding_date:eventDate.slice(0,10),breeding_method:method,selected_stud_listing_id:boar||null}).eq('id',plan);if(error)setError(error.message);else saved(`Breeding saved for ${female.call_name}. Expected farrowing: ${formatDate(expectedFarrowDate(eventDate.slice(0,10)))}.`)}
  return <Modal title={`Record breeding - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Date and time" type="datetime-local" value={date} onChange={setDate}/><label>Mating plan (optional)<select value={plan} onChange={e=>choosePlan(e.target.value)}><option value="">No plan</option>{plans.map(x=><option value={x.id} key={x.id}>{x.plan_name||formatDate(x.target_farrow_date)}</option>)}</select></label><label>Boar<select value={boar} onChange={e=>setBoar(e.target.value)}><option value="">Not recorded</option>{boars.map(x=><option value={x.id} key={x.id}>{x.boar_name} - {x.stud_name}</option>)}</select></label><label>Method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="artificial_insemination">Artificial insemination</option><option value="natural_service">Natural service</option></select></label><Input label="Service number" type="number" min="1" value={service} onChange={setService}/><Input label="Semen batch / collection" value={batch} onChange={setBatch}/><Input label="Technician" value={technician} onChange={setTechnician}/><div/><label className="full">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save breeding"/></form></Modal>
}

function CheckModal({female,farm,plans,close,saved}:{female:Animal;farm:Farm;plans:MatingPlan[];close:()=>void;saved:(m:string)=>void}){
  const[date,setDate]=useState(today()),[plan,setPlan]=useState(plans[0]?.id||''),[method,setMethod]=useState('Ultrasound'),[result,setResult]=useState('positive'),[checkedBy,setCheckedBy]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('pregnancy_checks').insert({farm_id:farm.id,breeding_cycle_id:null,female_animal_id:female.id,mating_plan_id:plan||null,check_date:date,method,result,checked_by:checkedBy||null,notes:notes||null});if(!error&&plan)await supabase.from('mating_plans').update({status:result==='positive'?'confirmed_pregnant':result==='negative'?'open':'bred'}).eq('id',plan);if(error)setError(error.message);else saved(`Pregnancy check saved for ${female.call_name}: ${result}.`)}
  return <Modal title={`Pregnancy check - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Check date" type="date" value={date} onChange={setDate}/><PlanSelect plans={plans} value={plan} onChange={setPlan}/><Input label="Method" value={method} onChange={setMethod}/><label>Result<select value={result} onChange={e=>setResult(e.target.value)}><option value="positive">Positive</option><option value="negative">Negative / open</option><option value="inconclusive">Inconclusive</option></select></label><Input label="Checked by" value={checkedBy} onChange={setCheckedBy}/><div/><label className="full">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save check"/></form></Modal>
}

function LitterModal({female,farm,boars,plans,close,saved}:{female:Animal;farm:Farm;boars:StudListing[];plans:MatingPlan[];close:()=>void;saved:(m:string)=>void}){
  const[date,setDate]=useState(nowLocal()),[plan,setPlan]=useState(plans[0]?.id||''),[boar,setBoar]=useState(plans[0]?.selected_stud_listing_id||''),[total,setTotal]=useState('0'),[alive,setAlive]=useState('0'),[stillborn,setStillborn]=useState('0'),[mummies,setMummies]=useState('0'),[notch,setNotch]=useState(''),[association,setAssociation]=useState('NSR'),[assisted,setAssisted]=useState(false),[notes,setNotes]=useState(''),[error,setError]=useState('')
  function choosePlan(id:string){setPlan(id);const selected=plans.find(x=>x.id===id);if(selected?.selected_stud_listing_id)setBoar(selected.selected_stud_listing_id)}
  async function submit(e:FormEvent){e.preventDefault();const counts=[total,alive,stillborn,mummies].map(Number);if(counts.some(x=>x<0)||counts[1]+counts[2]+counts[3]>counts[0]){setError('Birth outcomes cannot exceed total born.');return}const{error}=await supabase.rpc('create_litter_for_female',{p_female_id:female.id,p_sire_listing_id:boar||null,p_mating_plan_id:plan||null,p_event_date:new Date(date).toISOString(),p_total_born:counts[0],p_born_alive:counts[1],p_stillborn:counts[2],p_mummified:counts[3],p_litter_notch:notch||null,p_registry_association:association||null,p_assistance_required:assisted,p_notes:notes||null});if(error)setError(error.message);else saved(`Litter created for ${female.call_name}. ${total} pig records are in Litters and were not added to Herd Animals.`)}
  return <Modal title={`Add litter / farrowing - ${female.call_name}`} close={close}><form onSubmit={submit} className="form-grid"><Input label="Farrowing date and time" type="datetime-local" value={date} onChange={setDate}/><label>Mating plan (optional)<select value={plan} onChange={e=>choosePlan(e.target.value)}><option value="">Manual litter - no plan</option>{plans.map(x=><option value={x.id} key={x.id}>{x.plan_name||formatDate(x.target_farrow_date)}</option>)}</select></label><label>Recorded sire<select value={boar} onChange={e=>setBoar(e.target.value)}><option value="">Unknown / enter later</option>{boars.map(x=><option value={x.id} key={x.id}>{x.boar_name} - {x.stud_name}</option>)}</select></label><Input label="Litter ear notch / number" value={notch} onChange={setNotch}/><label>Registry association<select value={association} onChange={e=>setAssociation(e.target.value)}><option>NSR</option><option>CPS</option><option>Other</option></select></label><div/><Input label="Total born" type="number" min="0" value={total} onChange={setTotal}/><Input label="Born alive" type="number" min="0" value={alive} onChange={setAlive}/><Input label="Stillborn" type="number" min="0" value={stillborn} onChange={setStillborn}/><Input label="Mummified" type="number" min="0" value={mummies} onChange={setMummies}/><label className="check-label"><input type="checkbox" checked={assisted} onChange={e=>setAssisted(e.target.checked)}/> Assistance required</label><div/><label className="full">Farrowing notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><p className="notice full">This creates a separate litter and one editable litter-pig row for every animal in Total Born. Nothing is added to Herd Animals unless you later select Move to Herd.</p>{error&&<p className="error full">{error}</p>}<Actions close={close} label="Save litter"/></form></Modal>
}

function PlanSelect({plans,value,onChange}:{plans:MatingPlan[];value:string;onChange:(v:string)=>void}){return <label>Mating plan (optional)<select value={value} onChange={e=>onChange(e.target.value)}><option value="">No plan</option>{plans.map(x=><option value={x.id} key={x.id}>{x.plan_name||formatDate(x.target_farrow_date)}</option>)}</select></label>}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={close}><X/></button></header>{children}</section></div>}
function Actions({close,label}:{close:()=>void;label:string}){return <div className="form-actions full"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{label}</button></div>}
function Input({label,onChange,type='text',...props}:{label:string;onChange:(v:string)=>void;type?:string;[key:string]:unknown}){return <label>{label}<input type={type} {...props} onChange={e=>onChange(e.target.value)}/></label>}
