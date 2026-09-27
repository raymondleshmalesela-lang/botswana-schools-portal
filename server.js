const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Connection Pool using Render's DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// API ROUTES FOR DYNAMIC DROPDOWNS
// ==========================================

// Get Schools by Teaching Level
app.get("/api/schools", async (req, res) => {
  try {
    const level = req.query.level;
    if (!level) {
      return res.status(400).json({ error: "Level parameter is required" });
    }
    const result = await pool.query("SELECT * FROM schools WHERE level = $1", [
      level,
    ]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching schools:", err.message);
    res.status(500).json({ error: "Server error while fetching schools" });
  }
});

// Get Subjects by Teaching Level
app.get("/api/subjects", async (req, res) => {
  try {
    const level = req.query.level;
    if (!level) {
      return res.status(400).json({ error: "Level parameter is required" });
    }
    const result = await pool.query("SELECT * FROM subjects WHERE level = $1", [
      level,
    ]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching subjects:", err.message);
    res.status(500).json({ error: "Server error while fetching subjects" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// API: Register Staff/Teacher
app.post("/api/register", async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      staff_role,
      teaching_level,
      school_placement,
      subjects,
    } = req.body;

    // Simple insert query (Note: In production, hash passwords with bcrypt!)
    const query = `
            INSERT INTO staff (full_name, email, password, staff_role, teaching_level, school_placement, subjects_taught)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name, email;
        `;

    const values = [
      full_name,
      email,
      password,
      staff_role,
      teaching_level,
      school_placement,
      subjects,
    ];
    const result = await pool.query(query, values);

    res
      .status(201)
      .json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({
      error: "Server error during registration. Email might already exist.",
    });
  }
});
// API: Staff Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM staff WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Simple password check (matches text storage from registration)
    if (user.password !== password) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.full_name, role: user.staff_role },
    });
  } catch (err) {
    console.error("Login server error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});
