import { syncArticles } from "./sync.js";

window.addEventListener("online", () => {
  console.log("Conexión restaurada");
  syncArticles();
});