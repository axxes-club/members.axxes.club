import {wrapAdmission} from '@/lib/security/admission-server';
import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
export const GET=wrapAdmission(commerceRoutes.operator,'commerce-operator-read');export const POST=wrapAdmission(commerceRoutes.operator,'commerce-operator-write',3000);
