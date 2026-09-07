'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Eye, LayoutTemplate, Palette, Save, Smartphone, Sparkles, Type, RotateCcw } from 'lucide-react';

const DEFAULTS = {
  primary_color: '#d9295f',
  secondary_color: '#171717',
  font_family: 'Inter, system-ui, sans-serif',
  settings: {
    background_color: '#fffafc',
    surface_color: '#ffffff',
    text_color: '#171717',
    muted_color: '#6b7280',
    announcement_bar: 'Free shipping on orders above ₹999 · Secure checkout',
    layout_width: '1320px',
    button_radius: '18px',
    card_radius: '24px',
    section_spacing: '88px',
    product_grid: '4',
    hero_style: 'split',
    hero_height: '560px',
    header_style: 'glass',
    header_height: '78px',
    card_style: 'soft',
    card_shadow: 'soft',
    image_ratio: '1/1.08',
    button_style: 'solid',
    heading_weight: '800',
    show_benefits: true,
    show_blog: true,
    show_categories: true,
    custom_css: '',
  },
};

const PRESETS = [
  { name: 'Pink Luxe', primary: '#d9295f', secondary: '#171717', bg: '#fff8fa', surface: '#ffffff', radius: '22px', card: '24px' },
  { name: 'Clean Studio', primary: '#111111', secondary: '#f1a3b8', bg: '#fafafa', surface: '#ffffff', radius: '12px', card: '18px' },
  { name: 'Rose Editorial', primary: '#9f174d', secondary: '#3b1728', bg: '#fff7f9', surface: '#ffffff', radius: '8px', card: '10px' },
  { name: 'Modern Violet', primary: '#7c3aed', secondary: '#171717', bg: '#faf9ff', surface: '#ffffff', radius: '20px', card: '24px' },
];

const controls = [
  ['layout', 'Layout', LayoutTemplate],
  ['brand', 'Branding', Palette],
  ['hero', 'Hero', Sparkles],
  ['type', 'Typography', Type],
  ['components', 'Components', Eye],
];

export default function PinkBoxDesignStudio() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('layout');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => {
    fetch('/api/website/phase4?resource=theme', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const x = j.data || {};
        setData({
          primary_color: x.primary_color || DEFAULTS.primary_color,
          secondary_color: x.secondary_color || DEFAULTS.secondary_color,
          font_family: x.font_family || DEFAULTS.font_family,
          settings: { ...DEFAULTS.settings, ...(x.settings || {}) },
        });
      })
      .catch(() => setData(DEFAULTS));
  }, []);

  const set = (key, value) => setData(v => ({ ...v, [key]: value }));
  const setS = (key, value) => setData(v => ({ ...v, settings: { ...(v.settings || {}), [key]: value } }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const r = await fetch('/api/website/phase4?resource=theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        font_family: data.font_family,
        ...(data.settings || {}),
      }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    }
  };

  const reset = () => setData(DEFAULTS);
  const applyPreset = p => setData(v => ({ ...v, primary_color: p.primary, secondary_color: p.secondary, settings: { ...(v.settings || {}), background_color: p.bg, surface_color: p.surface, button_radius: p.radius, card_radius: p.card } }));

  if (!data) return <div className="p-8 text-sm text-gray-400">Loading Design Studio…</div>;
  const s = data.settings || {};

  return (
    <div className="design-studio space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.22em] text-pink-400">PinkBox Design Studio</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Build the storefront visually.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Storefront styling is controlled from this screen. Change the visual system here instead of editing frontend code.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-300"><RotateCcw size={15}/> Reset</button>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200"><ExternalLink size={15}/> Open Store</a>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20"><Save size={15}/>{saving ? 'Saving…' : saved ? 'Saved' : 'Save design'}</button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_500px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035] shadow-2xl">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
            {controls.map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${tab === key ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Icon size={15}/>{label}</button>)}
          </div>
          <div className="p-5 sm:p-7">
            <PresetRow applyPreset={applyPreset}/>
            {tab === 'layout' && <LayoutTab s={s} setS={setS}/>} 
            {tab === 'brand' && <BrandTab data={data} set={set}/>} 
            {tab === 'hero' && <HeroTab s={s} setS={setS}/>} 
            {tab === 'type' && <TypeTab data={data} set={set} s={s} setS={setS}/>} 
            {tab === 'components' && <ComponentsTab s={s} setS={setS}/>} 
          </div>
        </div>
        <Preview data={data} mode={previewMode} setMode={setPreviewMode}/>
      </div>
    </div>
  );
}

