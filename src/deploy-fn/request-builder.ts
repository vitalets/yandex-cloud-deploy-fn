/**
 * Builds createVersion request
 */
import crypto from 'crypto';
import prettyBytes from 'pretty-bytes';
import { Duration } from 'yandex-cloud-lite';
import {
  CreateFunctionVersionRequest
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_pb';
import { Resources, Package } from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_pb';
import { Config } from '../config';
import { Logger } from '../helpers/logger';
import { S3Object } from './storage';

// see: https://cloud.yandex.ru/docs/functions/concepts/function#upload
const MAX_DIRECT_UPLOAD_SIZE = 3.5 * 1024 * 1024;

export interface ExternalProps {
  functionId: string;
  content: Buffer;
  serviceAccountId?: string;
}

export class RequestBuilder {
  req: CreateFunctionVersionRequest;
  s3Object?: S3Object;

  constructor(private config: Config, private logger: Logger) {
    this.req = new CreateFunctionVersionRequest();
  }

  get deployConfig() {
    return this.config.deploy!;
  }

  // eslint-disable-next-line max-statements
  async build({ functionId, content, serviceAccountId }: ExternalProps) {
    const { handler, runtime, timeout, memory, tags } = this.deployConfig;
    this.req.setFunctionId(functionId);
    this.req.setEntrypoint(handler);
    this.req.setRuntime(runtime);
    this.req.setExecutionTimeout(new Duration().setSeconds(timeout));
    this.req.setResources(new Resources().setMemory(memory * 1024 * 1024));
    if (serviceAccountId) this.req.setServiceAccountId(serviceAccountId);
    if (tags) this.req.setTagList(tags);
    this.setEnvVars();
    await this.setContent(content);
    return this.req;
  }

  async cleanup() {
    await this.s3Object?.delete();
  }

  private setEnvVars() {
    const { environment } = this.deployConfig;
    if (environment) {
      const envMap = this.req.getEnvironmentMap();
      Object.keys(environment).forEach(key => {
        const value = environment[key];
        if (value === undefined) throw new Error(`Undefined env var: ${key}`);
        envMap.set(key, value);
      });
    }
  }

  private async setContent(content: Buffer) {
    return content.length < MAX_DIRECT_UPLOAD_SIZE
      ? this.setDirectUpload(content)
      : this.setStorageUpload(content);
  }

  private setDirectUpload(content: Buffer) {
    this.logger.log(`Zip size: ${prettyBytes(content.length)} (will upload directly)`);
    this.req.setContent(content);
  }

  private async setStorageUpload(content: Buffer) {
    this.logger.log(`Zip size: ${prettyBytes(content.length)} (will upload via storage)`);
    this.s3Object = new S3Object(this.config, content);
    const { bucketName, filePath } = this.s3Object;
    this.logger.log(`Uploading zip to bucket: [${bucketName}]${filePath}`);
    await this.s3Object.upload();
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const pkg = new Package().setBucketName(bucketName).setObjectName(filePath).setSha256(sha256);
    this.req.setPackage(pkg);
  }
}
