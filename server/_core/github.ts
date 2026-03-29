import { ENV } from "./env";

/**
 * 生成 GitHub OAuth 授權 URL
 */
export function generateGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.githubClientId,
    redirect_uri: ENV.githubRedirectUri,
    scope: "repo,user",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * 交換授權碼獲取 access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: ENV.githubClientId,
      client_secret: ENV.githubClientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 使用 access token 獲取用戶信息
 */
export async function getGitHubUserInfo(accessToken: string): Promise<{
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
}> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user info: ${response.statusText}`);
  }

  return response.json();
}
