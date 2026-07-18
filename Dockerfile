FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV HOST=0.0.0.0
ENV PORT=4173
ENV STRIDEOS_STATE_FILE=/data/strideos-state.json
EXPOSE 4173

CMD ["npm", "start"]
