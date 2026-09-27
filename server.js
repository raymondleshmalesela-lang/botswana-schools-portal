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
