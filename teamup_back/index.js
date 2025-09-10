import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";
import session from "express-session";
import { Issuer } from "openid-client";
import { Client } from "ssh2";
import net from "net";

dotenv.config();
const { Pool } = pkg;

// SSH configuration
const sshConfig = {
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  privateKey: fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH),
};

// Create SSH tunnel then initialize pool
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const sshClient = new Client();

    sshClient
      .on("ready", () => {
        console.log("SSH Connection established");

        // สร้าง local TCP server
        const server = net.createServer((localStream) => {
          sshClient.forwardOut(
            "127.0.0.1",
            0,
            process.env.DB_HOST,
            parseInt(process.env.DB_PORT),
            (err, remoteStream) => {
              if (err) {
                localStream.destroy();
                reject(err);
                return;
              }
              // pipe data ไปกลับ
              localStream.pipe(remoteStream).pipe(localStream);
            }
          );
        });

        // listen ที่ localhost:5433
        server.listen(5433, "127.0.0.1", async () => {
          console.log("Local tunnel listening on 127.0.0.1:5433");

          const pool = new Pool({
            host: "127.0.0.1",
            port: 5433,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
          });

          try {
            const client = await pool.connect();
            console.log("Connected to DB through SSH tunnel");
            const result = await client.query("SELECT NOW()");
            console.log("Database time:", result.rows[0].now);
            client.release();
            resolve(pool);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", (err) => {
        console.error("SSH Connection error:", err);
        reject(err);
      })
      .connect(sshConfig);
  });
}


// Initialize database connection with SSH tunnel
let pool;
initializeDatabase()
  .then((p) => {
    pool = p;
    console.log("Database pool initialized");

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database pool:", err);
    process.exit(1);
  });

const app = express();

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
      "http://localhost:3100/callback",
      params,
      {
        nonce: req.session.nonce,
        state: req.session.state,
      }
    );

    const userInfo = await client.userinfo(tokenSet.access_token);
    req.session.userInfo = userInfo;

    res.redirect("http://localhost:3000");
  } catch (err) {
    console.error("Callback error:", err);
    res.redirect("http://localhost:3000");
  }
});

app.get("/", checkAuth, (req, res) => {
  res.redirect("http://localhost:3000");
});

app.get("/createActivity", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect('/login');
  }
  // redirect ไปที่ frontend page
  res.redirect("http://localhost:3000/createActivity");
});

app.get("/login", (req, res) => {
  const cognitoDomain =
    "https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com";
  const clientId = "2sqjfuh2t12b1djlpnbjq9beba";
  const redirectUri = "http://localhost:3100/callback";
  const responseType = "code";
  const scope = "phone+openid+email";

  const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}`;

  res.redirect(loginUrl);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  const logoutUrl = `https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com/logout?client_id=2sqjfuh2t12b1djlpnbjq9beba&logout_uri=http://localhost:3000`;
  res.redirect(logoutUrl);
});

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
    res.json({
      status: "success",
      message: "Connected to RDS successfully",
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    console.error("Database connection error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to connect to RDS",
      error: err.message,
    });
  }
});

app.post("/api/createActivity", async (req, res) => {
  try {
    const {
      name,
      owner,
      category,
      startDate,
      endDate,
      signUpDeadline,
      description,
      location
    } = req.body;

    if (!name || !owner || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const query = `
      INSERT INTO activity 
      (name, owner, category, startDate, endDate, signUpDeadline, description, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      name,
      owner,
      category,
      startDate,
      endDate,
      signUpDeadline,
      description,
      location
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({
      error: "Failed to create activity"
    });
  }
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
