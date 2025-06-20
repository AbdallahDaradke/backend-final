import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import complaintsRouter from "./routes/complaints.js";
import db from "./db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";

dotenv.config();
const app = express();

app.use(cors());
// Add this to handle form-data (key=value) parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// localhost:5000
app.use("/api/complaints", complaintsRouter);

// localhost:5000/api/auth
// This route handles user authentication
app.use("/api/auth", authRoutes);

// localhost:5000/api/users
// This route handles user-related operations
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Complaints API");
});

db.connect().then(() => {
  console.log("Connected to the database");
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
