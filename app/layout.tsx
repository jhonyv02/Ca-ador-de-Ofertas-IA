import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title:'Caçador de Ofertas IA', description:'Seu radar de anúncios, produtos e oportunidades para testar.'
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
