/**
 * Load deploy.config.js
 */
import path from 'path';
import { TagConfig } from './deploy-fn-tag/tags-manager';
import { DeployConfig } from './deploy-fn';

export interface Config {
  oauthToken: string;
  folderId: string;
  functionName: string;
  deploy?: DeployConfig;
  tags?: (string | TagConfig)[];
}

export async function loadConfigFromFile(file: string): Promise<Config> {
  // todo: find file js, cjs, mjs
  const fullPath = path.join(process.cwd(), file);
  const content = await import(fullPath);
  const config = content.default as Config;
  assertConfig(config);
  return config;
}

function assertConfig(config: Config) {
  const requiredProps = [ 'oauthToken', 'folderId', 'functionName' ];
  const missingProps = requiredProps.filter(prop => !config[prop as keyof Config]);
  if (missingProps.length) throw new Error(`Missing config props: ${missingProps.join(', ')}`);
}
