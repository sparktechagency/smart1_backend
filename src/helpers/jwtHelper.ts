import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { IJwtPayload } from '../app/modules/auth/auth.interface';

const createToken = (payload: IJwtPayload, secret: Secret, expireTime: string) => {
     return jwt.sign(payload, secret, { expiresIn: expireTime } as SignOptions);
};

const verifyToken = (token: string, secret: Secret) => {
     return jwt.verify(token, secret) as JwtPayload;
};

export const jwtHelper = { createToken, verifyToken };
