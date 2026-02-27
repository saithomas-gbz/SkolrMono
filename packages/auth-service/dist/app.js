"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const oauth2_1 = __importDefault(require("@fastify/oauth2"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, fastify_1.default)({ logger: true });
app.register(jwt_1.default, {
    secret: process.env.JWT_SECRET,
});
app.register(oauth2_1.default, {
    name: 'googleOAuth2',
    credentials: {
        client: {
            id: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: oauth2_1.default.GOOGLE_CONFIGURATION
    },
    scope: ['profile', 'email'],
    startRedirectPath: '/login/google',
    callbackUri: process.env.GOOGLE_CALLBACK_URI,
    callbackUriParams: {
        access_type: 'offline',
    },
    pkce: 'S256'
});
app.register(authRoutes_1.default);
app.get('/health', async () => {
    return { status: 'ok' };
});
app.listen({ port: 3000, host: '0.0.0.0' }, () => {
    app.log.info('Server running on http://localhost:3000');
});
