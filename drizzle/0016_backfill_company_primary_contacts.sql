INSERT INTO `contacts` (
  `companyId`,
  `firstName`,
  `lastName`,
  `email`,
  `phone`,
  `position`,
  `contactType`,
  `active`
)
SELECT
  c.`id`,
  CASE
    WHEN LOCATE(' ', TRIM(c.`primaryContactName`)) = 0
      THEN TRIM(c.`primaryContactName`)
    ELSE SUBSTRING_INDEX(TRIM(c.`primaryContactName`), ' ', 1)
  END,
  CASE
    WHEN LOCATE(' ', TRIM(c.`primaryContactName`)) = 0
      THEN '-'
    ELSE TRIM(SUBSTRING(TRIM(c.`primaryContactName`), LOCATE(' ', TRIM(c.`primaryContactName`)) + 1))
  END,
  c.`primaryContactEmail`,
  c.`primaryContactPhone`,
  'Primary Contact',
  'Client',
  true
FROM `companies` c
WHERE c.`primaryContactName` IS NOT NULL
  AND TRIM(c.`primaryContactName`) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM `contacts` ct
    WHERE ct.`companyId` = c.`id`
      AND LOWER(TRIM(ct.`firstName`)) = LOWER(
        CASE
          WHEN LOCATE(' ', TRIM(c.`primaryContactName`)) = 0
            THEN TRIM(c.`primaryContactName`)
          ELSE SUBSTRING_INDEX(TRIM(c.`primaryContactName`), ' ', 1)
        END
      )
      AND LOWER(TRIM(ct.`lastName`)) = LOWER(
        CASE
          WHEN LOCATE(' ', TRIM(c.`primaryContactName`)) = 0
            THEN '-'
          ELSE TRIM(SUBSTRING(TRIM(c.`primaryContactName`), LOCATE(' ', TRIM(c.`primaryContactName`)) + 1))
        END
      )
  );
