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
    const key = `users/${userId}/settings.json`;
    const file = await env.CHATTER_DATA.get(key);
    
    if (!file) {
      // Return default settings if none exist
      return Response.json({ hiddenModels: [] });
    }
    
    const settings = await file.json();
    return Response.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return new Response('Failed to fetch settings', { status: 500 });
  }
}

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const { userId, settings } = await request.json();

  if (!userId || !settings) {
    return new Response('User ID and settings required', { status: 400 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    const key = `users/${userId}/settings.json`;
    
    // Fetch existing settings to merge
    let existingSettings = {};
    const existingFile = await env.CHATTER_DATA.get(key);
    if (existingFile) {
      existingSettings = await existingFile.json();
    }

    const newSettings = { ...existingSettings, ...settings };
    
    await env.CHATTER_DATA.put(key, JSON.stringify(newSettings));
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return new Response('Failed to save settings', { status: 500 });
  }
}
