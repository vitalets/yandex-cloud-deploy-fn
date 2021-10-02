# yandex-cloud-deploy-fn
CLI для деплоя функций в Yandex Cloud.

## Зачем
Отличия от связки [serverless framework](https://github.com/serverless/serverless) + [yandex-cloud-serverless-plugin](https://github.com/yandex-cloud/serverless-plugin):
* ✅ &nbsp;Более быстрый деплой
* ✅ &nbsp;Нет зависимости на yc cli ([#13](https://github.com/yandex-cloud/serverless-plugin/issues/13))
* ✅ &nbsp;Нет лишних сообщений в логах вида `Serverless: Unknonwn function "xxx" found` ([#18](https://github.com/yandex-cloud/serverless-plugin/issues/18))
* ✅ &nbsp;Удаление devDependencies
* ✅ &nbsp;Интерактивное перекидывание тегов
- ❌ &nbsp;Деплоится только одна функция. Триггеры, сервисные аккаунты и message queue не создаются

## Установка
```
npm i -D yandex-cloud-deploy-fn
```

## Использование
Создайте в корне проекта конфиг `deploy.config.js` следующего вида:
```js
const { YC_OAUTH_TOKEN, YC_FOLDER_ID } = process.env;

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
    environment: {
      NODE_ENV: 'production'
    },
  },
  tags: [ 'prod', 'testing' ] // необязательно
};
```

Для деплоя функции запустите:
```
npx deploy-fn
```

Для интерактивного выставления тегов запустите:
```
npx deploy-fn-tag
```

## Лицензия
MIT @ [Vitaliy Potapov](https://github.com/vitalets)
