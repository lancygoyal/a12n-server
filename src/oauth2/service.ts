import { OAuth2Client, OAuth2Token } from './types';
import { NotFound } from '../errors';
import db from '../database';
import crypto from 'crypto';
import { User } from '../user/types';

// 10 minutes
const ACCESS_TOKEN_EXPIRY = 600;

// 1 hour
const REFRESH_TOKEN_EXPIRY = 3600;

export async function getClientByClientId(clientId: string): Promise<OAuth2Client> {

  const query = "SELECT id, client_id FROM oauth2_clients WHERE client_id = ?";
  const result = await db.query(query, [clientId]);

  if (!result[0].length) {
    throw new NotFound('OAuth2 client_id not recognized');
  }
  
  return {
    id: result[0][0].id,
    clientId: result[0][0].client_id,
  };

}

export async function validateRedirectUri(client: OAuth2Client, redirectUrl: string) {

  const query = "SELECT id FROM oauth2_redirect_uris WHERE oauth2_client_id = ? AND uri = ?";
  const result = await db.query(query, [client.id, redirectUrl]);

  return result[0].length > 0;

}


export async function getAccessToken(client: OAuth2Client, user: User): Promise<OAuth2Token> {

  const accessToken = crypto.randomBytes(32).toString('base64').replace('=','');
  const refreshToken = crypto.randomBytes(32).toString('base64').replace('=','');

  const query = "INSERT INTO oauth2_tokens SET created = UNIX_TIMESTAMP(), ?";

  const accessTokenExpires = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY;
  const refreshTokenExpires = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY;

  await db.query(query,{
    oauth2_client_id: client.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user.id,
    access_token_expires: accessTokenExpires,
    refresh_token_expires: refreshTokenExpires,
  });

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    accessTokenExpires: accessTokenExpires,
  };

}