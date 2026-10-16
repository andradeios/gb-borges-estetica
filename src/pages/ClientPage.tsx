import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, LogOut, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SessionUser, money } from '../lib/siteData'

const TZ = 'America/Sao_Paulo'
const statusInfo: Record<string, { label: string; dot: string }> = {
  pendente: { label: 'Aguardando confirmação', dot: '#d4b25a' },
  confirmado: { label: 'Confirmado pela profissional', dot: '#7fc29b' },
  em_atendimento: { label: 'Em atendimento', dot: '#7fc29b' },
  concluido: { label: 'Concluído', dot: '#8c9295' },
  cancelado: { label: 'Cancelado', dot: '#c46a6a' },
  nao_compareceu: { label: 'Não compareceu', dot: '#c46a6a' }
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const dayOf = (iso: string) => cap(new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }))
const hourOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

type Appt = { id: string; start_time: string; end_time: string; price: number; status: string; notes: string | null; services: { name: string } | null; service_price_tiers: { label: string } | null }
type ContactSettings = { business_name?: string | null; whatsapp?: string | null; phone?: string | null }

function Card({ a, past }: { a: Appt; past?: boolean }) {
  const st = statusInfo[a.status] || { label: a.status, dot: '#8c9295' }
  return <article className={`appt-card${past ? ' is-past' : ''}`}>
    <div className="appt-head"><h3>{a.services?.name}</h3><span className="appt-status" style={{ ['--dot' as any]: st.dot }}>{st.label}</span></div>
    <dl className="appt-info">
      <div><dt>Dia</dt><dd>{dayOf(a.start_time)}</dd></div>
      <div><dt>Horário</dt><dd>{hourOf(a.start_time)} às {hourOf(a.end_time)}</dd></div>
      <div><dt>Valor</dt><dd>{money(Number(a.price))}</dd></div>
      {a.service_price_tiers?.label && <div><dt>Última aplicação</dt><dd>{a.service_price_tiers.label}</dd></div>}
    </dl>
    {a.notes && <p className="appt-notes">Observação: {a.notes}</p>}
  </article>
}

export default function Client({ user, onBack, onLogout, onBook }: { user: SessionUser | null; onBack: () => void; onLogout: () => void; onBook: () => void }) {
  const [items, setItems] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState<ContactSettings | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('appointments')
      .select('id,start_time,end_time,price,status,notes,services(name),service_price_tiers(label)')
      .eq('client_id', user.id).order('start_time', { ascending: false }).limit(60)
      .then(({ data }) => { setItems((data as unknown as Appt[]) || []); setLoading(false) })
    supabase.from('business_settings').select('business_name,whatsapp,phone').eq('id', 1).maybeSingle()
      .then(({ data }) => setContact((data as ContactSettings | null) || null))
  }, [user])

  const now = Date.now()
  const active = ['pendente', 'confirmado', 'em_atendimento']
  const upcoming = items.filter(a => active.includes(a.status) && new Date(a.end_time).getTime() >= now).sort((x, y) => +new Date(x.start_time) - +new Date(y.start_time))
  const history = items.filter(a => !upcoming.includes(a))
  const supportNumber = (contact?.whatsapp || contact?.phone || '5548998599624').replace(/\D/g, '')
  const supportUrl = supportNumber ? `https://wa.me/${supportNumber.startsWith('55') ? supportNumber : `55${supportNumber}`}?text=${encodeURIComponent('Olá! Preciso de ajuda com meu agendamento.')}` : null

  return <main className="dashboard-page"><div className="dashboard-wrap">
    <div className="dash-top"><button className="back-link" onClick={onBack}>← SITE</button><button className="logout" onClick={onLogout}><LogOut size={15} /> SAIR</button></div>
    <div className="dash-heading"><div><div className="section-kicker">MINHA ÁREA</div><h1>Olá, <em>{user?.name?.split(' ')[0] || 'beleza'}.</em></h1></div></div>
    <section className="dashboard-card appt-group">
      <div className="card-title"><CalendarDays size={18} /> PRÓXIMOS AGENDAMENTOS</div>
      {upcoming.length
        ? <div className="appt-list">{upcoming.map(a => <Card a={a} key={a.id} />)}</div>
        : <div className="empty-dashboard"><p>{loading ? 'Carregando…' : 'Você não tem horários marcados.'}</p>{!loading && <button className="button button-dark" onClick={onBook}>AGENDAR AGORA <ArrowUpRight size={16} /></button>}</div>}
      {upcoming.length > 0 && <button className="text-link appt-more" onClick={onBook}>NOVO AGENDAMENTO <ArrowUpRight size={14} /></button>}
    </section>
    {history.length > 0 && <section className="dashboard-card appt-group"><div className="card-title">HISTÓRICO</div><div className="appt-list">{history.map(a => <Card a={a} past key={a.id} />)}</div></section>}
    <section className="dashboard-card client-support-card"><div><div className="section-kicker">PRECISA DE AJUDA?</div><h2>Fale com a gente.</h2><p>Entre em contato pelo WhatsApp se tiver dúvidas sobre seu agendamento.</p></div>{supportUrl ? <a className="button button-dark" href={supportUrl} target="_blank" rel="noreferrer"><MessageCircle size={16}/> FALAR PELO WHATSAPP</a> : <p className="appt-notes">O contato de suporte ainda não foi configurado.</p>}</section>
  </div></main>
}
