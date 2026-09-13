-- Aprovisionamiento local de MySQL para el proyecto Entre Páginas.
-- Ejecutar UNA vez como root:  mysql -u root -p < database/00-provision-local.sql
--
-- Crea las bases de desarrollo y de pruebas y sus usuarios de aplicación.
-- NO crea tablas: el esquema lo aplican las migraciones de Sequelize
-- (`npm run db:migrate`), que son la única fuente de verdad del esquema.
-- `database/entre_paginas.sql` es una referencia del modelo; no lo ejecute
-- junto con las migraciones o duplicará el esquema.

CREATE DATABASE IF NOT EXISTS entre_paginas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS entre_paginas_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Las contraseñas deben coincidir con Back/.env y Back/.env.test.
CREATE USER IF NOT EXISTS 'entre_paginas_app'@'localhost'
  IDENTIFIED BY 'UnaClaveSegura123!';
CREATE USER IF NOT EXISTS 'entre_paginas_app'@'127.0.0.1'
  IDENTIFIED BY 'UnaClaveSegura123!';

CREATE USER IF NOT EXISTS 'entre_paginas_test'@'localhost'
  IDENTIFIED BY 'ClaveDePruebas123!';
CREATE USER IF NOT EXISTS 'entre_paginas_test'@'127.0.0.1'
  IDENTIFIED BY 'ClaveDePruebas123!';

-- Mínimo privilegio: el usuario de aplicación no recibe GRANT ALL sobre *.*,
-- solo DML/DDL acotado a su propia base.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON entre_paginas.* TO 'entre_paginas_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON entre_paginas.* TO 'entre_paginas_app'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON entre_paginas_test.* TO 'entre_paginas_test'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON entre_paginas_test.* TO 'entre_paginas_test'@'127.0.0.1';

FLUSH PRIVILEGES;

SELECT user, host FROM mysql.user
  WHERE user IN ('entre_paginas_app', 'entre_paginas_test');
