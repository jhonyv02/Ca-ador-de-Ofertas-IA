'use client';
import {useMemo} from 'react';
import {useLocale,UI_LANGUAGES} from '@/components/locale';

const PREFERRED = ['BRL','USD','EUR','GBP','MXN','ARS','COP','CLP','PEN','UYU','PYG','CAD','AUD','JPY','CNY','INR','CHF','AED','SAR','AOA','MZN','ZAR','KRW','TRY','PLN'];
const FALLBACK = ('AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWG').split(' ');
export function currencyCodes():string[] {
 try {return Intl.supportedValuesOf('currency');}
 catch {return FALLBACK;}
}
const MARKET:ReadonlyArray<readonly [string,string]> = [
 ['pt-BR','Português — Brasil'],['pt-PT','Português — Portugal'],['es','Español'],
 ['en','English'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['nl','Nederlands'],
 ['ru','Русский'],['ja','日本語'],['zh-CN','简体中文'],['zh-TW','繁體中文'],
 ['ar','العربية'],['hi','हिन्दी'],['ko','한국어'],['id','Bahasa Indonesia'],
 ['tr','Türkçe'],['pl','Polski'],['sv','Svenska'],['no','Norsk'],['da','Dansk'],
 ['fi','Suomi'],['el','Ελληνικά'],['he','עברית'],['th','ไทย'],['vi','Tiếng Việt'],
 ['ms','Bahasa Melayu'],['uk','Українська'],['cs','Čeština'],['ro','Română'],
 ['hu','Magyar'],['bn','বাংলা'],['ta','தமிழ்'],['te','తెలుగు'],['ur','اردو'],
 ['fa','فارسی'],['sw','Kiswahili'],['af','Afrikaans'],['sq','Shqip'],['am','አማርኛ'],
 ['az','Azərbaycanca'],['be','Беларуская'],['bg','Български'],['bs','Bosanski'],
 ['ca','Català'],['cy','Cymraeg'],['et','Eesti'],['eu','Euskara'],['fil','Filipino'],
 ['ga','Gaeilge'],['gl','Galego'],['gu','ગુજરાતી'],['hr','Hrvatski'],
 ['hy','Հայերեն'],['is','Íslenska'],['ka','ქართული'],['kk','Қазақша'],
 ['km','ខ្មែរ'],['kn','ಕನ್ನಡ'],['ky','Кыргызча'],['lo','ລາວ'],
 ['lt','Lietuvių'],['lv','Latviešu'],['mk','Македонски'],['ml','മലയാളം'],
 ['mn','Монгол'],['mr','मराठी'],['my','မြန်မာ'],['ne','नेपाली'],
 ['pa','ਪੰਜਾਬੀ'],['ps','پښتو'],['si','සිංහල'],['sk','Slovenčina'],
 ['sl','Slovenščina'],['so','Soomaali'],['sr','Српски'],['su','Basa Sunda'],
 ['tg','Тоҷикӣ'],['tk','Türkmençe'],['uz','O‘zbekcha'],['xh','isiXhosa'],
 ['yo','Yorùbá'],['zu','isiZulu']
];

export function LocalePicker() {
 const {locale,setLocale,t}=useLocale();
 return <select className="select locale-select" aria-label={t('language')} title={t('language')} value={locale}
  onChange={event=>setLocale(event.target.value)}>
   {UI_LANGUAGES.map(([code,name])=><option key={code} value={code}>{name}</option>)}
 </select>;
}

export function CurrencyPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const {locale,t}=useLocale();
 const options=useMemo(()=>{
   const all=Array.from(new Set([...PREFERRED,...currencyCodes(),value])).filter(x=>/^[A-Z]{3}$/.test(x));
   const dn=(()=>{try{return new Intl.DisplayNames([locale],{type:'currency'});}catch{return null;}})();
   const rest=all.filter(c=>!PREFERRED.includes(c)).sort((a,b)=>a.localeCompare(b));
   return [...PREFERRED.filter(c=>all.includes(c)),...rest].map(code=>({code,name:dn?.of(code)||code}));
 },[locale,value]);
 return <select className="input" value={value} onChange={e=>onChange(e.target.value)} aria-label={t('currency')}>
  {options.map(({code,name})=><option key={code} value={code}>{code} — {name}</option>)}
 </select>;
}

export function MarketLanguagePicker({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const {t}=useLocale();
 return <>
  <input type="text" className="input" list="cacador-market-language-list" maxLength={35}
   aria-label={t('offerLanguage')} value={value} onChange={e=>onChange(e.target.value)}
   placeholder="pt-BR / es / en / fr" />
  <datalist id="cacador-market-language-list">{MARKET.map(([code,name])=><option key={code} value={code} label={name}/>)}</datalist>
  <small>{t('selectLanguage')}: ISO / BCP 47 (ex.: pt-BR, es, en, ar, hi).</small>
 </>;
}
