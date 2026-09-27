const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL Connection Pool for Local and Render Cloud
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Multer configuration for document and material uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// --- PUBLIC & CONFIG API ENDPOINTS ---

app.get("/api/schools", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM schools ORDER BY region, school_name",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subjects", async (req, res) => {
  try {
    const { level } = req.query;
    let query = "SELECT * FROM subjects";
    let params = [];

    if (level) {
      query += " WHERE education_level ILIKE $1";
      params.push(`%${level}%`);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ENHANCED LOGIN ROUTE WITH ROLE-BASED DASHBOARD ROUTING ---
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password_hash = $2",
      [email, password],
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      let dashboardUrl = "index.html";

      switch (user.role) {
        case "student":
          dashboardUrl = "student-dashboard.html";
          break;
        case "teacher":
          dashboardUrl = "teacher-dashboard.html";
          break;
        case "head_teacher":
          dashboardUrl = "head-teacher-dashboard.html";
          break;
        case "parent":
          dashboardUrl = "parent-dashboard.html";
          break;
        case "regional_admin":
        case "ministry_official":
          dashboardUrl = "regionalofficial-dashboard.html";
          break;
      }

      res.json({ message: "Login successful", user, redirect: dashboardUrl });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CORE REGISTRATION ROUTE ---
app.post("/api/register", upload.single("document"), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      national_id,
      school_id,
      grade_level,
      term,
      teaching_level,
      subjects,
    } = req.body;

    const newUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, national_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, email, role, national_id`,
      [username, email, password, role, national_id || null],
    );
    const user = newUser.rows[0];

    if (role === "student") {
      await pool.query(
        `INSERT INTO students (user_id, first_name, last_name, grade_level, school_id, date_of_birth) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.user_id,
          username.split(" ")[0] || "Student",
          username.split(" ")[1] || "User",
          grade_level || "Form 1",
          school_id || 1,
          "2008-01-01",
        ],
      );
    } else if (
      [
        "teacher",
        "head_teacher",
        "regional_admin",
        "ministry_official",
      ].includes(role)
    ) {
      let parsedSubjects = [];
      if (subjects) {
        parsedSubjects =
          typeof subjects === "string" ? JSON.parse(subjects) : subjects;
      }
      await pool.query(
        `INSERT INTO teachers (user_id, first_name, last_name, school_id, teaching_level, subjects_taught) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.user_id,
          username.split(" ")[0] || "Staff",
          username.split(" ")[1] || "User",
          school_id || null,
          teaching_level || null,
          JSON.stringify(parsedSubjects),
        ],
      );
    } else if (role === "parent") {
      await pool.query(
        "INSERT INTO parents (user_id, first_name, last_name) VALUES ($1, $2)",
        [
          user.user_id,
          username.split(" ")[0] || "Parent",
          username.split(" ")[1] || "User",
        ],
      );
    }

    if (req.file) {
      await pool.query(
        "INSERT INTO user_documents (user_id, document_type, file_path) VALUES ($1, $2, $3)",
        [
          user.user_id,
          "Registration Verification Document",
          `/uploads/${req.file.filename}`,
        ],
      );
    }

    res
      .status(201)
      .json({ message: "Registration completed successfully.", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD WORKFLOW API ENDPOINTS ---

app.post("/api/marks", async (req, res) => {
  try {
    const { student_id, subject_name, assessment_type, grade, score } =
      req.body;
    await pool.query(
      `INSERT INTO student_marks (student_id, subject_name, assessment_type, grade, score) VALUES ($1, $2, $3, $4, $5)`,
      [student_id, subject_name, assessment_type, grade, score],
    );
    res.status(201).json({ message: "Marks recorded successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const { parent_id, student_id, amount, school_id } = req.body;
    const result = await pool.query(
      `INSERT INTO payments (parent_id, student_id, amount, school_id, status) VALUES ($1, $2, $3, $4, 'Verified') RETURNING *`,
      [parent_id, student_id, amount, school_id],
    );
    res.status(201).json({
      message: "Payment processed and receipt generated.",
      payment: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transfers", async (req, res) => {
  try {
    const {
      applicant_id,
      applicant_type,
      current_school_id,
      target_school_id,
      reason,
    } = req.body;
    await pool.query(
      `INSERT INTO transfer_requests (applicant_id, applicant_type, current_school_id, target_school_id, reason, status) VALUES ($1, $2, $3, $4, $5, 'Pending')`,
      [
        applicant_id,
        applicant_type,
        current_school_id,
        target_school_id,
        reason,
      ],
    );
    res
      .status(201)
      .json({ message: "Transfer application submitted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/resources", async (req, res) => {
  try {
    const { school_id, resource_type, quantity } = req.body;
    await pool.query(
      `INSERT INTO resource_allocations (school_id, resource_type, quantity) VALUES ($1, $2, $3)`,
      [school_id, resource_type, quantity],
    );
    res.status(201).json({ message: "Resources allocated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
