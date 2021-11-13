/**
 * Upload function code to storage if it's big.
 * See: https://cloud.yandex.ru/docs/functions/concepts/function#upload
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Config } from '../config';

export interface StorageConfig {
  bucketName: string,
  bucketPath?: string,
  accessKeyId?: string;
  secretAccessKey?: string;
}

const REGION = 'ru-central1';
const ENDPOINT = 'https://storage.yandexcloud.net';

export class S3Object {
  client: S3Client;
  filePath = '';

  constructor(private config: Config, private content: Buffer) {
    this.assertConfig();
    this.client = this.createClient();
    this.filePath = this.generateFilePath();
  }

  get storageConfig() {
    return this.config.storage!;
  }

  get bucketName() {
    return this.storageConfig.bucketName!;
  }

  async upload() {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: this.filePath,
      Body: this.content,
    });
    await this.client.send(command);
  }

  async delete() {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: this.filePath
    });
    await this.client.send(command);
  }

  private generateFilePath() {
    const bucketPath = (this.storageConfig.bucketPath || '').replace(/\/+$/, '');
    return `${bucketPath}/${this.config.functionName}-${Date.now()}.zip`;
  }

  private assertConfig() {
    if (!this.storageConfig) throw new Error(`Please fill config.storage to upload fn > 3.5 Mb`);
    if (!this.bucketName) throw new Error(`Empty config.storage.bucketName`);
  }

  private createClient() {
    const { accessKeyId, secretAccessKey } = this.storageConfig;
    const credentials = accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined;
    return new S3Client({ region: REGION, endpoint: ENDPOINT, credentials });
  }
}
