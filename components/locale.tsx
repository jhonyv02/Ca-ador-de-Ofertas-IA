'use client';

import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';

/** Idiomas traduzidos na navegação e no fluxo principal. Outros idiomas de OFERTA são livres (BCP 47). */
export const UI_LANGUAGES = [
  ['pt-BR','Português (Brasil)'], ['pt-PT','Português (Portugal)'], ['en','English'],
  ['es','Español'], ['fr','Français'], ['de','Deutsch'], ['it','Italiano'],
  ['nl','Nederlands'], ['ar','العربية'], ['hi','हिन्दी'], ['ja','日本語'],
  ['zh-CN','简体中文'], ['ru','Русский'], ['ko','한국어'], ['id','Bahasa Indonesia'],
  ['tr','Türkçe']
] as const;

const pt:Record<string,string>={
  dashboard:'Início', products:'Produtos', ads:'Anúncios', compare:'Comparar',
  simulator:'Simulador', settings:'Configurações', more:'Mais ferramentas',
  logout:'Sair', private:'Área privada', language:'Idioma do painel', currency:'Moeda',
  newProduct:'Novo produto', newAd:'Salvar anúncio', save:'Salvar', cancel:'Cancelar',
  productName:'Nome do produto', productType:'Tipo', price:'Preço de venda',
  salesPage:'Link da página de vendas', researchStatus:'Etapa da pesquisa',
  niche:'Nicho', country:'País', offerLanguage:'Idioma da oferta', cost:'Custo do produto',
  fees:'Taxas por venda', checkout:'Link do checkout', pageCopy:'Texto da página',
  promise:'Promessa da oferta', audience:'Público-alvo', notes:'Observações',
  optional:'opcional', advanced:'Mais opções (opcional)', essentials:'Somente o essencial',
  digital:'Digital', physical:'Físico', service:'Serviço',
  researching:'Pesquisando', ready:'Pronto para testar', testing:'Em teste',
  winning:'Validado', discarded:'Descartado', metaLink:'Cole o link do anúncio',
  associatedProduct:'Produto', selectProduct:'Selecione um produto',
  quickProduct:'Criar produto com este nome', adTitle:'Nome do anúncio',
  import:'Consultar link', importing:'Consultando...', advertiser:'Anunciante',
  platform:'Plataforma', adCopy:'Texto do anúncio', hook:'Gancho do anúncio',
  startDate:'Data de início', observedStatus:'Status observado',
  firstSeen:'Data em que encontrou', upload:'Print, imagem ou vídeo',
  favorite:'Favoritar anúncio', unknown:'Não verificado', active:'Ativo',
  inactive:'Inativo', manual:'Completar manualmente', verified:'Dados encontrados',
  unavailable:'Não foi possível ler todos os dados; complete manualmente',
  savedInfo:'Dados salvos somente no seu banco', productPlaceholder:'Ex.: Mapas mentais de informática',
  noProduct:'Selecione um produto ou crie um novo pelo nome.',
  needName:'Informe o nome do produto.', validURL:'Informe um link válido.',
  productsTitle:'Produtos salvos', productsDescription:'Guarde ofertas para comparar depois.',
  adsTitle:'Meus anúncios', adsDescription:'Cole links, salve e compare.',
  search:'Buscar', noAds:'Nenhum anúncio salvo', noProducts:'Nenhum produto salvo',
  filters:'Filtros', export:'Exportar', selectCurrency:'Escolha uma moeda',
  selectLanguage:'Selecione um idioma', productSaved:'Produto salvo',
  favoriteOnly:'Favoritos', saved:'Salvar anúncio', overview:'Seu painel',
  settingsTitle:'Preferências', quickStart:'Comece salvando sua primeira oferta',
  autoOnly:'O sistema só preenche dados que conseguir confirmar. Você pode completar o restante.'
};
const en:Record<string,string>={
  dashboard:'Home',products:'Products',ads:'Ads',compare:'Compare',simulator:'Test simulator',settings:'Settings',
  more:'More tools',logout:'Log out',private:'Private area',language:'Interface language',
  currency:'Currency',newProduct:'New product',newAd:'Save ad',save:'Save',cancel:'Cancel',
  productName:'Product name',productType:'Type',price:'Selling price',salesPage:'Sales page URL',
  researchStatus:'Research stage',niche:'Niche',country:'Country',offerLanguage:'Offer language',
  cost:'Product cost',fees:'Fees per sale',checkout:'Checkout URL',pageCopy:'Sales page text',
  promise:'Main promise',audience:'Target audience',notes:'Notes',optional:'optional',
  advanced:'More options (optional)',essentials:'Just the essentials',
  digital:'Digital',physical:'Physical',service:'Service',researching:'Researching',
  ready:'Ready to test',testing:'Testing',winning:'Validated',discarded:'Discarded',
  metaLink:'Paste the ad link',associatedProduct:'Product',selectProduct:'Choose a product',
  quickProduct:'Create a product with this name',adTitle:'Ad name',import:'Check link',
  importing:'Checking...',advertiser:'Advertiser',platform:'Platform',adCopy:'Ad text',hook:'Ad hook',
  startDate:'Start date',observedStatus:'Observed status',firstSeen:'Date found',
  upload:'Screenshot, image or video',favorite:'Favorite ad',unknown:'Unverified',
  active:'Active',inactive:'Inactive',manual:'Fill in manually',verified:'Data found',
  unavailable:'Some information is unavailable; add it manually',savedInfo:'Saved to your private database',
  productPlaceholder:'E.g. IT mind maps',noProduct:'Choose a product or enter a new one.',
  needName:'Enter the product name.',validURL:'Enter a valid URL.',
  productsTitle:'Saved products',productsDescription:'Keep offers here to compare later.',
  adsTitle:'My ads',adsDescription:'Paste links, save and compare.',search:'Search',noAds:'No ads saved',
  noProducts:'No products saved',filters:'Filters',export:'Export',selectCurrency:'Choose a currency',
  selectLanguage:'Choose a language',productSaved:'Product saved',favoriteOnly:'Favorites',
  saved:'Save ad',overview:'Your dashboard',settingsTitle:'Preferences',
  quickStart:'Start by saving your first offer',autoOnly:'Only verifiable data is filled automatically. You can add missing details.'
};
const es:Record<string,string>={
  dashboard:'Inicio',products:'Productos',ads:'Anuncios',compare:'Comparar',simulator:'Simulador',
  settings:'Configuración',more:'Más herramientas',logout:'Salir',private:'Área privada',language:'Idioma del panel',
  currency:'Moneda',newProduct:'Nuevo producto',newAd:'Guardar anuncio',save:'Guardar',cancel:'Cancelar',
  productName:'Nombre del producto',productType:'Tipo',price:'Precio de venta',
  salesPage:'Enlace a la página de ventas',researchStatus:'Etapa de investigación',niche:'Nicho',
  country:'País',offerLanguage:'Idioma de la oferta',cost:'Costo del producto',fees:'Tarifas por venta',
  checkout:'Enlace de pago',pageCopy:'Texto de ventas',promise:'Promesa principal',
  audience:'Público objetivo',notes:'Notas',advanced:'Más opciones (opcional)',
  essentials:'Solo lo esencial',digital:'Digital',physical:'Físico',service:'Servicio',
  researching:'Investigando',ready:'Listo para probar',testing:'En prueba',
  winning:'Validado',discarded:'Descartado',metaLink:'Pega el enlace del anuncio',
  associatedProduct:'Producto',selectProduct:'Selecciona un producto',
  quickProduct:'Crear producto con este nombre',adTitle:'Nombre del anuncio',
  import:'Consultar enlace',importing:'Consultando...',advertiser:'Anunciante',
  platform:'Plataforma',adCopy:'Texto del anuncio',hook:'Gancho del anuncio',
  startDate:'Fecha de inicio',observedStatus:'Estado observado',firstSeen:'Fecha encontrada',
  upload:'Captura, imagen o vídeo',favorite:'Guardar favorito',unknown:'Sin verificar',
  active:'Activo',inactive:'Inactivo',manual:'Completar manualmente',
  verified:'Datos encontrados',unavailable:'Faltan datos; complétalos manualmente',
  productPlaceholder:'Ej.: Mapas mentales de informática',
  noProduct:'Selecciona un producto o crea uno nuevo.',needName:'Escribe el nombre del producto.',
  validURL:'Introduce un enlace válido.',productsTitle:'Productos guardados',
  productsDescription:'Guarda ofertas para comparar luego.',adsTitle:'Mis anuncios',
  adsDescription:'Pega enlaces, guarda y compara.',search:'Buscar',noAds:'No hay anuncios',
  noProducts:'No hay productos',filters:'Filtros',export:'Exportar',
  selectCurrency:'Selecciona moneda',selectLanguage:'Selecciona idioma',
  favoriteOnly:'Favoritos',saved:'Guardar anuncio',overview:'Tu panel',
  settingsTitle:'Preferencias',quickStart:'Empieza guardando tu primera oferta',
  autoOnly:'Solo se completan los datos confirmados. Puedes añadir el resto.'
};
const fr:Record<string,string>={
 dashboard:'Accueil',products:'Produits',ads:'Publicités',compare:'Comparer',simulator:'Simulateur',
 settings:'Paramètres',more:'Autres outils',logout:'Déconnexion',private:'Espace privé',
 language:'Langue de l’interface',currency:'Devise',newProduct:'Nouveau produit',newAd:'Enregistrer la publicité',
 save:'Enregistrer',cancel:'Annuler',productName:'Nom du produit',productType:'Type',price:'Prix de vente',
 salesPage:'Lien de la page de vente',researchStatus:'Étape de recherche',niche:'Niche',
 country:'Pays',offerLanguage:'Langue de l’offre',cost:'Coût du produit',fees:'Frais par vente',
 checkout:'Lien de paiement',pageCopy:'Texte de vente',promise:'Promesse',audience:'Public cible',
 notes:'Notes',advanced:'Autres options (facultatif)',digital:'Numérique',physical:'Physique',
 service:'Service',researching:'Recherche',ready:'Prêt à tester',testing:'En test',
 winning:'Validé',discarded:'Écarté',metaLink:'Collez le lien de la publicité',
 associatedProduct:'Produit',selectProduct:'Choisir un produit',quickProduct:'Créer ce produit',
 adTitle:'Nom de la publicité',import:'Vérifier le lien',importing:'Vérification...',
 advertiser:'Annonceur',platform:'Plateforme',adCopy:'Texte publicitaire',hook:'Accroche',
 startDate:'Date de début',observedStatus:'Statut observé',firstSeen:'Date de découverte',
 upload:'Capture, image ou vidéo',favorite:'Favori',unknown:'Non vérifié',active:'Actif',
 inactive:'Inactif',manual:'Compléter manuellement',verified:'Données trouvées',
 unavailable:'Informations manquantes : complétez-les manuellement',
 productsTitle:'Produits enregistrés',adsTitle:'Mes publicités',search:'Rechercher',
 export:'Exporter',settingsTitle:'Préférences'
};
const de:Record<string,string>={
 dashboard:'Startseite',products:'Produkte',ads:'Anzeigen',compare:'Vergleichen',
 simulator:'Testrechner',settings:'Einstellungen',more:'Weitere Tools',logout:'Abmelden',
 language:'Sprache der Oberfläche',currency:'Währung',newProduct:'Neues Produkt',
 newAd:'Anzeige speichern',save:'Speichern',cancel:'Abbrechen',productName:'Produktname',
 productType:'Typ',price:'Verkaufspreis',salesPage:'Verkaufsseite',niche:'Nische',
 country:'Land',offerLanguage:'Angebotssprache',cost:'Produktkosten',fees:'Gebühren',
 checkout:'Checkout-Link',notes:'Notizen',advanced:'Weitere Optionen (optional)',
 digital:'Digital',physical:'Physisch',service:'Dienstleistung',
 researching:'Recherche',ready:'Bereit zum Testen',testing:'Im Test',
 winning:'Bestätigt',discarded:'Verworfen',metaLink:'Anzeigenlink einfügen',
 associatedProduct:'Produkt',selectProduct:'Produkt wählen',quickProduct:'Neues Produkt eingeben',
 adTitle:'Anzeigenname',import:'Link prüfen',importing:'Prüfe...',
 advertiser:'Werbetreibender',platform:'Plattform',adCopy:'Anzeigentext',hook:'Einstieg',
 startDate:'Startdatum',observedStatus:'Beobachteter Status',upload:'Screenshot, Bild oder Video',
 unknown:'Ungeprüft',active:'Aktiv',inactive:'Inaktiv',manual:'Manuell ergänzen',
 productsTitle:'Gespeicherte Produkte',adsTitle:'Meine Anzeigen',search:'Suchen',
 export:'Exportieren',settingsTitle:'Einstellungen'
};
const it:Record<string,string>={
 dashboard:'Home',products:'Prodotti',ads:'Annunci',compare:'Confronta',simulator:'Simulatore',
 settings:'Impostazioni',more:'Altri strumenti',logout:'Esci',language:'Lingua del pannello',
 currency:'Valuta',newProduct:'Nuovo prodotto',newAd:'Salva annuncio',save:'Salva',
 cancel:'Annulla',productName:'Nome del prodotto',productType:'Tipo',price:'Prezzo di vendita',
 salesPage:'Link pagina di vendita',niche:'Nicchia',country:'Paese',
 offerLanguage:'Lingua dell’offerta',cost:'Costo del prodotto',fees:'Commissioni',
 checkout:'Link pagamento',notes:'Note',advanced:'Altre opzioni (facoltative)',
 digital:'Digitale',physical:'Fisico',service:'Servizio',researching:'Ricerca',
 ready:'Pronto per test',testing:'In prova',winning:'Convalidato',discarded:'Scartato',
 metaLink:'Incolla il link dell’annuncio',associatedProduct:'Prodotto',
 selectProduct:'Scegli un prodotto',quickProduct:'Crea un prodotto con questo nome',
 adTitle:'Nome annuncio',import:'Controlla link',importing:'Controllo...',
 platform:'Piattaforma',adCopy:'Testo annuncio',hook:'Gancio',startDate:'Data di inizio',
 observedStatus:'Stato osservato',unknown:'Non verificato',active:'Attivo',
 inactive:'Inattivo',manual:'Completa manualmente',productsTitle:'Prodotti salvati',
 adsTitle:'I miei annunci',search:'Cerca',export:'Esporta'
};
const other:Record<string,Record<string,string>>={
 'nl':{dashboard:'Start',products:'Producten',ads:'Advertenties',compare:'Vergelijken',settings:'Instellingen',language:'Taal',currency:'Valuta',save:'Opslaan',cancel:'Annuleren',newAd:'Advertentie opslaan',newProduct:'Nieuw product',advanced:'Meer opties',metaLink:'Advertentielink plakken'},
 'ar':{dashboard:'الرئيسية',products:'المنتجات',ads:'الإعلانات',compare:'مقارنة',settings:'الإعدادات',language:'لغة الواجهة',currency:'العملة',save:'حفظ',cancel:'إلغاء',newAd:'حفظ الإعلان',newProduct:'منتج جديد',advanced:'خيارات إضافية',metaLink:'ألصق رابط الإعلان'},
 'hi':{dashboard:'होम',products:'उत्पाद',ads:'विज्ञापन',compare:'तुलना करें',settings:'सेटिंग्स',language:'भाषा',currency:'मुद्रा',save:'सहेजें',cancel:'रद्द करें',newAd:'विज्ञापन सहेजें',newProduct:'नया उत्पाद',advanced:'अधिक विकल्प',metaLink:'विज्ञापन लिंक डालें'},
 'ja':{dashboard:'ホーム',products:'商品',ads:'広告',compare:'比較',settings:'設定',language:'表示言語',currency:'通貨',save:'保存',cancel:'キャンセル',newAd:'広告を保存',newProduct:'新しい商品',advanced:'詳細設定',metaLink:'広告リンクを貼り付け'},
 'zh-CN':{dashboard:'首页',products:'产品',ads:'广告',compare:'比较',settings:'设置',language:'界面语言',currency:'货币',save:'保存',cancel:'取消',newAd:'保存广告',newProduct:'新产品',advanced:'更多选项',metaLink:'粘贴广告链接'},
 'ru':{dashboard:'Главная',products:'Товары',ads:'Реклама',compare:'Сравнить',settings:'Настройки',language:'Язык интерфейса',currency:'Валюта',save:'Сохранить',cancel:'Отмена',newAd:'Сохранить рекламу',newProduct:'Новый товар',advanced:'Другие параметры',metaLink:'Вставьте ссылку'},
 'ko':{dashboard:'홈',products:'상품',ads:'광고',compare:'비교',settings:'설정',language:'화면 언어',currency:'통화',save:'저장',cancel:'취소',newAd:'광고 저장',newProduct:'새 상품',advanced:'추가 옵션',metaLink:'광고 링크 붙여넣기'},
 'id':{dashboard:'Beranda',products:'Produk',ads:'Iklan',compare:'Bandingkan',settings:'Pengaturan',language:'Bahasa',currency:'Mata uang',save:'Simpan',cancel:'Batal',newAd:'Simpan iklan',newProduct:'Produk baru',advanced:'Opsi tambahan',metaLink:'Tempel tautan iklan'},
 'tr':{dashboard:'Ana sayfa',products:'Ürünler',ads:'Reklamlar',compare:'Karşılaştır',settings:'Ayarlar',language:'Dil',currency:'Para birimi',save:'Kaydet',cancel:'İptal',newAd:'Reklam kaydet',newProduct:'Yeni ürün',advanced:'Diğer seçenekler',metaLink:'Reklam bağlantısını yapıştır'}
};

