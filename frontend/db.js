const DB_NAME = "ArticleDB";
const DB_VERSION = 1;

let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      db.createObjectStore("articles", { keyPath: "id" });
      db.createObjectStore("syncQueue", { autoIncrement: true });
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = reject;
  });
}

export async function saveArticle(article) {
  const database = await initDB();
  const tx = database.transaction(["articles", "syncQueue"], "readwrite");

  tx.objectStore("articles").put(article);

  tx.objectStore("syncQueue").add({
    operation: "CREATE",
    payload: article
  });

  return tx.complete;
}