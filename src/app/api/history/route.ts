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
    const list = await env.CHATTER_DATA.list({ prefix: `users/${userId}/chats/` });
    const chats = await Promise.all(list.objects.map(async (obj) => {
      const file = await env.CHATTER_DATA.get(obj.key);
      if (!file) return null;
      const data = await file.json();
      return data;
    }));

    return Response.json(chats.filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt));
  } catch (error) {
    console.error('Error listing chats:', error);
    return new Response('Failed to list chats', { status: 500 });
  }
}

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const chat = await request.json();

  if (!chat.userId || !chat.id) {
    return new Response('Invalid chat data', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    const key = `users/${chat.userId}/chats/${chat.id}.json`;
    await env.CHATTER_DATA.put(key, JSON.stringify(chat));
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error saving chat:', error);
    return new Response('Failed to save chat', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { env } = getRequestContext();
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const chatId = url.searchParams.get('chatId');

  if (!userId || !chatId) {
    return new Response('User ID and Chat ID required', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    const key = `users/${userId}/chats/${chatId}.json`;
    await env.CHATTER_DATA.delete(key);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('Failed to delete chat', { status: 500 });
  }
}
