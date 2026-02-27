import fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import autoLoad from "@fastify/autoload";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const gateway = fastify({
  logger: true,
});

gateway.register(sensible);
gateway.register(cors, {
  origin: "*",
});

gateway.register(autoLoad, {
  dir: join(__dirname, "plugins"),
  dirNameRoutePrefix: false,
  ignorePattern: /proxy\.js$/,
});

gateway.register(import("./routes/auth.js"));

gateway.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Skolr Gateway Documentation",
      version: "1.0.0",
      description: "API Gateway for Skolr services including Auth Service",
    },
    servers: [
      { url: "http://localhost:3001", description: "Development server" },
    ],
  },
});

gateway.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
});

gateway.listen(
  { port: parseInt(process.env.PORT || "3001", 10), host: "0.0.0.0" },
  (err, address) => {
    if (err) {
      gateway.log.error(err);
      process.exit(1);
    }
    gateway.log.info(`Server listening at ${address}`);
  },
);
