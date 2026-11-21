import {receiveGrokResearch} from '@/lib/grok-research-ingest';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){return receiveGrokResearch(req,'mini_apps');}
