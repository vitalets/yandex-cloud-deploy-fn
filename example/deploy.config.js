require('dotenv/config');

module.exports = {
  authKeyFile: '../.auth-key.json',
  functionName: 'test-fn',
  zipDir: '../temp',
  deploy: {
    files: [
      'package*.json',
      'dist/**',
      process.env.S3 ? 'assets/**' : '',
    ],
    handler: 'dist/index.handler',
    runtime: 'nodejs14',
    timeout: 5,
    memory: 128,
    account: 'tools-testing',
    tags: [ 'my-tag' ],
    environment: {
      NODE_ENV: 'production'
    },
    bucketName: 'tools-testing',
  },
  tags: [
    'prod',
    { name: 'prod_10', history: 2, cmdPre: 'echo "example cmd {tag}"' },
    { name: 'test', history: 0 },
    { name: 'all (prod, test)', tags: [ 'prod', 'test' ] }
  ],
};
