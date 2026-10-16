# Guia rápido de edição — GB BEAUTY

Abra a pasta `gb-beauty` no seu editor. Cada parte principal agora está em um arquivo separado.

## Landing page

- `src/pages/HomePage.tsx` — primeira tela, textos do hero, tabela de preços e contato.
- `src/components/SiteHeader.tsx` — logo, menu superior e botão de agendamento.
- `src/components/SiteFooter.tsx` — rodapé.
- `src/styles.css` — cores, tamanhos, fontes, espaçamentos e responsividade.

## Login e fluxo do cliente

- `src/pages/LoginPage.tsx` — login, cadastro, nome, telefone, e-mail e senha.
- `src/pages/BookingPage.tsx` — escolha do serviço, data, horário e observações.
- `src/pages/ClientPage.tsx` — área do cliente e histórico de agendamentos.

## Painel administrativo

- `src/components/AdminPanelV2.tsx` — dashboard, clientes, agendamentos, serviços, financeiro e configurações.

## Dados e conexão

- `src/lib/siteData.ts` — imagens, nomes de arquivos da tabela, tipos e formatação de preço.
- `src/lib/supabase.ts` — conexão com o Supabase. Normalmente não precisa editar.
- `.env.local` — URL e chave pública do Supabase.

## Imagens

- `public/assets/brand` — logo.
- `public/assets/editorial` — fotos reais da landing.
- `public/assets/tabela-precos` — imagens dos procedimentos.

## Como abrir no VS Code

```bash
code /caminho/para/gb-beauty
```

Depois de editar, rode:

```bash
npm run dev
```

Abra `http://localhost:5173`.

## Regra importante

Não edite `node_modules` nem `dist`. Essas pastas são geradas automaticamente.

Se alterar um arquivo `.tsx` e aparecer erro, rode:

```bash
npm run build
```

O terminal mostrará o arquivo e a linha do problema.
