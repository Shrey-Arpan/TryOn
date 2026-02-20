import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tryown.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { title, content, category } = req.body;
    const info = db.prepare("INSERT INTO notes (title, content, category) VALUES (?, ?, ?)").run(title, content, category);
    res.json({ id: info.lastInsertRowid, title, content, category, created_at: new Date().toISOString() });
  });

  app.patch("/api/notes/:id/category", (req, res) => {
    const { category } = req.body;
    db.prepare("UPDATE notes SET category = ? WHERE id = ?").run(category, req.params.id);
    res.status(204).end();
  });

  app.delete("/api/notes/:id", (req, res) => {
    db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
