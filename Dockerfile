FROM node:18-alpine

RUN apk add --no-cache git build-base python3

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# Build CyberChef and compile TypeScript
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js"]
