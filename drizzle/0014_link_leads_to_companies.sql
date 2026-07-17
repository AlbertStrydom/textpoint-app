SET @lead_company_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'leads'
    AND column_name = 'company_id'
);

SET @lead_company_column_sql = IF(
  @lead_company_column_exists = 0,
  'ALTER TABLE `leads` ADD COLUMN `company_id` int',
  'SELECT 1'
);

PREPARE lead_company_column_stmt FROM @lead_company_column_sql;
EXECUTE lead_company_column_stmt;
DEALLOCATE PREPARE lead_company_column_stmt;

SET @lead_company_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'leads'
    AND index_name = 'leads_company_id_idx'
);

SET @lead_company_index_sql = IF(
  @lead_company_index_exists = 0,
  'CREATE INDEX `leads_company_id_idx` ON `leads` (`company_id`)',
  'SELECT 1'
);

PREPARE lead_company_index_stmt FROM @lead_company_index_sql;
EXECUTE lead_company_index_stmt;
DEALLOCATE PREPARE lead_company_index_stmt;

UPDATE `leads` l
INNER JOIN `companies` c ON LOWER(l.`company_name`) = LOWER(c.`name`)
SET l.`company_id` = c.`id`
WHERE l.`company_id` IS NULL
  AND l.`company_name` IS NOT NULL
  AND l.`company_name` <> '';
