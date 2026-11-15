FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /opt/cacador-browser
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY security.mjs server.mjs ./
USER pwuser
ENV NODE_ENV=production PORT=8765
EXPOSE 8765
CMD ["node","server.mjs"]
