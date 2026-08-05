import { FormEvent, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Activity, Baby, CalendarDays, HeartPulse, Home, Menu, PiggyBank, Settings, X } from 'lucide-react'
import { isConfigured, supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { Animal, Farm, RegistryProfile, StudListing } from './types/database'
import AnimalProfile from './pages/AnimalProfile'
import BoarSelection from './pages/BoarSelection'
import Reproduction from './pages/Reproduction'
import Litters from './pages/Litters'
import LitterProfile from './pages/LitterProfile'

const nav = [
  ['/', 'Dashboard', Home], ['/animals', 'Animals', PiggyBank], ['/planning', 'Boar Selection', CalendarDays],
  ['/breeding', 'Reproduction', Activity], ['/litters', 'Litters', Baby], ['/health', 'Health', HeartPulse], ['/settings', 'Settings', Settings]
] as const

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!isConfigured) return <SetupNotice />
  if (loading) return <div className="center"><div className="spinner" /></div>
  if (!session) return <AuthPage />
  return <AuthenticatedApp />
}

function SetupNotice() {
  return <main className="auth-page"><section className="auth-card"><Brand /><h2>Connect Supabase to begin</h2><p>Copy <code>.env.example</code> to <code>.env</code>, then add your Supabase project URL and public anonymous key.</p><p className="muted">The complete steps are in INSTALLATION-GUIDE.md.</p></section></main>
}

function Brand() { return <div className="brand"><div className="brand-mark">PH</div><div><strong>Precision Herd</strong><span>Management — Swine</span></div></div> }

function AuthPage() {
  const [signup, setSignup] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setMessage(result.error?.message || (signup ? 'Account created. Check your email if confirmation is enabled.' : 'Signed in.'))
    setBusy(false)
  }
  return <main className="auth-page"><section className="auth-card"><Brand /><p className="eyebrow">SWINE RECORDS • HEALTH • REPRODUCTION</p><h1>{signup ? 'Create your account' : 'Welcome back'}</h1><form onSubmit={submit}>{signup && <Field label="Your name" value={name} onChange={setName} required />}<Field label="Email" type="email" value={email} onChange={setEmail} required /><Field label="Password" type="password" value={password} onChange={setPassword} required minLength={8} /><button className="button primary" disabled={busy}>{busy ? 'Working…' : signup ? 'Create account' : 'Sign in'}</button></form>{message && <p className="notice">{message}</p>}<button className="text-button" onClick={() => { setSignup(!signup); setMessage('') }}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></section></main>
}

function AuthenticatedApp() {
  const [farm, setFarm] = useState<Farm | null>(null), [loading, setLoading] = useState(true), [mobile, setMobile] = useState(false)
  async function loadFarm() { const { data } = await supabase.from('farms').select('*').order('created_at').limit(1).maybeSingle(); setFarm(data); setLoading(false) }
  useEffect(() => { loadFarm() }, [])
  if (loading) return <div className="center"><div className="spinner" /></div>
  if (!farm) return <FarmOnboarding onCreated={loadFarm} />
  return <div className="app-shell"><aside className={mobile ? 'sidebar open' : 'sidebar'}><div className="side-head"><Brand /><button className="icon-button mobile-only" onClick={() => setMobile(false)}><X /></button></div><nav>{nav.map(([to,label,Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobile(false)}><Icon size={19}/>{label}</NavLink>)}</nav><div className="side-footer"><span>{farm.name}</span><button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button></div></aside><main className="content"><header className="mobile-header"><button className="icon-button" onClick={() => setMobile(true)}><Menu /></button><Brand /></header><Routes><Route path="/" element={<Dashboard farm={farm}/>} /><Route path="/animals" element={<Animals farm={farm}/>} /><Route path="/animals/:id" element={<AnimalProfile farm={farm}/>} /><Route path="/planning" element={<BoarSelection farm={farm}/>} /><Route path="/breeding" element={<Reproduction farm={farm}/>} /><Route path="/litters" element={<Litters farm={farm}/>} /><Route path="/litters/:id" element={<LitterProfile farm={farm}/>} /><Route path="/health" element={<ComingSoon title="Health" text="Routine protocols, illness cases, treatments, withdrawals, and reminders arrive in Package 3."/>} /><Route path="/settings" element={<SettingsPage farm={farm}/>} /><Route path="*" element={<Navigate to="/"/>}/></Routes></main></div>
}

function FarmOnboarding({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('Lookout Mountain Farms'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); const { error } = await supabase.rpc('create_farm_with_owner', { p_name: name, p_primary_species: 'swine' }); if (error) setError(error.message); else await onCreated(); setBusy(false) }
  return <main className="auth-page"><section className="auth-card wide"><Brand/><p className="step">SWINE EDITION SETUP</p><h1>Create your farm</h1><p>This becomes the secure home for your sows, show pigs, boar plans, health records, breeding history, and litters.</p><form onSubmit={submit}><Field label="Farm or operation name" value={name} onChange={setName} required/><label>Application edition<input value="Swine" disabled/></label><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create farm'}</button></form>{error && <p className="error">{error}</p>}</section></main>
}

function PageHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action}</div> }

