import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import {
  ArrowUpRight,
  Smartphone,
  CalendarDays,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePwaInstall } from '../lib/pwa'
import { serviceImage } from '../lib/siteData'

type Props = {
  user: any
  onBack: () => void
  onLogout: () => void
  onToast: (message: string) => void
}
type Tab =
  | 'dashboard'
  | 'agendamentos'
  | 'clientes'
  | 'servicos'
  | 'financeiro'
  | 'admins'
  | 'config'
type ServiceKind = 'manutencao' | 'procedimento'
type Service = {
  id?: string
  name: string
  description: string
  price: number
  duration_minutes: number
  image_path: string | null
  active: boolean
  sort_order: number
  category_id: string
  kind: ServiceKind
  price_tiers?: PriceTier[]
}
type PriceTier = { id?: string; label: string; price: number; sort_order: number }
type Transaction = {
  id?: string
  description: string
  amount: number
  type: 'receita' | 'despesa'
  status: 'pago' | 'pendente' | 'cancelado'
  payment_method: string
  occurred_on: string
  category: string
  notes: string
  appointment_id?: string | null
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
  service_name?: string | null
}
type Settings = {
  id: number
  business_name: string
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  address: string | null
  description: string | null
  timezone: string
  slot_interval_minutes: number
  min_notice_hours: number
  max_advance_days: number
  cancel_limit_hours: number
}
type SaleInsight = { service_name: string; client_name: string; price: number; start_time: string }
type Appointment = {
  id: string
  client_id: string
  service_id: string
  start_time: string
  end_time: string
  price: number
  status: string
  notes?: string | null
  client_name?: string
  client_email?: string | null
  client_phone?: string | null
  service_name?: string
}
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const blankService: Service = {
  name: '',
  description: '',
  price: 0,
  duration_minutes: 60,
  image_path: null,
  active: true,
  sort_order: 0,
  category_id: '',
  kind: 'procedimento',
}
const blankTransaction = (): Transaction => ({
  description: '',
  amount: 0,
  type: 'receita',
  status: 'pago',
  payment_method: '',
  occurred_on: todayLocal(),
  category: '',
  notes: '',
  appointment_id: null,
})
const statusLabels: Record<string, string> = {
  pendente: 'Aguardando sua confirmação',
  confirmado: 'Confirmado pela profissional',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  nao_compareceu: 'Não compareceu',
}
const errText = (error: any) => error?.message || 'Não foi possível concluir a operação.'
const paymentMethods = [
  { value: '', label: 'Não informado' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
]
const normalizePaymentMethod = (value: unknown): string | null => {
  const raw = String(value ?? '').trim().toLocaleLowerCase('pt-BR')
  if (!raw) return null
  if (['pix'].includes(raw)) return 'pix'
  if (['dinheiro', 'cash', 'espécie', 'especie'].includes(raw)) return 'dinheiro'
  if (['cartao', 'cartão', 'cartao de credito', 'cartão de crédito', 'cartao de debito', 'cartão de débito', 'credito', 'crédito', 'debito', 'débito', 'credit card'].includes(raw)) return 'cartao'
  if (['transferencia', 'transferência', 'ted', 'doc', 'transfer'].includes(raw)) return 'transferencia'
  if (['outro', 'other'].includes(raw)) return 'outro'
  return null
}

export default function AdminPanelV2({ user, onBack, onLogout, onToast }: Props) {
  const { canInstall, install } = usePwaInstall()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState({ clients: 0, today: 0, revenue: 0, pending: 0, expenses: 0, todayRevenue: 0, monthRevenue: 0 })
  const [salesInsights, setSalesInsights] = useState<SaleInsight[]>([])
  const [financePeriod, setFinancePeriod] = useState<'today' | 'month' | 'all'>('month')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [adminCandidates, setAdminCandidates] = useState<any[]>([])
  const [adminSearch, setAdminSearch] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<'todos' | 'atendidos' | 'nao-atendidos' | 'agendados' | 'novos' | 'sem-voltar'>('todos')
  const [clientSort, setClientSort] = useState<'nome' | 'cadastro' | 'gasto' | 'atendimentos' | 'ultimo'>('nome')
  const [financeFilter, setFinanceFilter] = useState<string>('todos')
  const [loading, setLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const items: [Tab, string, any][] = [
    ['dashboard', 'Dashboard', <LayoutDashboard size={16} />],
    ['agendamentos', 'Agendamentos', <CalendarDays size={16} />],
    ['clientes', 'Clientes', <Users size={16} />],
    ['servicos', 'Serviços', <Sparkles size={16} />],
    ['financeiro', 'Financeiro', <WalletCards size={16} />],
    ['admins', 'Administradores', <ShieldCheck size={16} />],
  ]

  const loadAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id,client_id,service_id,start_time,end_time,price,status,notes')
      .gte('start_time', `${todayLocal()}T00:00:00`)
      .order('start_time')
      .limit(500)
    if (error) throw error
    const rows = (data || []) as Appointment[]
    const clientIds = [...new Set(rows.map((a) => a.client_id).filter(Boolean))]
    const serviceIds = [...new Set(rows.map((a) => a.service_id).filter(Boolean))]
    const [profilesResult, servicesResult] = await Promise.all([
      clientIds.length
        ? supabase.from('profiles').select('id,full_name,email,phone').in('id', clientIds)
        : Promise.resolve({ data: [], error: null } as any),
      serviceIds.length
        ? supabase.from('services').select('id,name').in('id', serviceIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])
    if (profilesResult.error) throw profilesResult.error
    if (servicesResult.error) throw servicesResult.error
    const profileMap = new Map<string, any>((profilesResult.data || []).map((p: any) => [p.id, p] as [string, any]))
    const serviceMap = new Map<string, string>((servicesResult.data || []).map((s: any) => [s.id, s.name] as [string, string]))
    setAppointments(
      rows.map((a) => ({
        ...a,
        client_name: profileMap.get(a.client_id)?.full_name || 'Cliente',
        client_email: profileMap.get(a.client_id)?.email || null,
        client_phone: profileMap.get(a.client_id)?.phone || null,
        service_name: serviceMap.get(a.service_id) || 'Serviço',
      })),
    )
    return rows
  }, [])

  const loadFinance = useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('id,description,amount,type,status,payment_method,occurred_on,category,notes,appointment_id')
      .order('occurred_on', { ascending: false })
      .limit(1000)
    if (error) throw error
    const rows = (data || []) as Transaction[]
    const appointmentIds = [...new Set(rows.map((t) => t.appointment_id).filter(Boolean) as string[])]
    let enrichedRows = rows
    if (appointmentIds.length) {
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('id,client_id,service_id,start_time')
        .in('id', appointmentIds)
      if (appointmentError) throw appointmentError
      const linkedAppointments = appointmentData || []
      const clientIds = [...new Set(linkedAppointments.map((a: any) => a.client_id).filter(Boolean))]
      const serviceIds = [...new Set(linkedAppointments.map((a: any) => a.service_id).filter(Boolean))]
      const [profileResult, serviceResult] = await Promise.all([
        clientIds.length ? supabase.from('profiles').select('id,full_name,email,phone').in('id', clientIds) : Promise.resolve({ data: [], error: null } as any),
        serviceIds.length ? supabase.from('services').select('id,name').in('id', serviceIds) : Promise.resolve({ data: [], error: null } as any),
      ])
      if (profileResult.error) throw profileResult.error
      if (serviceResult.error) throw serviceResult.error
      const appointmentMap = new Map<string, any>(linkedAppointments.map((a: any) => [a.id, a]))
      const profileMap = new Map<string, any>((profileResult.data || []).map((p: any) => [p.id, p]))
      const serviceMap = new Map<string, string>((serviceResult.data || []).map((service: any) => [service.id, service.name]))
      enrichedRows = rows.map((t) => {
        const appointment = t.appointment_id ? appointmentMap.get(t.appointment_id) : null
        const profile = appointment ? profileMap.get(appointment.client_id) : null
        return {
          ...t,
          client_name: profile?.full_name || null,
          client_email: profile?.email || null,
          client_phone: profile?.phone || null,
          service_name: appointment ? serviceMap.get(appointment.service_id) || null : null,
        }
      })
    }
    setTransactions(enrichedRows)
    return enrichedRows
  }, [])

  const loadTab = useCallback(
    async (next: Tab) => {
      setTab(next)
      setSearch('')
      setLoadError('')
      setLoading(true)
      try {
        if (next === 'dashboard' || next === 'agendamentos') {
          const [profilesResult, appointmentsRows, financeRows] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            loadAppointments(),
            loadFinance(),
          ])
          if (profilesResult.error) throw profilesResult.error
          const today = todayLocal()
          const monthStart = `${today.slice(0, 7)}-01`
          const paidRevenue = financeRows.filter((t) => t.type === 'receita' && t.status === 'pago')
          setStats({
            clients: profilesResult.count || 0,
            today: appointmentsRows.filter((a) => a.start_time.slice(0, 10) === today).length,
            revenue: paidRevenue.reduce((sum, t) => sum + Number(t.amount || 0), 0),
            pending: financeRows.filter((t) => t.type === 'receita' && t.status === 'pendente').reduce((sum, t) => sum + Number(t.amount || 0), 0),
            expenses: financeRows.filter((t) => t.type === 'despesa' && t.status !== 'cancelado').reduce((sum, t) => sum + Number(t.amount || 0), 0),
            todayRevenue: paidRevenue.filter((t) => t.occurred_on.slice(0, 10) === today).reduce((sum, t) => sum + Number(t.amount || 0), 0),
            monthRevenue: paidRevenue.filter((t) => t.occurred_on >= monthStart && t.occurred_on < `${today.slice(0, 7)}-32`).reduce((sum, t) => sum + Number(t.amount || 0), 0),
          })
          if (next === 'dashboard') {
            const { data: completed, error: completedError } = await supabase.from('appointments').select('id,client_id,service_id,start_time,price').eq('status', 'concluido').order('start_time', { ascending: false }).limit(1000)
            if (completedError) throw completedError
            const clientIds = [...new Set((completed || []).map((a: any) => a.client_id).filter(Boolean))]
            const serviceIds = [...new Set((completed || []).map((a: any) => a.service_id).filter(Boolean))]
            const [profiles, serviceRows] = await Promise.all([
              clientIds.length ? supabase.from('profiles').select('id,full_name').in('id', clientIds) : Promise.resolve({ data: [], error: null } as any),
              serviceIds.length ? supabase.from('services').select('id,name').in('id', serviceIds) : Promise.resolve({ data: [], error: null } as any),
            ])
            if (profiles.error) throw profiles.error
            if (serviceRows.error) throw serviceRows.error
            const clientMap = new Map((profiles.data || []).map((x: any) => [x.id, x.full_name || 'Cliente']))
            const serviceMap = new Map((serviceRows.data || []).map((x: any) => [x.id, x.name || 'Serviço']))
            setSalesInsights((completed || []).map((a: any) => ({ service_name: String(serviceMap.get(a.service_id) || 'Serviço'), client_name: String(clientMap.get(a.client_id) || 'Cliente'), price: Number(a.price || 0), start_time: a.start_time })))
          }
        }

        if (next === 'clientes') {
          // A função SQL usa SECURITY DEFINER com verificação de permissão para ler
          // os dados necessários mesmo quando as políticas RLS ocultam profiles/appointments.
          const { data: rows, error } = await supabase.rpc('admin_client_directory')
          if (error) throw error

          const profileById = new Map<string, any>()
          const visitMap = new Map<string, any[]>()
          for (const row of rows || []) {
            if (!row.client_id) continue
            if (!profileById.has(row.client_id)) {
              profileById.set(row.client_id, {
                id: row.client_id,
                full_name: row.full_name || 'Cliente',
                email: row.email || null,
                phone: row.phone || null,
                created_at: row.created_at || null,
              })
            }
            if (row.appointment_id) {
              const list = visitMap.get(row.client_id) || []
              list.push({
                id: row.appointment_id,
                client_id: row.client_id,
                service_id: row.service_id,
                service_name: row.service_name || 'Serviço',
                start_time: row.start_time,
                price: Number(row.price || 0),
                status: row.status || 'pendente',
                notes: row.notes || null,
              })
              visitMap.set(row.client_id, list)
            }
          }

          setClients([...profileById.values()]
            .map((profile: any) => {
              const history = (visitMap.get(profile.id) || []).sort(
                (a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
              )
              const completed = history.filter((visit: any) => visit.status === 'concluido')
              return {
                ...profile,
                visitHistory: history,
                completedCount: completed.length,
                totalSpent: completed.reduce((sum: number, visit: any) => sum + Number(visit.price || 0), 0),
                lastVisit: completed[0]?.start_time || null,
                nextVisit: history.find((visit: any) => ['pendente', 'confirmado', 'em_atendimento'].includes(visit.status)) || null,
              }
            })
            .sort((a: any, b: any) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR')))
        }

        if (next === 'servicos') {
          const [{ data: serviceRows, error: serviceError }, { data: categoryRows, error: categoryError }, { data: tierRows, error: tierError }] =
            await Promise.all([
              supabase
                .from('services')
                .select('id,name,description,price,duration_minutes,image_path,active,sort_order,category_id,kind')
                .order('sort_order')
                .limit(500),
              supabase.from('service_categories').select('id,name,slug').eq('active', true).order('sort_order').limit(100),
              supabase.from('service_price_tiers').select('id,service_id,label,price,sort_order').order('sort_order').limit(1000),
            ])
          if (serviceError) throw serviceError
          if (categoryError) throw categoryError
          if (tierError) throw tierError
          const tiersByService = new Map<string, PriceTier[]>()
          for (const tier of tierRows || []) {
            const list = tiersByService.get(tier.service_id) || []
            list.push({ id: tier.id, label: tier.label, price: Number(tier.price || 0), sort_order: Number(tier.sort_order || 0) })
            tiersByService.set(tier.service_id, list)
          }
          setServices(((serviceRows || []) as Service[]).map((service) => ({ ...service, price_tiers: service.id ? tiersByService.get(service.id) || [] : [] })))
          setCategories(categoryRows || [])
        }

        if (next === 'financeiro') await loadFinance()

        if (next === 'admins') {
          const { data: roleRows, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id,role,active,created_at')
            .order('created_at')
            .limit(200)
          if (roleError) throw roleError
          const ids = [...new Set((roleRows || []).map((r: any) => r.user_id).filter(Boolean))]
          const { data: profileRows, error: profileError } = ids.length
            ? await supabase.from('profiles').select('id,full_name,email').in('id', ids)
            : ({ data: [], error: null } as any)
          if (profileError) throw profileError
          const profileMap = new Map<string, any>((profileRows || []).map((p: any) => [p.id, p] as [string, any]))
          // A lista principal mostra somente acessos administrativos ativos.
          // Quando o acesso é removido, a conta volta para a lista de usuários comuns/candidatos.
          setAdmins((roleRows || []).filter((r: any) => r.active === true).map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) })))
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('id,full_name,email,phone,created_at')
            .order('full_name')
            .limit(1000)
          if (allProfilesError) throw allProfilesError
          // Contas com papel inativo também podem voltar a receber acesso.
          const activeStaffIds = new Set((roleRows || []).filter((r: any) => r.active === true).map((r: any) => r.user_id))
          setAdminCandidates((allProfiles || []).filter((profile: any) => !activeStaffIds.has(profile.id)))
        }

        if (next === 'config') {
          const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).maybeSingle()
          if (error) throw error
          setSettings(data as Settings | null)
        }
      } catch (error: any) {
        const message = errText(error)
        setLoadError(message)
        onToast(message)
      } finally {
        setLoading(false)
      }
    },
    [loadAppointments, loadFinance, onToast],
  )

  useEffect(() => {
    void loadTab('dashboard')
  }, [loadTab])

  async function addAdministrator(profile: any) {
    if (!profile?.id || addingAdmin) return
    const confirmed = window.confirm(`Conceder acesso administrativo completo para ${profile.full_name || profile.email || 'esta conta'}?`)
    if (!confirmed) return
    setAddingAdmin(true)
    const { error } = await supabase.rpc('grant_admin_access', { target_user_id: profile.id })
    setAddingAdmin(false)
    if (error) {
      onToast(`Não foi possível adicionar administrador: ${errText(error)}. Confira se executou o SQL supabase/grant-admin-access.sql.`)
      return
    }
    onToast('Acesso administrativo concedido.')
    await loadTab('admins')
  }

  async function removeAdministrator(admin: any) {
    if (!admin?.user_id || addingAdmin) return
    const label = admin.profile?.full_name || admin.profile?.email || 'esta conta'
    const confirmed = window.confirm(`Remover o acesso administrativo de ${label}? A conta continuará existindo, mas perderá o acesso ao painel.`)
    if (!confirmed) return
    setAddingAdmin(true)
    const { error } = await supabase.rpc('revoke_admin_access', { target_user_id: admin.user_id })
    setAddingAdmin(false)
    if (error) {
      onToast(`Não foi possível remover o acesso: ${errText(error)}. Confira se executou o SQL supabase/grant-admin-access.sql atualizado.`)
      return
    }
    onToast('Acesso administrativo removido.')
    await loadTab('admins')
  }

  async function toggleService(service: Service) {
    if (!service.id) return
    setLoading(true)
    const { error } = await supabase
      .from('services')
      .update({ active: !service.active, updated_at: new Date().toISOString() })
      .eq('id', service.id)
    setLoading(false)
    if (error) return onToast(errText(error))
    setServices((rows) => rows.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s)))
    onToast(service.active ? 'Serviço retirado do site.' : 'Serviço publicado no site.')
  }

  async function deleteService(service: Service) {
    if (!service.id || loading) return
    const confirmed = window.confirm(
      `Excluir definitivamente o serviço “${service.name}”? Essa ação não pode ser desfeita.`,
    )
    if (!confirmed) return
    setLoading(true)
    const { error } = await supabase.from('services').delete().eq('id', service.id)
    setLoading(false)
    if (error) {
      const isAppointmentLink = error.code === '23503' || String(error.message || '').includes('appointments_service_id_fkey')
      if (isAppointmentLink) {
        const archiveResult = await supabase
          .from('services')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', service.id)
        if (archiveResult.error) {
          onToast(`Não foi possível arquivar “${service.name}”. ${errText(archiveResult.error)}`)
          return
        }
        setServices((rows) => rows.map((row) => (row.id === service.id ? { ...row, active: false } : row)))
        onToast(`“${service.name}” foi arquivado para preservar o histórico de agendamentos.`)
        return
      }
      onToast(`Não foi possível excluir “${service.name}”. ${errText(error)}`)
      return
    }
    setEditingService((current) => (current?.id === service.id ? null : current))
    setServices((rows) => rows.filter((row) => row.id !== service.id))
    onToast('Serviço excluído.')
  }

  async function uploadServicePhoto(file: File) {
    if (!editingService) return
    if (!file.type.startsWith('image/')) return onToast('Selecione um arquivo de imagem válido.')
    if (file.size > 10 * 1024 * 1024) return onToast('A foto deve ter no máximo 10 MB.')
    setLoading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
    const path = `${user.id}/${editingService.id || 'novo'}-${Date.now()}-${safeName}`
    const result = await supabase.storage.from('services').upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    })
    if (result.error) {
      setLoading(false)
      onToast(errText(result.error))
      return
    }
    const url = supabase.storage.from('services').getPublicUrl(path).data.publicUrl
    setEditingService({ ...editingService, image_path: url })
    setLoading(false)
    onToast('Foto enviada. Clique em salvar para atualizar o serviço.')
  }

  async function saveService() {
    if (!editingService?.name.trim()) return onToast('Informe o nome do serviço.')
    if (!editingService.category_id && !categories[0]?.id) return onToast('Cadastre uma categoria ativa antes de criar serviços.')
    const payload = {
      name: editingService.name.trim(),
      description: editingService.description.trim() || null,
      price: Number(editingService.price),
      duration_minutes: Number(editingService.duration_minutes),
      image_path: editingService.image_path || null,
      active: editingService.active,
      sort_order: Number(editingService.sort_order) || 0,
      category_id: editingService.category_id || categories[0].id,
      kind: editingService.kind || 'procedimento',
      updated_at: new Date().toISOString(),
    }
    if (payload.price < 0 || payload.duration_minutes < 5) return onToast('Confira o preço e a duração do serviço.')
    setLoading(true)
    const result = editingService.id
      ? await supabase.from('services').update(payload).eq('id', editingService.id)
      : await supabase.from('services').insert(payload)
    setLoading(false)
    if (result.error) return onToast(errText(result.error))
    onToast(editingService.id ? 'Serviço atualizado.' : 'Serviço cadastrado.')
    setEditingService(null)
    await loadTab('servicos')
  }

  async function updateAppointment(id: string, status: string) {
    const appointment = appointments.find((a) => a.id === id)
    if (!appointment) return onToast('Não encontrei esse agendamento. Atualize a tela e tente novamente.')

    if (status === 'confirmado' && appointment.status === 'pendente') {
      const confirmAvailability = window.confirm(
        `Você confirma que consegue atender ${appointment.client_name || 'a cliente'} em ${new Date(appointment.start_time).toLocaleString('pt-BR')}? A cliente verá a confirmação na área dela.`
      )
      if (!confirmAvailability) return
    }
    if (status === 'concluido' && appointment.status !== 'concluido') {
      if (appointment.status !== 'confirmado' && appointment.status !== 'em_atendimento') {
        return onToast('Primeiro confirme que consegue receber a cliente nesse horário.')
      }
      const confirmFinish = window.confirm(
        `Confirmar que o serviço de ${appointment.client_name || 'a cliente'} foi realizado? O valor de ${money(Number(appointment.price))} será registrado no Financeiro.`
      )
      if (!confirmFinish) return
    }

    setLoading(true)
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setLoading(false)
      return onToast(errText(error))
    }

    if (status === 'concluido') {
      // Idempotência no fluxo da interface: reutiliza qualquer lançamento já vinculado ao atendimento.
      const { data: existing, error: findError } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('appointment_id', id)
        .eq('type', 'receita')
        .limit(1)
        .maybeSingle()

      if (findError) {
        setLoading(false)
        setAppointments((rows) => rows.map((a) => (a.id === id ? { ...a, status } : a)))
        return onToast(`Atendimento concluído, mas não consegui verificar o Financeiro: ${errText(findError)}`)
      }

      const financePayload = {
        description: `${appointment.service_name || 'Serviço'} — ${appointment.client_name || 'Cliente'}`,
        amount: Number(appointment.price),
        type: 'receita' as const,
        status: 'pago' as const,
        payment_method: 'outro',
        occurred_on: appointment.start_time.slice(0, 10),
        category: 'Serviços',
        notes: `Venda de serviço: ${appointment.service_name || 'Serviço'}\nCliente: ${appointment.client_name || 'Cliente'}\nTelefone: ${appointment.client_phone || 'Não informado'}\nE-mail: ${appointment.client_email || 'Não informado'}\nAgendamento: ${id}`,
        appointment_id: id,
      }
      const financeResult = existing
        ? await supabase.from('financial_transactions').update(financePayload).eq('id', existing.id)
        : await supabase.from('financial_transactions').insert({ ...financePayload, created_by: user?.id || null })
      if (financeResult.error) {
        setLoading(false)
        setAppointments((rows) => rows.map((a) => (a.id === id ? { ...a, status } : a)))
        return onToast(`Atendimento concluído, mas houve erro ao lançar no Financeiro: ${errText(financeResult.error)}`)
      }
    }

    setLoading(false)
    setAppointments((rows) => rows.map((a) => (a.id === id ? { ...a, status } : a)))
    onToast(status === 'concluido' ? 'Atendimento concluído e valor lançado no Financeiro.' : 'Agendamento atualizado.')
    if (status === 'concluido') await loadFinance()
  }

  function editTransaction(transaction?: Transaction, type: 'receita' | 'despesa' = 'receita') {
    setEditingTransaction(transaction ? { ...transaction } : { ...blankTransaction(), type, category: type === 'despesa' ? 'Despesas operacionais' : 'Outros recebimentos' })
  }

  async function saveTransaction() {
    const t = editingTransaction
    if (!t?.description.trim()) return onToast('Informe a descrição do lançamento.')
    if (!(Number(t.amount) > 0)) return onToast('O valor precisa ser maior que zero.')
    if (!t.occurred_on) return onToast('Informe a data do lançamento.')
    const payload = {
      description: t.description.trim(),
      amount: Number(t.amount),
      type: t.type,
      status: t.status,
      payment_method: normalizePaymentMethod(t.payment_method),
      occurred_on: t.occurred_on,
      category: t.category.trim() || null,
      notes: t.notes.trim() || null,
      appointment_id: t.appointment_id || null,
      updated_at: new Date().toISOString(),
      ...(!t.id ? { created_by: user?.id || null } : {}),
    }
    setLoading(true)
    const result = t.id
      ? await supabase.from('financial_transactions').update(payload).eq('id', t.id)
      : await supabase.from('financial_transactions').insert(payload)
    setLoading(false)
    if (result.error) return onToast(errText(result.error))
    onToast(t.id ? 'Lançamento atualizado.' : 'Lançamento cadastrado.')
    setEditingTransaction(null)
    await loadTab('financeiro')
  }

  async function deleteTransaction(t: Transaction) {
    if (!t.id || !window.confirm(`Excluir o lançamento "${t.description}"? Esta ação não pode ser desfeita.`)) return
    setLoading(true)
    const { error } = await supabase.from('financial_transactions').delete().eq('id', t.id)
    setLoading(false)
    if (error) return onToast(errText(error))
    setTransactions((rows) => rows.filter((row) => row.id !== t.id))
    onToast('Lançamento excluído.')
  }

  async function saveSettings() {
    if (!settings) return
    if (!settings.business_name.trim()) return onToast('Informe o nome do negócio.')
    setSettingsSaving(true)
    const payload = {
      business_name: settings.business_name.trim(),
      phone: settings.phone || null,
      whatsapp: settings.whatsapp || null,
      instagram: settings.instagram || null,
      address: settings.address || null,
      description: settings.description || null,
      timezone: settings.timezone || 'America/Sao_Paulo',
      slot_interval_minutes: Number(settings.slot_interval_minutes),
      min_notice_hours: Number(settings.min_notice_hours),
      max_advance_days: Number(settings.max_advance_days),
      cancel_limit_hours: Number(settings.cancel_limit_hours),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('business_settings').update(payload).eq('id', settings.id)
    setSettingsSaving(false)
    if (error) return onToast(errText(error))
    onToast('Configurações salvas.')
  }

  const clientNow = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const clientCounts = {
    all: clients.length,
    attended: clients.filter((c) => Number(c.completedCount || 0) > 0).length,
    notAttended: clients.filter((c) => Number(c.completedCount || 0) === 0).length,
    scheduled: clients.filter((c) => Boolean(c.nextVisit)).length,
    newClients: clients.filter((c) => c.created_at && clientNow - new Date(c.created_at).getTime() <= 30 * dayMs).length,
    notReturned: clients.filter((c) => Number(c.completedCount || 0) > 0 && c.lastVisit && clientNow - new Date(c.lastVisit).getTime() >= 60 * dayMs && !c.nextVisit).length,
  }
  const clientRevenue = clients.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0)
  const clientCompletedCount = clients.reduce((sum, c) => sum + Number(c.completedCount || 0), 0)
  const clientTicket = clientCompletedCount ? clientRevenue / clientCompletedCount : 0
  const filteredClients = clients
    .filter((c) => !search || [c.full_name, c.email, c.phone].join(' ').toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      if (clientFilter === 'atendidos') return Number(c.completedCount || 0) > 0
      if (clientFilter === 'nao-atendidos') return Number(c.completedCount || 0) === 0
      if (clientFilter === 'agendados') return Boolean(c.nextVisit)
      if (clientFilter === 'novos') return Boolean(c.created_at && clientNow - new Date(c.created_at).getTime() <= 30 * dayMs)
      if (clientFilter === 'sem-voltar') return Number(c.completedCount || 0) > 0 && Boolean(c.lastVisit && clientNow - new Date(c.lastVisit).getTime() >= 60 * dayMs) && !c.nextVisit
      return true
    })
    .sort((a, b) => {
      if (clientSort === 'cadastro') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      if (clientSort === 'gasto') return Number(b.totalSpent || 0) - Number(a.totalSpent || 0)
      if (clientSort === 'atendimentos') return Number(b.completedCount || 0) - Number(a.completedCount || 0)
      if (clientSort === 'ultimo') return new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime()
      return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR')
    })
  const financeCategories = [...new Set(transactions.map((t) => t.category || (t.appointment_id ? 'Serviços' : 'Sem categoria')).filter(Boolean))].sort()
  const visibleTransactions = transactions.filter((t) => {
    if (financeFilter === 'todos') return true
    if (financeFilter === 'pendente') return t.status === 'pendente'
    if (financeFilter === 'receita' || financeFilter === 'despesa') return t.type === financeFilter
    return (t.category || (t.appointment_id ? 'Serviços' : 'Sem categoria')) === financeFilter
  })
  const revenue = transactions
    .filter((t) => t.type === 'receita' && t.status === 'pago')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const pending = transactions
    .filter((t) => t.status === 'pendente')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const expenses = transactions
    .filter((t) => t.type === 'despesa' && t.status !== 'cancelado')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const updateTransactionField = (field: keyof Transaction, value: any) =>
    setEditingTransaction((current) => current ? { ...current, [field]: value } : current)
  const updateSetting = (field: keyof Settings, value: any) =>
    setSettings((current) => current ? { ...current, [field]: value } : current)

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img className="brand-logo" src="/assets/brand/gabrielly-borges-logo.png" alt="Gabrielly Borges Beauty" />
          <div><strong>GB BEAUTY</strong><small>ADMIN STUDIO</small></div>
        </div>
        <div className="admin-tree">
          <span>GESTÃO</span>
          {items.map(([key, label, icon]) => (
            <button className={tab === key ? 'admin-nav active' : 'admin-nav'} key={key} onClick={() => void loadTab(key)}>
              {icon}<span className="admin-nav-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="admin-sidebar-bottom">
          <button className="logout" onClick={onLogout}><LogOut size={14} /> SAIR</button>
        </div>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <button className="back-link desktop-public-back" onClick={onBack}>← SITE PÚBLICO</button>
          <button className="back-link mobile-dashboard-back" onClick={onBack}>← VOLTAR AO SITE</button>
          <div className="topbar-right">
            {canInstall && (
              <button className="install-app" onClick={async () => {
                const result = await install()
                if (result === 'ios') onToast('No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.')
              }}><Smartphone size={14} /> INSTALAR APP</button>
            )}
            <button className="logout topbar-logout" onClick={onLogout}><LogOut size={14} /> SAIR</button>
            <span>GB BEAUTY / {items.find((x) => x[0] === tab)?.[1].toUpperCase()}</span>
          </div>
        </div>

        <div className="admin-heading">
          <div>
            <div className="section-kicker">PAINEL ADMINISTRATIVO</div>
            <h1>{items.find((x) => x[0] === tab)?.[1]}<em>.</em></h1>
            <p>Dados sincronizados com Supabase.</p>
          </div>
          {tab === 'servicos' && <button className="button button-dark" onClick={() => setEditingService({ ...blankService, sort_order: services.length })}><Plus size={16} /> ADICIONAR SERVIÇO</button>}
          {tab === 'financeiro' && <div className="finance-header-actions"><button className="toggle" onClick={() => editTransaction(undefined, 'receita')}><Plus size={14} /> OUTRA RECEITA</button><button className="button button-dark" onClick={() => editTransaction(undefined, 'despesa')}><Plus size={16} /> ADICIONAR DESPESA</button></div>}
        </div>

        {loadError && <div className="module-note" role="alert">Erro ao carregar: {loadError}</div>}
        {loading && <p className="module-note">Carregando dados…</p>}

        {tab === 'dashboard' && <><Stats stats={stats} /><Insights sales={salesInsights} /><Agenda appointments={appointments} onStatus={updateAppointment} /></>}

        {tab === 'agendamentos' && <Agenda appointments={appointments} onStatus={updateAppointment} />}

        {tab === 'clientes' && (
          <Card title="CLIENTES" icon={<Users size={18} />}>
            <div className="client-overview-stats client-overview-stats-rich">
              <div><strong>{clients.length}</strong><span>CLIENTES CADASTRADOS</span></div>
              <div><strong>{clientCounts.attended}</strong><span>CLIENTES ATENDIDOS</span></div>
              <div><strong>{clientCompletedCount}</strong><span>ATENDIMENTOS CONCLUÍDOS</span></div>
              <div className="client-revenue-stat"><strong>{money(clientRevenue)}</strong><span>FATURAMENTO · TICKET MÉDIO {money(clientTicket)}</span></div>
            </div>
            <div className="client-filter-chips" aria-label="Filtrar clientes">
              <button className={clientFilter === 'todos' ? 'active' : ''} onClick={() => setClientFilter('todos')}>Todos <b>{clientCounts.all}</b></button>
              <button className={clientFilter === 'atendidos' ? 'active' : ''} onClick={() => setClientFilter('atendidos')}>Já atendidos <b>{clientCounts.attended}</b></button>
              <button className={clientFilter === 'nao-atendidos' ? 'active' : ''} onClick={() => setClientFilter('nao-atendidos')}>Ainda não atendidos <b>{clientCounts.notAttended}</b></button>
              <button className={clientFilter === 'agendados' ? 'active' : ''} onClick={() => setClientFilter('agendados')}>Com agendamento <b>{clientCounts.scheduled}</b></button>
              <button className={clientFilter === 'novos' ? 'active' : ''} onClick={() => setClientFilter('novos')}>Novos (30 dias) <b>{clientCounts.newClients}</b></button>
              <button className={clientFilter === 'sem-voltar' ? 'active' : ''} onClick={() => setClientFilter('sem-voltar')}>Sem voltar (60+ dias) <b>{clientCounts.notReturned}</b></button>
            </div>
            <div className="client-list-toolbar">
              <input className="admin-search" placeholder="Buscar cliente por nome, e-mail ou telefone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <label>ORDENAR POR<select value={clientSort} onChange={(e) => setClientSort(e.target.value as typeof clientSort)}><option value="nome">Nome (A–Z)</option><option value="cadastro">Cadastro mais recente</option><option value="gasto">Maior valor gasto</option><option value="atendimentos">Mais atendimentos</option><option value="ultimo">Último atendimento</option></select></label>
            </div>
            <p className="client-result-count">{filteredClients.length} de {clients.length} cliente(s)</p>
            {filteredClients.length ? (
              <div className="client-directory">
                {filteredClients.map((c) => {
                  const phoneDigits = String(c.phone || '').replace(/\D/g, '')
                  const whatsapp = phoneDigits ? (phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`) : ''
                  const attended = Number(c.completedCount || 0) > 0
                  const averageTicket = Number(c.completedCount || 0) ? Number(c.totalSpent || 0) / Number(c.completedCount || 0) : 0
                  return <article className="client-directory-card" key={c.id}>
                    <div className="client-directory-head">
                      <div className="client-heading-main"><h3>{c.full_name || 'Sem nome'}</h3><p>{c.email || 'Sem e-mail'} · {c.phone || 'Sem telefone'}</p>
                        <div className="client-tags"><span className={attended ? 'client-tag is-positive' : 'client-tag'}>{attended ? 'Recorrente' : 'Ainda não atendida'}</span>{c.nextVisit && <span className="client-tag is-scheduled">Agendada</span>}</div>
                      </div>
                      <div className="client-head-actions">{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WHATSAPP</a>}{c.email && <a href={`mailto:${c.email}`}>E-MAIL</a>}</div>
                      <span className="client-joined">Cadastro {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    <div className="client-metrics client-metrics-rich">
                      <div><span>ATENDIMENTOS</span><strong>{c.completedCount || 0}</strong></div>
                      <div><span>TOTAL GASTO</span><strong>{money(Number(c.totalSpent || 0))}</strong></div>
                      <div><span>TICKET MÉDIO</span><strong>{money(averageTicket)}</strong></div>
                      <div><span>ÚLTIMO ATENDIMENTO</span><strong>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('pt-BR') : 'Ainda não atendida'}</strong></div>
                    </div>
                    {c.nextVisit && <p className="client-next-visit">Próximo agendamento: <strong>{c.nextVisit.service_name}</strong> · {new Date(c.nextVisit.start_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                    <details className="client-history-details">
                      <summary>Ver histórico de atendimentos ({(c.visitHistory || []).length})</summary>
                      {(c.visitHistory || []).length ? (
                        <div className="client-history-list">
                          {c.visitHistory.map((visit: any) => (
                            <div className="client-history-item" key={visit.id}>
                              <div><strong>{visit.service_name}</strong><span>{new Date(visit.start_time).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</span>{visit.notes && <small>Observação: {visit.notes}</small>}</div>
                              <div className="client-history-value"><strong>{money(Number(visit.price || 0))}</strong><span className={`client-visit-status status-${visit.status}`}>{statusLabels[visit.status] || visit.status}</span></div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="client-history-empty">Este cliente ainda não tem agendamentos registrados.</p>}
                    </details>
                  </article>
                })}
              </div>
            ) : <Empty text="Nenhum cliente corresponde a este filtro." />}
          </Card>
        )}

        {tab === 'servicos' && (
          <ServicesCard
            services={services}
            editing={editingService}
            setEditing={setEditingService}
            categories={categories}
            onToggle={toggleService}
            onDelete={deleteService}
            onUpload={uploadServicePhoto}
            onSave={saveService}
            loading={loading}
          />
        )}

        {tab === 'financeiro' && (
          <Card title="FINANCEIRO" icon={<WalletCards size={18} />}>
            <div className="finance-period-toolbar">
              <label>Ver período<select value={financePeriod} onChange={(e) => setFinancePeriod(e.target.value as typeof financePeriod)}><option value="today">Hoje</option><option value="month">Este mês</option><option value="all">Tudo</option></select></label>
            </div>
            <div className="finance-summary finance-summary-compact">
              <span>RECEITAS PAGAS<strong>{money(transactions.filter((t) => t.type === 'receita' && t.status === 'pago' && (financePeriod === 'all' || (financePeriod === 'today' ? t.occurred_on === todayLocal() : t.occurred_on.slice(0, 7) === todayLocal().slice(0, 7)))).reduce((sum, t) => sum + Number(t.amount || 0), 0))}</strong></span>
              <span>A RECEBER<strong>{money(transactions.filter((t) => t.type === 'receita' && t.status === 'pendente').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</strong></span>
              <span>SALDO GERAL<strong>{money(revenue - expenses)}</strong></span>
            </div>
            {editingTransaction && (
              <div className="service-editor">
                <div className="editor-heading">
                  <strong>{editingTransaction.id ? 'Editar lançamento' : 'Novo lançamento'}</strong>
                  <button className="logout" onClick={() => setEditingTransaction(null)}><X size={14} /> FECHAR</button>
                </div>
                <div className="editor-grid">
                  <label>Descrição<input value={editingTransaction.description} onChange={(e) => updateTransactionField('description', e.target.value)} placeholder="Ex.: Atendimento, produto, aluguel…" /></label>
                  <label>Valor (R$)<input type="number" min="0.01" step="0.01" value={editingTransaction.amount} onChange={(e) => updateTransactionField('amount', Number(e.target.value))} /></label>
                  <label>Tipo<select value={editingTransaction.type} onChange={(e) => updateTransactionField('type', e.target.value)}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
                  <label>Status<select value={editingTransaction.status} onChange={(e) => updateTransactionField('status', e.target.value)}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option></select></label>
                  <label>Data<input type="date" value={editingTransaction.occurred_on} onChange={(e) => updateTransactionField('occurred_on', e.target.value)} /></label>
                  <label>Pagamento<select value={normalizePaymentMethod(editingTransaction.payment_method) || ''} onChange={(e) => updateTransactionField('payment_method', e.target.value)}>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                  <label>Categoria<select value={editingTransaction.category} onChange={(e) => updateTransactionField('category', e.target.value)}>{(editingTransaction.type === 'despesa' ? ['Despesas operacionais', 'Aluguel', 'Materiais e produtos', 'Marketing', 'Equipamentos', 'Taxas', 'Salários', 'Outras despesas'] : ['Serviços', 'Produtos', 'Outros recebimentos']).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                </div>
                <label>Observações<textarea value={editingTransaction.notes} onChange={(e) => updateTransactionField('notes', e.target.value)} /></label>
                <button className="button button-dark" disabled={loading} onClick={() => void saveTransaction()}><Save size={15} /> SALVAR LANÇAMENTO</button>
              </div>
            )}
            <div className="finance-toolbar">
              <select className="inline-status" value={financeFilter} onChange={(e) => setFinanceFilter(e.target.value as typeof financeFilter)}>
                <option value="todos">Todas as categorias</option><option value="receita">Todas as receitas</option><option value="despesa">Despesas</option><option value="pendente">Pendentes</option>{financeCategories.map((category) => <option key={category} value={category}>Categoria: {category}</option>)}
              </select>
              <button className="toggle" onClick={() => void loadTab('financeiro')}><RefreshCw size={13} /> ATUALIZAR</button>
            </div>
            {visibleTransactions.length ? visibleTransactions.map((t) => (
              <Row
                key={t.id}
                title={t.description}
                sub={`${t.type === 'receita' ? 'Receita' : 'Despesa'} · ${t.category || (t.appointment_id ? 'Serviços' : 'Sem categoria')} · ${t.status} · ${t.occurred_on}${t.client_name ? ` · Cliente: ${t.client_name}` : ''}${t.service_name ? ` · Serviço: ${t.service_name}` : ''}${t.client_phone ? ` · ${t.client_phone}` : ''}${t.client_email ? ` · ${t.client_email}` : ''}${t.payment_method ? ` · ${t.payment_method}` : ''}`}
                right={<div className="service-admin-actions"><strong>{money(Number(t.amount))}</strong><button className="toggle" aria-label="Editar lançamento" onClick={() => editTransaction(t)}><Pencil size={13} /> EDITAR</button><button className="toggle" aria-label="Excluir lançamento" onClick={() => void deleteTransaction(t)}><Trash2 size={13} /> EXCLUIR</button></div>}
              />
            )) : <Empty text="Nenhum lançamento para este filtro." />}
          </Card>
        )}

        {tab === 'admins' && (
          <>
            <Card title="ADMINISTRADORES" icon={<ShieldCheck size={18} />}>
              <p className="module-note">Contas com acesso ao painel administrativo. Só um Super Admin autorizado pode conceder novos acessos; a validação também é feita no Supabase.</p>
              {admins.length ? admins.map((a) => (
                <Row
                  key={a.user_id}
                  title={a.profile?.full_name || a.profile?.email || 'Usuário'}
                  sub={a.profile?.email || a.user_id}
                  right={<div className="service-admin-actions admin-role-actions"><span className="status admin-role-badge">{String(a.role).replace(/_/g, ' ')}</span><button className="toggle admin-remove-icon" type="button" title="Remover acesso administrativo" aria-label={`Remover acesso administrativo de ${a.profile?.full_name || a.profile?.email || 'usuário'}`} disabled={addingAdmin} onClick={() => void removeAdministrator(a)}><Trash2 size={15} /></button></div>}
                />
              )) : <Empty text="Nenhum administrador encontrado ou você não tem permissão para visualizar." />}
            </Card>
            <Card title="ADICIONAR ADMINISTRADOR" icon={<Plus size={18} />}>
              <p className="module-note">Selecione uma conta já cadastrada no site. Ela passará a ter acesso ao painel administrativo após a autorização do Supabase. Se a conta ainda não aparece, a pessoa precisa criar o login e entrar no site ao menos uma vez.</p>
              <input className="admin-search" placeholder="Buscar conta por nome ou e-mail…" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} />
              <div className="admin-candidate-list">
                {adminCandidates.filter((profile) => `${profile.full_name || ''} ${profile.email || ''}`.toLowerCase().includes(adminSearch.toLowerCase())).map((profile) => (
                  <Row key={profile.id} title={profile.full_name || 'Conta sem nome'} sub={`${profile.email || 'E-mail não informado'}${profile.phone ? ` · ${profile.phone}` : ''}`} right={<button className="toggle" disabled={addingAdmin} onClick={() => void addAdministrator(profile)}><Plus size={13} /> DAR ACESSO ADMIN</button>} />
                ))}
                {!adminCandidates.length && <Empty text="Todas as contas listadas já têm um papel ou ainda não há contas cadastradas." />}
                {adminCandidates.length > 0 && !adminCandidates.some((profile) => `${profile.full_name || ''} ${profile.email || ''}`.toLowerCase().includes(adminSearch.toLowerCase())) && <Empty text="Nenhuma conta encontrada para essa busca." />}
              </div>
            </Card>
          </>
        )}

        {tab === 'config' && (
          <Card title="CONFIGURAÇÕES DO NEGÓCIO" icon={<Settings size={18} />}>
            {settings ? (
              <div className="service-editor">
                <div className="editor-grid">
                  <label>Nome do negócio<input value={settings.business_name || ''} onChange={(e) => updateSetting('business_name', e.target.value)} /></label>
                  <label>Telefone<input value={settings.phone || ''} onChange={(e) => updateSetting('phone', e.target.value)} /></label>
                  <label>WhatsApp<input value={settings.whatsapp || ''} onChange={(e) => updateSetting('whatsapp', e.target.value)} /></label>
                  <label>Instagram<input value={settings.instagram || ''} onChange={(e) => updateSetting('instagram', e.target.value)} /></label>
                  <label>Fuso horário<input value={settings.timezone || ''} onChange={(e) => updateSetting('timezone', e.target.value)} /></label>
                  <label>Intervalo entre horários (min)<input type="number" min="5" value={settings.slot_interval_minutes} onChange={(e) => updateSetting('slot_interval_minutes', Number(e.target.value))} /></label>
                  <label>Antecedência mínima (horas)<input type="number" min="0" value={settings.min_notice_hours} onChange={(e) => updateSetting('min_notice_hours', Number(e.target.value))} /></label>
                  <label>Agendamento máximo (dias)<input type="number" min="1" value={settings.max_advance_days} onChange={(e) => updateSetting('max_advance_days', Number(e.target.value))} /></label>
                  <label>Limite para cancelar (horas)<input type="number" min="0" value={settings.cancel_limit_hours} onChange={(e) => updateSetting('cancel_limit_hours', Number(e.target.value))} /></label>
                  <label>Endereço<input value={settings.address || ''} onChange={(e) => updateSetting('address', e.target.value)} /></label>
                </div>
                <label>Descrição<textarea value={settings.description || ''} onChange={(e) => updateSetting('description', e.target.value)} /></label>
                <button className="button button-dark" disabled={settingsSaving} onClick={() => void saveSettings()}><Save size={15} /> {settingsSaving ? 'SALVANDO…' : 'SALVAR CONFIGURAÇÕES'}</button>
              </div>
            ) : <Empty text="Configurações não encontradas ou sem permissão de leitura." />}
          </Card>
        )}
      </section>
    </main>
  )
}

function Stats({ stats }: { stats: { clients: number; today: number; revenue: number; pending: number; expenses: number; todayRevenue: number; monthRevenue: number } }) {
  return (
    <div className="stat-grid">
      <div><span>CLIENTES</span><strong>{stats.clients}</strong><small>perfis cadastrados</small></div>
      <div><span>HOJE</span><strong>{stats.today}</strong><small>agendamentos</small></div>
      <div><span>RECEBIDO</span><strong>{money(stats.revenue)}</strong><small>receitas pagas</small></div>
      <div><span>PENDENTE</span><strong>{money(stats.pending)}</strong><small>a receber</small></div>
      <div><span>FATURADO HOJE</span><strong>{money(stats.todayRevenue)}</strong><small>receitas pagas no dia</small></div>
      <div><span>FATURADO NO MÊS</span><strong>{money(stats.monthRevenue)}</strong><small>receitas pagas no mês</small></div>
    </div>
  )
}

function Insights({ sales }: { sales: SaleInsight[] }) {
  const serviceStats = new Map<string, { count: number; revenue: number }>()
  const clientStats = new Map<string, { count: number; spend: number }>()
  for (const sale of sales) {
    const service = serviceStats.get(sale.service_name) || { count: 0, revenue: 0 }
    service.count += 1; service.revenue += sale.price; serviceStats.set(sale.service_name, service)
    const client = clientStats.get(sale.client_name) || { count: 0, spend: 0 }
    client.count += 1; client.spend += sale.price; clientStats.set(sale.client_name, client)
  }
  const topServices = [...serviceStats.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5)
  const topClients = [...clientStats.entries()].sort((a, b) => b[1].spend - a[1].spend).slice(0, 5)
  return <div className="insights-grid">
    <Card title="SERVIÇOS MAIS VENDIDOS" icon={<Sparkles size={18} />}>
      {topServices.length ? topServices.map(([name, data], i) => <Row key={name} title={`${i + 1}. ${name}`} sub={`${data.count} atendimento(s) concluído(s) · ${money(data.revenue)} em vendas`} right={<strong>{data.count}</strong>} />) : <Empty text="Ainda não há atendimentos concluídos para montar o ranking." />}
    </Card>
    <Card title="CLIENTES EM DESTAQUE" icon={<Users size={18} />}>
      {topClients.length ? topClients.map(([name, data], i) => <Row key={name} title={`${i + 1}. ${name}`} sub={`${data.count} atendimento(s) concluído(s) · ${money(data.spend)} em serviços`} right={<strong>{money(data.spend)}</strong>} />) : <Empty text="O ranking aparecerá após os primeiros atendimentos concluídos." />}
    </Card>
  </div>
}

function Agenda({ appointments, onStatus }: { appointments: Appointment[]; onStatus: (id: string, status: string) => void }) {
  return (
    <Card title="PRÓXIMOS AGENDAMENTOS" icon={<CalendarDays size={18} />}>
      <p className="module-note">Confira os dados da cliente e confirme quando o atendimento for concluído. O valor será enviado ao Financeiro automaticamente.</p>
      {appointments.length ? appointments.map((a) => (
        <div className="appointment-line" key={a.id}>
          <div className="appointment-details">
            <strong>{new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {a.client_name || 'Cliente'}</strong>
            <span>{a.service_name || 'Serviço'} · {money(Number(a.price))} · {new Date(a.start_time).toLocaleDateString('pt-BR')}</span>
            {a.client_phone && <span>Telefone: {a.client_phone}</span>}
            {a.client_email && <span>E-mail: {a.client_email}</span>}
            {a.notes && <span>Observações: {a.notes}</span>}
          </div>
          <div className="appointment-actions">
            {a.status === 'pendente' && <button className="toggle active" type="button" onClick={() => onStatus(a.id, 'confirmado')}>Confirmar disponibilidade</button>}
            {(a.status === 'confirmado' || a.status === 'em_atendimento') && <button className="button button-dark" type="button" onClick={() => onStatus(a.id, 'concluido')}>Confirmar serviço realizado</button>}
            {a.status !== 'concluido' && a.status !== 'cancelado' && a.status !== 'nao_compareceu' && <select aria-label="Outras opções do agendamento" className="inline-status" value={a.status} onChange={(e) => onStatus(a.id, e.target.value)}><option value={a.status}>{statusLabels[a.status] || a.status}</option><option value="cancelado">Cancelar agendamento</option><option value="nao_compareceu">Cliente não compareceu</option></select>}
            {a.status === 'concluido' && <span className="appointment-finished">Serviço concluído · lançado no Financeiro</span>}
          </div>
        </div>
      )) : <Empty text="Nenhum agendamento encontrado para hoje." />}
    </Card>
  )
}

function ServicesCard({
  services,
  editing,
  setEditing,
  categories,
  onToggle,
  onDelete,
  onUpload,
  onSave,
  loading,
}: {
  services: Service[]
  editing: Service | null
  setEditing: (service: Service | null) => void
  categories: any[]
  onToggle: (service: Service) => void
  onDelete: (service: Service) => void
  onUpload: (file: File) => void
  onSave: () => void
  loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const change = (field: keyof Service, value: any) =>
    setEditing(editing ? { ...editing, [field]: value } : null)
  const visible = services.filter((s, i) => {
    const matches = s.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
    const statusMatches = filter === 'todos' || (filter === 'ativos' ? s.active : !s.active)
    return matches && statusMatches
  })
  const activeCount = services.filter((s) => s.active).length
  return (
    <Card title="CATÁLOGO DE SERVIÇOS" icon={<Sparkles size={18} />}>
      <div className="services-quick-stats">
        <div><strong>{services.length}</strong><span>CADASTRADOS</span></div>
        <div><strong>{activeCount}</strong><span>NO SITE</span></div>
        <div><strong>{services.length - activeCount}</strong><span>INATIVOS</span></div>
      </div>
      <div className="services-list-toolbar">
        <input aria-label="Buscar serviço" placeholder="Buscar serviço…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Filtrar serviços" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="todos">Todos</option><option value="ativos">No site</option><option value="inativos">Inativos</option>
        </select>
      </div>
      {editing && (
        <div className="service-editor">
          <div className="editor-heading"><strong>{editing.id ? 'Editar serviço' : 'Novo serviço'}</strong><button className="logout" onClick={() => setEditing(null)}><X size={14} /> FECHAR</button></div>
          <div className="editor-grid">
            <label>Nome<input value={editing.name} onChange={(e) => change('name', e.target.value)} /></label>
            <label>Preço (R$)<input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => change('price', Number(e.target.value))} /></label>
            <label>Duração (minutos)<input type="number" min="5" value={editing.duration_minutes} onChange={(e) => change('duration_minutes', Number(e.target.value))} /></label>
            <label>Categoria<select value={editing.category_id || ''} onChange={(e) => change('category_id', e.target.value)}><option value="">Selecione</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Tipo<select value={editing.kind} onChange={(e) => change('kind', e.target.value as ServiceKind)}><option value="procedimento">Procedimento</option><option value="manutencao">Manutenção</option></select></label>
            <label>Ordem de exibição<input type="number" min="0" value={editing.sort_order} onChange={(e) => change('sort_order', Number(e.target.value))} /></label>
          </div>
          <label>Descrição<textarea value={editing.description || ''} onChange={(e) => change('description', e.target.value)} /></label>
          <div className="service-photo-control">
            <img src={serviceImage(editing, Math.max(0, services.findIndex((s) => s.id === editing.id)))} alt={`Foto de ${editing.name || 'serviço'}`} />
            <label className="button button-light">TROCAR FOTO<input type="file" accept="image/*" hidden onClick={(e) => { e.currentTarget.value = '' }} onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && onUpload(e.target.files[0])} /></label>
          </div>
          <label className="module-note"><input type="checkbox" checked={editing.active} onChange={(e) => change('active', e.target.checked)} /> Serviço ativo no site</label>
          <button className="button button-dark" disabled={loading} onClick={onSave}><Save size={15} /> SALVAR SERVIÇO</button>
        </div>
      )}
      {visible.length ? <div className="services-admin-grid">{visible.map((s) => (
        <article className="services-admin-card" key={s.id}>
          <div className="services-admin-card-photo"><img src={serviceImage(s, services.findIndex((item) => item.id === s.id))} alt={s.name} loading="lazy" /><span className={s.active ? 'services-live-pill' : 'services-off-pill'}>{s.active ? 'NO SITE' : 'INATIVO'}</span></div>
          <div className="services-admin-card-body">
            <strong>{s.name}</strong>
            <div className="services-admin-meta"><b>{money(Number(s.price))}</b><span>{s.duration_minutes} min</span></div>
            {s.price_tiers?.length ? <div className="services-admin-tiers">{s.price_tiers.map((tier) => <span key={tier.id || `${s.id}-${tier.label}`}><em>{tier.label}</em>{money(Number(tier.price))}</span>)}</div> : null}
            <small>{s.kind === 'manutencao' ? 'Manutenção' : 'Procedimento'}</small>
            <div className="services-admin-card-actions">
              <button className="toggle" onClick={() => setEditing({ ...s })}><Pencil size={13} /> EDITAR</button>
              <button className={s.active ? 'toggle active' : 'toggle'} onClick={() => onToggle(s)}>{s.active ? 'OCULTAR' : 'PUBLICAR'}</button>
              <button className="toggle service-delete-button" disabled={loading} onClick={() => onDelete(s)}><Trash2 size={13} /> EXCLUIR</button>
            </div>
          </div>
        </article>
      ))}</div> : <Empty text="Nenhum serviço encontrado para esse filtro." />}
    </Card>
  )
}

function Card({ title, icon, children }: { title: string; icon: any; children: any }) {
  return <section className="admin-card"><div className="card-title">{icon}<span>{title}</span></div>{children}</section>
}
function Row({ title, sub, right }: { title: string; sub: string; right?: any }) {
  return <div className="admin-table-row"><div><strong>{title}</strong><span>{sub}</span></div>{right}</div>
}
function Empty({ text }: { text: string }) {
  return <div className="empty-dashboard"><p>{text}</p></div>
}
