/**
 * Load deploy.config.js
 */
import path from 'path';
import { TagConfig } from './deploy-fn-tag/tags-manager';
import { DeployConfig } from './deploy-fn';

export interface Config {
  authKeyFile?: string;
  oauthToken?: string;
  folderId?: string;
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
