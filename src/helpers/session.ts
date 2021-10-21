/**
 * Session helpers
 */
import { Session } from 'yandex-cloud-lite';
import { Config } from '../config';

export function createSession(config: Config) {
  const { authKeyFile, oauthToken } = config;
  if (authKeyFile) return new Session({ authKeyFile });
  if (oauthToken) return new Session({ oauthToken });
  throw new Error(`You should provide "authKeyFile" or "oauthToken"`);
}

export async function getFolderId(session: Session, config: Config) {
  const { authKeyFile, folderId } = config;
  if (folderId) return folderId;
  if (authKeyFile) return (await session.getServiceAccount())!.folderId;
  throw new Error(`You should provide "folderId" when using "oauthToken"`);
}
