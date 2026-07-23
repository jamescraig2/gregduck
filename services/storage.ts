import { put, PutBlobResult, PutCommandOptions } from '@vercel/blob';
import { randomUUID } from 'crypto';

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
  const uuid = randomUUID();
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

export async function validateImageContent(
  file: Buffer | Blob | ReadableStream | string | ArrayBuffer,
): Promise<boolean> {
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && validMimes.includes(file.type)) {
      return true;
    }
  }

  let buffer: ArrayBuffer | Buffer | null = null;

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof ArrayBuffer) {
    buffer = file;
  } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
    buffer = await file.arrayBuffer();
  }

  if (buffer) {
    const bytes = new Uint8Array(buffer.slice(0, 12));
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      return true; // JPEG
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    )
      return true; // PNG
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    )
      return true; // GIF
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return true; // WEBP
    }
    return false;
  }

  if (typeof file === 'string') {
    if (
      file.startsWith('data:image/jpeg;') ||
      file.startsWith('data:image/png;') ||
      file.startsWith('data:image/webp;') ||
      file.startsWith('data:image/gif;')
    ) {
      return true;
    }
    return false;
  }

  // Fallback for unsupported types like ReadableStream without consuming them
  // In a real app we might consume the first few bytes of the stream, but here we just return false
  return false;
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

  const isValidContent = await validateImageContent(file);
  if (!isValidContent) {
    throw new Error('Invalid file content. The file does not appear to be a valid image.');
  }

  const uniquePathname = generateUniqueFilename(originalFilename, 'animal-photos');
  return await uploadFile(uniquePathname, file, options);
}
