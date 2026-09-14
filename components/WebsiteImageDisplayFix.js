'use client';
import {useEffect} from 'react';

export default function WebsiteImageDisplayFix(){
 useEffect(()=>{
  const apply=()=>{
   document.querySelectorAll('img').forEach(img=>{
    const src=img.currentSrc||img.src||'';
    if(src.includes('/storage/v1/object/public/website-images/')){
      img.style.objectFit='contain';
      img.style.objectPosition='center';
      img.style.maxWidth='100%';
      if(img.closest('.pb-home')) img.style.backgroundColor=img.style.backgroundColor||'transparent';
    }
   });
  };
  apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  return()=>observer.disconnect();
 },[]);
 return null;
}
