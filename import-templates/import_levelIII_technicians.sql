-- ============================================================
-- Level III Technicians — Import Template
-- Run in Supabase SQL Editor (https://supabase.com → SQL Editor)
-- ============================================================

INSERT INTO "levelIIITechnicians" ("clientId", "name", "email", "phone", "method", "level", "certificateNumber", "notes")
VALUES
  (1, 'Bob Wilson', 'bob@example.com', '0777711111', 'UT', 'Level II', 'CERT-001', NULL),
  (1, 'Sarah Lee', 'sarah@example.com', '0777722222', 'MT', 'Level II', 'CERT-002', 'Eye test due soon'),
  (2, 'Tom Brown', 'tom@another.com', '0777733333', 'VT', 'Level I', NULL, NULL);

-- clientId must match an existing id in the "levelIIIClients" table
-- method examples: UT, MT, VT, PT, RT, ET
-- level examples: Level I, Level II, Level III
