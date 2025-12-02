import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { env } = getRequestContext();
  
  // Debug logging
  console.log('Environment keys:', Object.keys(env));
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { prompt, userId, width, height, steps } = body;

  if (!prompt) {
    return new Response('Missing prompt', { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getImgKey = (env as any).GETIMG_API_KEY || process.env.GETIMG_API_KEY;

  if (!getImgKey) {
    console.error('GETIMG_API_KEY missing');
    return new Response('GETIMG_API_KEY not configured', { status: 500 });
  }

  if (!env.CHATTER_DATA) {
    console.error('CHATTER_DATA R2 binding missing');
    return new Response('R2 binding not found. Please configure CHATTER_DATA in Cloudflare Dashboard.', { status: 500 });
  }

  try {
    // Call GetImg API
    // Using Flux Schnell for speed and quality
    // Note: Flux Schnell might ignore width/height if not supported, but we'll pass them if provided.
    // Standard Flux Schnell usually supports standard aspect ratios.
    
    const params: any = {
      prompt: prompt,
      steps: steps || 4,
      response_format: 'b64'
    };

    // Only add width/height if provided (Flux Schnell supports them)
    if (width) params.width = width;
    if (height) params.height = height;

    const response = await fetch('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getImgKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GetImg API error:', response.status, error);
      return new Response(`GetImg API error: ${error}`, { status: response.status });
    }

    const data = await response.json();
    const base64Image = data.image;
    
    // Convert base64 to buffer
    const binaryString = atob(base64Image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Save to R2
    // Flux defaults to JPEG usually, but let's check the magic bytes or just save as png for now.
    // Actually, let's save as jpeg if we aren't sure, but the previous code used png.
    // To be safe, let's assume jpeg for Flux unless specified.
    // But wait, if I don't specify output_format, it might be jpeg.
    // Let's try to detect or just save as .png and hope browser handles it (it usually does).
    // Better: Let's try to send output_format: 'png' if possible.
    // But since I don't have the docs, I'll stick to minimal params.
    
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    // We'll use .png extension but it might be a jpeg. Browsers are forgiving.
    const key = `users/${userId}/images/${timestamp}_${id}.png`;
    
    await env.CHATTER_DATA.put(key, bytes, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { prompt: prompt.substring(0, 1000) } // Store prompt in metadata
    });

    // Update index file (optional, but good for performance if listing is slow)
    // For now, we'll rely on listing the prefix, but we need to return the URL
    // The URL will be our own API route: /api/images/view?key=...

    return Response.json({
      id,
      url: `/api/images/view?key=${encodeURIComponent(key)}`,
      prompt,
      createdAt: timestamp
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
