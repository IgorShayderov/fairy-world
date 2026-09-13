FROM node:24-slim AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN npm run postinstall


FROM base AS development

EXPOSE 9000

CMD ["npm", "run", "dev"]


FROM base AS build-stage

RUN npm run build


FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist/spa /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]