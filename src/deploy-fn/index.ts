/**
 * Deploy cloud function.
 */
import { Session, GrpcPromisedClient, Duration } from 'yandex-cloud-lite';
import {
  FunctionServiceClient
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_grpc_pb';
import {
  ServiceAccountServiceClient
} from 'yandex-cloud-lite/generated/yandex/cloud/iam/v1/service_account_service_grpc_pb';
import {
  CreateFunctionVersionRequest,
  CreateFunctionVersionMetadata,
  CreateFunctionMetadata,
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_pb';
import { Resources } from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_pb';
import { Config } from '../config';
import { logger } from '../helpers/logger';
import { formatBytes } from '../helpers';
import { createSession, getFolderId } from '../helpers/session';
import { Zip } from './zip';

export interface DeployConfig {
  files: string | string[],
  handler: string,
  runtime: string,
  timeout: number,
  memory: number,
  account?: string,
  environment?: Record<string, string>,
}

export class DeployFn {
  deployConfig: DeployConfig;
  session: Session;
  api: GrpcPromisedClient<FunctionServiceClient>;
  zip: Zip;
  functionId = '';
  serviceAccountId = '';
  functionVersionId = '';
  folderId = '';
  startTime = 0;

  constructor(private config: Config) {
    this.deployConfig = this.getDeployConfig();
    this.session = createSession(config);
    this.api = this.session.createClient(FunctionServiceClient);
    this.zip = new Zip(this.deployConfig);
  }

  async run() {
    this.logStart();
    await this.zip.create();
    await this.fillFolderId();
    await Promise.all([
      this.fillServiceAccountId(),
      this.fillFunctionId(),
    ]);
    await this.createFunctionVersion();
    await this.showVersionSize();
    this.logDone();
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

  private async fillFunctionId() {
    this.functionId = await this.getFunctionId() || await this.createFunction();
  }

  private async fillFolderId() {
    if (!this.folderId) this.folderId = await getFolderId(this.session, this.config);
  }

  private async createFunctionVersion() {
    const req = this.buildCreateFunctionVersionRequest();
    logger.log(`Sending API request...`);
    const operation = await this.api.createVersion(req);
    logger.log(`Waiting operation complete...`);
    const res = await this.session.waitOperation(operation, CreateFunctionVersionMetadata, {
      startingDelay: 1000,
      maxDelay: 1000,
      numOfAttempts: 3 * 60, // 3 mminutes
      retry: (e, attempt) => {
        const isRetry = e.message === 'operation-not-done';
        if (!isRetry) {
          // log this for debug why error pass here
          logger.log(`Attempt: ${attempt}, isRetry: ${isRetry}, e.message: ${e.message}`);
        }
        return isRetry;
      },
    });
    this.functionVersionId = res.getFunctionVersionId();
    logger.log(`Version created: ${this.functionVersionId}`);
  }

  // eslint-disable-next-line max-statements
  private buildCreateFunctionVersionRequest() {
    const { handler, runtime, timeout, memory } = this.deployConfig;
    const req = new CreateFunctionVersionRequest();
    req.setFunctionId(this.functionId);
    req.setEntrypoint(handler);
    req.setRuntime(runtime);
    req.setExecutionTimeout(new Duration().setSeconds(timeout));
    req.setResources(new Resources().setMemory(memory * 1024 * 1024));
    this.serviceAccountId && req.setServiceAccountId(this.serviceAccountId);
    this.setEnvVars(req);
    req.setContent(this.zip.toBuffer());
    // todo: set tags
    return req;
  }

  private async getFunctionId() {
    const filter = `name="${this.config.functionName}"`;
    const res = await this.api.list({ folderId: this.folderId, filter });
    const { functionsList } = res.toObject();
    return functionsList.length && functionsList[0].id;
  }

  private async createFunction() {
    const { functionName } = this.config;
    logger.log(`Creating function: ${functionName}`);
    const operation = await this.api.create({ folderId: this.folderId, name: functionName });
    const res = await this.session.waitOperation(operation, CreateFunctionMetadata);
    return res.getFunctionId();
  }

  private setEnvVars(req: CreateFunctionVersionRequest) {
    const { environment } = this.deployConfig;
    if (environment) {
      const envMap = req.getEnvironmentMap();
      Object.keys(environment).forEach(key => {
        const value = environment[key];
        if (value === undefined) throw new Error(`Undefined env var: ${key}`);
        envMap.set(key, value);
      });
    }
  }

  private async showVersionSize() {
    const res = await this.api.getVersion({ functionVersionId: this.functionVersionId });
    const { imageSize } = res.toObject();
    logger.log(`Version size: ${formatBytes(imageSize)}`);
  }

  private getDeployConfig() {
    if (!this.config.functionName) throw new Error(`Empty config.functionName`);
    if (!this.config.deploy) throw new Error(`Empty config.deploy`);
    return this.config.deploy;
  }

  private logStart() {
    logger.log(`Deploying function "${this.config.functionName}"...`);
    this.startTime = Date.now();
  }

  private logDone() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    logger.log(`Done (${duration}s).`);
  }
}
