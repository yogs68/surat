-- Pastikan user BIDANG ada
INSERT INTO users (email, name, role)
VALUES ('bidang@pbsi.id', 'Ari Bidang', 'BIDANG')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

INSERT INTO users (email, name, role)
VALUES ('waketum@pbsi.id', 'Waketum 3', 'WAKETUM')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

INSERT INTO users (email, name, role)
VALUES ('sekjen@pbsi.id', 'Sekjen', 'SEKJEN')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

INSERT INTO users (email, name, role)
VALUES ('bendum@pbsi.id', 'Bendum', 'BENDUM')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

INSERT INTO users (email, name, role)
VALUES ('eksekutor@pbsi.id', 'Staff Eksekutor', 'EKSEKUTOR')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

-- Ambil id BIDANG (pastikan tidak null)
SELECT id INTO @bidang_id FROM users WHERE email='bidang@pbsi.id' LIMIT 1;

-- Insert surat (pakai @bidang_id)
INSERT INTO surat (no, judul, bidang, ringkasan, status, prioritas, created_by) VALUES
('PBSI/SPR/001/I/2026', 'Usulan Pengadaan Shuttlecock', 'Sarpras',
 'Pengadaan shuttlecock untuk TC nasional 3 bulan. Dibutuhkan 1200 tube. Estimasi biaya Rp 180.000.000.',
 'MENUNGGU_APPROVAL', 'Tinggi', @bidang_id),
('PBSI/SPR/017/I/2026', 'Perjalanan Dinas Kejuaraan Asia', 'Kejuaraan',
 'Perjalanan dinas tim pendamping. Mohon revisi detail rincian biaya akomodasi dan tiket.',
 'REVISI', 'Normal', @bidang_id),
('PBSI/SPR/021/I/2026', 'Perbaikan Lampu Gedung Latihan', 'Sarpras',
 'Penggantian lampu LED area lapangan 1–4. Sudah selesai dikerjakan vendor. Lampirkan BA serah terima.',
 'SELESAI', 'Rendah', @bidang_id)
ON DUPLICATE KEY UPDATE
  judul=VALUES(judul),
  bidang=VALUES(bidang),
  ringkasan=VALUES(ringkasan),
  status=VALUES(status),
  prioritas=VALUES(prioritas),
  created_by=VALUES(created_by);

-- ambil id surat
SELECT id INTO @s1 FROM surat WHERE no='PBSI/SPR/001/I/2026' LIMIT 1;
SELECT id INTO @s2 FROM surat WHERE no='PBSI/SPR/017/I/2026' LIMIT 1;
SELECT id INTO @s3 FROM surat WHERE no='PBSI/SPR/021/I/2026' LIMIT 1;

-- buat approval steps jika belum ada
INSERT IGNORE INTO approval_steps (surat_id, step, role) VALUES
(@s1, 1, 'WAKETUM'), (@s1, 2, 'SEKJEN'), (@s1, 3, 'BENDUM'), (@s1, 4, 'EKSEKUTOR'),
(@s2, 1, 'WAKETUM'), (@s2, 2, 'SEKJEN'), (@s2, 3, 'BENDUM'), (@s2, 4, 'EKSEKUTOR'),
(@s3, 1, 'WAKETUM'), (@s3, 2, 'SEKJEN'), (@s3, 3, 'BENDUM'), (@s3, 4, 'EKSEKUTOR');

-- contoh status approval untuk surat 3
UPDATE approval_steps SET status='DISETUJUI', acted_at=NOW()
WHERE surat_id=@s3;

-- audit log contoh
INSERT INTO audit_logs (surat_id, actor_id, action, meta)
SELECT @s1, @bidang_id, 'CREATE_SURAT', JSON_OBJECT('no','PBSI/SPR/001/I/2026')
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE surat_id=@s1 AND action='CREATE_SURAT');
