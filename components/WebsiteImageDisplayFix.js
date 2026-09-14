'use client';
import {useEffect} from 'react';

export default function WebsiteImageDisplayFix(){
 useEffect(()=>{
  const apply=()=>{
   document.querySelectorAll('img').forEach(img=>{
    img.style.objectFit='contain';
    img.style.objectPosition='center';
    img.style.maxWidth='100%';
   });
  };
  apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','class','style']});
  return()=>observer.disconnect();
 },[]);
 return null;
}
