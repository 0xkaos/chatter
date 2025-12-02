import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const { prompt, userId } = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getImgKey = (env as any).GETIMG_API_KEY || process.env.GETIMG_API_KEY;

  if (!getImgKey) {
    return new Response('GETIMG_API_KEY not configured', { status: 500 });
  }

  if (!env.CHATTER_DATA) {
    return new Response('R2 binding not found', { status: 500 });
  }

  try {
    // Call GetImg API
    // Using Essential v2 for speed/cost, or SDXL
    const response = await fetch('https://api.getimg.ai/v1/stable-diffusion/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getImgKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'stable-diffusion-xl-v1-0',
        prompt: prompt,
        negative_prompt: "disfigured, blurry, low quality",
        width: 1024,
        height: 1024,
        steps: 30,
        guidance: 7.5,
        output_format: 'png',
        response_format: 'b64'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GetImg API error:', error);
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
    const id = crypto.randomUUID();
    const timestamp = Date.now();
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
