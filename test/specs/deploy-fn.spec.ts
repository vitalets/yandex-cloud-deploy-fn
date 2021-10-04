import { Config } from '../../src/config';
import { DeployFn } from '../../src/deploy-fn';

describe('deploy-fn', () => {
  it('success run', async () => {
    const d = getDeployFn(getConfig());
    await d.run();
  });

  it('throw for undefined env vars', async () => {
    const config = getConfig();
    // @ts-expect-error expected
    config.deploy.environment.ABC = undefined;
    const d = getDeployFn(config);
    await assert.rejects(d.run(), /Error: Undefined env var: ABC/);
  });
});

function getConfig(): Config {
  return {
    oauthToken: 'YC_OAUTH_TOKEN',
    folderId: 'YC_FOLDER_ID',
    functionName: 'test-fn',
    deploy: {
      files: [ 'package*.json' ],
      handler: 'dist/index.handler',
      runtime: 'nodejs14',
      timeout: 5,
      memory: 128,
      environment: {
        NODE_ENV: 'production'
      },
    },
  };
}

function getDeployFn(config: Config) {
  const d = new DeployFn(config);
  sinon.stub(d.api, 'list').resolves({ toObject: () => ({ functionsList: [ { id: 'function-id' } ] })} as any);
  sinon.stub(d.api, 'createVersion').resolves({ getId: () => 'operation-id' } as any);
  sinon.stub(d.session, 'waitOperation').resolves({ getFunctionVersionId: () => 'version-id' } as any);
  return d;
}
