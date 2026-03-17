import { Router } from "express";

const router = Router();

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const user = {
    id: "1",
    name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    email,
    plan: "Family",
  };
  return res.json({ user, token: "demo-token" });
});

router.post("/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  const user = { id: "1", name, email, plan: "Free" };
  return res.json({ user, token: "demo-token" });
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
