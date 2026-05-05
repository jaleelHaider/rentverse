/**
 * Converts an image file to base64-encoded string using native fetch API
 * This is a more reliable approach that works with Expo 55
 */
export const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    console.log('[ImageConverter] Reading file:', imageUri);
    
    // Use the Fetch API to read the file and convert to base64
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        console.log('[ImageConverter] Successfully converted image to base64, length:', base64String.length);
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Converts any local file URI to base64 using Expo FileSystem.
 */
export const convertFileToBase64 = async (fileUri: string): Promise<string> => {
  try {
    const fileSystem = await import('expo-file-system');
    return await fileSystem.readAsStringAsync(fileUri, {
      encoding: fileSystem.EncodingType.Base64,
    });
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Converts multiple images to base64 format for backend upload
 * Returns array of image objects with contentBase64, type, and name
 */
export const prepareImagesForUpload = async (
  images: Array<{ uri: string; type?: string; name?: string }>
): Promise<
  Array<{
    contentBase64: string;
    type: string;
    name: string;
  }>
> => {
  const preparedImages = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i];
      console.log(`[ImageConverter] Processing image ${i + 1}/${images.length}: ${image.uri}`);

      const contentBase64 = await convertImageToBase64(image.uri);
      const type = image.type || 'image/jpeg';
      const name = image.name || `image-${i}-${Date.now()}.jpg`;

      preparedImages.push({
        contentBase64,
        type,
        name,
      });

      console.log(`[ImageConverter] Successfully converted image ${i + 1}: ${name}`);
    } catch (error) {
      console.error(`[ImageConverter] Failed to process image ${i + 1}:`, error);
      throw error;
    }
  }

  return preparedImages;
};
