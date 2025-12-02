import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function DELETE(request: Request) {
  const { env } = getRequestContext();
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const userId = url.searchParams.get('userId');

  if (!key || !userId) {
    return new Response('Key and userId required', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  // Security check: Ensure the key belongs to the user
  if (!key.startsWith(`users/${userId}/`)) {
    return new Response('Unauthorized', { status: 403 });
  }

  try {
    await env.CHATTER_DATA.delete(key);
    return new Response('Deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting image:', error);
    return new Response('Failed to delete image', { status: 500 });
  }
}
