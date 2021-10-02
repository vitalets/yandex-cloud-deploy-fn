const { YC_OAUTH_TOKEN, YC_FOLDER_ID } = require('../.env');

module.exports = {
  oauthToken: YC_OAUTH_TOKEN,
  folderId: YC_FOLDER_ID,
  functionName: 'test-fn',
  deploy: {
    files: [ 'package*.json', 'dist/**' ],
    handler: 'dist/index.handler',
    runtime: 'nodejs14',
    timeout: 5,
    memory: 128,
    account: 'editor-test',
    environment: {
      NODE_ENV: 'production'
    },
  },
  tags: [
    'prod',
    { name: 'prod_10', history: 2, cmdPre: 'echo "example cmd {tag}"' },
    { name: 'test', history: 0 },
    { name: 'all (prod, test)', tags: [ 'prod', 'test' ] }
  ],
};
