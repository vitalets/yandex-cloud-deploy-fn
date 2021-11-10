/**
 * Deploy cloud function.
 */

import { GrpcPromisedClient, Session } from 'yandex-cloud-lite';
import {
  FunctionServiceClient
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_grpc_pb';
import {
  ServiceAccountServiceClient
} from 'yandex-cloud-lite/generated/yandex/cloud/iam/v1/service_account_service_grpc_pb';
import {
  CreateFunctionVersionMetadata,
  CreateFunctionMetadata,
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_pb';

import { Config } from '../config';
import { Logger } from '../helpers/logger';
import prettyBytes from 'pretty-bytes';
import { Zip } from './zip';
import { getAuthInfo } from '../helpers/auth-info';
import { RequestBuilder } from './request-builder';

export interface DeployConfig {
  files: (string | FileSrcToZip)[],
  handler: string,
  runtime: string,
  timeout: number,
  memory: number,
  account?: string,
  tags?: string[],
  environment?: Record<string, string>,
  bucketName?: string,
  bucketPath?: string,
}

/** Copy file from src to zip */
export interface FileSrcToZip {
  src: string;
  zip: string;
}

export class DeployFn {
  session: Session;
  api: GrpcPromisedClient<FunctionServiceClient>;
  requestBuilder: RequestBuilder;
  folderId = '';
  zip: Zip;
  functionId = '';
  serviceAccountId = '';
  functionVersionId = '';
  startTime = 0;
  logger: Logger;

  get deployConfig() {
    return this.config.deploy!;
  }

  constructor(private config: Config) {
    this.assertConfig();
    this.session = new Session(config);
    this.api = this.session.createClient(FunctionServiceClient);
    this.zip = new Zip(this.config);
    this.logger = new Logger(config.functionName);
    this.requestBuilder = new RequestBuilder(this.config, this.logger);
  }

  async run() {
    this.logStart();
    await this.createZip();
    await Promise.all([
      this.fillFolderId(),
      this.logAuthInfo(),
    ]);
    await Promise.all([
      this.fillServiceAccountId(),
      this.fillFunctionId(),
    ]);
    await this.createFunctionVersion();
    await this.showVersionSize();
    this.logDone();
  }

  private async createZip() {
    this.logger.log(`Creating zip...`);
    await this.zip.create();
  }

  private async fillServiceAccountId() {
    const { account } = this.deployConfig;
    if (account) {
      const accountsApi = this.session.createClient(ServiceAccountServiceClient);
      const filter = `name="${account}"`;
      const res = await accountsApi.list({ folderId: this.folderId, filter });
      const { serviceAccountsList } = res.toObject();
      if (!serviceAccountsList.length) throw new Error(`Service account "${account}" not found.`);
      this.serviceAccountId = serviceAccountsList[0].id;
    }
  }

  private async logAuthInfo() {
    const authInfo = await getAuthInfo(this.session);
    this.logger.log(`Authorized by: ${authInfo}`);
  }

  private async fillFolderId() {
    this.folderId = await this.session.getFolderId();
    if (!this.folderId) throw new Error(`Empty folderId`);
  }

  private async fillFunctionId() {
    this.functionId = await this.getFunctionId() || await this.createFunction();
  }

  private async createFunctionVersion() {
    const req = await this.requestBuilder.build({
      content: this.zip.toBuffer(),
      functionId: this.functionId,
      serviceAccountId: this.serviceAccountId,
    });
    this.logger.log(`Sending API request...`);
    const operation = await this.api.createVersion(req);
    this.logger.log(`Waiting operation complete...`);
    const res = await this.session.waitOperation(operation, CreateFunctionVersionMetadata, {
      startingDelay: 1000,
      maxDelay: 1000,
      numOfAttempts: 5 * 60, // 5 min (todo: configure?)
    });
    this.functionVersionId = res.getFunctionVersionId();
    this.logger.log(`Version created: ${this.functionVersionId}`);
    await this.requestBuilder.cleanup();
  }

  private async getFunctionId() {
    const filter = `name="${this.config.functionName}"`;
    const res = await this.api.list({ folderId: this.folderId, filter });
    const { functionsList } = res.toObject();
    return functionsList.length && functionsList[0].id;
  }

  private async createFunction() {
    const { functionName } = this.config;
    this.logger.log(`Creating function: ${functionName}`);
    const operation = await this.api.create({ folderId: this.folderId, name: functionName });
    const res = await this.session.waitOperation(operation, CreateFunctionMetadata);
    return res.getFunctionId();
  }

  private async showVersionSize() {
    const res = await this.api.getVersion({ functionVersionId: this.functionVersionId });
    const { imageSize } = res.toObject();
    this.logger.log(`Version size: ${prettyBytes(imageSize)}`);
  }

  private assertConfig() {
    if (!this.config.functionName) throw new Error(`Empty config.functionName`);
    if (!this.config.deploy) throw new Error(`Empty config.deploy`);
  }

  private logStart() {
    this.logger.log(`Deploying function "${this.config.functionName}"...`);
    this.startTime = Date.now();
  }

  private logDone() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    this.logger.log(`Done (${duration}s).`);
  }
}
