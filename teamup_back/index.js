import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";
import session from "express-session";
import { Issuer } from "openid-client";
import { Client } from "ssh2";
import net from "net";
import multer from "multer";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import http from "http";
import { Server } from "socket.io";
import {
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

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
            ssl: { rejectUnauthorized: false },
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
const server = http.createServer(app);
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3100"],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3100"],
    credentials: true,
  },
});

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

  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
      return res.redirect("http://localhost:3000");
    }

    // 🆕 เก็บ userInfo + accessToken ลง session
    req.session.userInfo = {
      ...userInfo,
      accessToken: tokenSet.access_token,
      idToken: tokenSet.id_token, // เก็บเผื่อไว้ถ้าจะใช้อัปเดต claims ฝั่ง client
    };

    req.session.save(() => {
      res.redirect("http://localhost:3000");
    });
  });
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinActivity", ({ activityId, userId }) => {
    socket.join(`activity_${activityId}`);
    console.log(`User ${userId} joined room activity_${activityId}`);
  });

  socket.on("sendMessage", async ({ activityId, userId, message }) => {
    const result = await pool.query(
      "INSERT INTO chat_message (activity_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
      [activityId, userId, message]
    );
    const savedMessage = result.rows[0];
    io.to(`activity_${activityId}`).emit("newMessage", savedMessage);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ใช้ key จาก environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_32_byte_key_123456789012"; 
const IV_LENGTH = 16; // สำหรับ AES-CBC ต้องใช้ IV ยาว 16 bytes

// เข้ารหัสข้อความ
function encryptText(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH); // สร้างค่าเริ่มต้นแบบสุ่ม
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  // รวม iv + ciphertext เป็น string เดียว
  return iv.toString("base64") + ":" + encrypted;
}

// ถอดรหัสข้อความ
function decryptText(encryptedText) {
  const [ivBase64, encryptedData] = encryptedText.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function computeSecretHash(username) {
  if (!process.env.COGNITO_CLIENT_SECRET || !process.env.COGNITO_CLIENT_ID) return undefined;
  const hmac = crypto.createHmac("sha256", process.env.COGNITO_CLIENT_SECRET);
  hmac.update(username + process.env.COGNITO_CLIENT_ID);
  return hmac.digest("base64");
}

async function verifyUserPassword(username, password) {
  try {
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const secretHash = computeSecretHash(username);
    if (secretHash) params.AuthParameters.SECRET_HASH = secretHash;

    const result = await cognitoClient.send(new AdminInitiateAuthCommand(params));
    // ถ้าไม่มี error ถือว่า auth ผ่าน (จะได้ ChallengeName หรือ AuthenticationResult)
    return { ok: true, result };
  } catch (err) {
    console.warn("verifyUserPassword failed:", err);
    return { ok: false, error: err };
  }
}

app.get("/", checkAuth, (req, res) => {
  res.redirect("http://localhost:3000");
});

app.get("/createActivity", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect("/login");
  }
  // redirect ไปที่ frontend page
  res.redirect("http://localhost:3000/createActivity");
});

app.get("/eventSchedule", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect("/login");
  }
  // redirect ไปที่ frontend page
  res.redirect("http://localhost:3000/eventSchedule");
});

app.get("/eventDetail/:id", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect("/login");
  }
  // redirect ไปหน้า frontend ที่แสดงรายละเอียดกิจกรรม
  res.redirect(`http://localhost:3000/eventDetail/${req.params.id}`);
});

app.get("/profile", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect("/login");
  }
  // redirect ไปที่ profile page
  res.redirect("http://localhost:3000/profile");
});

app.get("/groupChat", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect("/login");
  }
  // redirect ไปที่ groupChat page
  res.redirect("http://localhost:3000/groupChat");
});

app.get("/login", (req, res) => {
  const cognitoDomain =
    "https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com";
  const clientId = "2sqjfuh2t12b1djlpnbjq9beba";
  const redirectUri = "http://localhost:3100/callback";
  const responseType = "code";
  const scope = "profile openid email";

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
      location,
    } = req.body;

    if (!name || !owner || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // ✅ 1. สร้าง activity
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
      location,
    ];

    const result = await pool.query(query, values);
    const newActivity = result.rows[0];

    // ✅ 2. insert owner ไปที่ activity_participant
    await pool.query(
      `
      INSERT INTO activity_participant (activity_id, user_id, status, role)
      VALUES ($1, $2, 'joined', 'organizer')
      `,
      [newActivity.id, owner] // ใช้ owner id เป็น user_id
    );

    res.status(201).json(newActivity);
  } catch (err) {
    console.error("Error creating activity:", err);
    res.status(500).json({
      error: "Failed to create activity",
    });
  }
});

