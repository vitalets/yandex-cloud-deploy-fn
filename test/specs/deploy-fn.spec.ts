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

  it('throw if handler not found in zip', async () => {
    const config = getConfig();
    config.deploy!.handler = 'path/to/index.handler';
    const d = getDeployFn(config);
    await assert.rejects(d.run(), /Error: Handler file not found in zip: path\/to\/index\.handler/);
  });
});

function getConfig(): Config {
  return {
    authKeyFile: 'fake-file.json',
    functionName: 'test-fn',
    deploy: {
      files: [ 'example/package*.json', 'example/dist/**' ],
      handler: 'example/dist/index.handler',
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
  sinon.stub(d.session, 'getFolderId').resolves('folder-id');
  sinon.stub(d.session, 'getServiceAccount').resolves({ name: 'sa-name' } as any);
  sinon.stub(d.session, 'waitOperation').resolves({ getFunctionVersionId: () => 'version-id' } as any);
  sinon.stub(d.api, 'getVersion').resolves({ toObject: () => ({ imageSize: 100 })} as any);
  return d;
}
