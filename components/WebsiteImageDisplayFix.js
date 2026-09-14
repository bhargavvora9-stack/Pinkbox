'use client';
import {useEffect} from 'react';

export default function WebsiteImageDisplayFix(){
 useEffect(()=>{
  const apply=()=>{
   document.querySelectorAll('img').forEach(img=>{
    if(img.style.objectFit!=='contain') img.style.objectFit='contain';
    if(img.style.objectPosition!=='center') img.style.objectPosition='center';
    if(img.style.maxWidth!=='100%') img.style.maxWidth='100%';
   });
  };
  apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  return()=>observer.disconnect();
 },[]);
 return null;
}
