'use client';
import {useEffect,useState} from 'react';
import {Save,Trash2,Edit3,Plus,RefreshCw} from 'lucide-react';
import WebsiteImageUpload from './WebsiteImageUpload';

const blank={title:'',slug:'',excerpt:'',content:'',cover_image_url:'',is_published:false,published_at:''};
const input='w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10';

const api=async(url,options)=>{const r=await fetch(url,options);const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Request failed');return j};

export default function WebsiteBlogWithUploads(){
 const [rows,setRows]=useState([]),[edit,setEdit]=useState(null),[form,setForm]=useState(blank),[err,setErr]=useState(''),[msg,setMsg]=useState(''),[saving,setSaving]=useState(false);
 const load=async()=>{try{setRows((await api('/api/website/phase4?resource=blog')).data||[]);setErr('')}catch(e){setErr(e.message)}};
 useEffect(()=>{load()},[]);
 const save=async e=>{e.preventDefault();setSaving(true);setErr('');setMsg('');try{const body={...form,content:{html:form.content||''}};if(!body.slug&&body.title)body.slug=body.title.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');await api('/api/website/phase4?resource=blog',{method:edit?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(edit?{...body,id:edit}:body)});setForm(blank);setEdit(null);setMsg('Blog post saved successfully.');load()}catch(e){setErr(e.message)}finally{setSaving(false)}};
 const remove=async id=>{if(!confirm('Delete post?'))return;try{await api(`/api/website/phase4?resource=blog&id=${id}`,{method:'DELETE'});setMsg('Blog post deleted.');load()}catch(e){setErr(e.message)}};
 return <div className="space-y-5 text-gray-900">
  <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Blog</h1><p className="mt-1 text-sm text-gray-500">Create and manage blog posts with Storage-backed cover images.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={17}/></button></div>
  {(err||msg)&&<div className={`rounded-xl border p-4 text-sm ${err?'border-red-200 bg-red-50 text-red-700':'border-green-200 bg-green-50 text-green-700'}`}>{err||msg}</div>}
  <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
   <div className="divide-y rounded-2xl border bg-white">{rows.map(r=><div key={r.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><div className="font-semibold truncate">{r.title}</div><div className="text-xs text-gray-500">/{r.slug} · {r.is_published?'published':'draft'}</div>{r.cover_image_url&&<img src={r.cover_image_url} alt="" className="mt-2 h-16 w-24 rounded-lg border object-contain"/>}</div><div className="flex gap-2"><button onClick={()=>setForm({...blank,...r,content:r.content?.html||''})||setEdit(r.id)} className="rounded-lg border p-2"><Edit3 size={15}/></button><button onClick={()=>remove(r.id)} className="rounded-lg border p-2 text-red-600"><Trash2 size={15}/></button></div></div>)}{!rows.length&&<div className="p-10 text-center text-gray-500">No blog posts yet.</div>}</div>
   <form onSubmit={save} className="space-y-3 rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-semibold"><Plus size={17}/>{edit?'Edit':'New'} post</div>
    <label className="block text-sm font-medium"><span className="mb-1.5 block">Title</span><input required value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} className={input}/></label>
    <label className="block text-sm font-medium"><span className="mb-1.5 block">Slug</span><input value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value})} className={input}/></label>
    <WebsiteImageUpload value={form.cover_image_url||''} onChange={v=>setForm({...form,cover_image_url:v})} label="Cover Image" folder="blog-covers"/>
    <label className="block text-sm font-medium"><span className="mb-1.5 block">Excerpt</span><textarea rows={3} value={form.excerpt||''} onChange={e=>setForm({...form,excerpt:e.target.value})} className={input}/></label>
    <label className="block text-sm font-medium"><span className="mb-1.5 block">Content</span><textarea rows={10} required value={form.content||''} onChange={e=>setForm({...form,content:e.target.value})} className={input}/></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/>{form.is_published?'Published':'Draft'}</label>
    <div className="flex gap-2"><button type="button" onClick={()=>{setForm(blank);setEdit(null)}} className="rounded-xl border px-4 py-2.5">Clear</button><button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 font-semibold text-white disabled:opacity-50"><Save size={16}/>{saving?'Saving…':edit?'Update':'Save'}</button></div>
   </form>
  </div>
 </div>
}
