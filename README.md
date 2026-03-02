Es indispensable abrir "index.html" con un servidor y no como archivo HTTPS, así como contar con:
- MariaDB
- Node.js
******
Ejecutar las siguientes instrucciones en MariaDB:
CREATE USER 'appuser'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON articles_db.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;

CREATE DATABASE articles_db;
USE articles_db;

CREATE TABLE articles (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Entrar a cmd en la carpeta backend y ejecutar:
node server.js
No cerrar hasta haber terminado de utilizar el programa.


