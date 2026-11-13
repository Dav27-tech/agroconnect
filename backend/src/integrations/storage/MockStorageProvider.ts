import { IStorageProvider, UploadFileOptions, UploadFileResult } from './StorageProvider.interface.js';
import crypto from 'node:crypto';

export class MockStorageProvider implements IStorageProvider {
  public readonly providerName = 'Mock-LocalStorage-Adapter';

  public async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    const fileId = `file_${crypto.randomUUID().slice(0, 12)}_${options.filename}`;
    // Simule une URL servie localement
    const url = `/uploads/${options.folder}/${fileId}`;
    return {
      fileId,
      url,
      sizeBytes: options.buffer.length,
    };
  }

  public async deleteFile(_fileId: string): Promise<boolean> {
    return true;
  }

  public getPublicUrl(fileId: string): string {
    return `/uploads/public/${fileId}`;
  }
}

export const defaultStorageProvider = new MockStorageProvider();

