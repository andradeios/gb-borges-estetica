import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ArrowUpRight, LayoutDashboard, Menu, UserRound, X } from 'lucide-react'
import { SessionUser } from '../lib/siteData'

type View = 'home' | 'login' | 'booking' | 'client' | 'admin'
type Props = { view: View; user: SessionUser | null; mobile: boolean; onToggleMobile: () => void; onNavigate: (view: View) => void; onBook: () => void }

const links = [
  { id: 'agendamentos', label: 'AGENDAMENTOS' },
  { id: 'precos', label: 'PREÇOS' },
  { id: 'contato', label: 'CONTATO' }
]

export default function SiteHeader({ view, user, mobile, onToggleMobile, onNavigate, onBook }: Props) {
  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  // Compacta o cabeçalho ao rolar e desenha a linha de progresso da página
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        setScrolled(y > 24)
        headerRef.current?.style.setProperty('--p', String(max > 0 ? Math.min(1, y / max) : 0))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [view])

  // Descobre qual seção está na tela (na página inicial)
  useEffect(() => {
    if (view === 'admin') { setActive('painel'); return }
    if (view !== 'home') { setActive(''); return }
    const els = links.map(l => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    if (!els.length || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }), { rootMargin: '-45% 0px -50% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [view])

  // A "pílula" prateada desliza até o link ativo ou sob o mouse
  const place = (id: string | null) => {
    const nav = navRef.current
    if (!nav) return
    const el = id ? nav.querySelector<HTMLElement>(`[data-id="${id}"]`) : null
    if (!el) { nav.style.setProperty('--io', '0'); return }
    nav.style.setProperty('--ix', `${el.offsetLeft}px`)
    nav.style.setProperty('--iy', `${el.offsetTop}px`)
    nav.style.setProperty('--iw', `${el.offsetWidth}px`)
    nav.style.setProperty('--ih', `${el.offsetHeight}px`)
    nav.style.setProperty('--io', '1')
    requestAnimationFrame(() => { nav.dataset.ready = '1' })
  }
  useEffect(() => { place(active || null) }, [active, view, user?.role])
  useEffect(() => {
    const again = () => place(active || null)
    window.addEventListener('resize', again)
    document.fonts?.ready.then(again)
    return () => window.removeEventListener('resize', again)
  }, [active])

  const go = (e: ReactMouseEvent, id: string) => {
    if (mobile) onToggleMobile()
    if (view !== 'home') {
      e.preventDefault()
      onNavigate('home')
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 140)
    }
  }

  return <header ref={headerRef} className={`site-header${view === 'home' || view === 'login' ? ' landing-header' : ''}${scrolled ? ' is-scrolled' : ''}`}>
    <a className="brand" onClick={() => onNavigate('home')}>
      <span className="brand-mark"><img className="brand-logo" src="/assets/brand/gabrielly-borges-logo.png" alt="Gabrielly Borges Beauty" /></span>
      <span className="brand-text">BEAUTY<small>STUDIO DE BELEZA</small></span>
    </a>
    <button className="mobile-toggle" aria-label={mobile ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobile} onClick={onToggleMobile}>{mobile ? <X key="x" /> : <Menu key="m" />}</button>
    <nav ref={navRef} className={mobile ? 'nav-open' : ''} onMouseLeave={() => place(active || null)}>
      <span className="nav-indicator" aria-hidden="true" />
      {links.map((l, i) => <a key={l.id} href={`#${l.id}`} data-id={l.id} className={active === l.id ? 'is-active' : ''} style={{ ['--i' as any]: i }}
        onMouseEnter={() => place(l.id)} onFocus={() => place(l.id)} onBlur={() => place(active || null)} onClick={e => go(e, l.id)}>{l.label}</a>)}
      {user?.role && <a href="#painel" data-id="painel" className={active === 'painel' ? 'is-active' : ''} style={{ ['--i' as any]: 3 }}
        onMouseEnter={() => place('painel')} onFocus={() => place('painel')} onBlur={() => place(active || null)}
        onClick={e => { e.preventDefault(); if (mobile) onToggleMobile(); onNavigate('admin') }}><LayoutDashboard size={14} /> PAINEL ADMIN</a>}
      {user && !user.role
        ? <button className="nav-account" style={{ ['--i' as any]: 4 }} onClick={() => onNavigate('client')}><UserRound size={16} /> MINHA ÁREA</button>
        : <button className="nav-cta" style={{ ['--i' as any]: 4 }} onClick={onBook}>AGENDAR HORÁRIO <ArrowUpRight size={16} /></button>}
    </nav>
  </header>
}
