export interface UploadFileOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder: 'products' | 'sellers' | 'documents' | 'general';
}

export interface UploadFileResult {
  fileId: string;
  url: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  readonly providerName: string;
  uploadFile(options: UploadFileOptions): Promise<UploadFileResult>;
  deleteFile(fileId: string): Promise<boolean>;
  getPublicUrl(fileId: string): string;
}

