'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, LibraryBig, Megaphone, GitCompareArrows, Calculator, Settings, LogOut, Menu, X, Target, ChevronRight, ExternalLink } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { WorkspaceProvider } from '@/components/workspace';
const nav=[
  {href:'/dashboard',label:'Visão geral',icon:LayoutDashboard},
  {href:'/products',label:'Produtos',icon:LibraryBig},
  {href:'/ads',label:'Biblioteca de anúncios',icon:Megaphone},
  {href:'/compare',label:'Comparar oportunidades',icon:GitCompareArrows},
  {href:'/simulator',label:'Simulador de testes',icon:Calculator},
  {href:'/settings',label:'Configurações',icon:Settings},
];
export function AppShell({email,children}:{email:string;children:React.ReactNode}){
  const pathname=usePathname();const router=useRouter();const [menu,setMenu]=useState(false);
  async function logout(){await browserClient().auth.signOut();router.replace('/login');router.refresh();}
  const selected=nav.find(n=>pathname===n.href||(n.href==='/products'&&pathname.startsWith('/products/')));
  return <WorkspaceProvider>
    <div className="shell">
      {menu&&<button aria-label="Fechar menu" className="overlay" onClick={()=>setMenu(false)}/>}
      <aside className={`sidebar ${menu?'sidebar-open':''}`}>
        <Link href="/dashboard" className="brand" onClick={()=>setMenu(false)}>
          <span className="brand-icon"><Target size={24}/></span>
          <span><strong>CAÇADOR<span className="green">.IA</span></strong><small>INTELIGÊNCIA DE OFERTAS</small></span>
        </Link>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        <nav className="side-nav">{nav.map(n=>{const Icon=n.icon;const active=pathname===n.href||(n.href==='/products'&&pathname.startsWith('/products/'));return <Link className={`nav-link ${active?'active':''}`} href={n.href} key={n.href} onClick={()=>setMenu(false)}><Icon size={18}/>{n.label}{active&&<ChevronRight className="nav-chevron" size={14}/>}</Link>;})}</nav>
        <div className="sidebar-bottom"><div className="hint-block"><strong>Radar inteligente</strong><span>Organize evidências antes de investir em anúncios.</span><a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer">Abrir Meta Ads Library <ExternalLink size={13}/></a></div><button className="account" onClick={logout}><span className="avatar">{email.charAt(0).toUpperCase()}</span><span className="account-email">{email}<small>Sair da conta</small></span><LogOut size={17}/></button></div>
      </aside>
      <div className="main-container"><header className="topbar"><button className="mobile-nav" aria-label="Abrir menu" onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button><div className="breadcrumb">Workspace <ChevronRight size={14}/><span>{selected?.label||'Produto'}</span></div><div className="top-actions"><span className="live-dot"/> Área privada <span className="top-avatar">{email.charAt(0).toUpperCase()}</span></div></header><main className="content">{children}</main><footer className="footer">Caçador de Ofertas IA · Análise de oportunidades, não garantia de vendas.</footer></div>
    </div>
  </WorkspaceProvider>;
}
