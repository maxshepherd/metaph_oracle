import express, { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Add this to parse JSON bodies for this router
router.use(express.json());

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic route
router.get('/test', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Express.js server!' });
});


router.post('/', async (req: Request, res: Response): Promise<void> => {
    const {prompt} =  await req.body;

    if (!prompt || prompt.length < 25) {
      res.status(400).json({ error: 'Prompt is required and must be at least 25 characters long' });
      return;
    }
    try {
      const { metaphor, imagePrompt, imageUrl } = await chainedImageGeneration(prompt);
      res.json({ metaphor, imagePrompt, imageUrl });
    } catch (error) {
      console.error('Error processing OpenAI request:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
});

// OpenAI route - POST method (for handling user prompts)
router.post(
  '/api',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt } = await req.body;

      if (!prompt || prompt.length < 25) {
        res.status(400).json({ error: 'Prompt is required and must be at least 25 characters long' });
        return;
      }

      const response = await getOpenAIResponseWithPrompt(prompt);
      const imagePrompt = await makeImagePromptFromMetaphor(response);
      res.json({ response, imagePrompt });
    } catch (error) {
      console.error('Error processing OpenAI request:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);



// Function to get response from OpenAI with default prompt
async function getOpenAIResponse(): Promise<string | null> {
  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4.1-nano-2025-04-14',
    messages: [
      {
        role: 'system',
        content:
          'You are a master of the metaphor and simile. You make complex problems simple and easy to understand.',
      },
      { role: 'user', content: 'explain to me what quantum computing is' },
    ],
  });

  return chatCompletion.choices[0].message.content;
}

// Function to get response from OpenAI with user-provided prompt
async function getOpenAIResponseWithPrompt(prompt: string): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4.1-nano-2025-04-14',
    messages: [
      {
        role: 'system',
        content:
          'You are a master of the metaphor and simile. You make complex problems simple and easy to understand helping the user to visualize concepts through singular mental models, and all in under 200 words.',
      },
      { role: 'user', content: prompt },
    ],
  });

  // Extract the text content from the response
  return chatCompletion.choices[0].message.content ?? '';
}

async function makeImagePromptFromMetaphor(metaphor: string): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4.1-nano-2025-04-14',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert in creating vivid and imaginative image prompts based on metaphors. Your task is to generate a detailed and creative description that can be used to create an image. Make sure the description is rich in detail and evokes strong imagery. Leave out any additional context or instructions.',
      },
      {
        role: 'user',
        content: `Given the metaphor: "${metaphor}", write a vivid image generation prompt for a model like DALL·E.`,
      },
    ],
  });
  // Adjust this line based on the actual response structure, e.g., response.output or response.output_text
  return chatCompletion.choices[0].message.content ?? '';
}

async function createImageFromPrompt(imagePrompt: string): Promise<string> {
  const imageResponse = await client.images.generate({
    model: 'dall-e-3',
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
  });

  if (imageResponse.data && imageResponse.data[0] && imageResponse.data[0].url) {
    return imageResponse.data[0].url;
  } else {
    throw new Error('Image generation failed: No image URL returned.');
  }
}

async function chainedImageGeneration(prompt: string ): Promise< {metaphor: string, imagePrompt: string, imageUrl: string}> {
  const metaphor = await getOpenAIResponseWithPrompt(prompt);
  // Step 2: Get the image prompt from the metaphor
  const imagePrompt = await makeImagePromptFromMetaphor(metaphor);
  // Step 3: Generate the image using the image prompt
 const imageUrl = await createImageFromPrompt(imagePrompt);
 return {metaphor, imagePrompt, imageUrl};
}

export default router;
