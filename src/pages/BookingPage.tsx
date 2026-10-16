import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarPlus, Check, Tag, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Service, money, serviceImage } from '../lib/siteData'

type Tier = { id: string; label: string; price: number; sort_order: number }
type Slot = { slot_start: string }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const isMaintenance = (service: Service) => normalize(service.name).startsWith('manutencao')
const maintenanceKey = (name: string) => normalize(name).replace(/^volume\s+/, '').replace(/^manutencao\s+/, '')
const daysFromTier = (label: string) => Number(label.match(/\d+/)?.[0] || 20)
const discountFor = (price: number) => price >= 115 ? 15 : 10
const datePlusDays = (date: string, days: number) => {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}
const today = () => new Date().toISOString().slice(0, 10)

export default function Booking({
  services,
  selected,
  onBack,
  onDone,
}: {
  services: Service[]
  selected: Service | null
  onBack: () => void
  onDone: (message: string) => void
}) {
  const [service, setService] = useState(selected?.id || '')
  const [tiers, setTiers] = useState<Tier[]>([])
  const [tier, setTier] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slot, setSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [initialServiceId, setInitialServiceId] = useState('')
  const [initialDate, setInitialDate] = useState('')
  const [offerService, setOfferService] = useState<Service | null>(null)
  const [offerTiers, setOfferTiers] = useState<Tier[]>([])
  const [offerTierId, setOfferTierId] = useState('')
  const [offerDate, setOfferDate] = useState('')
  const [offerDateManual, setOfferDateManual] = useState(false)
  const [offerSlots, setOfferSlots] = useState<Slot[]>([])
  const [offerSlot, setOfferSlot] = useState('')
  const [offerError, setOfferError] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)

  const chosen = services.find((item) => item.id === service)
  const chosenTier = tiers.find((item) => item.id === tier)
  const offerTier = offerTiers.find((item) => item.id === offerTierId)
  const offerDiscount = offerTier ? discountFor(Number(offerTier.price)) : 0
  const offerPrice = offerTier ? Math.max(0, Number(offerTier.price) - offerDiscount) : 0
  const needsTier = tiers.length > 0
  const isOfferVisible = !!offerService
  const relatedMaintenance = useMemo(() => {
    if (!chosen || isMaintenance(chosen)) return null
    const key = maintenanceKey(chosen.name)
    return services.find((item) => isMaintenance(item) && maintenanceKey(item.name) === key) || null
  }, [chosen, services])

  useEffect(() => {
    setTier(''); setSlot(''); setSlots([]); setTiers([]); setError('')
    if (!service) return
    let alive = true
    supabase.from('service_price_tiers').select('id,label,price,sort_order').eq('service_id', service).order('sort_order')
      .then(({ data }) => { if (alive) setTiers((data as Tier[]) || []) })
    return () => { alive = false }
  }, [service])

  useEffect(() => {
    setSlot(''); setSlots([])
    if (!service || !date) return
    let alive = true
    const refresh = () => supabase.rpc('get_available_slots', { p_service_id: service, p_date: date })
      .then(({ data }) => { if (alive) setSlots((data as Slot[]) || []) })
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [service, date])

  useEffect(() => {
    setOfferTierId(''); setOfferDate(''); setOfferDateManual(false); setOfferSlot(''); setOfferSlots([]); setOfferTiers([])
    if (!offerService) return
    let alive = true
    supabase.from('service_price_tiers').select('id,label,price,sort_order').eq('service_id', offerService.id).order('sort_order')
      .then(({ data }) => { if (alive) setOfferTiers((data as Tier[]) || []) })
    return () => { alive = false }
  }, [offerService])

  useEffect(() => {
    setOfferSlot(''); setOfferSlots([])
    if (!offerService || !offerDate) return
    let alive = true
    const refresh = () => supabase.rpc('get_available_slots', { p_service_id: offerService.id, p_date: offerDate })
      .then(({ data }) => { if (alive) setOfferSlots((data as Slot[]) || []) })
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [offerService, offerDate])

  function beginOffer() {
    if (!relatedMaintenance) return onDone('Seu horário foi solicitado com sucesso.')
    setInitialServiceId(service)
    setInitialDate(date)
    setOfferService(relatedMaintenance)
    setError('')
  }

  async function confirm() {
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('create_appointment', {
      p_service_id: service,
      p_start: slot,
      p_tier_id: needsTier ? tier : null,
      p_notes: notes || null,
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    beginOffer()
  }

  async function confirmOffer() {
    if (!offerService || !offerTier || !offerSlot || !initialServiceId) return
    setOfferBusy(true); setOfferError('')
    const { error: err } = await supabase.rpc('create_appointment_offer', {
      p_service_id: offerService.id,
      p_start: offerSlot,
      p_tier_id: offerTier.id,
      p_discount: offerDiscount,
      p_notes: `Oferta de manutenção vinculada ao ${chosen?.name || 'procedimento'} agendado em ${initialDate}.`,
    })
    setOfferBusy(false)
    if (err) { setOfferError(err.message); return }
    onDone('Seu volume e sua manutenção promocional foram solicitados com sucesso.')
  }

  const skipOffer = () => onDone('Seu horário foi solicitado com sucesso. A oferta de manutenção ficará disponível para um próximo agendamento.')
  const price = chosenTier ? chosenTier.price : chosen ? Number(chosen.price) : 0
  const ready = !!service && !!slot && (!needsTier || !!tier) && !busy
  const offerMinDate = offerTier && initialDate ? datePlusDays(initialDate, daysFromTier(offerTier.label)) : today()

  return <main className="booking-page"><div className="booking-inner"><button className="back-link" onClick={onBack}>← VOLTAR</button><div className="section-kicker">AGENDAMENTO / 01</div><h1>Seu próximo<br/><em>ritual.</em></h1>
    {!isOfferVisible ? <div className="booking-layout"><div className="booking-form">
      <label>Escolha o serviço<select value={service} onChange={(e) => setService(e.target.value)}><option value="">Selecione</option>{services.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {needsTier && <label>Há quanto tempo foi a última aplicação?<select value={tier} onChange={(e) => setTier(e.target.value)}><option value="">Selecione</option>{tiers.map((item) => <option key={item.id} value={item.id}>{item.label} · {money(Number(item.price))}</option>)}</select></label>}
      <label>Escolha a data<input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      {date && service && <div><span className="field-title">Horários disponíveis</span><div className="slot-grid">{slots.length ? slots.map((item) => <button type="button" className={slot === item.slot_start ? 'slot selected' : 'slot'} key={item.slot_start} onClick={() => setSlot(item.slot_start)}>{new Date(item.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</button>) : <p className="empty-note">Nenhum horário disponível nesta data. Escolha outro dia.</p>}</div></div>}
      <label>Observações<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      {error && <p className="error">{error}</p>}
      <button className="button button-dark" disabled={!ready} onClick={confirm}>{busy ? 'ENVIANDO…' : 'CONFIRMAR AGENDAMENTO'} <ArrowUpRight size={16} /></button>
    </div><aside className="booking-summary">{chosen ? <><img src={serviceImage(chosen)} alt={chosen.name} /><h3>{chosen.name}</h3>{chosenTier && <div className="summary-line"><span>Última aplicação</span><strong>{chosenTier.label}</strong></div>}<div className="summary-line"><span>Investimento</span><strong>{needsTier && !chosenTier ? 'Escolha a faixa' : money(price)}</strong></div><div className="summary-line"><span>Duração</span><strong>{chosen.duration_minutes} min</strong></div></> : <div className="summary-empty">Selecione um serviço.</div>}</aside></div> : <section className="maintenance-offer-panel">
      <div className="offer-heading"><span className="offer-icon"><Tag size={20} /></span><div><div className="section-kicker">OFERTA ESPECIAL</div><h2>Garanta sua <em>manutenção.</em></h2><p>Reserve agora o próximo cuidado do seu volume e ganhe até <strong>R$ 15,00 de desconto</strong>.</p></div></div>
      <div className="offer-layout"><div className="booking-form offer-form">
        <div className="offer-service-pill"><img src={serviceImage(offerService)} alt={offerService.name} /><div><strong>{offerService.name}</strong><span>Oferta exclusiva para quem acabou de agendar {chosen?.name}.</span></div></div>
        <label>Escolha a faixa da manutenção<select value={offerTierId} onChange={(e) => { const nextId = e.target.value; const nextTier = offerTiers.find((item) => item.id === nextId); setOfferTierId(nextId); setOfferDateManual(false); setOfferDate(nextTier && initialDate ? datePlusDays(initialDate, daysFromTier(nextTier.label)) : '') }}><option value="">Selecione</option>{offerTiers.map((item) => <option key={item.id} value={item.id}>{item.label} · de {money(Number(item.price))} por {money(Math.max(0, Number(item.price) - discountFor(Number(item.price))))}</option>)}</select></label>
        {offerTier && <div className="offer-auto-date"><p className="offer-date-note"><CalendarPlus size={15} /> Data calculada automaticamente: <strong>{new Date(`${offerDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong> ({offerTier.label.toLowerCase()}).</p><button type="button" className="text-link offer-change-date" onClick={() => setOfferDateManual((value) => !value)}>{offerDateManual ? 'USAR DATA CALCULADA' : 'NÃO POSSO NESTE DIA'}</button></div>}
        {offerTier && offerDateManual && <label>Escolha outro dia<input type="date" min={offerMinDate} value={offerDate} onChange={(e) => setOfferDate(e.target.value)} /></label>}
        {offerDate && <div><span className="field-title">Horários disponíveis</span><div className="slot-grid">{offerSlots.length ? offerSlots.map((item) => <button type="button" className={offerSlot === item.slot_start ? 'slot selected' : 'slot'} key={item.slot_start} onClick={() => setOfferSlot(item.slot_start)}>{new Date(item.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</button>) : <p className="empty-note">Nenhum horário disponível nesta data. Escolha outro dia.</p>}</div></div>}
        {offerError && <p className="error">{offerError}</p>}
        <div className="offer-actions"><button className="button button-dark" disabled={!offerTier || !offerSlot || offerBusy} onClick={confirmOffer}>{offerBusy ? 'RESERVANDO…' : 'RESERVAR COM DESCONTO'} <Check size={16} /></button><button className="text-link" type="button" onClick={skipOffer}><X size={15} /> NÃO AGORA</button></div>
      </div><aside className="booking-summary offer-summary"><img src={serviceImage(offerService)} alt={offerService.name} /><h3>{offerService.name}</h3><div className="summary-line"><span>Preço promocional</span><strong>{offerTier ? money(offerPrice) : 'Escolha a faixa'}</strong></div>{offerTier && <div className="summary-line"><span>Desconto aplicado</span><strong className="offer-discount">- {money(offerDiscount)}</strong></div>}<div className="summary-line"><span>Após a aplicação</span><strong>{offerTier ? offerTier.label : 'Escolha a faixa'}</strong></div></aside></div>
    </section>}
  </div></main>
}
