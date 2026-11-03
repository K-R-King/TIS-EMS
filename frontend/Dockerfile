# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public public
COPY src src
RUN npm run build

# Serve the static build with nginx, which also forwards /api to the backend
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
# Where nginx forwards /api requests; override per environment (e.g. the backend's Kubernetes service)
ENV BACKEND_URL=http://backend:8080
EXPOSE 80
