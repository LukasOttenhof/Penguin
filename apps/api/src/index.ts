import express from "express";
import { pool } from "./db.js";


const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});


app.get("/todos", async (_req, res) => {
  const result = await pool.query("SELECT * FROM todos ORDER BY id");
  res.json(result.rows);
});

app.post("/todos", async (req, res) => {
  const result = await pool.query(
    "INSERT INTO todos (title) VALUES ($1) RETURNING *",
    [req.body.title],
  );
  res.json(result.rows[0]);
});