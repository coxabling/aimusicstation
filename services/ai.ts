import { GoogleGenAI, GenerateContentRequest, GenerateContentResponse } from '@google/genai';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Helper to parse potential JSON error messages from the API
const getApiErrorMessage = (error: any): string => {
    if (error instanceof Error) {
        try {
            // The error message might be a JSON string from the API proxy
            const errorObj = JSON.parse(error.message);
            if (errorObj.error && errorObj.error.message) {
                return `${errorObj.error.status}: ${errorObj.error.message}`;
            }
        } catch (e) {
            // Not a JSON string, return the original message
            return error.message;
        }
    }
    return 'An unknown API error occurred.';
};

/**
 * Wraps the GoogleGenAI generateContent call with a retry mechanism.
 * It specifically handles 429 "RESOURCE_EXHAUSTED" and transient XHR errors by waiting
 * with exponential backoff before retrying.
 * @param request The request object for the generateContent call.
 * @returns A Promise that resolves with the GenerateContentResponse.
 * @throws Throws the last error after all retries have been exhausted, or a non-retriable error immediately.
 */
export async function generateWithRetry(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let lastError: Error | null = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await ai.models.generateContent(request);
            return response;
        } catch (error: any) {
            lastError = error;
            const errorMessage = getApiErrorMessage(error);
            
            // Check for retriable error codes or messages
            const isRetriableError = 
                errorMessage.includes('429') || 
                errorMessage.includes('RESOURCE_EXHAUSTED') || 
                errorMessage.includes('quota') ||
                errorMessage.includes('Rpc failed due to xhr error');

            const isDailyLimitError = errorMessage.includes('per_model_per_day');

            // Do not retry for daily limit errors, fail immediately.
            if (isDailyLimitError) {
                console.error("Non-retriable daily quota error:", error);
                throw error;
            }

            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.warn(`Retriable error encountered. Retrying in ${delay}ms... (Attempt ${i + 1}/${MAX_RETRIES})`, errorMessage);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Not a retriable error, or it's the last attempt, so fail
                console.error("Non-retriable API error or final attempt failed:", error);
                throw error;
            }
        }
    }
    
    // This part should theoretically not be reached, but as a fallback:
    console.error("Failed to generate content after multiple retries.", lastError);
    throw lastError || new Error("AI content generation failed after multiple retries.");
}


/**
 * A centralized error handler for AI-related operations that displays user-friendly toasts.
 * @param error The error object caught from a try/catch block.
 * @param addToast The toast function from useToast context.
 */
export const handleAiError = (error: any, addToast: (message: string, type: 'success' | 'error' | 'info') => void) => {
    const errorMessage = getApiErrorMessage(error);

    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        let userMessage = 'AI service is busy or quota exceeded. Please try again later.';
        
        // Check for more specific quota messages
        if (errorMessage.includes('per_model_per_day')) {
            userMessage = 'Daily quota for this AI model has been reached. Please check your AI provider plan and billing details.';
        } else if (errorMessage.includes('per_project_per_minute')) {
            userMessage = 'Too many requests per minute. Please wait a moment before trying again.';
        }
        
        addToast(userMessage, 'error');
    } else {
        addToast('An unexpected error occurred with the AI service.', 'error');
    }
    
    // Always log the full error for debugging
    console.error("AI operation failed:", error);
};