import {snapshotSchema,type SiteSnapshotV1} from './schema';
import type {Data} from '@puckeditor/core';
export function toPuck(data:SiteSnapshotV1):Data{
 const {blocks,...root}=data;
 return {root:{props:root},content:blocks.map(b=>({type:b.type,props:{...b.content,id:b.id,_settings:b.settings,_visible:b.isVisible}})),zones:{}} as Data;
}
export function fromPuck(data:Data,base:SiteSnapshotV1):SiteSnapshotV1{
 const root=data.root.props as Partial<SiteSnapshotV1>;
 return snapshotSchema.parse({...base,...root,page:{...base.page,...root.page},theme:{...base.theme,...root.theme},footer:{...base.footer,...root.footer},blocks:data.content.map((item,i)=>{
  const {id,_settings,_visible,...content}=item.props as Record<string,unknown>;
  return {id:id||crypto.randomUUID(),type:item.type,content,settings:_settings||{},isVisible:_visible!==false,sortOrder:i};
 })});
}
