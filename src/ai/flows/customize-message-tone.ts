'use server';

/**
 * @fileOverview This file contains a Genkit flow for customizing the tone and style of a welcome message.
 *
 * - customizeMessageTone - A function that customizes the welcome message based on user preferences.
 * - CustomizeMessageToneInput - The input type for the customizeMessageTone function.
 * - CustomizeMessageToneOutput - The return type for the customizeMessageTone function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizeMessageToneInputSchema = z.object({
  userProfile: z
    .string()
    .describe('A description of the user, including their history and preferences.'),
  preferredTone: z
    .string()
    .describe(
      'The preferred tone of the welcome message (e.g., formal, informal, humorous).'
    ),
});
export type CustomizeMessageToneInput = z.infer<typeof CustomizeMessageToneInputSchema>;

const CustomizeMessageToneOutputSchema = z.object({
  customizedMessage: z
    .string()
    .describe('The customized welcome message that aligns with the user preferences.'),
});
export type CustomizeMessageToneOutput = z.infer<typeof CustomizeMessageToneOutputSchema>;

export async function customizeMessageTone(
  input: CustomizeMessageToneInput
): Promise<CustomizeMessageToneOutput> {
  return customizeMessageToneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeMessageTonePrompt',
  input: {schema: CustomizeMessageToneInputSchema},
  output: {schema: CustomizeMessageToneOutputSchema},
  prompt: `You are an AI assistant that customizes welcome messages based on user preferences.

  User Profile: {{{userProfile}}}
  Preferred Tone: {{{preferredTone}}}

  Generate a welcome message that aligns with the user's profile and preferred tone.
  Ensure the message is engaging and appropriate for the given context.`,
});

const customizeMessageToneFlow = ai.defineFlow(
  {
    name: 'customizeMessageToneFlow',
    inputSchema: CustomizeMessageToneInputSchema,
    outputSchema: CustomizeMessageToneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