app.get("/api/eventSchedule", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, owner, category, startDate, endDate, signUpDeadline, description, location
      FROM activity
      ORDER BY startDate ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

app.get("/api/eventDetail/:id", async (req, res) => {
  const eventId = req.params.id;
  try {
    const result = await pool.query(
      `
      SELECT id, name, owner, category, startdate, enddate, signUpdeadline, description, location
      FROM activity
      WHERE id = $1
      `,
      [eventId] // ค่า eventId จะถูก bind เข้ามาที่ $1
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(result.rows[0]); // ส่ง object ของกิจกรรมเดียว
  } catch (err) {
    console.error("Error fetching activity:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ✅ ผู้ใช้เข้าร่วมกิจกรรม
app.post("/api/eventDetail/:id/join", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const activityId = req.params.id;
  const userId = req.session.userInfo.sub; // Cognito user id

  try {
    const query = `
      INSERT INTO activity_participant (activity_id, user_id, status, role)
      VALUES ($1, $2, 'pending', 'participant')
      ON CONFLICT (activity_id, user_id) DO NOTHING
      RETURNING *;
    `;
    const values = [activityId, userId];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(200).json({ message: "Already joined or pending" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error joining activity:", err);
    res.status(500).json({ error: "Failed to join activity" });
  }
});

app.put("/api/eventDetail/:id/cancel", checkAuth, async (req, res) => {
  const activityId = req.params.id;
  const userId = req.session.userInfo.sub; // Cognito user id

  try {
    const query = `
      INSERT INTO activity_participant (activity_id, user_id, status, role)
      VALUES ($1, $2, 'canceled', 'participant')
      ON CONFLICT (activity_id, user_id)
      DO UPDATE SET status = 'canceled'
      RETURNING *;
    `;
    const values = [activityId, userId];

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error canceling activity:", err);
    res.status(500).json({ error: "Failed to cancel activity" });
  }
});

app.get(
  "/api/eventDetail/:id/checkParticipant",
  checkAuth,
  async (req, res) => {
    if (!req.isAuthenticated) {
      return res.json({ joined: false });
    }

    const activityId = req.params.id;
    const userId = req.session.userInfo.sub;

    try {
      const result = await pool.query(
        "SELECT 1 FROM activity_participant WHERE activity_id = $1 AND user_id = $2",
        [activityId, userId]
      );

      res.json({ joined: result.rows.length > 0 });
    } catch (err) {
      console.error("Error checking participant:", err);
      res.status(500).json({ joined: false });
    }
  }
);

// ✅ ดึงกิจกรรมที่ user เป็น organizer
app.get("/api/myGroups", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.session.userInfo.sub; // ได้มาจาก Cognito
  console.log("Fetching groups for user:", userId);

  try {
    const result = await pool.query(
      `
      SELECT a.id, a.name, a.category, a.startDate, a.endDate, a.location
      FROM activity a
      JOIN activity_participant ap 
        ON a.id = ap.activity_id
      WHERE ap.user_id = $1 AND ap.role = 'organizer'
      ORDER BY a.startDate ASC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching my groups:", err);
    res.status(500).json({ error: "Failed to fetch my groups" });
  }
});

// ✅ กลุ่มทั้งหมดที่ user joined (ไม่สน role)
app.get("/api/myGroups/chat", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.session.userInfo.sub;

  try {
    const result = await pool.query(
      `
      SELECT a.id, a.name, a.category, a.startDate, a.endDate, a.location
      FROM activity a
      JOIN activity_participant ap 
        ON a.id = ap.activity_id
      WHERE ap.user_id = $1 
        AND ap.status = 'joined'
      ORDER BY a.startDate ASC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching chat groups:", err);
    res.status(500).json({ error: "Failed to fetch chat groups" });
  }
});

app.post(
  "/api/uploadProfile",
  checkAuth,
  upload.single("profileImage"),
  async (req, res) => {
    if (!req.isAuthenticated)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const userId = req.session.userInfo.sub; // จาก Cognito
      const file = req.file;
      const key = `user/${userId}/${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      res.json({ imageUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

app.get("/api/getProfile", checkAuth, async (req, res) => {
  if (!req.isAuthenticated)
    return res.status(401).json({ error: "Unauthorized" });

  const userId = req.session.userInfo.sub;

  try {
    // ดึง list object ของ user
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: `user/${userId}/`,
    });
    const response = await s3.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return res.json({ imageUrl: null }); // ไม่มีรูป
    }

    // เลือก object ล่าสุด
    const latestObject = response.Contents.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    )[0];

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${latestObject.Key}`;

    res.json({ imageUrl });
  } catch (err) {
    console.error("Error fetching profile image:", err);
    res.status(500).json({ error: "Failed to fetch profile image" });
  }
});

app.get("/api/settings/getInterests", checkAuth, async (req, res) => {
  if (!req.isAuthenticated)
    return res.status(401).json({ error: "Unauthorized" });

  const userId = req.session.userInfo.sub;
  try {
    const result = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: userId,
      })
    );

    const attr = result.UserAttributes.find(
      (a) => a.Name === "custom:interests"
    );
    const interests = attr ? JSON.parse(attr.Value) : [];

    res.json({ interests });
  } catch (err) {
    console.error("Error fetching interests:", err);
    res.status(500).json({ error: "Failed to fetch interests" });
  }
});

app.post("/api/settings/changeInterests", checkAuth, async (req, res) => {
  if (!req.isAuthenticated)
    return res.status(401).json({ error: "Unauthorized" });

  const userId = req.session.userInfo.sub;
  const { interests } = req.body;

  if (!Array.isArray(interests) || interests.length > 3) {
    return res
      .status(400)
      .json({ error: "Interests must be an array with up to 3 items" });
  }

  try {
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          {
            Name: "custom:interests",
            Value: JSON.stringify(interests), // เก็บเป็น JSON string
          },
        ],
      })
    );

    res.json({ success: true, interests });
  } catch (err) {
    console.error("Error updating interests:", err);
    res.status(500).json({ error: "Failed to update interests" });
  }
});

