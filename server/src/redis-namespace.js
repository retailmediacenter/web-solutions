const DEFAULT_NAMESPACE='';

export function redisNamespace(env=process.env){
 const value=String(env.RMC_REDIS_NAMESPACE??DEFAULT_NAMESPACE).trim();
 if(!value)return DEFAULT_NAMESPACE;
 if(!/^[a-z0-9][a-z0-9_-]{0,30}$/.test(value))throw new Error('RMC_REDIS_NAMESPACE mora sadržati mala slova, brojeve, _ ili - .');
 return value;
}

export function redisPrefix(domain,namespace=''){
 if(!['booking','commerce'].includes(domain))throw new Error('Nepoznat Redis domen.');
 const scope=String(namespace??'').trim();
 if(scope&&!/^[a-z0-9][a-z0-9_-]{0,30}$/.test(scope))throw new Error('Redis namespace nije ispravan.');
 return `rmc:${domain}:${scope?`${scope}:`:''}v1:`;
}
