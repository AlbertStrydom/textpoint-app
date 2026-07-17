SET @lead_contact_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'leads'
    AND column_name = 'contact_id'
);

SET @lead_contact_column_sql = IF(
  @lead_contact_column_exists = 0,
  'ALTER TABLE `leads` ADD COLUMN `contact_id` int',
  'SELECT 1'
);

PREPARE lead_contact_column_stmt FROM @lead_contact_column_sql;
EXECUTE lead_contact_column_stmt;
DEALLOCATE PREPARE lead_contact_column_stmt;

SET @lead_contact_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'leads'
    AND index_name = 'leads_contact_id_idx'
);

SET @lead_contact_index_sql = IF(
  @lead_contact_index_exists = 0,
  'CREATE INDEX `leads_contact_id_idx` ON `leads` (`contact_id`)',
  'SELECT 1'
);

PREPARE lead_contact_index_stmt FROM @lead_contact_index_sql;
EXECUTE lead_contact_index_stmt;
DEALLOCATE PREPARE lead_contact_index_stmt;
