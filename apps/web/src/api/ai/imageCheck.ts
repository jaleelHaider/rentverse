import { apiJsonRequest, fileToBase64, type EncodedFile } from '@/api/clients';

export interface ImageQualityCheckResponse {
  verdict: 'accept' | 'warn' | 'reject';
  score: number;
  warnings: string[];
  failures: string[];
  metrics: Record<string, number | string>;
}

/**
 * Check image quality using the AI backend.
 * Accepts a File object and encodes it to base64 for transmission.
 */
export const checkImageQuality = async (file: File): Promise<ImageQualityCheckResponse> => {
  try {
    const encoded = await fileToBase64(file);

    const response = await apiJsonRequest<ImageQualityCheckResponse>(
      '/check-image-quality',
      {
        method: 'POST',
        auth: false,
        body: {
          contentBase64: encoded.contentBase64,
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Image quality check failed:', error);
    throw new Error(`Image quality check unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Check multiple images and return results for each.
 */
export const checkMultipleImages = async (files: File[]): Promise<ImageQualityCheckResponse[]> => {
  const results = await Promise.all(files.map((file) => checkImageQuality(file)));
  return results;
};

/**
 * Helper to determine if image passed quality check.
 */
export const didImagePass = (response: ImageQualityCheckResponse): boolean => {
  return response.verdict === 'accept';
};
