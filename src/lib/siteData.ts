export type Service = { id:string; name:string; description:string|null; price:number; duration_minutes:number; image_path:string|null; active:boolean; sort_order:number; category?:{name:string}|null; category_id?:string|null }
export type SessionUser = { id:string; email?:string; name?:string; role?:string }
export const realImages=['/assets/editorial/real-lashes.webp','/assets/editorial/real-wispy-lashes.jpg','/assets/editorial/real-brows.jpg']
const norm=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
export const isMaintenance=(s:Pick<Service,'name'>)=>norm(s.name).startsWith('manutencao')
const baseName=(s:Pick<Service,'name'>)=>norm(s.name).replace(/^manutencao\s+/,'')
export const servicePhotos:Record<string,string>={
 'brasileiro':'/assets/servicos/volume-brasileiro.webp',
 'volume brasileiro':'/assets/servicos/volume-brasileiro.webp',
 'egipcio':'/assets/servicos/volume-egipcio.webp',
 'volume egipcio':'/assets/servicos/volume-egipcio.webp',
 'egipcio marrom':'/assets/servicos/volume-egipcio-marrom.webp',
 'volume egipcio marrom':'/assets/servicos/volume-egipcio-marrom.webp',
 'volume fox eyes':'/assets/servicos/volume-fox-eyes.webp',
 'fox eyes':'/assets/servicos/volume-fox-eyes.webp',
 'volume capping':'/assets/servicos/volume-capping.webp',
 'capping':'/assets/servicos/volume-capping.webp',
 'mega brasileiro':'/assets/servicos/volume-mega-brasileiro.webp',
 'volume mega brasileiro':'/assets/servicos/volume-mega-brasileiro.webp',
 'capping luxury':'/assets/servicos/volume-capping-luxury.webp',
 'volume capping luxury':'/assets/servicos/volume-capping-luxury.webp',
 'volume mega luxury':'/assets/servicos/volume-capping-luxury.webp',
 'mega luxury':'/assets/servicos/volume-capping-luxury.webp',
 'design com henna':'/assets/servicos/design-henna.webp',
 'design de sobrancelhas':'/assets/editorial/real-brows.jpg'
}
export const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
// A foto enviada pelo painel sempre tem prioridade sobre a foto padrão do catálogo.
// Sem essa ordem, o upload era salvo no banco, mas continuava invisível para
// serviços que possuíam uma imagem local associada ao nome.
export const serviceImage=(s:Pick<Service,'name'|'image_path'>,i=0)=>s.image_path||servicePhotos[baseName(s)]||realImages[i%3]

export const contact={
 whatsappNumber:'5548998599624',
 whatsappLabel:'(48) 99859-9624',
 whatsappMessage:'Olá! Vim pelo site da GB BEAUTY e gostaria de agendar um horário.',
 instagramUser:'gabriellyborges_beauty'
}
export const whatsappLink=`https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappMessage)}`
export const instagramLink=`https://instagram.com/${contact.instagramUser}`