// ✅ เปลี่ยนชื่อ
app.post("/api/settings/changeName", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) return res.status(401).json({ error: "Unauthorized" });

  const userId = req.session.userInfo.sub; // Cognito user id (USERNAME)
  const { newName, password } = req.body;

  if (!newName) return res.status(400).json({ error: "Name required" });
  if (!password) return res.status(400).json({ error: "Current password required to confirm" });

  // ตรวจสอบ password ว่าใช่ของ user นี้จริง
  const verify = await verifyUserPassword(userId, password);
  if (!verify.ok) {
    return res.status(403).json({ error: "Invalid password" });
  }

  try {
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: userId,
        UserAttributes: [{ Name: "name", Value: newName }],
      })
    );

    // อัปเดต session copy ถ้ามี
    if (req.session && req.session.userInfo) {
      req.session.userInfo.name = newName;
    }

    res.json({ success: true, name: newName });
  } catch (err) {
    console.error("Error updating name:", err);
    res.status(500).json({ error: "Failed to update name" });
  }
});

// ✅ เปลี่ยนรหัสผ่าน
app.post("/api/settings/changePassword", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) return res.status(401).json({ error: "Unauthorized" });

  const userId = req.session.userInfo.sub;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "oldPassword, newPassword and confirmPassword are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New password and confirmation do not match" });
  }

  // ตรวจสอบความถูกต้องของรหัสเก่า
  const verify = await verifyUserPassword(userId, oldPassword);
  if (!verify.ok) {
    return res.status(403).json({ error: "Invalid current password" });
  }

  try {
    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: userId,
        Password: newPassword,
        Permanent: true,
      })
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

