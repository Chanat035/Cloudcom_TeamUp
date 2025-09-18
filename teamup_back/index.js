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
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

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

app.get("/callback", async (req,res)=>{
  const params = client.callbackParams(req);
  const tokenSet = await client.callback("http://localhost:3100/callback",params,{
    nonce:req.session.nonce,
    state:req.session.state
  });
  const userInfo = await client.userinfo(tokenSet.access_token);

  req.session.regenerate(err=>{
    if(err){ console.error(err); return res.redirect("http://localhost:3000"); }
    req.session.userInfo = userInfo;
    req.session.save(()=>{
      res.redirect("http://localhost:3000");
    });
  });
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,           // เช่น ap-southeast-2
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

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

app.get("/eventSchedule", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect('/login');
  }
  // redirect ไปที่ frontend page
  res.redirect("http://localhost:3000/eventSchedule");
});

app.get("/eventDetail/:id", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect('/login');
  }
  // redirect ไปหน้า frontend ที่แสดงรายละเอียดกิจกรรม
  res.redirect(`http://localhost:3000/eventDetail/${req.params.id}`);
});

app.get("/profile", checkAuth, (req, res) => {
  if (!req.isAuthenticated) {
    return res.redirect('/login');
  }
  // redirect ไปที่ profile page
  res.redirect("http://localhost:3000/profile");
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
      location
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
    console.error('Error creating activity:', err);
    res.status(500).json({
      error: "Failed to create activity"
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
      SELECT id, name, owner, category, startDate, endDate, signUpDeadline, description, location
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

app.get("/api/eventDetail/:id/checkParticipant", checkAuth, async (req, res) => {
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
});

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

app.post("/api/uploadProfile", checkAuth, upload.single("profileImage"), async (req, res) => {
  if (!req.isAuthenticated) return res.status(401).json({ error: "Unauthorized" });
  try {
    const userId = req.session.userInfo.sub; // จาก Cognito
    const file = req.file;
    const key = `user/${userId}/${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/getProfile", checkAuth, async (req, res) => {
  if (!req.isAuthenticated) return res.status(401).json({ error: "Unauthorized" });

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

app.post("/api/uploadActivityImage/:activityId", checkAuth, upload.single("activityImage"), async (req, res) => {
  if (!req.isAuthenticated) return res.status(401).json({ error: "Unauthorized" });

  const activityId = req.params.activityId; // รับ activityId จาก URL parameter

  if (!activityId) {
    return res.status(400).json({ error: "Missing activityId" });
  }

  try {
    const file = req.file;
    // ✅ แก้ไข Key ให้มี prefix เป็น 'activity/activityId/'
    const key = `activity/${activityId}/${file.originalname}`; 

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // ไม่จำเป็นต้องตอบกลับ imageUrl
    res.json({ message: "Upload successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/getActivityImage/:id", async (req, res) => {
  const activityId = req.params.id;
  const defaultImageUrl = "https://teamupbucket035.s3.ap-southeast-2.amazonaws.com/activity/Default-Activity-Image/default-activity.jpg";

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
    res.status(500).json({ imageUrl: defaultImageUrl, error: "Failed to fetch activity image" });
  }
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
