ALTER TABLE `plannerEntries`
  ADD COLUMN `recurrence` varchar(30) NULL,
  ADD COLUMN `recurrenceUntil` date NULL;
