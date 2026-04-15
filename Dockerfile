FROM node:20-slim AS frontend-build
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-build /client/dist ./client/dist
CMD ["sh", "-c", "uvicorn server.main:app --host 0.0.0.0 --port $PORT"]
