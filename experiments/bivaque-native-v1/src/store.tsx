import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {makeId,initialListings,initialQuestions,type Question,type Listing,type Conversation,type Moment,type ListingKind} from './content';

type Data={hapticsEnabled:boolean;moment:Moment;questions:Question[];listings:Listing[];favorites:string[];joinedGroups:string[];joinedEvents:string[];conversations:Conversation[]};
const defaults:Data={hapticsEnabled:true,moment:'chegando',questions:initialQuestions,listings:initialListings,favorites:[],joinedGroups:[],joinedEvents:[],conversations:[]};
type NewListing={title:string;description:string;price:number|null;kind:ListingKind;neighborhood:string;localUri?:string};
type Store={state:Data;ready:boolean;setHaptics:(enabled:boolean)=>void;setMoment:(m:Moment)=>void;createQuestion:(q:{title:string;body:string;category:string;neighborhood:string})=>string;reply:(id:string,text:string)=>void;solve:(id:string)=>void;favorite:(id:string)=>void;createListing:(v:NewListing)=>string;message:(id:string,text:string)=>void;chatFor:(id:string)=>string;toggleGroup:(id:string)=>void;toggleEvent:(id:string)=>void;reset:()=>void};
const Context=createContext<Store|null>(null);
const STORAGE_KEY='bivaque-native-beta-v1';
export function StoreProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<Data>(defaults);const [ready,setReady]=useState(false);const hapticsRef=useRef(true);
 const vibrate=useCallback(()=>{if(hapticsRef.current)void Haptics.selectionAsync().catch(()=>{});},[]);
 const setHaptics=useCallback((enabled:boolean)=>{hapticsRef.current=enabled;setState(s=>({...s,hapticsEnabled:enabled}));},[]);
 useEffect(()=>{hapticsRef.current=state.hapticsEnabled;},[state.hapticsEnabled]);
 useEffect(()=>{let active=true;void AsyncStorage.getItem(STORAGE_KEY).then(value=>{if(!active)return;if(value){try{const saved=JSON.parse(value) as Partial<Data>;setState({...defaults,...saved});}catch{setState(defaults);}}setReady(true);}).catch(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
 useEffect(()=>{if(ready)void AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(state)).catch(()=>{});},[state,ready]);
 const setMoment=useCallback((moment:Moment)=>{setState(s=>({...s,moment}));vibrate();},[]);
 const createQuestion=useCallback((q:{title:string;body:string;category:string;neighborhood:string})=>{const id=makeId('q');const item:Question={id,author:'Você',at:'agora',replies:[],solved:false,isMine:true,...q};setState(s=>({...s,questions:[item,...s.questions]}));vibrate();return id;},[]);
 const reply=useCallback((id:string,text:string)=>{setState(s=>({...s,questions:s.questions.map(q=>q.id===id?{...q,replies:[...q.replies,{id:makeId('r'),author:'Você',text,at:'agora'}]}:q)}));vibrate();},[]);
 const solve=useCallback((id:string)=>{setState(s=>({...s,questions:s.questions.map(q=>q.id===id?{...q,solved:!q.solved}:q)}));vibrate();},[]);
 const favorite=useCallback((id:string)=>{setState(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]}));vibrate();},[]);
 const createListing=useCallback((v:NewListing)=>{const id=makeId('a');setState(s=>({...s,listings:[{...v,id,at:'agora',seller:'Você',isMine:true},...s.listings]}));vibrate();return id;},[]);
 const chatFor=useCallback((id:string)=>{const result=`c-${id}`;setState(s=>{if(s.conversations.some(c=>c.id===result))return s;const item=s.listings.find(x=>x.id===id);if(!item)return s;return {...s,conversations:[...s.conversations,{id:result,listingId:id,title:item.title,participant:item.seller,messages:[]}]};});return result;},[]);
 const message=useCallback((id:string,text:string)=>{setState(s=>({...s,conversations:s.conversations.map(c=>c.id===id?{...c,messages:[...c.messages,{id:makeId('m'),own:true,text,at:new Date().toISOString()}]}:c)}));vibrate();},[]);
 const toggleGroup=useCallback((id:string)=>{setState(s=>({...s,joinedGroups:s.joinedGroups.includes(id)?s.joinedGroups.filter(x=>x!==id):[...s.joinedGroups,id]}));vibrate();},[]);
 const toggleEvent=useCallback((id:string)=>{setState(s=>({...s,joinedEvents:s.joinedEvents.includes(id)?s.joinedEvents.filter(x=>x!==id):[...s.joinedEvents,id]}));vibrate();},[]);
 const reset=useCallback(()=>{setState(defaults);vibrate();},[]);
 const value=useMemo(()=>({state,ready,setHaptics,setMoment,createQuestion,reply,solve,favorite,createListing,message,chatFor,toggleGroup,toggleEvent,reset}),[state,ready,setHaptics,setMoment,createQuestion,reply,solve,favorite,createListing,message,chatFor,toggleGroup,toggleEvent,reset]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore(){const ctx=useContext(Context);if(!ctx)throw new Error('StoreProvider necessário');return ctx;}
