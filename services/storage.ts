import { put, PutBlobResult, PutCommandOptions } from '@vercel/blob';

/**
 * Generates a unique, collision-resistant filename by prefixing with a timestamp and UUID.
 *
 * @param originalFilename - The original name of the uploaded file
 * @param prefix - Optional directory prefix (e.g. 'photos' or 'animals')
 * @returns A unique pathname suitable for Vercel Blob storage
 */
export function generateUniqueFilename(
  originalFilename: string,
  prefix: string = 'photos',
): string {
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, '');
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const baseName = `${timestamp}-${uuid}-${sanitized}`;

  return sanitizedPrefix ? `${sanitizedPrefix}/${baseName}` : baseName;
}

/**
 * Validates whether a Vercel Blob token is available in options or environment variables.
 *
 * @param token - Optional explicit token
 * @returns The active token string
 * @throws Error if no token is available
 */
export function getStorageToken(token?: string): string {
  const activeToken = token || process.env.BLOB_READ_WRITE_TOKEN;
  if (!activeToken) {
    throw new Error(
      'Missing Vercel Blob storage token. Please configure the BLOB_READ_WRITE_TOKEN environment variable or pass a token option.',
    );
  }
  return activeToken;
}

/**
 * Uploads a file buffer, stream, or blob to Vercel Blob storage.
 *
 * @param pathname - Target path/filename in blob storage
 * @param data - The file content (Buffer, Blob, ReadableStream, string, etc.)
 * @param options - Additional Vercel Blob upload options
 * @returns Promise resolving to PutBlobResult containing the secure URL
 */
export async function uploadFile(
  pathname: string,
  data: Buffer | Blob | ReadableStream | string | ArrayBuffer,
  options?: PutCommandOptions,
): Promise<PutBlobResult> {
  const token = getStorageToken(options?.token);

  return await put(pathname, data, {
    access: 'public',
    ...options,
    token,
  });
}

/**
 * Helper function specifically for animal photo uploads with collision-resistant naming.
 *
 * @param file - The animal photo file content
 * @param originalFilename - Original filename of the photo
 * @param options - Additional options including optional token override
 * @returns Promise resolving to PutBlobResult containing the secure URL
 */
export async function uploadAnimalPhoto(
  file: Buffer | Blob | ReadableStream | string | ArrayBuffer,
  originalFilename: string,
  options?: PutCommandOptions,
): Promise<PutBlobResult> {
  const validExtensions = /\.(jpg|jpeg|png|webp|gif)$/i;
  if (!validExtensions.test(originalFilename)) {
    throw new Error('Invalid file type. Only jpg, jpeg, png, webp, and gif are allowed.');
  }

  const uniquePathname = generateUniqueFilename(originalFilename, 'animal-photos');
  return await uploadFile(uniquePathname, file, options);
}
