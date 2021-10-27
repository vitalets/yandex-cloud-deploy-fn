/**
 * Load deploy.config.js
 */
import path from 'path';
import { Session } from 'yandex-cloud-lite';
import { TagConfig } from './deploy-fn-tag/tags-manager';
import { DeployConfig } from './deploy-fn';

type SessionOptions = Session['options'];

export interface Config {
  authKeyFile?: SessionOptions['authKeyFile'];
  oauthToken?: SessionOptions['oauthToken'];
  folderId?: SessionOptions['folderId'];
  useCliConfig?: SessionOptions['useCliConfig'];
  functionName: string;
  deploy?: DeployConfig;
  tags?: (string | TagConfig)[];
}

export async function loadConfigFromFile(file: string): Promise<Config> {
  // todo: find file js, cjs, mjs
  const fullPath = path.join(process.cwd(), file);
  const content = await import(fullPath);
  return content.default as Config;
}
