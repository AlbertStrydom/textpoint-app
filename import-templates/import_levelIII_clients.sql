-- ============================================================
-- Level III Clients — Import Template
-- Run in Supabase SQL Editor (https://supabase.com → SQL Editor)
-- ============================================================

INSERT INTO "levelIIIClients" ("companyName", "primaryContact", "secondaryContact", "email", "secondaryEmail", "phone", "secondaryPhone", "physicalAddress", "visitCadence", "notes")
VALUES
  ('Example Corp', 'John Doe', 'Jane Doe', 'john@example.com', 'jane@example.com', '0123456789', '0987654321', '123 Main St, City', 'Monthly', 'Initial notes'),
  ('Another Co', 'Alice Smith', NULL, 'alice@another.com', NULL, '0112223333', NULL, '456 Oak Ave, Town', 'Quarterly', NULL);

-- visitCadence options: 'Weekly', 'Monthly', 'Six Monthly'
-- Dates (lastVisit, nextVisit) use format: '2026-07-15'