app.post(
  "/api/uploadActivityImage/:activityId",
  checkAuth,
  upload.single("activityImage"),
  async (req, res) => {
    if (!req.isAuthenticated)
      return res.status(401).json({ error: "Unauthorized" });

    const activityId = req.params.activityId; // รับ activityId จาก URL parameter

    if (!activityId) {
      return res.status(400).json({ error: "Missing activityId" });
    }

    try {
      const file = req.file;
      // ✅ แก้ไข Key ให้มี prefix เป็น 'activity/activityId/'
      const key = `activity/${activityId}/${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      // ไม่จำเป็นต้องตอบกลับ imageUrl
      res.json({ message: "Upload successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

app.get("/api/getActivityImage/:id", async (req, res) => {
  const activityId = req.params.id;
  const defaultImageUrl =
    "https://teamupbucket035.s3.ap-southeast-2.amazonaws.com/activity/Default-Activity-Image/default-activity.jpg";

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: `activity/${activityId}/`, // ค้นหาตาม activityId
    });
    const response = await s3.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return res.json({ imageUrl: defaultImageUrl });
    }

    // เลือกรูปภาพล่าสุด หากมีหลายรูป
    const latestObject = response.Contents.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    )[0];

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${latestObject.Key}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error("Error fetching activity image:", err);
    res.status(500).json({
      imageUrl: defaultImageUrl,
      error: "Failed to fetch activity image",
    });
  }
});

app.get("/api/activity/:id/messages", checkAuth, async (req, res) => {
  if (!req.isAuthenticated)
    return res.status(401).json({ error: "Unauthorized" });

  const activityId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT id, activity_id, user_id, user_name, message, created_at
       FROM chat_message
       WHERE activity_id = $1
       ORDER BY created_at ASC`,
      [activityId]
    );

    // 🧠 ถอดรหัสก่อนส่ง
    const decryptedRows = result.rows.map((row) => {
      try {
        return { ...row, message: decryptText(row.message) };
      } catch (err) {
        console.warn("Failed to decrypt message id", row.id);
        return { ...row, message: "[Unable to decrypt message]" };
      }
    });

    res.json(decryptedRows);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


app.post("/api/activity/:id/messages", checkAuth, async (req, res) => {
  if (!req.isAuthenticated)
    return res.status(401).json({ error: "Unauthorized" });

  const activityId = req.params.id;
  const userId = req.session.userInfo.sub;
  const userName =
    req.session.userInfo.name ||
    req.session.userInfo.given_name ||
    req.session.userInfo.preferred_username ||
    "Unknown";

  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "Message required" });
  }

  try {
    const encrypted = encryptText(message); // 🧠 เข้ารหัสก่อนบันทึก
    const result = await pool.query(
      `INSERT INTO chat_message (activity_id, user_id, user_name, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [activityId, userId, userName, encrypted]
    );

    // ส่งข้อความที่ถอดรหัสแล้วกลับให้ frontend เห็น
    const saved = result.rows[0];
    saved.message = message;

    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});


// ✅ อัปเดตกิจกรรม
app.put("/api/editActivity/:id", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const activityId = req.params.id;
  const userId = req.session.userInfo.sub;

  try {
    // ✅ ต้องมี record เป็น organizer เท่านั้น ไม่เจอถือว่าไม่มีสิทธิ์
    const check = await pool.query(
      `SELECT 1
       FROM activity_participant
       WHERE activity_id = $1 AND user_id = $2 AND role = 'organizer'`,
      [activityId, userId]
    );

    if (check.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Forbidden: You are not organizer of this activity" });
    }

    const {
      name,
      category,
      startDate,
      endDate,
      signUpDeadline,
      description,
      location,
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      `UPDATE activity
       SET name=$1, category=$2, startDate=$3, endDate=$4,
           signUpDeadline=$5, description=$6, location=$7
       WHERE id=$8
       RETURNING *`,
      [name, category, startDate, endDate, signUpDeadline, description, location, activityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error editing activity:", err);
    res.status(500).json({ error: "Failed to edit activity" });
  }
});


// ✅ ดึงผู้เข้าร่วมกิจกรรม
app.get("/api/activity/:id/participants", checkAuth, async (req, res) => {
  const activityId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT user_id, status, role
      FROM activity_participant
      WHERE activity_id = $1
      ORDER BY role DESC, status ASC
      `,
      [activityId]
    );

    // ใช้ชื่อจาก session (เฉพาะผู้ใช้ที่ล็อกอินอยู่ตอนนี้)
    const currentUserId = req.session.userInfo.sub;
    const currentUserName =
      req.session.userInfo.name ||
      req.session.userInfo.given_name ||
      req.session.userInfo.preferred_username ||
      "Unknown";

    // map ชื่อจาก session ให้เฉพาะ user ปัจจุบัน
    const participants = result.rows.map((row) => ({
      ...row,
      name: row.user_id === currentUserId ? currentUserName : "Unknown User",
    }));

    res.json(participants);
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});


// ✅ อัปเดตสถานะหรือบทบาทของผู้เข้าร่วม
app.put("/api/activity/:id/participants/:userId", async (req, res) => {
  const { id: activityId, userId } = req.params;
  const { status, role } = req.body;

  if (!["joined", "pending", "canceled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!["organizer", "participant"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE activity_participant
      SET status = $1, role = $2
      WHERE activity_id = $3 AND user_id = $4
      RETURNING *
      `,
      [status, role, activityId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating participant:", err);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
