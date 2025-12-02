import { getRequestContext } from '@cloudflare/next-on-pages';
import OpenAI from 'openai';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { env } = getRequestContext();
  
  const models = [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openaiKey = process.env.OPENAI_API_KEY || (env as any).OPENAI_API_KEY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xaiKey = process.env.XAI_API_KEY || (env as any).XAI_API_KEY;

  // Fetch OpenAI models
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const list = await openai.models.list();
      models.push(...list.data.filter(m => m.id.includes('gpt')).map(m => ({ id: m.id, provider: 'OpenAI' })));
    } catch (e) {
      console.error('Failed to fetch OpenAI models', e);
    }
  }

  // Fetch xAI models
  // Note: xAI uses OpenAI compatible API
  if (xaiKey) {
    try {
      const xai = new OpenAI({ 
        apiKey: xaiKey,
        baseURL: 'https://api.x.ai/v1'
      });
      const list = await xai.models.list();
      models.push(...list.data.map(m => ({ id: m.id, provider: 'xAI' })));
    } catch (e) {
      console.error('Failed to fetch xAI models', e);
    }
  }

  return Response.json(models);
}
