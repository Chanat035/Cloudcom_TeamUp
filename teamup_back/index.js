import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import { Issuer, generators } from "openid-client";
import cors from "cors";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});
const app = express();

// CORS configuration สำหรับ Next.js
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3100"],
    credentials: true,
  })
);

app.use(express.json());

let client;
// Initialize OpenID Client
async function initializeClient() {
  const issuer = await Issuer.discover(
    "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_zbXn28iAN"
  );
  client = new issuer.Client({
    client_id: "2sqjfuh2t12b1djlpnbjq9beba",
    client_secret: "sg64df35j17gb53n9hps1rt967m6lc4l5pid1kajbip8f0d70f0",
    redirect_uris: ["http://localhost:3100/callback"],
    response_types: ["code"],
  });
}
initializeClient().catch(console.error);

app.use(
  session({
    secret: "L3VxwxeRG0",
    resave: false,
    saveUninitialized: false,
  })
);

const checkAuth = (req, res, next) => {
  if (!req.session.userInfo) {
    req.isAuthenticated = false;
  } else {
    req.isAuthenticated = true;
  }
  next();
};

app.get("/callback", async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      "http://localhost:3100/callback", // ใช้ localhost
      params,
      {
        nonce: req.session.nonce,
        state: req.session.state,
      }
    );

    const userInfo = await client.userinfo(tokenSet.access_token);
    req.session.userInfo = userInfo;

    res.redirect("http://localhost:3000"); // redirect กลับไป frontend
  } catch (err) {
    console.error("Callback error:", err);
    res.redirect("http://localhost:3000");
  }
});

app.get("/", checkAuth, (req, res) => {
  res.redirect("http://localhost:3000"); // ไปหน้า Next.js
});

app.get("/login", (req, res) => {
  const nonce = generators.nonce();
  const state = generators.state();

  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = client.authorizationUrl({
    scope: "phone openid email",
    state: state,
    nonce: nonce,
  });

  res.redirect(authUrl);
});

// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}

app.get(
  getPathFromURL("http://localhost:3100/callback"),
  async (req, res) => {
    try {
      const params = client.callbackParams(req);
      const tokenSet = await client.callback(
        "http://localhost:3100/callback",
        params,
        {
          nonce: req.session.nonce,
          state: req.session.state,
        }
      );

      const userInfo = await client.userinfo(tokenSet.access_token);
      req.session.userInfo = userInfo;

      res.redirect("/");
    } catch (err) {
      console.error("Callback error:", err);
      res.redirect("/");
    }
  }
);

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  const logoutUrl = `https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com/logout?client_id=2sqjfuh2t12b1djlpnbjq9beba&logout_uri=http://localhost:3000`;
  res.redirect(logoutUrl);
});

// API routes สำหรับ Next.js
app.get("/api/auth/status", checkAuth, (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated,
    userInfo: req.session.userInfo || null,
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/testdb", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
