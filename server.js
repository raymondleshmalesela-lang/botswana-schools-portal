const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env file during local development
dotenv.config();

const app = express();

// Middleware to parse incoming request payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL Database Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Test and verify database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection error:", err.stack);
  } else {
    console.log("✅ Successfully connected to Neon PostgreSQL database!");
    release();
  }
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Staff & Admin Login Endpoint
app.post("/api/staff-login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const query =
      "SELECT id, username, role, full_name, school_id FROM staff WHERE username = $1 AND password = $2";
    const result = await pool.query(query, [username, password]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const user = result.rows[0];

    // Role-Based Redirection Logic
    let redirectUrl = "/teacher-dashboard.html";
    if (user.role === "headteacher" || user.role === "admin") {
      redirectUrl = "/admin-dashboard.html";
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error("Error during staff login:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 2. Pre-School Seat Capacity Management Endpoint
app.get("/api/capacity", async (req, res) => {
  try {
    const query =
      "SELECT school_name, class_name, total_seats, occupied_seats FROM preschool_capacity";
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching capacity:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch capacity data." });
  }
});

// 3. Fallback Route: Serve index.html for root requests
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Botswana Schools Portal server running on port ${PORT}`);
});
