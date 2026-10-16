import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUpRight, ChevronRight, Clock3, Instagram } from 'lucide-react'
import { Service, money, serviceImage, isMaintenance, contact, whatsappLink, instagramLink } from '../lib/siteData'

const heroWords=[{t:'Seu'},{t:'próximo'},{t:'ritual',em:true},{t:'começa',em:true},{t:'aqui.'}]
const heroSlides=[
 {name:'Volume Brasileiro',key:'volume brasileiro',src:'/assets/servicos/volume-brasileiro.webp'},
 {name:'Volume Egípcio',key:'volume egipcio',src:'/assets/servicos/volume-egipcio.webp'},
 {name:'Fox Eyes',key:'fox eyes',src:'/assets/servicos/fox-eyes.webp'},
 {name:'Mega Brasileiro',key:'mega brasileiro',src:'/assets/servicos/mega-brasileiro.webp'},
 {name:'Capping',key:'capping',src:'/assets/servicos/capping.webp'},
 {name:'Design com Henna',key:'design com henna',src:'/assets/servicos/design-henna.webp'},
 {name:'Fio Colorido',key:'fio colorido',src:'/assets/servicos/fio-colorido.webp'},
 {name:'Resultado real',key:'resultado real',src:'/assets/editorial/real-lashes.webp'}
]
const plain=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()

const contactLines:{t:string;em?:boolean}[][]=[[{t:'Fale'},{t:'com'},{t:'a'}],[{t:'GB',em:true},{t:'BEAUTY.',em:true}]]

function WhatsAppIcon({size=24}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><g transform="translate(7 7) scale(.42)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="3.6"/></g></svg>
}

/** Brilho prateado que acompanha o dedo/mouse dentro do cartão */
const followLight=(e:ReactPointerEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--my',`${e.clientY-r.top}px`)}

function useReveal(dep:unknown){
 useEffect(()=>{
  const els=document.querySelectorAll<HTMLElement>('.reveal:not(.in)')
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'})
  els.forEach(e=>io.observe(e))
  return()=>io.disconnect()
 },[dep])
}

function HeroShowcase({services,onBook}:{services:Service[];onBook:(s?:Service)=>void}){
 const [i,setI]=useState(0)
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=setInterval(()=>setI(v=>(v+1)%heroSlides.length),5200);return()=>clearInterval(t)},[])
 const cur=heroSlides[i];const svc=services.find(s=>plain(s.name)===cur.key)
 return <div className="hero-art"><div className="hero-showcase"><button className="showcase-window" aria-label={`Agendar ${cur.name}`} onClick={()=>onBook(svc)}>{heroSlides.map((sl,n)=><img key={sl.key} src={sl.src} alt={n===i?`Resultado de ${sl.name}`:''} className={n===i?'is-active':''} loading={n===0?'eager':'lazy'}/>)}</button><div className="showcase-caption" aria-live="polite"><span key={cur.key}>{cur.name}{svc?` · ${money(Number(svc.price))}`:''}</span><div className="showcase-dots">{heroSlides.map((sl,n)=><button key={sl.key} aria-label={`Ver ${sl.name}`} className={n===i?'on':''} onClick={()=>setI(n)}/>)}</div></div></div></div>
}

export default function Home({services,onBook}:{services:Service[];onBook:(s?:Service)=>void}){useReveal(services.length);const main=services.filter(s=>!isMaintenance(s));const maintenance=services.filter(isMaintenance);return <main className="public-home"><section className="hero" id="agendamentos"><div className="hero-copy"><p className="eyebrow"><span/> AGENDAMENTOS GB BEAUTY</p><h1 aria-label="Seu próximo ritual começa aqui.">{heroWords.map((w,i)=><span className="h-word" aria-hidden="true" key={w.t}><span className={w.em?'h-in h-em':'h-in'} style={{animationDelay:`${0.15+i*0.11}s`}}>{w.t}</span>{' '}</span>)}</h1><p className="hero-intro">Escolha seu procedimento, encontre o melhor horário e reserve seu momento de beleza com praticidade.</p><div className="hero-actions"><button className="button button-light" onClick={()=>onBook()}>COMEÇAR AGENDAMENTO <ArrowUpRight size={16}/></button><a href="#precos" className="text-link">VER TABELA DE PREÇOS <ChevronRight size={16}/></a></div></div><HeroShowcase services={services} onBook={onBook}/></section><section className="services-section price-table-section" id="precos"><div className="section-heading reveal"><div><div className="section-kicker">01 — TABELA DE PREÇOS</div><h2>Escolha seu<br/><em>procedimento.</em></h2></div><p>Serviços disponíveis ao vivo no site, com preço, duração e detalhes atualizados pela equipe GB BEAUTY.</p></div><div className="service-cards">{main.map((s,i)=><article className="service-card reveal" style={{['--d' as any]:`${(i%4)*0.09}s`}} key={s.id} onClick={()=>onBook(s)}><div className="service-photo"><img src={serviceImage(s,i)} alt={s.name} loading="lazy"/></div><div className="service-card-info"><h3>{s.name}</h3><p>{s.description||'Resultado personalizado e acabamento impecável.'}</p><div className="service-card-meta"><strong>{money(Number(s.price))}</strong><span><Clock3 size={13}/> {s.duration_minutes} min</span></div></div></article>)}</div>{maintenance.length>0&&<details className="maintenance reveal"><summary><span>Manutenção</span><small>Para quem já fez a aplicação e quer renovar</small><ChevronRight size={16} className="maintenance-chevron"/></summary><ul className="maintenance-list">{maintenance.map(s=><li key={s.id}><button onClick={()=>onBook(s)}><span className="maintenance-name">{s.name.replace(/^Manuten[çc][ãa]o\s+/i,'')}</span><span className="maintenance-price">a partir de {money(Number(s.price))}</span></button></li>)}</ul></details>}<div className="price-table-action"><button className="button button-dark" onClick={()=>onBook()}>AGENDAR MEU HORÁRIO <ArrowUpRight size={16}/></button></div></section><section className="contact-band contact-only reveal" id="contato"><div className="contact-copy"><div className="section-kicker">02 — CONTATO</div><h2 aria-label="Fale com a GB BEAUTY.">{contactLines.map((line,li)=><span className="rise-line" aria-hidden="true" key={li}>{line.map((w,wi)=><span className="rise-word" key={w.t}><span className={w.em?'rise-in rise-em':'rise-in'} style={{animationDelay:`${0.1+(li*3+wi)*0.1}s`}}>{w.t}</span></span>)}</span>)}</h2><p>Estamos prontas para receber você e ajudar a escolher o melhor procedimento.</p></div><div className="contact-channels"><a className="channel channel-wa reveal" style={{['--d' as any]:'.15s'}} href={whatsappLink} target="_blank" rel="noopener noreferrer" onPointerMove={followLight}><span className="channel-icon"><WhatsAppIcon/></span><span className="channel-body"><strong>WhatsApp</strong><span>{contact.whatsappLabel}</span></span><span className="channel-go"><ArrowUpRight size={18}/></span></a><a className="channel channel-ig reveal" style={{['--d' as any]:'.27s'}} href={instagramLink} target="_blank" rel="noopener noreferrer" onPointerMove={followLight}><span className="channel-icon"><Instagram size={24}/></span><span className="channel-body"><strong>Instagram</strong><span>@{contact.instagramUser}</span></span><span className="channel-go"><ArrowUpRight size={18}/></span></a><button className="text-link channel-book" onClick={()=>onBook()}>OU AGENDE ONLINE <ChevronRight size={16}/></button></div></section></main>}

