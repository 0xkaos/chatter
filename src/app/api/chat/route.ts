import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { getRequestContext } from '@cloudflare/next-on-pages';
import {
  getHuggingFaceBaseURL,
  getHuggingFaceModelId,
  isHuggingFaceSelectorId,
} from '@/lib/huggingface';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const { messages, data, model, systemPrompt } = await req.json();

  // Debug logging for attachments
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.experimental_attachments?.length) {
    console.log(`Received ${lastMsg.experimental_attachments.length} attachments in last message`);
  } else {
    console.log('No attachments found in last message');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openaiKey = process.env.OPENAI_API_KEY || (env as any).OPENAI_API_KEY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xaiKey = process.env.XAI_API_KEY || (env as any).XAI_API_KEY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const huggingFaceToken = process.env.HF_TOKEN || (env as any).HF_TOKEN;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const huggingFaceEndpoint = process.env.HF_ENDPOINT_URL || (env as any).HF_ENDPOINT_URL;

  // Determine which client to use based on the model
  let client: OpenAI;
  let requestedModel = model || 'gpt-4o';
  
  if (isHuggingFaceSelectorId(model)) {
    if (!huggingFaceToken) {
      return new Response('Hugging Face endpoint is not configured', { status: 500 });
    }

    client = new OpenAI({
      apiKey: huggingFaceToken,
      baseURL: getHuggingFaceBaseURL(huggingFaceEndpoint),
    });
    requestedModel = getHuggingFaceModelId(model);
  } else if (model && (model.includes('grok') || model.includes('xai'))) {
    if (!xaiKey) {
      return new Response('xAI is not configured', { status: 500 });
    }

    client = new OpenAI({
      apiKey: xaiKey,
      baseURL: 'https://api.x.ai/v1'
    });
  } else {
    if (!openaiKey) {
      return new Response('OpenAI is not configured', { status: 500 });
    }

    client = new OpenAI({ apiKey: openaiKey });
  }

  // Process messages to handle attachments (multimodal)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalMessages = messages.map((m: any) => {
    // Check for experimental_attachments (standard AI SDK way)
    if (m.experimental_attachments && m.experimental_attachments.length > 0) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...m.experimental_attachments
            .filter((a: any) => a.contentType?.startsWith('image/'))
            .map((a: any) => ({
              type: 'image_url',
              image_url: { url: a.url }
            }))
        ]
      };
    }
    
    // Legacy/Fallback: Check if data.images was passed (persisted in history)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (m.data && m.data.images && m.data.images.length > 0) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...m.data.images.map((image: string) => ({
            type: 'image_url',
            image_url: { url: image },
          })),
        ]
      };
    }

    // Check if this is the last message and data.images was passed in the request body (current upload)
    if (m === messages[messages.length - 1] && data && data.images && data.images.length > 0) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...data.images.map((image: string) => ({
            type: 'image_url',
            image_url: { url: image },
          })),
        ]
      };
    }

    // Standard text message
    return {
      role: m.role,
      content: m.content
    };
  });
  
  if (systemPrompt) {
    finalMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await client.chat.completions.create({
    model: requestedModel,
    stream: true,
    messages: finalMessages,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = OpenAIStream(response as any);
  return new StreamingTextResponse(stream);
}
