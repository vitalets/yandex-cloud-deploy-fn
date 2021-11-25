import { Session } from 'yandex-cloud-lite';

export async function getAuthInfo(session: Session) {
  const { authKeyFile, oauthToken, useCliConfig } = session.options;
  if (oauthToken) return `oauthToken`;
  if (useCliConfig) return `yc-cli`;
  if (authKeyFile) {
    const sa = await session.getServiceAccount();
    return `authKeyFile (${sa?.name})`;
  }
  return '';
}
