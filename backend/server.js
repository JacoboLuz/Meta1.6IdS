const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "appuser",
  password: "1234",
  database: "articles_db"
});

app.post("/api/articles", async (req, res) => {
  const { id, title, status } = req.body;

  await pool.query(
    "INSERT IGNORE INTO articles (id, title, status) VALUES (?, ?, ?)",
    [id, title, status]
  );

  res.json({ message: "Sincronizado" });
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});