const { createServer: createHttpsServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { parse } = require("url");
const { readFileSync, existsSync } = require("fs");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const useSSL =
  process.env.USE_SSL === "true" &&
  existsSync("./ssl.key") &&
  existsSync("./ssl.crt");

app.prepare().then(() => {
  let server;

  if (useSSL) {
    const httpsOptions = {
      key: readFileSync("./ssl.key"),
      cert: readFileSync("./ssl.crt"),
    };

    server = createHttpsServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(3000, "0.0.0.0", (err) => {
      if (err) throw err;
      console.log("> Ready on https://0.0.0.0:3000");
    });
  } else {
    server = createHttpServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(3000, "0.0.0.0", (err) => {
      if (err) throw err;
      console.log("> Ready on http://0.0.0.0:3000");
    });
  }
});
