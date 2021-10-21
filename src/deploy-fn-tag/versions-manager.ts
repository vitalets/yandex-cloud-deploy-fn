import { Session, GrpcPromisedClient } from 'yandex-cloud-lite';
import {
  FunctionServiceClient
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_grpc_pb';
import {
  SetFunctionTagMetadata
} from 'yandex-cloud-lite/generated/yandex/cloud/serverless/functions/v1/function_service_pb';
import { Config } from '../config';
import { logger } from '../helpers/logger';
import { createSession, getFolderId } from '../helpers/session';

export interface Version {
  id: string;
  tags: string[];
}

export class VersionsManager {
  session: Session;
  api: GrpcPromisedClient<FunctionServiceClient>;
  functionId = '';
  folderId = '';
  items: Version[] = [];

  constructor(private config: Config, private filteringTags: string[]) {
    this.session = createSession(config);
    this.api = this.session.createClient(FunctionServiceClient);
  }

  async load() {
    if (!this.folderId) await this.fillFolderId();
    if (!this.functionId) await this.fillFunctionId();
    await this.loadVersions();
  }

  async setTag(version: Version, tag: string) {
    logger.debug(`Setting tag "${tag}" to version: ${version.id}`);
    const operation = await this.api.setTag({ functionVersionId: version.id, tag });
    await this.session.waitOperation(operation, SetFunctionTagMetadata);
  }

  findByTag(tag: string) {
    return this.items.find(({ tags }) => tags.includes(tag));
  }

  private async loadVersions() {
    logger.debug(`Loading versions...`);
    const res = await this.api.listVersions({ functionId: this.functionId });
    const { versionsList = [] } = res.toObject();
    this.items = versionsList
      .map(v => ({ id: v.id, tags: v.tagsList }))
      .filter(({ tags }) => this.filteringTags.some(tag => tags.includes(tag)));
    logger.debug(`Loaded versions: ${this.items.length}`);
  }

  private async fillFunctionId() {
    const { functionName } = this.config;
    const filter = `name="${functionName}"`;
    const res = await this.api.list({ folderId: this.folderId, filter });
    const { functionsList } = res.toObject();
    if (!functionsList.length) throw new Error(`Function not found: ${functionName}`);
    this.functionId = functionsList[0].id;
  }

  private async fillFolderId() {
    if (!this.folderId) this.folderId = await getFolderId(this.session, this.config);
  }
}

export function formatVersion({ id, tags }: Version) {
  return [ id, tags.sort().join(',') ].join('  ');
}
