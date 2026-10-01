'use client';
import type {Config,Fields} from '@puckeditor/core';
const text={type:'text' as const},area={type:'textarea' as const};
const linkFields={label:text,href:text};
const common={eyebrow:text,title:text,subtitle:area,anchor:text};
const items=(fields:Fields)=>({type:'array' as const,arrayFields:fields});
const imageFields={image:text,alt:text};
const eventFields={id:text,title:text,date:text,venue:text,ticketUrl:text,image:text,label:text};
const definitions:Record<string,{label:string;fields:Fields}>={
 'gangstarz-hero':{label:'Gangstarz / Hero',fields:{...common,...imageFields,ctaText:text,ctaLink:text,secondaryText:text,secondaryLink:text,location:text}},
 'gangstarz-events':{label:'Gangstarz / Events',fields:{...common,emptyText:area,items:items(eventFields)}},
 'gangstarz-story':{label:'Gangstarz / Our story',fields:{...common,...imageFields,text:area,linkText:text,linkUrl:text}},
 'gangstarz-artists':{label:'Gangstarz / Collective',fields:{...common,items:items({name:text,...imageFields,instagram:text,role:text})}},
 'gangstarz-gallery':{label:'Gangstarz / Gallery',fields:{...common,items:items(imageFields)}},
 'gangstarz-merch':{label:'Gangstarz / Merch',fields:{...common,shopText:text,shopUrl:text,items:items({name:text,...imageFields,price:text,url:text,status:text})}},
 'gangstarz-partnership':{label:'Gangstarz / Partnerships',fields:{...common,email:text,phone:text,ctaText:text,items:items({title:text,text:area}),venues:items({name:text})}},
};
const fonts=(values:string[])=>({type:'select' as const,options:values.map(v=>({label:v,value:v}))});
type BlockProps=Record<string,unknown>&{eyebrow?:string;title?:string;subtitle?:string;text?:string;image?:string;alt?:string;anchor?:string;_visible?:boolean;items?:{title?:string;name?:string;alt?:string}[]};
export const gangstarzConfig:Config={
 root:{fields:{page:{type:'object',objectFields:{title:text,description:area,metaTitle:text,metaDescription:area,ogImage:text}},theme:{type:'object',objectFields:{logo:text,background:text,foreground:text,primary:text,secondary:text,displayFont:fonts(['Teko','Arial','Georgia']),labelFont:fonts(['Victor Mono','Arial','Georgia'])}},navigation:items(linkFields),footer:{type:'object',objectFields:{text:area,socials:items(linkFields),showPoweredBy:{type:'select',options:[{label:'Show AXXES credit',value:true},{label:'Hide AXXES credit',value:false}]},conceptLabel:text}}},render:({children}:{children:import('react').ReactNode})=><div style={{background:'#212121',color:'white',padding:24}}>{children}</div>},
 components:Object.fromEntries(Object.entries(definitions).map(([type,d])=>[type,{label:d.label,fields:{...d.fields,_visible:{type:'select',options:[{label:'Visible',value:true},{label:'Hidden',value:false}]}},defaultProps:{eyebrow:'',title:d.label.split(' / ')[1],subtitle:'',anchor:'',items:[],_visible:true},render:(props:BlockProps)=><section style={{padding:24,borderBottom:'1px solid #444'}}><small style={{color:'#F48D25'}}>{props.eyebrow}</small><h2>{props.title}</h2><p>{props.subtitle||props.text}</p>{props.image&&<img alt={props.alt||''} src={props.image.startsWith('/')?'https://gangstarz.axxes.club'+props.image:props.image} style={{maxWidth:'100%',maxHeight:240,objectFit:'cover'}}/>}{props.items?.map((item:{title?:string;name?:string;alt?:string},i:number)=><p key={i}>{item.title||item.name||item.alt||'Image'}</p>)}</section>}])),
};
