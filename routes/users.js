import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Where to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

// Get all users
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, email, role FROM users ORDER BY id"
  );
  res.json(result.rows);
});

// Get all complaints for a specific user
router.get("/:id/complaints", async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    "SELECT * FROM complaint WHERE user_id = $1 ORDER BY date DESC",
    [id]
  );
  res.json(result.rows);
});

// Get specific complaint for a user
// In order to get a specific complaint in a clean way we sent the user ID in the header, to not do /1/1 for example
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const user_id = req.headers["x-user-id"]; // simulate logged-in user

  const complaint = await db.query(
    'SELECT * FROM complaint WHERE "ComplaintId" = $1 AND user_id = $2',
    [id, user_id]
  );

  if (complaint.rows.length === 0) {
    return res.status(404).json({ error: "Complaint not found or not yours" });
  }

  res.json(complaint.rows[0]);
});

// Create a new complaint for a user
router.post("/", upload.single("attachment"), async (req, res) => {
  const { subject, description, status, type, priority } = req.body;
  const user_id = req.headers["x-user-id"];
  const filePath = req.file ? req.file.path : null;
  const date = new Date();

  const createdComplaint = await db.query(
    "INSERT INTO complaint (subject, description, date, status, type, priority, attachment_path, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [subject, description, date, status, type, priority, filePath, user_id]
  );

  res.json(createdComplaint.rows[0]);
});

// Update a complaint for a user
router.put("/:id", upload.single("attachment"), async (req, res) => {
  const { subject, description, status, type, priority } = req.body;
  const filePath = req.file ? req.file.path : null;
  const { id } = req.params;

  const fields = [];
  const values = [];
  let i = 1;

  if (subject) {
    fields.push(`subject = $${i++}`);
    values.push(subject);
  }
  if (description) {
    fields.push(`description = $${i++}`);
    values.push(description);
  }
  if (status) {
    fields.push(`status = $${i++}`);
    values.push(status);
  }
  if (type) {
    fields.push(`type = $${i++}`);
    values.push(type);
  }
  if (priority) {
    fields.push(`priority = $${i++}`);
    values.push(priority);
  }
  if (filePath) {
    fields.push(`attachment_path = $${i++}`);
    values.push(filePath);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No data to update." });
  }

  const query = `
    UPDATE complaint SET ${fields.join(", ")}
    WHERE "ComplaintId" = $${i}
    RETURNING *
  `;
  values.push(id);

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  res.json(result.rows[0]);
});

// Delete a complaint for a user
router.delete("/:id", async (req, res) => {
  const user_id = req.headers["x-user-id"];

  const result = await db.query(
    'DELETE FROM complaint WHERE "ComplaintId" = $1 AND user_id = $2 RETURNING *',
    [req.params.id, user_id]
  );

  result.rows.length > 0
    ? res.json({ deleted: result.rows[0] })
    : res.status(404).json({ message: "Complaint not found" });
});

export default router;
