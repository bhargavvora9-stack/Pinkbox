const ALLOWED_TAGS = new Set(['p','br','div','span','strong','b','em','i','u','s','del','small','mark','h1','h2','h3','h4','h5','h6','blockquote','pre','code','ul','ol','li','a','img','figure','figcaption','table','thead','tbody','tfoot','tr','th','td','hr','sup','sub']);
const GLOBAL_ATTRS = new Set(['class','id','title']);
const TAG_ATTRS = {
  a: new Set(['href','target','rel']),
  img: new Set(['src','alt','title','width','height','loading']),
  td: new Set(['colspan','rowspan']),
  th: new Set(['colspan','rowspan','scope'])
};

function escapeAttr(value) {
  return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function safeUrl(value, { image = false } = {}) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
    if (!image && (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:')) return parsed.toString();
  } catch {}
  return null;
}

function sanitizeTag(match) {
  const full = match[0];
  const closing = /^<\s*\//.test(full);
  const nameMatch = full.match(/^<\s*\/?\s*([a-z0-9]+)/i);
  if (!nameMatch) return '';
  const tag = nameMatch[1].toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return '';
  if (closing) return `</${tag}>`;
  const attrText = full.replace(/^<\s*[a-z0-9]+/i,'').replace(/\/?\s*>\s*$/,'');
  const attrs = [];
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let attr;
  while ((attr = attrRe.exec(attrText))) {
    const name = attr[1].toLowerCase();
    const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
    if (!(GLOBAL_ATTRS.has(name) || TAG_ATTRS[tag]?.has(name))) continue;
    if (name === 'href') { const safe = safeUrl(value); if (safe) attrs.push(`href="${escapeAttr(safe)}"`); continue; }
    if (name === 'src') { const safe = safeUrl(value,{image:true}); if (safe) attrs.push(`src="${escapeAttr(safe)}"`); continue; }
    if (name === 'target') { if (['_blank','_self'].includes(value)) attrs.push(`target="${value}"`); continue; }
    if (name === 'rel') { const rel = value.split(/\s+/).filter(Boolean).filter(x => ['nofollow','noopener','noreferrer'].includes(x.toLowerCase())).join(' '); if (rel) attrs.push(`rel="${escapeAttr(rel)}"`); continue; }
    if (['width','height','colspan','rowspan'].includes(name)) { if (/^\d{1,4}$/.test(value)) attrs.push(`${name}="${value}"`); continue; }
    if (name === 'loading') { if (['lazy','eager'].includes(value)) attrs.push(`loading="${value}"`); continue; }
    if (name === 'scope') { const v=value.toLowerCase(); if (['col','row','colgroup','rowgroup'].includes(v)) attrs.push(`scope="${v}"`); continue; }
    if (['class','id','title'].includes(name)) attrs.push(`${name}="${escapeAttr(value)}"`);
  }
  return attrs.length ? `<${tag} ${attrs.join(' ')}>` : `<${tag}>`;
}

export function sanitizeCmsHtml(input) {
  let html = typeof input === 'string' ? input : '';
  if (!html) return '';
  html = html
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|math|template|noscript)[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
    .replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|math|template|noscript)[^>]*\/?\s*>/gi,'')
    .replace(/<[^>]*>/g,sanitizeTag);
  return html;
}