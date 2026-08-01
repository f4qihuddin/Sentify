# Table of Contents
- [Table of Contents](#table-of-contents)
- [How to run the web app?](#how-to-run-the-web-app)
- [App Features](#app-features)
- [How the frontend and AI models interact?](#how-the-frontend-and-ai-models-interact)

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

# App Features
1. Data analysis dashboard
![dashboard](public\sentify-dashboard.png)

2. File import
![import](public\sentify-import.png)

3. Export data analysis to PDF
![export](public\sentify-export.png)

4. Sentiment Classifier
![analyze-sentiment](public\sentify-analyze-sentiment.png)

5. AI Based Chatbot
![chatbot](public\sentify-chatbot.png)

# How the frontend and AI models interact?
![flowchart](public\sentify-ai-flowchart.jpg)