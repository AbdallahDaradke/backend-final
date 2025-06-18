import express from "express";
import db from "../db.js";
const router = express.Router();

router.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// localhost:5000/auth/signup
router.post("/signup", async (req, res) => {
  const { email, password, role } = req.body;

  const exists = await db.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (exists.rows.length > 0)
    return res.status(400).json({ message: "User already exists" });

  const result = await db.query(
    "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING *",
    [email, password, role]
  );
  res.status(201).json({ user: result.rows[0] });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1 AND password = $2",
    [email, password]
  );
  if (result.rows.length === 0)
    return res.status(401).json({ message: "Invalid credentials" });

  res.json({ user: result.rows[0] });
});

export default router;
