import { saveArticle } from "./db.js";
import { syncArticles } from "./sync.js";

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const messageArea = document.getElementById("message-area");

// 🔹 Habilitar botón cuando haya archivo
fileInput.addEventListener("change", () => {
  uploadBtn.disabled = fileInput.files.length === 0;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return;

  const article = {
    id: crypto.randomUUID(),
    title: file.name,
    status: "pendiente",
    createdAt: Date.now()
  };

  await saveArticle(article);

  messageArea.textContent = "Guardado localmente (pendiente de sincronizar)";
  form.reset();

  // 🔹 Volver a desactivar botón
  uploadBtn.disabled = true;

  syncArticles();
});