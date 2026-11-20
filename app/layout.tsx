import type {Metadata, Viewport} from 'next';
import {ServiceWorkerRegister} from '@/components/service-worker-register';
import './globals.css';
export const metadata: Metadata = {
  title:'Caçador de Ofertas IA',
  description:'Seu radar de anúncios, produtos e oportunidades para testar.',
  applicationName:'Caçador de Ofertas IA',
  appleWebApp:{capable:true, title:'Caçador', statusBarStyle:'black-translucent'},
  icons:{
    icon:[
      {url:'/icons/icon-192.png', sizes:'192x192', type:'image/png'},
      {url:'/icons/icon-512.png', sizes:'512x512', type:'image/png'},
    ],
    apple:[{url:'/icons/apple-touch-icon.png', sizes:'180x180', type:'image/png'}],
  },
  other:{'apple-mobile-web-app-capable':'yes'},
};
export const viewport: Viewport = {
  themeColor:'#080d18',
  width:'device-width',
  initialScale:1,
  viewportFit:'cover',
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body><ServiceWorkerRegister/>{children}</body></html>;
}
