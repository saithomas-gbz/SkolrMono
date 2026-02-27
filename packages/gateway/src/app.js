"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("@fastify/cors"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const autoload_1 = __importDefault(require("@fastify/autoload"));
const path_1 = require("path");
dotenv_1.default.config();
const gateway = (0, fastify_1.default)({
    logger: true,
});
gateway.register(sensible_1.default);
gateway.register(cors_1.default, {
    origin: '*',
});
gateway.register(autoload_1.default, {
    dir: (0, path_1.join)(__dirname, 'plugins'),
    dirNameRoutePrefix: false,
});
// Register auth routes with proxy to auth-service
gateway.register(Promise.resolve().then(() => __importStar(require('./routes/auth'))));
gateway.register(autoload_1.default, {
    dir: (0, path_1.join)(__dirname, 'routes'),
    dirNameRoutePrefix: true,
    indexPattern: /.*routes(\.ts|\.js)$/,
});
gateway.register(swagger_1.default, {
    openapi: {
        info: {
            title: 'Skolr Gateway Documentation',
            version: '1.0.0',
            description: 'API Gateway for Skolr services including Auth Service',
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Development server' },
        ],
    },
    exposeRoute: true,
});
gateway.register(swagger_ui_1.default, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
    },
});
gateway.listen({ port: process.env.PORT || 8080 }, (err, address) => {
    if (err) {
        gateway.log.error(err);
        process.exit(1);
    }
    gateway.log.info(`Server listening at ${address}`);
});
