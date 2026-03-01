"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authController = {
    login: async (request, reply) => {
        try {
            const { email, password } = request.body;
            const user = await db_1.db.user.findUnique({ where: { email } });
            if (!user || !user.password) {
                return reply.status(401).send({ error: 'Invalid credentials' });
            }
            const passwordMatch = await bcrypt_1.default.compare(password, user.password);
            if (!passwordMatch) {
                return reply.status(401).send({ error: 'Invalid credentials' });
            }
            const token = request.server.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '1h' });
            return reply.send({
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role }
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    },
    register: async (request, reply) => {
        try {
            const { email, password, name } = request.body;
            const existingUser = await db_1.db.user.findUnique({ where: { email } });
            if (existingUser) {
                return reply.status(400).send({ error: 'User already exists' });
            }
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            const user = await db_1.db.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || email.split('@')[0]
                }
            });
            const token = request.server.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '1h' });
            return reply.status(201).send({
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role }
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    },
    googleCallback: async (request, reply) => {
        try {
            const { token, profile } = request.query;
            let user = await db_1.db.user.findFirst({
                where: {
                    oauthProvider: 'google',
                    oauthId: profile.id
                }
            });
            if (!user) {
                user = await db_1.db.user.create({
                    data: {
                        email: profile.email,
                        name: profile.displayName,
                        image: profile.picture,
                        oauthProvider: 'google',
                        oauthId: profile.id,
                        password: null // No password for OAuth users
                    }
                });
                await db_1.db.account.create({
                    data: {
                        userId: user.id,
                        provider: 'google',
                        providerId: profile.id
                    }
                });
            }
            const jwtToken = request.server.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '1h' });
            return reply.redirect(`http://localhost:3001/auth/callback?token=${jwtToken}`);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'OAuth callback failed' });
        }
    }
};
exports.default = authController;
``;
