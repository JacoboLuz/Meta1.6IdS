import { initDB } from "./db.js";

export async function syncArticles() {
  if (!navigator.onLine) return;

  const db = await initDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  const request = store.getAll();

  request.onsuccess = async () => {
    const items = request.result;

    for (const item of items) {
      try {
        await fetch("http://localhost:3000/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload)
        });

        store.delete(item.id);
      } catch (err) {
        console.error("Error sincronizando:", err);
      }
    }
  };
}