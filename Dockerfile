FROM node:10

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install && npm install typescript -g
COPY . ./
RUN tsc
CMD [ "node", "./_dist/device.js" ]
EXPOSE 101896