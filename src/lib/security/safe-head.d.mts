export function isPublicAddress(address:string):boolean;
export function safeHead(raw:string|URL):Promise<{status:number;headers:Record<string,string|string[]|undefined>}>;

export class UnsafeDestinationError extends Error {}
