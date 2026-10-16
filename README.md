# GB BEAUTY

Site da Gabrielly Borges Beauty com landing page, login, agendamento, área do cliente, painel administrativo e integração com Supabase.

## Requisitos

- Node.js 18 ou superior
- npm
- Acesso ao projeto Supabase configurado no `.env.local`

## Instalação

```bash
cd gb-beauty
npm install
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Depois abra o endereço mostrado pelo Vite, normalmente:

```text
http://localhost:5173
```

Para acessar pela rede local:

```text
http://SEU-IP-LOCAL:5173
```

## Validar o projeto

```bash
npm run build
```

## Testar a versão de produção localmente

```bash
npm run build
npm run preview
```

Depois abra:

```text
http://localhost:4173
```

## Variáveis do Supabase

O projeto usa o arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Se o arquivo não estiver disponível, crie-o na raiz do projeto com a URL e a chave publicável do seu projeto Supabase.

## Estrutura principal

- `src/App.tsx`: aplicação pública, login, agendamento e área do cliente
- `src/components/AdminPanelV2.tsx`: painel administrativo
- `src/styles.css`: identidade visual e responsividade
- `src/lib/supabase.ts`: cliente Supabase
- `public/assets/brand`: logo oficial
- `public/assets/editorial`: fotos editoriais
- `public/assets/tabela-precos`: artes dos serviços

## Painel administrativo

A conta precisa existir no Supabase Auth e ter um registro ativo em `user_roles`. O usuário com papel administrativo entra pelo mesmo login e é direcionado automaticamente para o painel.

## Observações

- `node_modules` e `dist` não são incluídos no ZIP; execute `npm install` e `npm run build` localmente.
- O projeto usa o bucket `services` para fotos dos serviços.

## App instalável (PWA) — GB BORGES

O site já vem configurado como aplicativo instalável. Nada precisa ser instalado a mais: os arquivos ficam em `public/` (`manifest.webmanifest`, `sw.js`, `offline.html` e a pasta `icons/`, gerada a partir da logo).

- Nome na tela inicial do celular: **GB BORGES**, com a logo.
- Ao abrir o app instalado, quem é administradora entra direto no painel. Quem ainda não fez login vê a tela de entrada.
- O service worker guarda só a "casca" do site. Supabase (login, agenda, painel) sempre usa dados ao vivo e nunca fica em cache.
- O service worker só é registrado na versão publicada (`npm run build`), não no `npm run dev`.

### Publicar (Vercel ou Netlify)

1. Rode `npm install` e `npm run build` para conferir que compila.
2. Envie o projeto. Comando de build: `npm run build`. Pasta de saída: `dist`.
3. Cadastre as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da hospedagem (os mesmos valores do `.env.local`).
4. No Supabase, em Authentication → URL Configuration, informe o endereço do site publicado.
5. O PWA exige HTTPS, que Vercel e Netlify já entregam.

### Testar a instalação no celular

- **Android (Chrome):** abra o site, entre no painel e toque em "Instalar app" (ou no menu ⋮ → Instalar aplicativo).
- **iPhone (Safari):** toque em Compartilhar → Adicionar à Tela de Início.
- Confira: ícone com a logo, nome GB BORGES, abre em tela cheia sem a barra do navegador e, com a conta admin, cai direto no painel.
- No computador, o Lighthouse do Chrome (aba Lighthouse → Progressive Web App) confirma se tudo está certo.

### Trocar a logo do app

Substitua `public/assets/brand/gabrielly-borges-logo.png` e gere de novo os arquivos de `public/icons/` (192, 512, maskable-512, apple-touch-icon e favicon-32).
