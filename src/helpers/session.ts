/**
 * Session helpers
 */
import { Session } from 'yandex-cloud-lite';
import { Config } from '../config';

export class SessionHelper {
  session: Session;
  folderId = '';
  serviceAccountName = '';

  constructor(private config: Config) {
    this.session = this.createSession();
  }

  async init() {
    const { authKeyFile, folderId } = this.config;
    if (folderId) {
      this.folderId = folderId;
    } else if (authKeyFile) {
      const { folderId = '', name = '' } = await this.session.getServiceAccount() || {};
      this.folderId = folderId;
      this.serviceAccountName = name;
    } else {
      throw new Error(`You should provide "folderId" when using "oauthToken"`);
    }
  }

  private createSession() {
    const { authKeyFile, oauthToken } = this.config;
    if (authKeyFile) return new Session({ authKeyFile });
    if (oauthToken) return new Session({ oauthToken });
    throw new Error(`You should provide "authKeyFile" or "oauthToken"`);
  }
}
