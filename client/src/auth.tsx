import React,{createContext,useContext,useState} from 'react';
import {getToken,setToken,User} from './api/client';
type AuthState={user:User|null;authenticated:boolean;login:(token:string,user:User)=>void;logout:()=>void};
const AuthContext=createContext<AuthState|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(()=>{try{return JSON.parse(sessionStorage.getItem('ck_user')||'null')}catch{return null}});
 const login=(value:string,next:User)=>{setToken(value);sessionStorage.setItem('ck_user',JSON.stringify(next));setUser(next)};
 const logout=()=>{setToken(null);sessionStorage.removeItem('ck_user');setUser(null)};
 return <AuthContext.Provider value={{user,authenticated:!!getToken()&&!!user,login,logout}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('Missing AuthProvider');return value}
