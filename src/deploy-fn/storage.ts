/**
 * Upload function code to storage if it's big.
 * See: https://cloud.yandex.ru/docs/functions/concepts/function#upload
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Config } from '../config';

const REGION = 'ru-central1';
const ENDPOINT = 'https://storage.yandexcloud.net';
// dont forget to add  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

export class S3Object {
  client: S3Client;
  filePath = '';

  constructor(private config: Config, private content: Buffer) {
    this.assertConfig();
    const credentials = this.config.awsCredentials;
    this.client = new S3Client({ region: REGION, endpoint: ENDPOINT, credentials });
    this.filePath = this.generateFilePath();
  }

  get deployConfig() {
    return this.config.deploy!;
  }

  get bucketName() {
    return this.deployConfig.bucketName!;
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
    const bucketPath = (this.deployConfig.bucketPath || '').replace(/\/+$/, '');
    return `${bucketPath}/${this.config.functionName}-${Date.now()}.zip`;
  }

  private assertConfig() {
    if (!this.bucketName) throw new Error(`Empty bucketName`);
  }
}
