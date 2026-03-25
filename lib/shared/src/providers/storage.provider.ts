export interface StorageUploadResult {
  storageKey: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageDownloadResult {
  stream: ReadableStream | NodeJS.ReadableStream;
  mimeType: string;
  sizeBytes: number;
  filename: string;
}

export interface IStorageProvider {
  upload(
    key: string,
    data: Buffer | ReadableStream,
    metadata: { mimeType: string; originalFilename: string },
  ): Promise<StorageUploadResult>;
  download(key: string): Promise<StorageDownloadResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}
