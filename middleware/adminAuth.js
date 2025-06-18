export default function adminAuth(req, res, next) {
  const role = req.headers["x-role"]; // we simulate role checking from the frontend

  if (role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
}
