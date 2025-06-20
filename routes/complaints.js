import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const router = express.Router();
router.get("/", async (req, res) => {
  const complaints = await db.query(
    'SELECT * FROM complaint ORDER BY "ComplaintId" ASC'
  );

  res.json(complaints.rows);
});

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

// Get complaints by user ID
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const result = await db.query(
    "SELECT * FROM complaint WHERE user_id = $1 ORDER BY date DESC",
    [userId]
  );
  res.json(result.rows);
});

//
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const complaint = await db.query(
    'SELECT * FROM complaint WHERE "ComplaintId" = $1',
    [id]
  );
  if (complaint.rows.length === 0) {
    return res.status(404).json({ error: "Complaint not found" });
  }
  res.rows.length > 0
    ? res.json(complaint.rows[0])
    : res.status(404).json({ message: "Complaint not found" });
});

router.post("/", upload.single("attachment"), async (req, res) => {
  const { subject, description, status, type, priority, user_id } = req.body;
  const filePath = req.file ? req.file.path : null;
  const date = new Date();

  const createdComplaint = await db.query(
    "INSERT INTO complaint (subject, description, date, status, type, priority, attachment_path, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [subject, description, date, status, type, priority, filePath, user_id]
  );

  res.json(createdComplaint.rows[0]);
});

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

router.delete("/:id", async (req, res) => {
  const result = await db.query(
    'DELETE FROM complaint WHERE "ComplaintId" = $1 RETURNING *',
    [req.params.id]
  );
  result.rows.length > 0
    ? res.json({ deleted: result.rows[0] })
    : res.status(404).json({ message: "Complaint not found" });
});

router.delete("/:id/attachment", async (req, res) => {
  const { id } = req.params;

  // Step 1: Get the file path from DB
  const result = await db.query(
    'SELECT attachment_path FROM complaint WHERE "ComplaintId" = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  const filePath = result.rows[0].attachment_path;

  if (!filePath) {
    return res.status(400).json({ message: "No attachment to delete." });
  }

  // Step 2: Delete the file from disk(from uploads folder)
  const fullPath = path.resolve(filePath);

  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error("File deletion failed:", err);
        return res.status(500).json({ error: "Failed to delete the file." });
      }
    });
  }

  // Step 3: Remove the path from the DB
  await db.query(
    'UPDATE complaint SET attachment_path = NULL WHERE "ComplaintId" = $1',
    [id]
  );

  res.json({ message: "Attachment deleted successfully." });
});

//feedback and rating
router.put("/:id/feedback", async (req, res) => {
  const { rating, comment } = req.body;
  const { id } = req.params;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." });
  }

  const result = await db.query(
    'UPDATE complaint SET rating = $1, feedback_comment = $2 WHERE "ComplaintId" = $3 RETURNING *',
    [rating, comment || null, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  res.json({
    message: "Feedback submitted successfully",
    complaint: result.rows[0],
  });
});

export default router;
