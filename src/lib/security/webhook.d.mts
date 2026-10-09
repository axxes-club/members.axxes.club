type DB={query:(sql:string,values:unknown[])=>Promise<{rows:Record<string,unknown>[]}>};
export function parseWebhook(request:Request,secret:string|undefined):Promise<{eventType:string;tenantId:string;payload:Record<string,unknown>;digest:string}>;
export function reserveDelivery(db:DB,provider:string,digest:string):Promise<string|null>;
export function finishDelivery(db:DB,provider:string,digest:string,lease:string,success:boolean):Promise<void>;
