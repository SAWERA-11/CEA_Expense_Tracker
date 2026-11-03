FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/SAWERA-11/CEA_Expense_Tracker"
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
