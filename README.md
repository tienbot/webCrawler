Для запуска сервера используем команду - node src/server.js
Для запуска краулера используем команду - curl localhost:3000/parse -X POST -d '{"domainName": "https://test.com"}' -H "Content-Type: application/json"