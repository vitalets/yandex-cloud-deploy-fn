/**
 * Deploy cloud function.
 */

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

  constructor(private config: Config) {
    this.deployConfig = this.getDeployConfig();
    this.session = new Session({ oauthToken: this.config.oauthToken });
    this.api = this.session.createClient(FunctionServiceClient);
    this.zip = new AdmZip();
  }

  async run() {
    logger.log(`Deploying function "${this.config.functionName}"...`);
    await this.createZip();
    await this.fillServiceAccountId();
    await this.fillFunctionId();
    await this.createFunctionVersion();
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
      const res = await accountsApi.list({ folderId: this.config.folderId, filter });
      const { serviceAccountsList } = res.toObject();
      if (!serviceAccountsList.length) throw new Error(`Service account "${account}" not found.`);
      this.serviceAccountId = serviceAccountsList[0].id;
    }
  }

  private async fillFunctionId() {
    this.functionId = await this.getFunctionId() || await this.createFunction();
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
      numOfAttempts: 60,
    });
    logger.log(`Version created: ${res.getFunctionVersionId()}`);
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
    const res = await this.api.list({ folderId: this.config.folderId, filter });
    const { functionsList } = res.toObject();
    return functionsList.length && functionsList[0].id;
  }

  private async createFunction() {
    const operation = await this.api.create({ folderId: this.config.folderId, name: this.config.functionName });
    const res = await this.session.waitOperation(operation, CreateFunctionMetadata);
    logger.log(`Function created: ${res.getFunctionId()}`);
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

  private getDeployConfig() {
    if (!this.config.deploy) throw new Error(`Empty config.deploy`);
    return this.config.deploy;
  }
}
