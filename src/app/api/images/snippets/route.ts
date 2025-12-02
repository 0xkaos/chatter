import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { env } = getRequestContext();
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response('User ID required', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    const key = `users/${userId}/snippets.json`;
    const file = await env.CHATTER_DATA.get(key);
    
    if (!file) {
      return Response.json([]);
    }

    const snippets = await file.json();
    return Response.json(snippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return Response.json([]);
  }
}

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const { userId, snippets } = await request.json();

  if (!userId || !Array.isArray(snippets)) {
    return new Response('Invalid data', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    const key = `users/${userId}/snippets.json`;
    await env.CHATTER_DATA.put(key, JSON.stringify(snippets));
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error saving snippets:', error);
    return new Response('Failed to save snippets', { status: 500 });
  }
}
