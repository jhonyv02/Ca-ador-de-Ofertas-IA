import type { Ad, Product } from './types';
import { safeHttpUrl } from './utils.ts';
import {repairMetaLibraryLink} from './meta-search.ts';

function safeLibraryUrl(raw:string):string {
  const http=safeHttpUrl(raw);
  return http?repairMetaLibraryLink(http):'';
}

const LIBRARY_NOTE = /Biblioteca do anunciante:\s*(\S+)/i;
const LIBRARY_LINE = /(^|\n)Biblioteca do anunciante:\s*\S+/g;

export function notesWithoutAdvertiserLibrary(notes: string): string {
  return notes.replace(LIBRARY_LINE, '$1').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Guarda o link nas anotações quando a coluna nova ainda não existe no banco. */
export function notesWithAdvertiserLibrary(notes: string, url: string): string {
  const cleaned = notesWithoutAdvertiserLibrary(notes);
  if (!url) return cleaned;
  return [cleaned, `Biblioteca do anunciante: ${url}`].filter(Boolean).join('\n');
}
const URL_IN_TEXT = /https?:\/\/\S+/g;

export type TextPart = { type: 'text'; value: string } | { type: 'link'; value: string; href: string };

/** Quebra um texto em trechos e links http(s), prontos para target=_blank. */
export function linkifyParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ type: 'text', value: text.slice(last, start) });
    const raw = match[0];
    const trimmed = raw.replace(/[),.;:!?]+$/, '');
    const visible = trimmed.length >= 'https://x'.length ? trimmed : raw;
    const href = safeHttpUrl(visible);
    if (href) {
      parts.push({ type: 'link', value: visible, href });
      const trailing = raw.slice(visible.length);
      if (trailing) parts.push({ type: 'text', value: trailing });
    } else {
      parts.push({ type: 'text', value: raw });
    }
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  if (!parts.length) parts.push({ type: 'text', value: text });
  return parts;
}

export function libraryUrlFromNotes(notes?: string | null): string {
  const raw = notes?.match(LIBRARY_NOTE)?.[1] || '';
  return safeLibraryUrl(raw.replace(/[),.;]+$/, ''));
}

export function advertiserLibraryUrl(ad: Pick<Ad, 'advertiser_library_url' | 'notes'>): string {
  return safeLibraryUrl(ad.advertiser_library_url || '') || libraryUrlFromNotes(ad.notes);
}

/** Link da biblioteca da oferta: coluna do produto, notas, biblioteca do anunciante ou o anúncio. */
export function offerLibraryUrl(
  product: Pick<Product, 'ad_library_url' | 'notes'>,
  ads: Pick<Ad, 'advertiser_library_url' | 'notes' | 'ad_url' | 'created_at'>[]
): string {
  const own = safeLibraryUrl(product.ad_library_url || '') || libraryUrlFromNotes(product.notes);
  if (own) return own;
  const ordered = [...ads].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  for (const ad of ordered) {
    const library = advertiserLibraryUrl(ad);
    if (library) return library;
  }
  const firstAdUrl = safeLibraryUrl(ordered[0]?.ad_url || '');
  if (firstAdUrl) return firstAdUrl;
  for (const ad of ordered) {
    const url = safeLibraryUrl(ad.ad_url || '');
    if (url) return url;
  }
  return '';
}

export function sameHttpUrl(a?: string | null, b?: string | null): boolean {
  const left = safeLibraryUrl(a || '').replace(/\/$/, '');
  const right = safeLibraryUrl(b || '').replace(/\/$/, '');
  return !!left && left === right;
}

export function adHasImage(ad: Pick<Ad, 'creative_path' | 'creative_thumb_path' | 'creative_type'>): boolean {
  if (ad.creative_thumb_path) return true;
  return !!ad.creative_path && ad.creative_type !== 'video';
}

export function firstAdWithImage<T extends Pick<Ad, 'creative_path' | 'creative_thumb_path' | 'creative_type'>>(ads: T[]): T | undefined {
  return ads.find(adHasImage);
}

export type AdvertiserLibrary = { key: string; name: string; url: string; count: number };

export function distinctAdvertisers(ads: Ad[]): AdvertiserLibrary[] {
  const map = new Map<string, AdvertiserLibrary>();
  const ordered = [...ads].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  for (const ad of ordered) {
    const url = advertiserLibraryUrl(ad);
    const name = ad.advertiser?.trim() || 'Anunciante não informado';
    const key = (url || name).toLowerCase();
    const current = map.get(key);
    if (current) {
      current.count += 1;
      if (current.name === 'Anunciante não informado' && name !== 'Anunciante não informado') current.name = name;
      if (!current.url && url) current.url = url;
    } else {
      map.set(key, { key, name, url, count: 1 });
    }
  }
  return [...map.values()];
}

export function creativeStoragePaths(ad: Pick<Ad, 'creative_path' | 'creative_thumb_path'>): string[] {
  return [ad.creative_path, ad.creative_thumb_path].filter((path): path is string => !!path);
}
