import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages, data } = await req.json();

  // If there are images in the data payload, attach them to the last message
  const initialMessages = messages.slice(0, -1);
  const currentMessage = messages[messages.length - 1];

  if (data && data.images && data.images.length > 0) {
    currentMessage.content = [
      { type: 'text', text: currentMessage.content },
      ...data.images.map((image: string) => ({
        type: 'image_url',
        image_url: { url: image },
      })),
    ];
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [...initialMessages, currentMessage],
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
