-- db/users.sql
-- Aman dijalankan berkali-kali (idempotent)

-- 1) Buat tabel users kalau belum ada
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  role ENUM('BIDANG','WAKETUM','SEKJEN','BENDUM','EKSEKUTOR','AUDITOR') NOT NULL DEFAULT 'BIDANG',
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2) Tambah kolom role kalau belum ada (pakai dynamic SQL supaya aman)
SET @col_role_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);

SET @sql_role := IF(
  @col_role_exists = 0,
  "ALTER TABLE users ADD COLUMN role ENUM('BIDANG','WAKETUM','SEKJEN','BENDUM','EKSEKUTOR','AUDITOR') NOT NULL DEFAULT 'BIDANG'",
  "SELECT 1"
);

PREPARE stmt_role FROM @sql_role;
EXECUTE stmt_role;
DEALLOCATE PREPARE stmt_role;

-- 3) Tambah kolom password_hash kalau belum ada
SET @col_pass_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_hash'
);

SET @sql_pass := IF(
  @col_pass_exists = 0,
  "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''",
  "SELECT 1"
);

PREPARE stmt_pass FROM @sql_pass;
EXECUTE stmt_pass;
DEALLOCATE PREPARE stmt_pass;

-- 4) Seed akun demo (password masih plain DEMO: sama dengan password_hash)
INSERT INTO users (name, email, role, password_hash) VALUES
  ('Waketum',   'waketum@pbsi.id',   'WAKETUM',   'waketum123'),
  ('Sekjen',    'sekjen@pbsi.id',    'SEKJEN',    'sekjen123'),
  ('Bendum',    'bendum@pbsi.id',    'BENDUM',    'bendum123'),
  ('Eksekutor', 'eksekutor@pbsi.id', 'EKSEKUTOR', 'eksekutor123'),
  ('Bidang',    'bidang@pbsi.id',    'BIDANG',    'bidang123')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  password_hash = VALUES(password_hash);
