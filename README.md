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
Сгенерите файл [авторизованных ключей](https://cloud.yandex.ru/docs/iam/operations/authorized-key/create) `auth-key.json` для сервисного аккаунта, от имени которого будете деплоить функцию:
```
yc iam key create --service-account-name <service-account-name> -o auth-key.json
```

Создайте в корне проекта конфиг `deploy.config.js` следующего вида:
```js
module.exports = {
  authKeyFile: 'auth-key.json',
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