function Dashboard({ farm }: { farm: Farm }) {
  const [counts, setCounts] = useState({ animals: 0, boars: 0, plans: 0, litters: 0 })
  useEffect(() => { Promise.all([supabase.from('animals').select('*',{count:'exact',head:true}).eq('farm_id',farm.id).eq('status','active'), supabase.from('stud_listings').select('*',{count:'exact',head:true}).eq('farm_id',farm.id),supabase.from('mating_plans').select('*',{count:'exact',head:true}).eq('farm_id',farm.id).not('status','in','("farrowed","cancelled","open")'),supabase.from('offspring_groups').select('*',{count:'exact',head:true}).eq('farm_id',farm.id)]).then(([a,b,c,d]) => setCounts({animals:a.count||0,boars:b.count||0,plans:c.count||0,litters:d.count||0})) }, [farm.id])
  return <><PageHead eyebrow={farm.name} title="Herd dashboard"/><section className="hero"><div><p className="eyebrow light">PRECISION HERD MANAGEMENT — SWINE</p><h2>Every pig. Every breeding. One reliable record.</h2><p>Manage identification, heat cycles, sow-centered mating plans, farrowing, and independent litters.</p></div><PiggyBank size={72}/></section><div className="stat-grid"><Stat label="Active herd animals" value={counts.animals}/><Stat label="Boars in library" value={counts.boars}/><Stat label="Active mating plans" value={counts.plans}/><Stat label="Recorded litters" value={counts.litters}/></div><section className="panel"><h2>Animal-centered reproduction</h2><div className="checklist"><p>1. Record each sow's last heat</p><p>2. Plan a target farrow date and mating</p><p>3. Record breeding and pregnancy checks directly</p><p>4. Manage offspring separately under Litters</p></div></section></>
}

function Stat({label,value}:{label:string;value:string|number}) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div> }

function Animals({ farm }: { farm: Farm }) {
  const [items,setItems]=useState<Animal[]>([]), [show,setShow]=useState(false)
  async function load(){const {data}=await supabase.from('animals').select('*').eq('farm_id',farm.id).order('call_name');setItems(data||[])}
  useEffect(()=>{load()},[farm.id])
  return <><PageHead eyebrow="SWINE HERD RECORDS" title="Animals" action={<button className="button primary" onClick={()=>setShow(true)}>+ Add animal</button>}/>{items.length ? <div className="card-grid">{items.map(a=><Link className="animal-card" to={`/animals/${a.id}`} key={a.id}><div className="avatar"><PiggyBank/></div><div><span className="pill">{a.status}</span><h3>{a.call_name}</h3><p>{[a.breed,a.sex,a.primary_id].filter(Boolean).join(' • ')}</p>{a.registered_name&&<small>{a.registered_name}</small>}</div></Link>)}</div>:<Empty icon={<PiggyBank/>} title="No animals entered yet" text="Add your first sow, gilt, boar, barrow, or show pig."/>}{show&&<AnimalModal farm={farm} close={()=>setShow(false)} saved={()=>{setShow(false);load()}}/>}</>
}

