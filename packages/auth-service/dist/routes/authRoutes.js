"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authController_1 = __importDefault(require("../controllers/authController"));
const db_1 = require("../db");
const authRoutes = async (fastify) => {
    fastify.post("/login", authController_1.default.login);
    fastify.post("/register", authController_1.default.register);
    fastify.get('/login/google/callback', async (request, reply) => {
        try {
            const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            const accessToken = token.token.access_token;
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const userInfo = await response.json();
            let user = await db_1.db.user.findUnique({
                where: { email: userInfo.email },
            });
            if (!user) {
                user = await db_1.db.user.create({
                    data: {
                        email: userInfo.email,
                        name: userInfo.name,
                        oauthProvider: 'google',
                        oauthId: userInfo.email,
                    },
                });
            }
            const jwtToken = fastify.jwt.sign({ id: user.id, email: user.email });
            // reply.redirect(process.env.GOOGLE_CALLBACK_URI)
            reply.redirect(`http://votre-frontend.com/auth/success?token=${jwtToken}`);
        }
        catch (error) {
            fastify.log.error(error);
            reply.redirect('http://votre-fronte//nd.com/auth/error');
        }
    });
};
exports.default = authRoutes;
