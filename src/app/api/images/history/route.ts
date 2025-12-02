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
    // List objects in the user's image directory
    // Note: This might be slow if there are thousands, but for hundreds it's fine.
    // We'll list in reverse order if possible, but R2 list is lexicographical.
    // Since we named files with timestamp prefix, they are sorted by time.
    // But we want newest first. We'll have to sort in memory.
    
    const list = await env.CHATTER_DATA.list({
      prefix: `users/${userId}/images/`,
      limit: 100, // Limit to 100 for now
      include: ['customMetadata'] // Request custom metadata (prompt)
    });

    const images = list.objects.map(obj => {
      // Extract timestamp from key: users/userId/images/TIMESTAMP_ID.png
      const filename = obj.key.split('/').pop() || '';
      const timestamp = parseInt(filename.split('_')[0]) || 0;
      
      return {
        id: obj.key,
        url: `/api/images/view?key=${encodeURIComponent(obj.key)}`,
        prompt: obj.customMetadata?.prompt || 'No prompt',
        createdAt: timestamp
      };
    });

    // Sort by newest first
    images.sort((a, b) => b.createdAt - a.createdAt);

    return Response.json(images);
  } catch (error) {
    console.error('Error listing images:', error);
    return new Response('Failed to list images', { status: 500 });
  }
}