function AnimalModal({farm,close,saved}:{farm:Farm;close:()=>void;saved:()=>void}) {
  const [v,setV]=useState({call_name:'',registered_name:'',breed:'',sex:'sow',primary_id:'',birth_date:''}), [error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();const {error}=await supabase.from('animals').insert({farm_id:farm.id,species:'swine',status:'active',...v,birth_date:v.birth_date||null});if(error)setError(error.message);else saved()}
  return <Modal title="Add animal" close={close}><form onSubmit={submit} className="form-grid"><Field label="Call name" value={v.call_name} onChange={x=>setV({...v,call_name:x})} required/><Field label="Registered name" value={v.registered_name} onChange={x=>setV({...v,registered_name:x})}/><Field label="Breed" value={v.breed} onChange={x=>setV({...v,breed:x})}/><label>Sex/class<select value={v.sex} onChange={e=>setV({...v,sex:e.target.value})}><option>sow</option><option>gilt</option><option>boar</option><option>barrow</option></select></label><Field label="Primary ID / ear tag" value={v.primary_id} onChange={x=>setV({...v,primary_id:x})}/><Field label="Birth date" type="date" value={v.birth_date} onChange={x=>setV({...v,birth_date:x})}/>{error&&<p className="error full">{error}</p>}<div className="form-actions full"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">Save animal</button></div></form></Modal>
}

function Planning({farm}:{farm:Farm}) {
  const [items,setItems]=useState<StudListing[]>([]),[show,setShow]=useState(false)
  async function load(){const {data}=await supabase.from('stud_listings').select('*').eq('farm_id',farm.id).order('boar_name');setItems(data||[])} useEffect(()=>{load()},[farm.id])
  return <><PageHead eyebrow="GENETIC & MATING PLANNING" title="Prospective boars" action={<button className="button primary" onClick={()=>setShow(true)}>+ Add boar</button>}/><p className="lead">Build a working library of boars before deciding which sire best complements each female.</p>{items.length?<div className="table-wrap"><table><thead><tr><th>Boar</th><th>Stud</th><th>Pedigree</th><th>Registration</th><th>Semen</th><th>Status</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.boar_name}</strong><small>{x.breed||'Breed not entered'}</small></td><td>{x.stud_name}</td><td>{x.sire_name||'—'} × {x.dam_name||'—'}</td><td>{x.registration_number||'—'}</td><td>{x.semen_price==null?'—':`$${Number(x.semen_price).toFixed(2)}`}</td><td><span className="pill">{x.availability_status}</span></td></tr>)}</tbody></table></div>:<Empty icon={<CalendarDays/>} title="Build your boar library" text="Record the stud, pedigree, registration, semen price, strengths, and notes for every prospective sire."/>}{show&&<BoarModal farm={farm} close={()=>setShow(false)} saved={()=>{setShow(false);load()}}/>}</>
}

function BoarModal({farm,close,saved}:{farm:Farm;close:()=>void;saved:()=>void}) {
  const blank={boar_name:'',stud_name:'',breed:'',sire_name:'',dam_name:'',registration_number:'',registration_association:'',semen_price:'',source_url:'',strengths:'',notes:'',availability_status:'available'}
  const [v,setV]=useState(blank),[error,setError]=useState(''); const field=(key:keyof typeof blank,x:string)=>setV({...v,[key]:x})
  async function submit(e:FormEvent){e.preventDefault();const {error}=await supabase.from('stud_listings').insert({...v,farm_id:farm.id,semen_price:v.semen_price?Number(v.semen_price):null});if(error)setError(error.message);else saved()}
  return <Modal title="Add prospective boar" close={close}><form onSubmit={submit} className="form-grid"><Field label="Boar name" value={v.boar_name} onChange={x=>field('boar_name',x)} required/><Field label="Boar stud" value={v.stud_name} onChange={x=>field('stud_name',x)} required/><Field label="Breed" value={v.breed} onChange={x=>field('breed',x)}/><Field label="Semen price" type="number" value={v.semen_price} onChange={x=>field('semen_price',x)} min="0" step="0.01"/><Field label="Sire" value={v.sire_name} onChange={x=>field('sire_name',x)}/><Field label="Dam" value={v.dam_name} onChange={x=>field('dam_name',x)}/><Field label="Registration association" value={v.registration_association} onChange={x=>field('registration_association',x)}/><Field label="Registration number" value={v.registration_number} onChange={x=>field('registration_number',x)}/><Field label="Stud/catalog URL" type="url" value={v.source_url} onChange={x=>field('source_url',x)}/><label>Availability<select value={v.availability_status} onChange={e=>field('availability_status',e.target.value)}><option value="available">Available</option><option value="watchlist">Watchlist</option><option value="unavailable">Unavailable</option><option value="retired">Retired</option></select></label><label className="full">Strengths / expected improvements<textarea value={v.strengths} onChange={e=>field('strengths',e.target.value)}/></label><label className="full">Planning notes<textarea value={v.notes} onChange={e=>field('notes',e.target.value)}/></label>{error&&<p className="error full">{error}</p>}<div className="form-actions full"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">Save boar</button></div></form></Modal>
}

