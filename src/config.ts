/**
 * Load deploy.config.js
 */
import path from 'path';
import fs from 'fs';
import { Session } from 'yandex-cloud-lite';
import { TagConfig } from './deploy-fn-tag/tags-manager';
import { DeployConfig } from './deploy-fn';

type SessionOptions = Session['options'];

export interface Config {
  authKeyFile?: SessionOptions['authKeyFile'];
  oauthToken?: SessionOptions['oauthToken'];
  folderId?: SessionOptions['folderId'];
  useCliConfig?: SessionOptions['useCliConfig'];
  awsCredentials?: AwsCredentials;
  functionName: string;
  /** Directory to extract zip (mainly for debug) */
  zipDir?: string;
  deploy?: DeployConfig;
  tags?: (string | TagConfig)[];
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export async function loadConfigFromFile(file: string): Promise<Config> {
  const fullPaths = getFileVariants(file).map(file => path.resolve(file));
  const fullPath = fullPaths.find(p => fs.existsSync(p));
  if (!fullPath) throw new Error(`Config file not found: ${fullPaths}`);
  const content = await import(fullPath);
  return content.default as Config;
}

function getFileVariants(file: string) {
  const fileInfo = path.parse(file);
  // use variants if file is default value: ./deploy.config.(js|cjs)
  const useVariants = fileInfo.ext.includes('|');
  return useVariants
    ? [ '.js', '.cjs' ].map(ext => path.format({ ...fileInfo, base: '', ext }))
    : [ file ];
}
