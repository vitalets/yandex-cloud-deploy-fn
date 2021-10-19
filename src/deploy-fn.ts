/**
 * Deploy cloud function.
 */

/* eslint-disable max-lines */

import path from 'path';
import fg from 'fast-glob';
import AdmZip from 'adm-zip';
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
import { Config } from './config';
import { logger } from './utils/logger';
import { formatBytes } from './utils';

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
  zip: AdmZip;
  functionId = '';
  serviceAccountId = '';
  functionVersionId = '';
  folderId = '';

  constructor(private config: Config) {
    this.deployConfig = this.getDeployConfig();
    this.session = this.createSession();
    this.api = this.session.createClient(FunctionServiceClient);
    this.zip = new AdmZip();
  }

  async run() {
    logger.log(`Deploying function "${this.config.functionName}"...`);
    await this.createZip();
    this.assertHandler();
    await this.fillFolderId();
    await this.fillServiceAccountId();
    await this.fillFunctionId();
    await this.createFunctionVersion();
    await this.showVersionSize();
    logger.log(`Done.`);
  }

  private async createZip() {
    logger.log(`Creating zip...`);
    const files = await fg(this.deployConfig.files, { dot: true });
    files.forEach(file => this.zip.addLocalFile(file, path.dirname(file)));
    this.removeDevDependencies();
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
    const { authKeyFile, folderId } = this.config;
    if (folderId) {
      this.folderId = folderId;
    } else if (authKeyFile) {
      this.folderId = (await this.session.getServiceAccount())!.folderId;
    } else {
      throw new Error(`You should provide "folderId" when using "oauthToken"`);
    }
  }

  private removeDevDependencies() {
    const pkgEntry = this.zip.getEntries().find(entry => entry.name === 'package.json');
    if (pkgEntry) {
      logger.log(`Removing devDependencies (${pkgEntry.entryName})...`);
      const pkgContent = this.zip.readAsText(pkgEntry);
      const pkg = JSON.parse(pkgContent);
      delete pkg.devDependencies;
      this.zip.updateFile(pkgEntry, Buffer.from(JSON.stringify(pkg, null, 2)));
    }
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

  private assertHandler() {
    const { handler } = this.deployConfig;
    const handlerFile = handler.split('.').slice(0, -1).concat([ 'js' ]).join('.');
    const pkgEntry = this.zip.getEntries().find(entry => entry.entryName === handlerFile);
    if (!pkgEntry) throw new Error(`Handler file not found in zip: ${handler}`);
  }

  private createSession() {
    const { authKeyFile, oauthToken } = this.config;
    if (authKeyFile) return new Session({ authKeyFile });
    if (oauthToken) return new Session({ oauthToken });
    throw new Error(`You should provide "authKeyFile" or "oauthToken"`);
  }

  private getDeployConfig() {
    if (!this.config.functionName) throw new Error(`Empty config.functionName`);
    if (!this.config.deploy) throw new Error(`Empty config.deploy`);
    return this.config.deploy;
  }
}
