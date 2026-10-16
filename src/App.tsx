import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import AdminPanelV2 from './components/AdminPanelV2'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import BookingPage from './pages/BookingPage'
import ClientPage from './pages/ClientPage'
import { Service, SessionUser } from './lib/siteData'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import { isStandalone } from './lib/pwa'


export default function App(){
 const [services,setServices]=useState<Service[]>([]); const [user,setUser]=useState<SessionUser|null>(null); const [view,setView]=useState<'home'|'login'|'booking'|'client'|'admin'>('home'); const [selected,setSelected]=useState<Service|null>(null); const [toast,setToast]=useState(''); const [mobile,setMobile]=useState(false); const launched=useRef(false)
 useEffect(()=>{if(isStandalone()&&window.location.search){window.history.replaceState(null,'','/')}loadServices();supabase.auth.getSession().then(({data})=>{if(data.session)loadUser(data.session.user.id,data.session.user.email);else if(isStandalone())setView('login')});const {data}=supabase.auth.onAuthStateChange((_e,s)=>s?loadUser(s.user.id,s.user.email):setUser(null));return()=>data.subscription.unsubscribe()},[])
 async function loadServices(){const {data}=await supabase.from('services').select('*,category:service_categories(name)').eq('active',true).order('sort_order').limit(50);if(data?.length)setServices(data)}
 async function loadUser(id:string,email?:string){const [{data:p},{data:r}]=await Promise.all([supabase.from('profiles').select('full_name').eq('id',id).maybeSingle(),supabase.from('user_roles').select('role,active').eq('user_id',id).maybeSingle()]);setUser({id,email,name:p?.full_name,role:r?.active?r.role:undefined});if(isStandalone()&&!launched.current){launched.current=true;if(r?.active)setView('admin')}}
 function nav(v:typeof view){setView(v);setMobile(false);window.scrollTo({top:0,behavior:'smooth'})}
 function book(s?:Service){setSelected(s||null);nav(user?.role?'booking':user?'booking':'login')}
 async function logout(){await supabase.auth.signOut();setUser(null);nav('home')}
 return <div className={`app-shell view-${view}`}><SiteHeader view={view} user={user} mobile={mobile} onToggleMobile={()=>setMobile(!mobile)} onNavigate={nav} onBook={()=>book()}/>{view==='home'&&<HomePage services={services} onBook={book}/>} {view==='login'&&<LoginPage onBack={()=>nav('home')} onSuccess={async()=>{const {data:{user:u}}=await supabase.auth.getUser();if(u){const {data:r}=await supabase.from('user_roles').select('active').eq('user_id',u.id).maybeSingle();nav(r?.active?'admin':'booking')}}}/>} {view==='booking'&&<BookingPage services={services} selected={selected} onBack={()=>nav('home')} onDone={m=>{setToast(m);nav('client')}}/>}{view==='client'&&<ClientPage user={user} onBack={()=>nav('home')} onLogout={logout} onBook={()=>book()}/>} {view==='admin'&&<AdminPanelV2 user={user} onBack={()=>nav('home')} onLogout={logout} onToast={setToast}/>} {toast&&<div className="toast" onClick={()=>setToast('')}><Check size={18}/>{toast}<X size={14}/></div>}<SiteFooter/></div>
}
