import { createClient } from '@supabase/supabase-js'

/**
 * "Permanecer conectado": a sessão fica em localStorage (continua depois de fechar o navegador/app)
 * ou em sessionStorage (acaba ao fechar). A escolha é guardada em um sinalizador.
 */
const KEY = 'gb-auth'
const FLAG = 'gb.remember'
const sessionOnly = () => { try { return localStorage.getItem(FLAG) === '0' } catch { return false } }
const store = () => (sessionOnly() ? sessionStorage : localStorage)

export const setRemember = (remember: boolean) => {
  try {
    localStorage.setItem(FLAG, remember ? '1' : '0')
    // ao trocar de modo, descarta a sessão antiga do outro armazenamento
    if (remember) sessionStorage.removeItem(KEY)
    else localStorage.removeItem(KEY)
  } catch { /* navegador bloqueou o armazenamento */ }
}

const storage = {
  getItem: (k: string) => { try { return store().getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => { try { store().setItem(k, v) } catch { /* ignora */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch { /* ignora */ } }
}

// A Vercel não envia .env.local no deploy. As variáveis continuam sendo a
// fonte principal, mas o fallback público evita que o app fique completamente
// preto caso elas ainda não tenham sido cadastradas no painel da Vercel.
// A chave publishable/anon é própria para uso no navegador; as policies do
// Supabase continuam sendo a camada de segurança dos dados.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gyacgaxjajuggvjjblpw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LudI9pIxwm0TBdDYYx_RiA_v8Dsq88q'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage, storageKey: KEY } }
)
