FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /opt/foundry-test

COPY package.json ./
RUN npm install --omit=optional --ignore-scripts

COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/foundry-playwright
RUN chmod +x /usr/local/bin/foundry-playwright

WORKDIR /work
ENV FOUNDRY_URL=http://host.docker.internal:30000

CMD ["foundry-playwright"]
