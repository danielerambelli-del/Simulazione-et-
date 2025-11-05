/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processImageResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param model The name of the model to use.
 * @param contents The contents for the request.
 * @param config Optional configuration for the request.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(
    model: string,
    contents: any,
    config: any = {}
): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({ model, contents, config });
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    throw new Error("Gemini API call failed after all retries.");
}


/**
 * Estimates the age of a person in an image.
 * @param imageDataUrl A data URL string of the source image.
 * @returns A promise that resolves to the estimated age as a number.
 */
export async function estimatePersonAge(imageDataUrl: string): Promise<number> {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format.");
    }
    const [, mimeType, base64Data] = match;

    const imagePart = { inlineData: { mimeType, data: base64Data } };
    const textPart = { text: "Analyze the person in this photo and estimate their age. Provide your best estimate as a single number. The person's face is clearly visible. Respond with only a JSON object containing an 'age' key with the estimated age as an integer. Example: {\"age\": 35}" };

    const response = await callGeminiWithRetry(
        'gemini-2.5-pro',
        { parts: [imagePart, textPart] },
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    age: { type: Type.INTEGER },
                },
            },
        }
    );

    try {
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        if (typeof result.age === 'number') {
            return Math.max(1, Math.min(100, result.age)); // Clamp age between 1 and 100
        }
        throw new Error("Invalid age format in response.");
    } catch (e) {
        console.error("Failed to parse age from Gemini response:", response.text);
        throw new Error("Could not determine age from the photo. The AI's response was not in the expected format.");
    }
}


/**
 * Generates an age-modified image from a source image and a prompt.
 * @param imageDataUrl A data URL string of the source image.
 * @param prompt The prompt to guide the image generation.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateAgeImage(imageDataUrl: string, prompt: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = { inlineData: { mimeType, data: base64Data } };
    const textPart = { text: prompt };

    try {
        const response = await callGeminiWithRetry(
            'gemini-2.5-flash-image',
            { parts: [imagePart, textPart] }
        );
        return processImageResponse(response);
    } catch (error) {
        console.error("An unrecoverable error occurred during image generation.", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
    }
}