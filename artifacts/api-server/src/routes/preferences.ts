import { Router, type IRouter } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const router: IRouter = Router();

const PREFS_FILE = join(process.cwd(), "preferences.json");

interface Preferences {
  accentId: string;
  themeMode: string;
  updatedAt: string;
}

const DEFAULT_PREFS: Preferences = {
  accentId: "ocean",
  themeMode: "system",
  updatedAt: new Date().toISOString(),
};

function loadPrefs(): Preferences {
  try {
    if (existsSync(PREFS_FILE)) {
      return JSON.parse(readFileSync(PREFS_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFS };
}

function savePrefs(prefs: Preferences): void {
  try {
    writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
  } catch {
    // ignore
  }
}

router.get("/preferences", (_req, res) => {
  const prefs = loadPrefs();
  res.json(prefs);
});

router.put("/preferences", (req, res) => {
  const current = loadPrefs();
  const body = req.body as Partial<Preferences>;
  const updated: Preferences = {
    ...current,
    ...(body.accentId ? { accentId: body.accentId } : {}),
    ...(body.themeMode ? { themeMode: body.themeMode } : {}),
    updatedAt: new Date().toISOString(),
  };
  savePrefs(updated);
  res.json(updated);
});

export default router;
