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
// API: Register Parent
app.post("/api/parent-register", async (req, res) => {
  try {
    const { full_name, identifier, password, child_national_id } = req.body;

    const query = `
            INSERT INTO parents (full_name, identifier, password, child_national_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name;
        `;

    const values = [full_name, identifier, password, child_national_id];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Parent registered successfully",
      parent: result.rows[0],
    });
  } catch (err) {
    console.error("Parent registration error:", err.message);
    res.status(500).json({ error: "Server error during parent registration." });
  }
});
// API: Parent Login
app.post("/api/parent-login", async (req, res) => {
  try {
    const { full_name, password } = req.body;

    // Check parent by full name (case-insensitive)
    const result = await pool.query(
      "SELECT * FROM parents WHERE full_name ILIKE $1",
      [full_name],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Parent account not found" });
    }

    const parent = result.rows[0];

    if (parent.password !== password) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      parent: { id: parent.id, name: parent.full_name },
    });
  } catch (err) {
    console.error("Parent login server error:", err.message);
    res.status(500).json({ error: "Server error during parent login" });
  }
});
// Ensure pre-school configuration table exists
pool
  .query(
    `
    CREATE TABLE IF NOT EXISTS preschool_classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(100) NOT NULL,
        max_capacity INT NOT NULL,
        enrolled_count INT DEFAULT 0
    );
`,
  )
  .catch((err) =>
    console.error("Error creating preschool_classes table:", err.message),
  );

// API: Get open pre-school classes and seats status
app.get("/api/preschool-classes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM preschool_classes ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching classes" });
  }
});

// API: Register Parent with Pre-school selection
app.post("/api/parent-register-preschool", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { full_name, identifier, password, class_id } = req.body;

    // Check seat availability
    const classCheck = await client.query(
      "SELECT * FROM preschool_classes WHERE id = $1",
      [class_id],
    );
    if (classCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Selected class not found" });
    }

    const cls = classCheck.rows[0];
    if (cls.enrolled_count >= cls.max_capacity) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Selected class is fully booked." });
    }

    // Insert Parent
    const parentQuery = `
            INSERT INTO parents (full_name, identifier, password, child_national_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
    const parentRes = await client.query(parentQuery, [
      full_name,
      identifier,
      password,
      "PRESCHOOL-PENDING",
    ]);

    // Increment class enrolled count
    await client.query(
      "UPDATE preschool_classes SET enrolled_count = enrolled_count + 1 WHERE id = $1",
      [class_id],
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Pre-school registration successful" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Preschool registration error:", err.message);
    res.status(500).json({ error: "Server error during registration" });
  }
});
// API: Head Teacher configures a pre-school class
app.post("/api/headteacher/preschool-class", async (req, res) => {
  try {
    const { class_name, max_capacity } = req.body;

    const result = await pool.query(
      "INSERT INTO preschool_classes (class_name, max_capacity, enrolled_count) VALUES ($1, $2, 0) RETURNING *",
      [class_name, max_capacity],
    );

    res
      .status(201)
      .json({ message: "Class created successfully", class: result.rows[0] });
  } catch (err) {
    console.error("Error creating class:", err.message);
    res.status(500).json({ error: "Error creating class" });
  }
});
// Ensure staff/users table supports roles (or use dedicated staff tables depending on your setup)
pool
  .query(
    `
    CREATE TABLE IF NOT EXISTS staff_users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        identifier VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL -- 'teacher' or 'headteacher'
    );
`,
  )
  .catch((err) =>
    console.error("Error creating staff_users table:", err.message),
  );

// API: Administrator creates a teacher or headteacher account
app.post("/api/admin/create-staff", async (req, res) => {
  try {
    const { full_name, identifier, password, role } = req.body;

    if (!["teacher", "headteacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid staff role specified." });
    }

    const query = `
            INSERT INTO staff_users (full_name, identifier, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, role;
        `;

    const result = await pool.query(query, [
      full_name,
      identifier,
      password,
      role,
    ]);

    res.status(201).json({
      message: `${role.toUpperCase()} account created successfully`,
      staff: result.rows[0],
    });
  } catch (err) {
    console.error("Admin staff creation error:", err.message);
    res.status(500).json({ error: "Server error during staff creation." });
  }
});
