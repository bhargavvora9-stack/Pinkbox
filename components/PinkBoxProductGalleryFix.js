'use client';
import {useEffect} from 'react';

export default function PinkBoxProductGalleryFix(){
  useEffect(()=>{
    let cancelled=false;
    const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const enhance=async()=>{
      const modal=document.querySelector('.pb-product-modal');
      const media=modal?.querySelector('.pb-modal-media');
      if(!modal||!media||media.dataset.galleryReady==='1')return;
      const title=modal.querySelector('.pb-modal-copy h2')?.textContent?.trim();
      if(!title)return;
      try{
        const r=await fetch('/api/storefront',{cache:'no-store'}); const j=await r.json(); if(!r.ok||cancelled)return;
        const p=(j.products||[]).find(x=>String(x.title||'').trim()===title); if(!p||!Array.isArray(p.images)||!p.images.length)return;
        const urls=[...new Map(p.images.filter(x=>x?.image_url).map(x=>[x.image_url,x])).values()].sort((a,b)=>a.is_primary===b.is_primary?Number(a.sort_order||0)-Number(b.sort_order||0):(a.is_primary?-1:1));
        if(urls.length<2)return;
        let index=0;
        media.dataset.galleryReady='1';
        media.innerHTML=`<div class="pb-fix-gallery"><div class="pb-fix-main"><img class="pb-fix-image" src="${escapeHtml(urls[0].image_url)}" alt="${escapeHtml(title)}"/>${urls.length>1?'<button type="button" class="pb-fix-prev" aria-label="Previous image">‹</button><button type="button" class="pb-fix-next" aria-label="Next image">›</button>':''}</div><div class="pb-fix-thumbs">${urls.map((x,i)=>`<button type="button" class="pb-fix-thumb${i===0?' active':''}" data-index="${i}" aria-label="Image ${i+1}"><img src="${escapeHtml(x.image_url)}" alt=""/></button>`).join('')}</div></div>`;
        const main=media.querySelector('.pb-fix-image'), thumbs=[...media.querySelectorAll('.pb-fix-thumb')];
        const render=()=>{const x=urls[index];if(!x)return;main.src=x.image_url;main.alt=title;thumbs.forEach((b,i)=>b.classList.toggle('active',i===index))};
        media.querySelector('.pb-fix-prev')?.addEventListener('click',()=>{index=(index-1+urls.length)%urls.length;render()});
        media.querySelector('.pb-fix-next')?.addEventListener('click',()=>{index=(index+1)%urls.length;render()});
        thumbs.forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.index||0);render()}));
      }catch{}
    };
    const observer=new MutationObserver(enhance); observer.observe(document.body,{childList:true,subtree:true}); enhance();
    return()=>{cancelled=true;observer.disconnect()};
  },[]);
  return null;
}