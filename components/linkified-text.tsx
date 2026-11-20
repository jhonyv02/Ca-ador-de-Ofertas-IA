import { linkifyParts } from '@/lib/library-links';

/** Transforma http(s):// no texto em links que abrem em nova aba. */
export function LinkifiedText({ text }: { text: string }) {
  return <>{linkifyParts(text).map((part, index) => part.type === 'link'
    ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.value}</a>
    : <span key={index}>{part.value}</span>)}</>;
}
