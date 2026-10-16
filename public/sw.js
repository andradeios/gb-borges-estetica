/* GB BORGES — service worker simples.
   Guarda só a "casca" do site (HTML, JS, CSS, imagens) para abrir rápido e mostrar
   uma tela offline. Chamadas ao Supabase e a outros domínios NUNCA passam por aqui,
   então agenda, login e painel sempre usam dados ao vivo. */
const VERSION = 'gb-v2'
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/brand/gabrielly-borges-logo.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: tenta a rede primeiro; sem internet, usa a cópia guardada ou a tela offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/', copy)); return res })
        .catch(() => caches.match('/').then((r) => r || caches.match('/offline.html')))
    )
    return
  }

  // Arquivos estáticos: mostra a cópia guardada na hora e atualiza em segundo plano.
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res }).catch(() => cached)
        return cached || net
      })
    )
  )
})
