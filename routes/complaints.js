import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
router.get("/", async (req, res) => {
  const complaints = await db.query("SELECT * FROM complaint");

  res.json(complaints.rows);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Where to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

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
  const { subject, description, status, type } = req.body;
  const filePath = req.file ? req.file.path : null;
  const date = new Date();

  const createdComplaint = await db.query(
    "INSERT INTO complaint (subject, description, date, status, type, attachment_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [subject, description, date, status, type, filePath]
  );

  res.json(createdComplaint.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { subject, description, status, type } = req.body;
  const result = await db.query(
    'UPDATE complaint SET "subject" = $1, "description" = $2, "status" = $3, "type" = $4 WHERE "ComplaintId" = $5 RETURNING *',
    [subject, description, status, type, req.params.id]
  );
  result.rows.length > 0
    ? res.json(result.rows[0])
    : res.status(404).json({ message: "Complaint not found" });
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

export default router;
