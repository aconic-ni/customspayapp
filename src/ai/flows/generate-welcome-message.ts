'use server';

/**
 * @fileOverview Generates a personalized welcome message using AI based on user profile data.
 *
 * - generateWelcomeMessage - A function that generates a personalized welcome message.
 * - GenerateWelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - GenerateWelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWelcomeMessageInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  userProfile: z
    .string()
    .describe('A description of the user, including their interests and history with the app.'),
  messagePreferences: z
    .string()
    .optional()
    .describe('The user specified preferences for the type of message they want to receive.'),
});
export type GenerateWelcomeMessageInput = z.infer<typeof GenerateWelcomeMessageInputSchema>;

const GenerateWelcomeMessageOutputSchema = z.object({
  welcomeMessage: z.string().describe('The personalized welcome message.'),
});
export type GenerateWelcomeMessageOutput = z.infer<typeof GenerateWelcomeMessageOutputSchema>;

export async function generateWelcomeMessage(input: GenerateWelcomeMessageInput): Promise<GenerateWelcomeMessageOutput> {
  return generateWelcomeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWelcomeMessagePrompt',
  input: {schema: GenerateWelcomeMessageInputSchema},
  output: {schema: GenerateWelcomeMessageOutputSchema},
  prompt: `You are an AI assistant that generates personalized welcome messages for users.

  The user's name is: {{{userName}}}.
  Here is some information about the user: {{{userProfile}}}.
  The user's specified preferences for the type of message they want is: {{{messagePreferences}}}.

  Generate a personalized welcome message based on the user's information and preferences. The message should be engaging and make the user feel valued.
  The welcome message should be no more than 50 words.
  Do not greet the user by name; just use the information provided to craft a great welcome message.
  Make it sound friendly and not too formal.
  `,
});

const generateWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'generateWelcomeMessageFlow',
    inputSchema: GenerateWelcomeMessageInputSchema,
    outputSchema: GenerateWelcomeMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
