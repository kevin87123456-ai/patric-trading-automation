import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { exchangeCodeForToken, getGitHubUserInfo } from "./github";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // GitHub OAuth callback
  app.get("/api/github/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // 交換授權碼獲取 access token
      const tokenData = await exchangeCodeForToken(code);
      const accessToken = tokenData.access_token;

      // 獲取 GitHub 用戶信息
      const githubUser = await getGitHubUserInfo(accessToken);

      // 獲取當前登入用戶的 session
      const sessionCookie = req.cookies[COOKIE_NAME];
      if (!sessionCookie) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // 從 session token 解析用戶信息
      const userInfo = await sdk.getUserInfo(sessionCookie);
      if (!userInfo?.openId) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      // 更新用戶的 GitHub token
      await db.updateUser(userInfo.openId, {
        githubToken: accessToken,
        githubUsername: githubUser.login,
        githubAuthorizedAt: new Date(),
      });

      // 重定向回設定頁面
      res.redirect(302, "/settings?github=success");
    } catch (error) {
      console.error("[GitHub OAuth] Callback failed", error);
      res.redirect(302, "/settings?github=error");
    }
  });

  // Manus OAuth callback
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
