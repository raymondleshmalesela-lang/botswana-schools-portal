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

// 1. Get list of schools for dropdown selection
app.get("/api/schools", async (req, res) => {
  const schoolType = req.query.type; // Optional filter: ?type=Primary or ?type=Secondary

  try {
    let query = "SELECT id, school_name, school_type FROM schools";
    let params = [];

    if (schoolType) {
      query += " WHERE school_type = $1";
      params.push(schoolType);
    }

    query += " ORDER BY school_name ASC";

    const result = await pool.query(query, params);
    res.json({ success: true, schools: result.rows });
  } catch (error) {
    console.error("Error fetching schools:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch schools" });
  }
});

// 2. Staff & Admin Login Endpoint
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
        schoolId: user.school_id,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error("Error during staff login:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 3. Pre-School Seat Capacity Management Endpoint (View)
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

// 4. Update Seat Capacity (Teacher / Admin Dashboard)
app.post("/api/update-capacity", async (req, res) => {
  const { classId, totalSeats, occupiedSeats } = req.body;

  try {
    const query = `
      UPDATE preschool_capacity 
      SET total_seats = COALESCE($1, total_seats), 
          occupied_seats = COALESCE($2, occupied_seats) 
      RETURNING *;
    `;
    const result = await pool.query(query, [
      totalSeats,
      occupiedSeats,
      classId,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Class capacity record not found." });
    }

    res.json({
      success: true,
      message: "Capacity updated successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating capacity:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update capacity." });
  }
});

// 5. Student / Parent Registration / Application Submission Endpoint
app.post("/api/register-student", async (req, res) => {
  const {
    studentName,
    dateOfBirth,
    guardianName,
    guardianContact,
    schoolId,
    className,
  } = req.body;

  try {
    const query = `
      INSERT INTO applications (student_name, date_of_birth, guardian_name, guardian_contact, school_id, class_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING id, student_name, status;
    `;
    const values = [
      studentName,
      dateOfBirth,
      guardianName,
      guardianContact,
      schoolId,
      className,
    ];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      application: result.rows[0],
    });
  } catch (error) {
    console.error("Error registering student application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application. Please try again.",
    });
  }
});

// 6. Check Application Status Endpoint
app.get("/api/check-status/:id", async (req, res) => {
  const appId = req.params.id;

  try {
    const query = `
      SELECT a.id, a.student_name, a.status, s.school_name, a.class_name, a.created_at
      FROM applications a
      JOIN schools s ON a.school_id = s.id
      WHERE a.id = $1;
    `;
    const result = await pool.query(query, [appId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Application ID not found." });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 7. Fallback Route: Serve index.html for root requests
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
