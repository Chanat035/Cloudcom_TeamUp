export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
export const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com";
export const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "2sqjfuh2t12b1djlpnbjq9beba";
export const OAUTH_REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || `${API_URL}/callback`;