const translations:Record<string,Record<string,string>> = {
 'pt-BR':pt,'pt-PT':{...pt,productName:'Nome do produto',price:'Preço de venda',settings:'Definições'},
 'en':en,'es':es,'fr':fr,'de':de,'it':it,...other
};
type LocaleContextValue = { locale:string; setLocale:(locale:string)=>void; defaultCurrency:string; setDefaultCurrency:(currency:string)=>void; t:(key:string)=>string };
const LocaleContext=createContext<LocaleContextValue|null>(null);

export function LocaleProvider({children}:{children:ReactNode}) {
 const [locale,setLocaleState]=useState('pt-BR');
 const [defaultCurrency,setDefaultCurrencyState]=useState('BRL');
 useEffect(()=>{
   try {
     const storedCurrency=window.localStorage.getItem('cacador-default-currency');
     if(storedCurrency&&/^[A-Z]{3}$/.test(storedCurrency))setDefaultCurrencyState(storedCurrency);
     const stored=window.localStorage.getItem('cacador-ui-locale');
     if(stored&&translations[stored])setLocaleState(stored);
     else {const browser=window.navigator.language;const exact=UI_LANGUAGES.find(([key])=>key===browser);
       const generic=UI_LANGUAGES.find(([key])=>key.split('-')[0]===browser.split('-')[0]);
       setLocaleState(exact?.[0]||generic?.[0]||'pt-BR');}
   } catch { /* localStorage indisponível */ }
 },[]);
 const setLocale=(value:string)=>{
   if(!translations[value])return;
   setLocaleState(value);
   try {window.localStorage.setItem('cacador-ui-locale',value);}catch{/* navegador privado */}
 };
 const setDefaultCurrency=(currency:string)=>{
   if(!/^[A-Z]{3}$/.test(currency))return;
   setDefaultCurrencyState(currency);
   try {window.localStorage.setItem('cacador-default-currency',currency);}catch{/* navegador privado */}
 };
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';},[locale]);
 const t=(key:string)=>translations[locale]?.[key]||pt[key]||key;
 const value=useMemo(()=>({locale,setLocale,defaultCurrency,setDefaultCurrency,t}),[locale,defaultCurrency]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale(){const ctx=useContext(LocaleContext);if(!ctx)throw new Error('LocaleProvider ausente');return ctx;}
