// ==================== IMPORTS ====================
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Set default environment if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('🔧 No NODE_ENV set, defaulting to development');
}

// ==================== APP SETUP ====================
const app = express();
const server = http.createServer(app);
const PORT = process.env.MYSQL_ADDON_PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log("🔧 Environment:", isProduction ? "production" : "development");

// ==================== CONFIGURATION ====================
const config = {
  db: {
    host: process.env.MYSQL_ADDON_HOST || "localhost",
    user: process.env.MYSQL_ADDON_USER || "root",
    password: process.env.MYSQL_ADDON_PASSWORD || "",
    database: process.env.MYSQL_ADDON_DB || "ResCareDB"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "rescare_development_secret_key_2024"
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@rescare.com",
    password: process.env.ADMIN_PASSWORD || "admin123"
  },
  cors: {
    origin: process.env.FRONTEND_URL || (isProduction ? false : true)
  }
};

console.log("🔧 Configuration loaded:");
console.log("   Database:", config.db.database);
console.log("   Host:", config.db.host);
console.log("   Port:", PORT);

// ==================== MIDDLEWARE ====================
// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression (production only)
if (isProduction) {
  app.use(compression());
  console.log("🔧 Compression enabled");
}

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://rescare.vercel.app",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Different limits for prod vs dev
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files in production
if (isProduction) {
  const reactBuildPath = path.join(__dirname, 'dist');
  app.use(express.static(reactBuildPath));
  console.log("📁 Production: Serving React from:", reactBuildPath);
} else {
  // In development, serve from the root directory
  app.use(express.static(path.join(__dirname)));
  console.log("🔧 Development: Serving files from root directory");
}

// ==================== DATABASE CONFIG ====================
let db;

