ALTER TABLE `students`
  ADD COLUMN `interestType` varchar(30) NULL,
  ADD COLUMN `isCurrentPcnHolder` boolean NOT NULL DEFAULT false,
  ADD COLUMN `bindtProductCompleted` boolean NOT NULL DEFAULT false,
  ADD COLUMN `pcnNumber` varchar(100) NULL;

ALTER TABLE `leads`
  ADD COLUMN `pcn_number` varchar(100) NULL;
