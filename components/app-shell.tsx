'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {LayoutDashboard,LibraryBig,Megaphone,GitCompareArrows,Calculator,Settings,LogOut,Menu,X,Target,ChevronRight,ExternalLink,MoreHorizontal} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {WorkspaceProvider} from '@/components/workspace';
import {LocaleProvider,useLocale} from '@/components/locale';
import {LocalePicker} from '@/components/global-options';

const primary = [
 {href:'/dashboard',key:'dashboard',icon:LayoutDashboard},
 {href:'/products',key:'products',icon:LibraryBig},
 {href:'/ads',key:'ads',icon:Megaphone},
 {href:'/compare',key:'compare',icon:GitCompareArrows},
];
const secondary = [
 {href:'/simulator',key:'simulator',icon:Calculator},
 {href:'/settings',key:'settings',icon:Settings},
];

export function AppShell({email,children}:{email:string;children:React.ReactNode}){
 return <LocaleProvider><WorkspaceProvider><AppFrame email={email}>{children}</AppFrame></WorkspaceProvider></LocaleProvider>;
}
function AppFrame({email,children}:{email:string;children:React.ReactNode}){
 const pathname=usePathname();const router=useRouter();const [menu,setMenu]=useState(false);
 const {t}=useLocale();
 const all=[...primary,...secondary];
 const selected=all.find(n=>pathname===n.href||(n.href==='/products'&&pathname.startsWith('/products/')));
 async function logout(){await browserClient().auth.signOut();router.replace('/login');router.refresh();}
 const renderNav=(items:typeof primary)=>items.map(n=>{
   const Icon=n.icon;const active=pathname===n.href||(n.href==='/products'&&pathname.startsWith('/products/'));
   return <Link className={`nav-link ${active?'active':''}`} href={n.href} key={n.href} onClick={()=>setMenu(false)}>
    <Icon size={18}/>{t(n.key)}{active&&<ChevronRight className="nav-chevron" size={14}/>}
   </Link>;
 });
 return <div className="shell">
  {menu&&<button aria-label="Fechar menu" className="overlay" onClick={()=>setMenu(false)}/>}
  <aside className={`sidebar ${menu?'sidebar-open':''}`}>
   <Link href="/dashboard" className="brand" onClick={()=>setMenu(false)}>
    <span className="brand-icon"><Target size={24}/></span>
    <span><strong>CAÇADOR<span className="green">.IA</span></strong><small>OFERTAS EM UM SÓ LUGAR</small></span>
   </Link>
   <nav className="side-nav" style={{marginTop:38}}>{renderNav(primary)}</nav>
   <details className="sidebar-more" open={secondary.some(n=>pathname.startsWith(n.href))||undefined}>
    <summary><MoreHorizontal size={18}/>{t('more')}</summary>
    <nav className="side-nav">{renderNav(secondary)}</nav>
   </details>
   <div className="sidebar-bottom">
    <div className="hint-block"><strong>{t('quickStart')}</strong><a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer">Meta Ads Library <ExternalLink size={13}/></a></div>
    <button className="account" onClick={logout}><span className="avatar">{email.charAt(0).toUpperCase()}</span><span className="account-email">{email}<small>{t('logout')}</small></span><LogOut size={17}/></button>
   </div>
  </aside>
  <div className="main-container">
   <header className="topbar">
    <button className="mobile-nav" aria-label="Abrir menu" onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button>
    <div className="breadcrumb">{t('dashboard')} <ChevronRight size={14}/><span>{t(selected?.key||'products')}</span></div>
    <div className="top-actions"><LocalePicker/><span className="top-avatar">{email.charAt(0).toUpperCase()}</span></div>
   </header>
   <main className="content">{children}</main>
   <footer className="footer">Caçador de Ofertas IA · {t('savedInfo')}</footer>
  </div>
 </div>;
}
