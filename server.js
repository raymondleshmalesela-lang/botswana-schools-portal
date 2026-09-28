const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool configuration for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Root route to explicitly serve student registration (index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: Fetch schools based on teaching/grade level
app.get("/api/schools", async (req, res) => {
  try {
    const { level } = req.query;
    const query = level
      ? "SELECT * FROM schools WHERE level = $1"
      : "SELECT * FROM schools";
    const values = level ? [level] : [];
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching schools:", err.message);
    res.status(500).json({ error: "Server error fetching schools" });
  }
});

// API: Fetch subjects based on teaching/grade level
app.get("/api/subjects", async (req, res) => {
  try {
    const { level } = req.query;
    const query = level
      ? "SELECT * FROM subjects WHERE level = $1"
      : "SELECT * FROM subjects";
    const values = level ? [level] : [];
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching subjects:", err.message);
    res.status(500).json({ error: "Server error fetching subjects" });
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

// API: Register Student
app.post("/api/student-register", async (req, res) => {
  try {
    const {
      national_id,
      full_name,
      password,
      grade_level,
      school_placement,
      academic_term,
      subjects,
    } = req.body;

    const query = `
            INSERT INTO students (national_id, full_name, password, grade_level, school_placement, academic_term, subjects_enrolled)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name;
        `;

    const values = [
      national_id,
      full_name,
      password,
      grade_level,
      school_placement,
      academic_term,
      subjects,
    ];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Student registered successfully",
      student: result.rows[0],
    });
  } catch (err) {
    console.error("Student registration error:", err.message);
    res.status(500).json({
      error:
        "Server error during student registration. National ID might already be used.",
    });
  }
});

// API: Student/Citizen Login
app.post("/api/student-login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM students WHERE national_id = $1 OR full_name ILIKE $1",
      [identifier],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Citizen account not found" });
    }

    const student = result.rows[0];
    if (student.password !== password) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      student: { id: student.id, name: student.full_name },
    });
  } catch (err) {
    console.error("Citizen login server error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
