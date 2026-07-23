import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { put, PutBlobResult } from '@vercel/blob';
import {
  generateUniqueFilename,
  getStorageToken,
  uploadFile,
  uploadAnimalPhoto,
} from '../../services/storage';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

describe('Vercel Blob Storage Integration Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateUniqueFilename', () => {
    it('should generate a unique filename prefixed with default "photos" directory', () => {
      const filename = 'duck.jpg';
      const result = generateUniqueFilename(filename);

      expect(result).toMatch(/^photos\/\d+-[0-9a-f-]{36}-duck\.jpg$/i);
    });

    it('should support custom directory prefix', () => {
      const filename = 'mallard.png';
      const result = generateUniqueFilename(filename, 'animal-photos');

      expect(result).toMatch(/^animal-photos\/\d+-[0-9a-f-]{36}-mallard\.png$/i);
    });

    it('should support empty prefix without leading slash', () => {
      const filename = 'duck.jpg';
      const result = generateUniqueFilename(filename, '');

      expect(result).toMatch(/^\d+-[0-9a-f-]{36}-duck\.jpg$/i);
    });

    it('should prevent naming conflicts across consecutive calls for the same filename', () => {
      const filename = 'photo.png';
      const name1 = generateUniqueFilename(filename);
      const name2 = generateUniqueFilename(filename);

      expect(name1).not.toBe(name2);
    });

    it('should sanitize special characters in original filename', () => {
      const messyFilename = 'my duck photo #1 (final)!.jpg';
      const result = generateUniqueFilename(messyFilename);

      expect(result).not.toContain(' ');
      expect(result).not.toContain('#');
      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result).not.toContain('!');
      expect(result).toMatch(/my_duck_photo__1__final__.jpg/);
    });
  });

  describe('getStorageToken', () => {
    it('should return explicit token parameter when provided', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      const token = getStorageToken('vercel_blob_rw_explicit_123');
      expect(token).toBe('vercel_blob_rw_explicit_123');
    });

    it('should fallback to process.env.BLOB_READ_WRITE_TOKEN if token parameter is omitted', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_env_456';
      const token = getStorageToken();
      expect(token).toBe('vercel_blob_rw_env_456');
    });

    it('should throw descriptive error when no token is present', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(() => getStorageToken()).toThrow(/Missing Vercel Blob storage token/);
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload buffer data and return secure URL', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
      const mockResult: PutBlobResult = {
        url: 'https://blob.vercel-storage.com/photos/123-duck.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/photos/123-duck.jpg?download=1',
        pathname: 'photos/123-duck.jpg',
        contentType: 'image/jpeg',
        contentDisposition: 'inline',
        etag: 'mock-etag-123',
      };

      vi.mocked(put).mockResolvedValueOnce(mockResult);

      const buffer = Buffer.from('fake-image-data');
      const res = await uploadFile('photos/123-duck.jpg', buffer);

      expect(put).toHaveBeenCalledWith(
        'photos/123-duck.jpg',
        buffer,
        expect.objectContaining({
          access: 'public',
          token: 'vercel_blob_rw_test_token',
        }),
      );
      expect(res).toEqual(mockResult);
      expect(res.url).toBe('https://blob.vercel-storage.com/photos/123-duck.jpg');
    });

    it('should handle missing token scenario gracefully by throwing before API call', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      const buffer = Buffer.from('test-data');

      await expect(uploadFile('photos/test.jpg', buffer)).rejects.toThrow(
        /Missing Vercel Blob storage token/,
      );
      expect(put).not.toHaveBeenCalled();
    });
  });

  describe('uploadAnimalPhoto', () => {
    it('should generate collision-resistant path and upload photo buffer', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
      const mockResult: PutBlobResult = {
        url: 'https://blob.vercel-storage.com/animal-photos/unique-duck.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/animal-photos/unique-duck.jpg?download=1',
        pathname: 'animal-photos/unique-duck.jpg',
        contentType: 'image/jpeg',
        contentDisposition: 'inline',
        etag: 'mock-etag-456',
      };

      vi.mocked(put).mockResolvedValueOnce(mockResult);

      const buffer = Buffer.from('duck-photo-binary');
      const res = await uploadAnimalPhoto(buffer, 'duck.jpg');

      expect(put).toHaveBeenCalledWith(
        expect.stringMatching(/^animal-photos\/\d+-[0-9a-f-]{36}-duck\.jpg$/),
        buffer,
        expect.objectContaining({
          access: 'public',
          token: 'vercel_blob_rw_test_token',
        }),
      );
      expect(res.url).toBe('https://blob.vercel-storage.com/animal-photos/unique-duck.jpg');
    });

    it('should throw an error if the file extension is not an image', async () => {
      const buffer = Buffer.from('fake-text-data');
      await expect(uploadAnimalPhoto(buffer, 'document.pdf')).rejects.toThrow(/Invalid file type/);
      expect(put).not.toHaveBeenCalled();
    });
  });
});
