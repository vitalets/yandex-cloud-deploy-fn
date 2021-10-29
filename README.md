# yandex-cloud-deploy-fn
CLI для деплоя функций в Yandex Cloud на Node.js.

## Зачем
Отличия от связки [serverless framework](https://github.com/serverless/serverless) + [yandex-cloud-serverless-plugin](https://github.com/yandex-cloud/serverless-plugin):
* ✅ &nbsp;Нет зависимости на yc cli ([#13](https://github.com/yandex-cloud/serverless-plugin/issues/13))
* ✅ &nbsp;Нет лишних сообщений в логах вида `Serverless: Unknonwn function "xxx" found` ([#18](https://github.com/yandex-cloud/serverless-plugin/issues/18))
* ✅ &nbsp;Интерактивное перекидывание тегов
- ❌ &nbsp;Пока деплоится только одна функция. Триггеры, сервисные аккаунты и message queue не создаются

## Установка
```
npm i -D yandex-cloud-deploy-fn
```

## Использование
Создайте в корне проекта конфиг `deploy.config.js` следующего вида:
```js
module.exports = {
  useCliConfig: true,
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
Пример вывода:
```
[test-fn]: Deploying function "test-fn"...
[test-fn]: Creating zip...
[test-fn]: Authorized by: yc cli
[test-fn]: Sending API request...
[test-fn]: Waiting operation complete...
[test-fn]: Version created: d4e5qq24h0cpqg9rfmi3
[test-fn]: Version size: 20 Kb
[test-fn]: Done (25s).
```

Для интерактивного выставления тегов запустите:
```
npx deploy-fn-tag
```

Пример вывода:
```
? Select version of "test-fn": (Use arrow keys)
❯ d4e5qq24h0cpqg9rfmi3  $latest
  d4ebrpdvjl50mtccr5pu  prod
  d4eiuu6oc7thuu11v1jo  prod-1,testing
  d4ecqudlemi9f2qijgh6  prod-2

? Select tag: (Use arrow keys)
❯ prod
  testing
  all (prod, testing)

Set tag "testing" to version: d4e5qq24h0cpqg9rfmi3
```

## Другие способы авторизации
В примере выше используется авторизация через конфиг yc cli - поле `useCliConfig: true`.
Возможны и другие способы. Например, через файл [авторизованных ключей](https://cloud.yandex.ru/docs/iam/operations/authorized-key/create) сервисного аккаунта, от имени которого будете деплоить функцию:

1. Сгенерите файл `auth-key.json`:
   ```
   yc iam key create --service-account-name <service-account-name> -o auth-key.json
   ```

2. Измените `deploy.config.js`:
   ```diff
   module.exports = {
   -  useCliConfig: true,
   +  authKeyFile: 'auth-key.json',
   ...
   ```

> Подробнее про способы авторизации можно посмотреть в доке по [yandex-cloud-lite](https://github.com/vitalets/yandex-cloud-lite#создание-сессии).

## Лицензия
MIT @ [Vitaliy Potapov](https://github.com/vitalets)