function PresetRow({ applyPreset }) {
  return <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Quick visual presets</h2><span className="text-xs text-gray-500">Apply, then fine-tune</span></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{PRESETS.map(p => <button key={p.name} onClick={() => applyPreset(p)} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:-translate-y-0.5 hover:border-pink-400/50"><div className="flex gap-1"><span className="h-7 flex-1 rounded-l-lg" style={{background:p.primary}}/><span className="h-7 flex-1 rounded-r-lg" style={{background:p.secondary}}/></div><div className="mt-2 text-xs font-semibold text-gray-200">{p.name}</div></button>)}</div></section>;
}

function LayoutTab({s,setS}) { return <div className="grid gap-5 sm:grid-cols-2"><Select label="Header style" value={s.header_style} onChange={v=>setS('header_style',v)} options={['glass','solid','minimal','dark']}/><Select label="Content width" value={s.layout_width} onChange={v=>setS('layout_width',v)} options={['1180px','1240px','1320px','1440px']}/><Select label="Header height" value={s.header_height} onChange={v=>setS('header_height',v)} options={['64px','72px','78px','88px']}/><Select label="Section spacing" value={s.section_spacing} onChange={v=>setS('section_spacing',v)} options={['56px','72px','88px','112px']}/><Select label="Product columns" value={s.product_grid} onChange={v=>setS('product_grid',v)} options={['2','3','4','5']}/><Select label="Image ratio" value={s.image_ratio} onChange={v=>setS('image_ratio',v)} options={['1/1','1/1.08','4/5','3/4']}/></div>; }
function BrandTab({data,set}) { return <div className="grid gap-5 sm:grid-cols-2"><Color label="Primary color" value={data.primary_color} onChange={v=>set('primary_color',v)}/><Color label="Secondary color" value={data.secondary_color} onChange={v=>set('secondary_color',v)}/><Color label="Page background" value={data.settings.background_color} onChange={v=>set('settings',{...data.settings,background_color:v})}/><Color label="Surface" value={data.settings.surface_color} onChange={v=>set('settings',{...data.settings,surface_color:v})}/></div>; }
function HeroTab({s,setS}) { return <div className="grid gap-5 sm:grid-cols-2"><Select label="Hero layout" value={s.hero_style} onChange={v=>setS('hero_style',v)} options={['split','full-bleed','editorial','minimal']}/><Select label="Hero height" value={s.hero_height} onChange={v=>setS('hero_height',v)} options={['420px','500px','560px','680px']}/><Field label="Announcement bar"><input className="field" value={s.announcement_bar || ''} onChange={e=>setS('announcement_bar',e.target.value)}/></Field><Field label="Custom CSS"><textarea className="field font-mono text-xs" rows={8} value={s.custom_css || ''} onChange={e=>setS('custom_css',e.target.value)} placeholder="Optional storefront-only CSS"/></Field></div>; }
function TypeTab({data,set,s,setS}) { return <div className="grid gap-5 sm:grid-cols-2"><Field label="Font family"><input className="field" value={data.font_family} onChange={e=>set('font_family',e.target.value)}/></Field><Select label="Heading weight" value={s.heading_weight} onChange={v=>setS('heading_weight',v)} options={['600','700','800','900']}/></div>; }
function ComponentsTab({s,setS}) { return <div className="space-y-4"><Toggle label="Show benefits strip" value={s.show_benefits!==false} onChange={v=>setS('show_benefits',v)}/><Toggle label="Show category section" value={s.show_categories!==false} onChange={v=>setS('show_categories',v)}/><Toggle label="Show journal/blog" value={s.show_blog!==false} onChange={v=>setS('show_blog',v)}/><Select label="Card style" value={s.card_style} onChange={v=>setS('card_style',v)} options={['clean','soft','bordered','luxury']}/><Select label="Card shadow" value={s.card_shadow} onChange={v=>setS('card_shadow',v)} options={['none','soft','strong']}/><Select label="Button style" value={s.button_style} onChange={v=>setS('button_style',v)} options={['solid','outline','pill']}/><Select label="Card radius" value={s.card_radius} onChange={v=>setS('card_radius',v)} options={['10px','16px','20px','24px','32px']}/></div>; }

function Field({label,children}) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-gray-400">{label}</span>{children}</label>; }
function Select({label,value,onChange,options}) { return <Field label={label}><select className="field" value={value || options[0]} onChange={e=>onChange(e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select></Field>; }
function Color({label,value,onChange}) { return <Field label={label}><div className="flex gap-2"><input type="color" value={value || '#ffffff'} onChange={e=>onChange(e.target.value)} className="h-11 w-14 rounded-xl bg-transparent"/><input className="field" value={value || ''} onChange={e=>onChange(e.target.value)}/></div></Field>; }
function Toggle({label,value,onChange}) { return <button type="button" onClick={()=>onChange(!value)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left"><span className="text-sm text-gray-200">{label}</span><span className={`h-6 w-11 rounded-full p-1 transition ${value?'bg-pink-500':'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${value?'translate-x-5':''}`}/></span></button>; }

function Preview({data,mode,setMode}) { const s=data.settings||{}; const mobile=mode==='mobile'; return <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-gray-300"><Sparkles size={14} className="text-pink-400"/> Live storefront preview</div><div className="flex gap-1 rounded-xl bg-white/5 p-1"><button onClick={()=>setMode('desktop')} className={`rounded-lg p-2 ${!mobile?'bg-white/10 text-white':'text-gray-500'}`}><LayoutTemplate size={14}/></button><button onClick={()=>setMode('mobile')} className={`rounded-lg p-2 ${mobile?'bg-white/10 text-white':'text-gray-500'}`}><Smartphone size={14}/></button></div></div><div className="bg-white p-3"><div style={{background:s.background_color||'#fff',fontFamily:data.font_family,color:data.primary_color}} className={`mx-auto overflow-hidden border border-gray-200 ${mobile?'max-w-[360px]':''}`}><div style={{background:data.secondary_color}} className="px-3 py-2 text-center text-[9px] font-bold text-white">{s.announcement_bar||'Announcement bar'}</div><div className="flex items-center justify-between border-b px-4" style={{height:s.header_height||'78px'}}><b className="flex items-center gap-2 text-sm text-gray-900"><span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{background:data.primary_color}}>PB</span> PinkBox</b><span className="text-[9px] text-gray-500">Shop&nbsp;&nbsp; Collections&nbsp;&nbsp; About&nbsp;&nbsp; Bag</span></div><div className="p-4"><div style={{background:`linear-gradient(135deg,${data.secondary_color},${data.primary_color})`,minHeight:mobile?'240px':s.hero_height||'560px'}} className="relative flex items-end rounded-3xl p-5 text-white"><div><div className="text-[8px] font-bold uppercase tracking-[.2em] opacity-70">PinkBox edit</div><div className="mt-2 text-2xl font-black leading-none">A better<br/>shopping experience.</div><button className="mt-4 rounded-xl px-4 py-2 text-[9px] font-bold text-white" style={{background:data.primary_color}}>Shop now</button></div></div><div className="mt-4 grid grid-cols-2 gap-2">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl bg-gray-100 p-2"><div className="aspect-square rounded-xl bg-gray-200"/><div className="mt-2 h-2 w-2/3 rounded bg-gray-300"/><div className="mt-2 h-3 w-1/3 rounded" style={{background:data.primary_color}}/></div>)}</div></div></div></div></div>; }
