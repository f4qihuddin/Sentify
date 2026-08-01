# How to run the web app?

1. Open terminal and run:
```bash
npm create vite@latest nama-proyek -- --template react
```

2. Follow the steps

3. Install dependency and run project
- You can start the instalation and run project automaticcally
- or manually by:
```bash
cd nama-of-your-project
npm install
npm run dev
```

4. Activating Model API (using Docker)
Build docker image
```bash
docker build -f src/model_api/Dockerfile -t sentiment-chat-api .
```
Run the container
```bash
docker run --rm --name sentiment-chat-api --env-file src/model_api/.env.docker --mount type=volume,source=chatbot-history,target=/app/storage -p 8000:8080 sentiment-chat-api
```
Lastly, check server status
```bash
curl http://localhost:8000/health
```