async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");
    
    // Create database if it doesn't exist
    const tempConnection = mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password
    });

    await new Promise((resolve, reject) => {
      tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`;`, (err) => { 
        if (err) {
          console.error("❌ Database creation failed:", err.message);
          reject(err);
        } else {
          console.log(`✅ Database '${config.db.database}' ready`);
          resolve();
        }
      });
    });
    tempConnection.end();

    // Create connection pool with environment-specific config
    db = mysql.createPool({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: isProduction ? 20 : 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });

    // Test connection
    await new Promise((resolve, reject) => {
      db.getConnection((err, connection) => {
        if (err) {
          console.error("❌ Database connection failed:", err.message);
          reject(err);
        } else {
          console.log("✅ Connected to MySQL Database");
          connection.release();
          resolve();
        }
      });
    });

    // Create tables one by one to avoid multiple statements issue
    console.log("📦 Creating database tables...");
    
    // Students table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        contactNumber VARCHAR(15) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        residence VARCHAR(100) NOT NULL,
        block VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Students table created");

    // Admin table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Admin table created");

    // Student requests table - UPDATED to preserve requests when student is deleted
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS student_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        dateCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
        studentName VARCHAR(255),
        studentResidence VARCHAR(100),
        studentBlock VARCHAR(50),
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Student requests table created");

    console.log("📦 All database tables initialized");

    // Seed admin if not exists
    const [admin] = await db.promise().query("SELECT * FROM admin WHERE email = ?", [config.admin.email]);
    
    if (admin.length === 0) {
      const hashed = await bcrypt.hash(config.admin.password, 12);
      await db.promise().query("INSERT INTO admin (email, password) VALUES (?, ?)", [config.admin.email, hashed]);
      console.log("🔑 Default admin account created");
      console.log("   Email:", config.admin.email);
      if (!isProduction) {
        console.log("   Password:", config.admin.password);
      }
    } else {
      console.log("✅ Admin account already exists");
    }

    // Show current counts
    const [students] = await db.promise().query("SELECT COUNT(*) as count FROM students");
    const [requests] = await db.promise().query("SELECT COUNT(*) as count FROM student_requests");
    console.log(`📊 Current data: ${students[0].count} students, ${requests[0].count} requests`);

  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
    if (err.sqlMessage) console.error("❌ SQL Error details:", err.sqlMessage);
    process.exit(1);
  }
}

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, { 
  cors: { 
    origin: config.cors.origin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  if (!isProduction) {
    console.log("🔌 User connected:", socket.id);
  }

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
    if (!isProduction) console.log("👨‍💼 Admin joined room");
  });

  socket.on("join-student-room", (data) => {
    const room = `residence-${data.residence}-block-${data.block}`;
    socket.join(room);
    if (!isProduction) console.log(`👨‍🎓 Student joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    if (!isProduction) {
      console.log("🔌 User disconnected:", socket.id);
    }
  });
});

// Helper functions for broadcasting
const broadcastToAdmins = (event, data) => {
  io.to("admin-room").emit(event, data);
};

const broadcastToStudentRoom = (residence, block, event, data) => {
  const room = `residence-${residence}-block-${block}`;
  io.to(room).emit(event, data);
};

// ==================== INPUT VALIDATION ====================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// ==================== MIDDLEWARE ====================
// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== ROUTES ====================

// ----- HEALTH CHECK -----
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "ResCare Server is running!",
    timestamp: new Date().toISOString(),
    mode: isProduction ? "production" : "development",
    version: "1.0.0",
    endpoints: [
      "GET /api/health",
      "POST /api/login", 
      "POST /api/students/register",
      "DELETE /api/students/:id",
      "POST /api/requests",
      "GET /api/requests",
      "GET /api/requests/block/:residence/:block",
      "PUT /api/requests/:id/status"
    ]
  });
});

// ----- HEALTH CHECK ENDPOINT -----
app.get("/api/health", async (req, res) => {
  try {
    const [students] = await db.promise().query("SELECT COUNT(*) as count FROM students");
    const [admins] = await db.promise().query("SELECT COUNT(*) as count FROM admin");
    const [requests] = await db.promise().query("SELECT COUNT(*) as count FROM student_requests");
    
    res.json({
      success: true,
      message: "ResCare Server is healthy 🚀",
      database: "Connected",
      students: students[0].count,
      admins: admins[0].count,
      requests: requests[0].count,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: isProduction ? "production" : "development"
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Database connection failed",
      error: isProduction ? undefined : err.message 
    });
  }
});

// ----- STUDENT REGISTER -----
app.post("/api/students/register", async (req, res) => {
  const { fullName, contactNumber, email, residence, block, password } = req.body;
  
  if (!fullName || !contactNumber || !email || !residence || !block || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  if (contactNumber.length !== 10 || !/^\d+$/.test(contactNumber)) {
    return res.status(400).json({ success: false, message: "Contact number must be 10 digits." });
  }

  try {
    const [existing] = await db.promise().query("SELECT id FROM students WHERE email = ?", [email]);
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await db.promise().query(
      "INSERT INTO students (fullName, contactNumber, email, residence, block, password) VALUES (?, ?, ?, ?, ?, ?)",
      [fullName.trim(), contactNumber, email.toLowerCase(), residence.trim(), block.trim(), hashedPassword]
    );

    if (!isProduction) {
      console.log("✅ New student registered:", email);
    }
    
    res.json({ success: true, message: "Registration successful." });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- DELETE STUDENT ACCOUNT (PRESERVES REQUESTS) -----
app.delete("/api/students/:id", authenticateToken, async (req, res) => {
  const studentId = parseInt(req.params.id);
  
  if (!studentId) {
    return res.status(400).json({ success: false, message: "Student ID is required." });
  }

  try {
    // Verify the student exists
    const [students] = await db.promise().query("SELECT * FROM students WHERE id = ?", [studentId]);
    
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    // Verify the authenticated user is deleting their own account
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: "You can only delete your own account." });
    }

    const student = students[0];

    // First, preserve student info in requests before deleting the student
    await db.promise().query(`
      UPDATE student_requests 
      SET 
        studentName = ?,
        studentResidence = ?,
        studentBlock = ?
      WHERE studentId = ?
    `, [student.fullName, student.residence, student.block, studentId]);

    // Now delete the student (requests will be preserved with student info)
    await db.promise().query("DELETE FROM students WHERE id = ?", [studentId]);

    if (!isProduction) {
      console.log(`🗑️ Student account deleted: ID ${studentId} (requests preserved)`);
    }
    
    res.json({ 
      success: true, 
      message: "Student account deleted successfully. Your maintenance requests have been preserved for administrative purposes." 
    });
  } catch (err) {
    console.error("Error deleting student:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting student account.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- UNIVERSAL LOGIN -----
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    if (!isProduction) {
      console.log("Login attempt for:", email);
    }
    
    // Check admin
    const [adminRows] = await db.promise().query("SELECT * FROM admin WHERE email = ?", [email.toLowerCase()]);
    
    if (adminRows.length > 0) {
      const admin = adminRows[0];
      const match = await bcrypt.compare(password, admin.password);
      
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      const token = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, config.jwt.secret, { expiresIn: "7d" });
      
      if (!isProduction) {
        console.log("✅ Admin login successful:", email);
      }
      
      return res.status(200).json({ 
        success: true, 
        token, 
        user: { id: admin.id, email: admin.email }, 
        role: "admin" 
      });
    }

    // Check student
    const [studentRows] = await db.promise().query("SELECT * FROM students WHERE email = ?", [email.toLowerCase()]);
    
    if (studentRows.length > 0) {
      const student = studentRows[0];
      const match = await bcrypt.compare(password, student.password);
      
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      const token = jwt.sign({ id: student.id, email: student.email, role: "student" }, config.jwt.secret, { expiresIn: "7d" });
      
      const userData = { 
        id: student.id, 
        fullName: student.fullName, 
        email: student.email, 
        residence: student.residence, 
        block: student.block 
      };
      
      if (!isProduction) {
        console.log("✅ Student login successful:", email);
      }
      
      return res.status(200).json({
        success: true,
        token,
        user: userData,
        role: "student"
      });
    }

    if (!isProduction) {
      console.log("❌ Login failed: Invalid credentials for", email);
    }
    
    res.status(401).json({ success: false, message: "Invalid credentials." });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- CREATE NEW REQUEST -----
app.post("/api/requests", async (req, res) => {
  const { studentId, subject, description } = req.body;
  
  if (!studentId || !subject || !description) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  if (subject.length > 255 || description.length > 1000) {
    return res.status(400).json({ success: false, message: "Input too long." });
  }

  try {
    // Get student info to include in the request
    const [student] = await db.promise().query("SELECT fullName, residence, block FROM students WHERE id = ?", [studentId]);
    
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const studentInfo = student[0];

    const [result] = await db.promise().query(
      "INSERT INTO student_requests (studentId, subject, description, studentName, studentResidence, studentBlock) VALUES (?, ?, ?, ?, ?, ?)",
      [studentId, subject.trim(), description.trim(), studentInfo.fullName, studentInfo.residence, studentInfo.block]
    );

    // Get the complete request data
    const [newRequest] = await db.promise().query(`
      SELECT sr.*, s.fullName, s.residence, s.block
      FROM student_requests sr 
      JOIN students s ON sr.studentId = s.id 
      WHERE sr.id = ?
    `, [result.insertId]);

    const formattedRequest = {
      ...newRequest[0],
      dateCreated: new Date(newRequest[0].dateCreated).toISOString()
    };

    if (!isProduction) {
      console.log("📝 New request created by:", formattedRequest.fullName);
    }

    // Broadcast new request
    broadcastToAdmins("new-request", formattedRequest);
    broadcastToStudentRoom(
      formattedRequest.residence, 
      formattedRequest.block, 
      "new-request", 
      formattedRequest
    );

    res.json({ 
      success: true, 
      message: "Request submitted successfully." 
    });
  } catch (err) {
    console.error("Request creation error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while creating request.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- GET REQUESTS BY STUDENT BLOCK -----
app.get("/api/requests/block/:residence/:block", async (req, res) => {
  const { residence, block } = req.params;
  
  try {
    const [requests] = await db.promise().query(`
      SELECT 
        sr.*, 
        COALESCE(s.fullName, sr.studentName) as fullName,
        COALESCE(s.residence, sr.studentResidence) as residence,
        COALESCE(s.block, sr.studentBlock) as block
      FROM student_requests sr 
      LEFT JOIN students s ON sr.studentId = s.id 
      WHERE (s.residence = ? AND s.block = ?) OR (sr.studentResidence = ? AND sr.studentBlock = ?)
      ORDER BY sr.dateCreated DESC
    `, [residence, block, residence, block]);

    const formattedRequests = requests.map(request => ({
      ...request,
      dateCreated: new Date(request.dateCreated).toISOString()
    }));

    res.json({ success: true, requests: formattedRequests });
  } catch (err) {
    console.error("Error fetching requests:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching requests.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- GET ALL REQUESTS (for admin) -----
app.get("/api/requests", async (req, res) => {
  try {
    const [requests] = await db.promise().query(`
      SELECT 
        sr.*, 
        COALESCE(s.fullName, sr.studentName) as fullName,
        COALESCE(s.residence, sr.studentResidence) as residence,
        COALESCE(s.block, sr.studentBlock) as block
      FROM student_requests sr 
      LEFT JOIN students s ON sr.studentId = s.id 
      ORDER BY sr.dateCreated DESC
    `);

    const formattedRequests = requests.map(request => ({
      ...request,
      dateCreated: new Date(request.dateCreated).toISOString()
    }));

    res.json({ success: true, requests: formattedRequests });
  } catch (err) {
    console.error("Error fetching all requests:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching requests.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ----- UPDATE REQUEST STATUS -----
app.put("/api/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required." });
  }

  const validStatuses = ["Pending", "Approved", "Completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid status." 
    });
  }

  try {
    const [existingRequests] = await db.promise().query(`
      SELECT 
        sr.*, 
        COALESCE(s.fullName, sr.studentName) as fullName,
        COALESCE(s.residence, sr.studentResidence) as residence,
        COALESCE(s.block, sr.studentBlock) as block
      FROM student_requests sr 
      LEFT JOIN students s ON sr.studentId = s.id 
      WHERE sr.id = ?
    `, [id]);

    if (existingRequests.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    await db.promise().query(
      "UPDATE student_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    // Get the updated request
    const [updatedRequests] = await db.promise().query(`
      SELECT 
        sr.*, 
        COALESCE(s.fullName, sr.studentName) as fullName,
        COALESCE(s.residence, sr.studentResidence) as residence,
        COALESCE(s.block, sr.studentBlock) as block
      FROM student_requests sr 
      LEFT JOIN students s ON sr.studentId = s.id 
      WHERE sr.id = ?
    `, [id]);

    const updatedRequest = {
      ...updatedRequests[0],
      dateCreated: new Date(updatedRequests[0].dateCreated).toISOString()
    };
    
    if (!isProduction) {
      console.log(`🔄 Request ${id} status updated to: ${status}`);
    }
    
    // Broadcast status update
    broadcastToAdmins("request-updated", updatedRequest);
    broadcastToStudentRoom(
      updatedRequest.residence, 
      updatedRequest.block, 
      "request-updated", 
      updatedRequest
    );

    res.json({ 
      success: true, 
      message: "Request status updated successfully."
    });
  } catch (err) {
    console.error("Error updating request status:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating request status.",
      error: isProduction ? undefined : err.message
    });
  }
});

// ==================== REACT APP ROUTING ====================
// Serve React app for all non-API routes (must be after API routes)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// ==================== ERROR HANDLING ====================
// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found',
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (isProduction) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: err.message,
      stack: err.stack 
    });
  }
});

// ==================== START SERVER ====================
initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 ResCare Server started successfully!`);
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO: Ready for real-time updates`);
      console.log(`📊 Database: ${config.db.database}@${config.db.host}`);
      console.log(`🌐 Environment: ${isProduction ? 'production' : 'development'}`);
      
      if (isProduction) {
        console.log(`🔒 Security: Enhanced security enabled`);
        console.log(`💡 Access your app at: http://localhost:${PORT}`);
      } else {
        console.log(`💡 Run your React app on http://localhost:5173`);
        console.log(`💡 API available at: http://localhost:${PORT}/api`);
      }
      
      console.log(`\n📋 Available Endpoints:`);
      console.log(`   GET  /                 - Server status`);
      console.log(`   GET  /api/health       - Health check`);
      console.log(`   POST /api/login        - User login`);
      console.log(`   POST /api/students/register - Student registration`);
      console.log(`   DELETE /api/students/:id - Delete student account (preserves requests)`);
      console.log(`   POST /api/requests     - Create request`);
      console.log(`   GET  /api/requests     - All requests (admin)`);
      console.log(`   GET  /api/requests/block/:residence/:block - Block requests`);
      console.log(`   PUT  /api/requests/:id/status - Update status\n`);
    });
  })
  .catch(err => { 
    console.error("❌ Server startup failed:", err.message); 
    process.exit(1); 
  });

// Graceful shutdown
const shutdown = () => {
  console.log("\n🛑 Shutting down server gracefully...");
  server.close(() => {
    console.log("✅ HTTP server closed.");
    if (db) {
      db.end((err) => {
        if (err) console.error("❌ Database connection close error:", err.message);
        else console.log("✅ Database connection closed.");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.log("⚠️ Forcing shutdown...");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
