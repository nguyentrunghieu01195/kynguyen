# Build game client rồi chạy máy chủ phục vụ cả game lẫn WebSocket trên cùng 1 cổng
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server ./server
# Máy chủ chạy luật chơi của game → cần mã nguồn game (src/) và gói phụ thuộc gốc (package.json "type": "module")
COPY src ./src
COPY package.json ./
COPY --from=build /app/dist ./dist
ENV PORT=8787 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "server/src/index.js"]
