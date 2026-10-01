import { z } from 'zod';
export const safeUrl=z.string().max(2048).refine(v=>/^(https:\/\/|\/[^\/]|#[\w-]+$|mailto:|tel:)/.test(v)&&!/[\x00-\x1f]/.test(v),'Unsafe URL');
const link=z.object({label:z.string().max(100),href:safeUrl});
export const snapshotSchema=z.object({
 version:z.literal(1),revision:z.number().int().nonnegative(),
 page:z.object({id:z.string(),title:z.string(),slug:z.string(),description:z.string().nullable().optional(),metaTitle:z.string().nullable().optional(),metaDescription:z.string().nullable().optional(),ogImage:safeUrl.nullable().optional()}),
 theme:z.object({logo:safeUrl,background:z.string().regex(/^#[a-fA-F0-9]{6}$/),foreground:z.string().regex(/^#[a-fA-F0-9]{6}$/),primary:z.string().regex(/^#[a-fA-F0-9]{6}$/),secondary:z.string().regex(/^#[a-fA-F0-9]{6}$/),displayFont:z.enum(['Teko','Arial','Georgia']),labelFont:z.enum(['Victor Mono','Arial','Georgia'])}),
 navigation:z.array(link).max(12),
 footer:z.object({text:z.string().max(2000),socials:z.array(link).max(12),showPoweredBy:z.boolean(),conceptLabel:z.string().max(200)}),
 blocks:z.array(z.object({id:z.string(),type:z.string(),content:z.record(z.string(),z.unknown()),settings:z.record(z.string(),z.unknown()).default({}),sortOrder:z.number().int(),isVisible:z.boolean().default(true)})).max(100)
});
export type SiteSnapshotV1=z.infer<typeof snapshotSchema>;