function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={close}><X/></button></header>{children}</section></div> }
function Field({label,onChange,...props}:{label:string;onChange:(v:string)=>void;[key:string]:unknown}) { return <label>{label}<input {...props} onChange={e=>onChange(e.target.value)}/></label> }
function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <section className="empty"><div>{icon}</div><h2>{title}</h2><p>{text}</p></section> }
function ComingSoon({title,text}:{title:string;text:string}) { return <><PageHead eyebrow="COMING IN THE NEXT PACKAGE" title={title}/><Empty icon={<Activity/>} title={`${title} foundation is ready`} text={text}/></> }
function SettingsPage({farm}:{farm:Farm}) { return <><PageHead eyebrow="ACCOUNT, FARM & EXPORTS" title="Settings"/><section className="panel"><h2>{farm.name}</h2><p>Application edition: <strong>Precision Herd Management — Swine</strong></p><p>Species: <strong>Swine</strong></p><p className="muted">Cattle, sheep, and goat products will be maintained as separate applications with their own association fields, workflows, and reports.</p></section><RegistrySettings farm={farm}/></> }

function RegistrySettings({farm}:{farm:Farm}){
  const[profiles,setProfiles]=useState<RegistryProfile[]>([])
  async function load(){const{data}=await supabase.from('farm_registry_profiles').select('*').eq('farm_id',farm.id);setProfiles(data||[])}
  useEffect(()=>{load()},[farm.id])
  return <section className="panel"><h2>Registration export details</h2><p className="muted">Enter this once for each association. It will populate the owner, herd mark, contact, and signature columns in litter exports.</p><div className="registry-settings"><RegistryProfileForm association="NSR" farm={farm} current={profiles.find(x=>x.association==='NSR')} saved={load}/><RegistryProfileForm association="CPS" farm={farm} current={profiles.find(x=>x.association==='CPS')} saved={load}/></div></section>
}

function RegistryProfileForm({association,farm,current,saved}:{association:string;farm:Farm;current?:RegistryProfile;saved:()=>void}){
  const blank={owner_name:'',business_name:'',address_line_1:'',city:'',state:'GA',postal_code:'',phone:'',email:'',herd_mark:'',breeder_number:'',signature_name:''}
  const[value,setValue]=useState(blank),[message,setMessage]=useState('')
  useEffect(()=>{if(current)setValue(Object.fromEntries(Object.keys(blank).map(key=>[key,(current as unknown as Record<string,string|null>)[key]||''])) as typeof blank)},[current])
  function field(key:keyof typeof blank,next:string){setValue({...value,[key]:next})}
  async function submit(e:FormEvent){e.preventDefault();const{error}=await supabase.from('farm_registry_profiles').upsert({farm_id:farm.id,association,...value,updated_at:new Date().toISOString()},{onConflict:'farm_id,association'});setMessage(error?.message||`${association} export details saved.`);if(!error)saved()}
  return <form className="registry-form" onSubmit={submit}><h3>{association}</h3><Field label="Owner name" value={value.owner_name} onChange={v=>field('owner_name',v)}/><Field label="Farm / business name" value={value.business_name} onChange={v=>field('business_name',v)}/><Field label="Address" value={value.address_line_1} onChange={v=>field('address_line_1',v)}/><div className="address-row"><Field label="City" value={value.city} onChange={v=>field('city',v)}/><Field label="State" value={value.state} onChange={v=>field('state',v)}/><Field label="ZIP" value={value.postal_code} onChange={v=>field('postal_code',v)}/></div><Field label="Phone" value={value.phone} onChange={v=>field('phone',v)}/><Field label="Email" type="email" value={value.email} onChange={v=>field('email',v)}/><Field label="Herd mark" value={value.herd_mark} onChange={v=>field('herd_mark',v)}/><Field label="Breeder / owner number" value={value.breeder_number} onChange={v=>field('breeder_number',v)}/><Field label="Signature name" value={value.signature_name} onChange={v=>field('signature_name',v)}/><button className="button secondary">Save {association} details</button>{message&&<p className="notice">{message}</p>}</form>
}

export default App
