// IMPORTANT: Compare these configurable paths with the project's wiki API Routes page.
// The public wiki API Routes content was not accessible during creation.
export const ROUTES = {
  login: '/api/auth/login', signup: '/api/auth/signup', me: '/api/auth/me',
  campaigns: '/api/campaigns', join: '/api/campaigns/join', roll: '/api/dice/roll'
};
export type User = {id: string; name: string; email: string};
export type Campaign = {id: string; name: string; role: string; inviteCode?: string};
export type Roll = {dice: number[]; total: number; modifier?: number};
let token = sessionStorage.getItem('ck_token');
export function setToken(value: string | null) {token=value; if(value) sessionStorage.setItem('ck_token',value); else sessionStorage.removeItem('ck_token');}
export function getToken(){return token;}
export async function request<T>(path:string, options:RequestInit={}):Promise<T>{
 const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(body.message || body.error || `Request failed (${response.status})`);
 return body as T;
}
const post=<T>(url:string,data:unknown)=>request<T>(url,{method:'POST',body:JSON.stringify(data)});
export const api={
 login:(email:string,password:string)=>post<{token:string;user:User}>(ROUTES.login,{email,password}),
 signup:(name:string,email:string,password:string)=>post<{token:string;user:User}>(ROUTES.signup,{name,email,password}),
 me:()=>request<{user:User}>(ROUTES.me),
 campaigns:()=>request<Campaign[] | {campaigns:Campaign[]}>(ROUTES.campaigns),
 createCampaign:(name:string)=>post<Campaign>(ROUTES.campaigns,{name}),
 joinCampaign:(inviteCode:string)=>post<Campaign>(ROUTES.join,{inviteCode}),
 roll:(notation:string)=>post<Roll>(ROUTES.roll,{notation})
};
