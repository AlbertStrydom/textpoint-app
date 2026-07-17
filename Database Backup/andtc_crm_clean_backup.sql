-- MySQL dump 10.13  Distrib 8.4.8, for Win64 (x86_64)
--
-- Host: localhost    Database: andtc_crm_clean
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__drizzle_migrations`
--

LOCK TABLES `__drizzle_migrations` WRITE;
/*!40000 ALTER TABLE `__drizzle_migrations` DISABLE KEYS */;
INSERT INTO `__drizzle_migrations` VALUES (1,'69d195a16104ceeb58e3fa7300121670aa48f7b1c78f1df1bc70109024fd6d89',1776235877647),(2,'d23e9b969f05e971b97f1a36983c406a9e98879bbf736dda1c920b6f5aa2522f',1776238010598),(3,'76d233894d919fa6c2eb7f3a8fd412704665acb770a0fead38e61e51b3d5d56d',1776239960463),(4,'e0d08ee96e0059af2804d655b7107776605a8f166c3aa21f6effaef27eb7dfd9',1776256698813),(5,'e486699df7b5541dc13962f8e906c6cb1c6327ee6a03ec27675000887095876e',1776666716940),(6,'a42a850d79918b021ef7ac723dc1b67e1a4213e28d5689993df1f1beb24df3f3',1776680842634),(7,'ea83e365b98c4fdd01dd89c34e7e7086a47a68f5c90a37cb6b2cb6814650b516',1776688557196);
/*!40000 ALTER TABLE `__drizzle_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessments`
--

DROP TABLE IF EXISTS `assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `assessorId` int DEFAULT NULL,
  `assessmentType` enum('Theory','Practical') NOT NULL DEFAULT 'Theory',
  `attemptNumber` int NOT NULL DEFAULT '1',
  `score` decimal(6,2) DEFAULT NULL,
  `maxScore` decimal(6,2) DEFAULT NULL,
  `result` enum('Pass','Fail','Incomplete') NOT NULL DEFAULT 'Incomplete',
  `assessmentDate` date NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assessments_enrollment_idx` (`enrollmentId`),
  KEY `assessments_assessor_idx` (`assessorId`),
  KEY `assessments_date_idx` (`assessmentDate`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessments`
--

LOCK TABLES `assessments` WRITE;
/*!40000 ALTER TABLE `assessments` DISABLE KEYS */;
INSERT INTO `assessments` VALUES (1,3,1,'Practical',1,88.00,100.00,'Pass','2026-04-06',NULL,'2026-04-25 16:54:23','2026-04-25 16:54:23');
/*!40000 ALTER TABLE `assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `courseScheduleId` int NOT NULL,
  `attendanceDate` date NOT NULL,
  `status` enum('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (1,2,2,'2026-04-23','Present',NULL,'2026-04-23 13:12:04','2026-04-23 13:12:04');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditlogs`
--

DROP TABLE IF EXISTS `auditlogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `entityType` varchar(100) NOT NULL,
  `entityId` int NOT NULL,
  `changes` json DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text,
  `status` enum('Success','Failed') NOT NULL DEFAULT 'Success',
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditlogs`
--

LOCK TABLES `auditlogs` WRITE;
/*!40000 ALTER TABLE `auditlogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_accounts`
--

DROP TABLE IF EXISTS `auth_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_accounts` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `accountId` varchar(255) NOT NULL,
  `providerId` varchar(255) NOT NULL,
  `accessToken` text,
  `refreshToken` text,
  `accessTokenExpiresAt` timestamp NULL DEFAULT NULL,
  `password` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_accounts`
--

LOCK TABLES `auth_accounts` WRITE;
/*!40000 ALTER TABLE `auth_accounts` DISABLE KEYS */;
INSERT INTO `auth_accounts` VALUES ('263699b2-6d5d-4ad8-a7c3-db03c4e37ac2','11dc46a9-aa0d-46f2-bd98-5b05928b117d','info@andtc.com','credentials',NULL,NULL,NULL,'scrypt:e8e5e0d68b896f39bd3dcf2de2f6ee5a:0b0b5c0c1f68e143fcd50343a550d23781ac0d48eabe2a6fee3e1a0ce0bda8db49b047ddd377f87ea772cfc49a956aaa8713f53a17c69e89c74f33ae4f8cbdbd','2026-04-23 15:28:31','2026-04-23 15:28:31'),('669a26b3-bf86-4aec-ad1f-eb1fa3cda200','ae2ad071-a8fb-4981-9048-1c18b57cab59','albert.vaal@gmail.com','credentials',NULL,NULL,NULL,'scrypt:67d46fb6c5394cb97be5f822356a7b30:966a1fadf7abf74a55dda226c98f79c6cee07dcce2f9e3acfa408bb01ae71911e305e646e02983d9b4aeb519d57fe8fbe60333dc19bade027c7428789c746562','2026-04-23 08:54:20','2026-04-23 09:14:30'),('953a7ca1-ca13-4520-88e1-cb4b6c9b7d2c','02960a7a-6a24-438f-8f8a-f41bac5a1be6','albert@andtc.com','credentials',NULL,NULL,NULL,'scrypt:9ebdcd10ebf5f1149d186a4f0bf9d03f:e5ca7e6515bd43dc44af7979615fcc88f5915b502298dccd7d83f7f4227a4380894bcb3a69950b58381630e341b2423097eff5527a8aa7825b051875f4546718','2026-04-23 08:12:28','2026-04-23 08:12:28');
/*!40000 ALTER TABLE `auth_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_sessions_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_sessions`
--

LOCK TABLES `auth_sessions` WRITE;
/*!40000 ALTER TABLE `auth_sessions` DISABLE KEYS */;
INSERT INTO `auth_sessions` VALUES ('7b986992-6409-40c6-9624-5df893eef76c','02960a7a-6a24-438f-8f8a-f41bac5a1be6','ca96f4f40a816e203ce88374fe3bf9f095577f8f5625e34147726457ec66af5f','2026-05-23 13:29:53','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-23 15:29:53','2026-04-23 15:29:53'),('b53c9bd6-72c7-4499-8e91-2d0a136ef27c','02960a7a-6a24-438f-8f8a-f41bac5a1be6','71f5e8ab78ce683a0e2316caf31f696e7105b38b574d3879158509748321f178','2026-05-23 06:48:48','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-23 08:48:47','2026-04-23 08:48:47'),('dc71ad5c-5c72-4e20-9d02-a44102f447a7','02960a7a-6a24-438f-8f8a-f41bac5a1be6','27305a8d5b12224e23f32b08f2f8ea0c76dbbefb3ada2cb138bfcc256a0abbfc','2026-05-29 05:02:36','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36','2026-04-29 07:02:35','2026-04-29 07:02:35');
/*!40000 ALTER TABLE `auth_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_users`
--

DROP TABLE IF EXISTS `auth_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `emailVerified` tinyint(1) NOT NULL DEFAULT '0',
  `image` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_users`
--

LOCK TABLES `auth_users` WRITE;
/*!40000 ALTER TABLE `auth_users` DISABLE KEYS */;
INSERT INTO `auth_users` VALUES ('02960a7a-6a24-438f-8f8a-f41bac5a1be6','Albert','albert@andtc.com',0,NULL,'2026-04-23 08:12:28','2026-04-30 10:25:09'),('11dc46a9-aa0d-46f2-bd98-5b05928b117d','Mieke','info@andtc.com',0,NULL,'2026-04-23 15:28:31','2026-04-23 15:28:31'),('ae2ad071-a8fb-4981-9048-1c18b57cab59','Test','albert.vaal@gmail.com',0,NULL,'2026-04-23 08:54:20','2026-04-23 08:54:20');
/*!40000 ALTER TABLE `auth_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_verifications`
--

DROP TABLE IF EXISTS `auth_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_verifications` (
  `id` varchar(36) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `value` varchar(255) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_verifications`
--

LOCK TABLES `auth_verifications` WRITE;
/*!40000 ALTER TABLE `auth_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `description` text,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `companyName` varchar(255) DEFAULT NULL,
  `companyDescription` text,
  `logoUrl` text,
  `primaryColor` varchar(7) DEFAULT NULL,
  `secondaryColor` varchar(7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'ANDTc Vaal','AV',NULL,1,'2026-04-22 09:09:43','2026-04-22 09:09:43',NULL,NULL,NULL,NULL,NULL),(2,'ANDTc Constantia','AC',NULL,1,'2026-04-22 09:10:00','2026-04-28 09:49:42',NULL,NULL,NULL,NULL,NULL),(3,'ANDTc Plett','PL',NULL,1,'2026-04-28 09:48:57','2026-04-28 09:48:57',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificates`
--

DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `certificateNumber` varchar(120) NOT NULL,
  `issuedDate` date NOT NULL,
  `expiryDate` date DEFAULT NULL,
  `status` enum('Active','Expired','Revoked') NOT NULL DEFAULT 'Active',
  `content` text,
  `notes` text,
  `issuedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificates_number_unique` (`certificateNumber`),
  KEY `certificates_enrollment_idx` (`enrollmentId`),
  KEY `certificates_issued_idx` (`issuedDate`),
  KEY `certificates_expiry_idx` (`expiryDate`),
  KEY `certificates_status_idx` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificates`
--

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES (1,1,'CERT-2026-0001','2026-04-24','2027-09-24','Active','<p>This certificate confirms that <strong>Koos Koek</strong> successfully completed the listed training programme.</p>\n    <table>\n      <tbody>\n        <tr><th>Certificate Number</th><td>CERT-2026-0001</td></tr>\n        <tr><th>Course / Schedule</th><td>PT 1&amp;2 - Penetrant Testing Level 1 and 2 Combined | No branch | 27 Apr 2026</td></tr>\n        <tr><th>Branch</th><td>No branch</td></tr>\n        <tr><th>Issued Date</th><td>24 Apr 2026</td></tr>\n        <tr><th>Expiry Date</th><td>24 Sept 2027</td></tr>\n      </tbody>\n    </table>\n    <p>The holder has completed the applicable training and practical record requirements captured by ANDTc.</p>\n    \n    <p><strong>Issued for:</strong> Koos Koek</p>',NULL,1,'2026-04-24 19:59:16','2026-04-24 19:59:16'),(2,3,'CERT-2026-0002','2026-04-25',NULL,'Active','<p>This certificate confirms that <strong>Koos Koek</strong> successfully completed the listed training programme.</p>\n    <table>\n      <tbody>\n        <tr><th>Certificate Number</th><td>CERT-2026-0002</td></tr>\n        <tr><th>Course / Schedule</th><td>PT 1&amp;2 - Penetrant Testing Level 1 and 2 Combined | ANDTc Vaal | 06 Apr 2026</td></tr>\n        <tr><th>Branch</th><td>ANDTc Vaal</td></tr>\n        <tr><th>Issued Date</th><td>25 Apr 2026</td></tr>\n        <tr><th>Expiry Date</th><td>Not applicable</td></tr>\n      </tbody>\n    </table>\n    <p>The holder has completed the applicable training and practical record requirements captured by ANDTc.</p>\n    \n    <p><strong>Issued for:</strong> Koos Koek</p>',NULL,1,'2026-04-25 16:57:15','2026-04-25 16:57:15');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `registrationNumber` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `physicalAddress` text,
  `primaryContactName` varchar(255) DEFAULT NULL,
  `primaryContactEmail` varchar(320) DEFAULT NULL,
  `primaryContactPhone` varchar(50) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Active',
  `branchId` int DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `companies_name_idx` (`name`),
  KEY `companies_branch_idx` (`branchId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (2,'Company a',NULL,'0111234567','123@companya.com','www.companya.com',NULL,'Mr a','123@companya.com','0001234567','Active',1,NULL,'2026-04-23 11:27:41','2026-04-23 11:29:04'),(4,'Company b',NULL,'0009876543','mrb@companyb.com',NULL,NULL,'Mr b','mrb@companyb.com','0009876543','Active',1,NULL,'2026-04-23 11:50:32','2026-04-23 11:51:01');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int DEFAULT NULL,
  `firstName` varchar(120) NOT NULL,
  `lastName` varchar(120) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `position` varchar(120) DEFAULT NULL,
  `contactType` varchar(50) NOT NULL DEFAULT 'Client',
  `notes` text,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contacts_company_idx` (`companyId`),
  KEY `contacts_email_idx` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
INSERT INTO `contacts` VALUES (3,2,'Mr','a','123@companya.com','0001234567','Primary Contact','Client',NULL,1,'2026-04-23 12:21:40','2026-04-23 12:21:40'),(4,4,'Mr','b','mrb@companyb.com','0009876543','Primary Contact','Client',NULL,1,'2026-04-23 12:21:40','2026-04-23 12:21:40');
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `duration` int DEFAULT NULL,
  `level` enum('Level 1','Level 2','Level 3') NOT NULL DEFAULT 'Level 1',
  `branchId` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `courses_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Penetrant Testing Level 1','PT 1','',NULL,'Level 1',NULL,1,'2026-04-20 10:37:11','2026-04-20 10:37:53'),(2,'Penetrant Testing Level 2','Pt 2','',NULL,'Level 2',NULL,1,'2026-04-20 10:37:40','2026-04-20 10:37:40'),(3,'Penetrant Testing Level 1 and 2 Combined','PT 1&2','',NULL,'Level 2',NULL,1,'2026-04-20 10:38:39','2026-04-20 10:38:39'),(4,'MT Level 1 and 2','MT 1&2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(5,'Intro to NDT for ENG','INDTE','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(6,'PAUT Level 1 and 2','PAUT 1&2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(7,'PCN BRS','PCN BRS','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(8,'RTFI','RTFI','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(9,'Basic Level 3','BASIC 3','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 3',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(10,'MT Level 3','MT 3','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 3',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(11,'PT Level 3','PT 3','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 3',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(12,'ET Level 1','ET 1','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(13,'VT Level 3','VT 3','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 3',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(14,'UT','UT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(15,'VT Level 1 and 2','VT 1&2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(16,'ACFM Level 1','ACFM 1','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(17,'ET Level 2','ET 2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(18,'UT Level 3','UT 3','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 3',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(19,'ET Level Tubes','ET TUBES','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(20,'ACFM Level 2','ACFM 2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(21,'TOFD Level 1 and 2','TOFD 1&2','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(22,'PT','PT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(23,'WT','WT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(24,'VT','VT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(25,'MT','MT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(26,'RT','RT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(27,'RTS','RTS','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(28,'HT','HT','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 1',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57'),(29,'CR/DR','CR/DR','Imported from the 2026 ANDTc branch training schedule PDFs.',NULL,'Level 2',NULL,1,'2026-04-27 11:41:57','2026-04-27 11:41:57');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courseschedules`
--

DROP TABLE IF EXISTS `courseschedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courseschedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `courseId` int NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `lecturerId` int DEFAULT NULL,
  `maxCapacity` int DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `status` enum('Scheduled','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `endOfCourseExamStartDate` datetime DEFAULT NULL,
  `endOfCourseExamEndDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courseschedules`
--

LOCK TABLES `courseschedules` WRITE;
/*!40000 ALTER TABLE `courseschedules` DISABLE KEYS */;
INSERT INTO `courseschedules` VALUES (1,3,'2026-04-26 22:00:00','2026-04-30 22:00:00',1,12,1,'Scheduled','2026-04-21 13:18:36','2026-04-25 13:02:24',NULL,NULL),(2,3,'2026-04-19 22:00:00','2026-04-27 22:00:00',2,12,1,'Scheduled','2026-04-22 05:50:11','2026-04-23 13:11:11',NULL,NULL),(3,3,'2026-04-05 22:00:00','2026-04-13 22:00:00',1,12,1,'Scheduled','2026-04-25 16:50:57','2026-04-25 16:51:06',NULL,NULL),(4,4,'2026-01-12 00:00:00','2026-01-20 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(5,5,'2026-01-19 00:00:00','2026-01-23 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(6,6,'2026-01-19 00:00:00','2026-02-06 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(7,3,'2026-01-26 00:00:00','2026-02-03 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(8,7,'2026-01-26 00:00:00','2026-01-29 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(9,8,'2026-02-02 00:00:00','2026-02-12 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(10,3,'2026-02-16 00:00:00','2026-02-24 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(11,9,'2026-02-09 00:00:00','2026-02-20 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(12,10,'2026-02-23 00:00:00','2026-02-27 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(13,11,'2026-03-02 00:00:00','2026-03-05 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(14,4,'2026-03-02 00:00:00','2026-03-10 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(15,12,'2026-03-09 00:00:00','2026-03-16 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:57','2026-04-27 11:41:57',NULL,NULL),(16,13,'2026-03-09 00:00:00','2026-03-12 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(17,14,'2026-03-16 00:00:00','2026-04-10 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(18,15,'2026-04-07 00:00:00','2026-04-13 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(19,16,'2026-04-13 00:00:00','2026-04-17 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(20,8,'2026-04-13 00:00:00','2026-04-23 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(21,3,'2026-04-20 00:00:00','2026-04-29 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(22,7,'2026-04-20 00:00:00','2026-04-23 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(23,4,'2026-05-04 00:00:00','2026-05-12 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(24,14,'2026-05-11 00:00:00','2026-06-05 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(25,17,'2026-05-18 00:00:00','2026-05-26 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(26,6,'2026-05-25 00:00:00','2026-06-12 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(27,4,'2026-06-01 00:00:00','2026-06-09 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(28,18,'2026-06-01 00:00:00','2026-06-05 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(29,3,'2026-06-15 00:00:00','2026-06-24 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(30,19,'2026-06-22 00:00:00','2026-06-29 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(31,4,'2026-07-06 00:00:00','2026-07-14 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(32,20,'2026-07-06 00:00:00','2026-07-10 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(33,14,'2026-07-06 00:00:00','2026-07-29 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(34,3,'2026-07-20 00:00:00','2026-07-28 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(35,7,'2026-07-20 00:00:00','2026-07-24 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(36,15,'2026-07-20 00:00:00','2026-07-24 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(37,4,'2026-08-03 00:00:00','2026-08-12 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(38,6,'2026-08-11 00:00:00','2026-08-28 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(39,3,'2026-08-17 00:00:00','2026-08-25 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(40,4,'2026-08-31 00:00:00','2026-09-08 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(41,3,'2026-09-14 00:00:00','2026-09-22 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(42,14,'2026-09-28 00:00:00','2026-10-21 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(43,8,'2026-09-21 00:00:00','2026-10-02 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(44,4,'2026-10-05 00:00:00','2026-10-13 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(45,15,'2026-10-26 00:00:00','2026-10-30 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(46,6,'2026-10-19 00:00:00','2026-11-06 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(47,3,'2026-11-16 00:00:00','2026-11-24 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(48,7,'2026-11-16 00:00:00','2026-11-19 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(49,21,'2026-11-23 00:00:00','2026-12-04 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(50,4,'2026-11-30 00:00:00','2026-12-08 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(51,3,'2026-12-07 00:00:00','2026-12-15 00:00:00',NULL,NULL,2,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:41:58',NULL,NULL),(52,22,'2026-01-11 22:00:00','2026-01-19 22:00:00',NULL,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:52:27','2026-01-19 22:00:00','2026-01-19 22:00:00'),(53,23,'2026-01-11 22:00:00','2026-01-15 22:00:00',NULL,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:52:36','2026-01-15 22:00:00','2026-01-15 22:00:00'),(54,24,'2026-01-19 00:00:00','2026-01-23 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-01-23 00:00:00','2026-01-23 00:00:00'),(55,25,'2026-01-26 00:00:00','2026-02-03 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-03 00:00:00','2026-02-03 00:00:00'),(56,26,'2026-01-19 00:00:00','2026-02-06 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-05 00:00:00','2026-02-06 00:00:00'),(57,22,'2026-02-02 00:00:00','2026-02-10 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-10 00:00:00','2026-02-10 00:00:00'),(58,27,'2026-02-09 00:00:00','2026-02-13 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-13 00:00:00','2026-02-13 00:00:00'),(59,7,'2026-02-16 00:00:00','2026-02-19 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-19 00:00:00','2026-02-19 00:00:00'),(60,14,'2026-02-09 00:00:00','2026-03-06 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-03-05 00:00:00','2026-03-06 00:00:00'),(61,25,'2026-02-23 00:00:00','2026-03-03 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-03-03 00:00:00','2026-03-03 00:00:00'),(62,24,'2026-02-23 00:00:00','2026-02-27 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-02-27 00:00:00','2026-02-27 00:00:00'),(63,22,'2026-03-02 00:00:00','2026-03-10 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-03-10 00:00:00','2026-03-10 00:00:00'),(64,23,'2026-03-09 00:00:00','2026-03-13 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-03-13 00:00:00','2026-03-13 00:00:00'),(65,25,'2026-03-16 00:00:00','2026-03-24 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-03-24 00:00:00','2026-03-24 00:00:00'),(66,26,'2026-03-16 00:00:00','2026-04-03 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-04-02 00:00:00','2026-04-03 00:00:00'),(67,28,'2026-03-23 00:00:00','2026-03-24 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:56:33','2026-03-24 00:00:00','2026-03-24 00:00:00'),(68,27,'2026-04-07 00:00:00','2026-04-13 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-04-13 00:00:00','2026-04-13 00:00:00'),(69,7,'2026-04-13 22:00:00','2026-04-16 22:00:00',2,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:53:04','2026-04-16 22:00:00','2026-04-16 22:00:00'),(70,22,'2026-04-06 22:00:00','2026-04-14 22:00:00',NULL,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:53:17','2026-04-14 22:00:00','2026-04-14 22:00:00'),(71,14,'2026-04-06 22:00:00','2026-05-04 22:00:00',3,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:57:00','2026-05-03 22:00:00','2026-05-04 22:00:00'),(72,24,'2026-04-20 00:00:00','2026-04-24 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-04-24 00:00:00','2026-04-24 00:00:00'),(73,25,'2026-04-20 00:00:00','2026-04-29 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-04-29 00:00:00','2026-04-29 00:00:00'),(74,22,'2026-05-04 00:00:00','2026-05-12 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-05-12 00:00:00','2026-05-12 00:00:00'),(75,25,'2026-05-18 00:00:00','2026-05-26 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-05-26 00:00:00','2026-05-26 00:00:00'),(76,23,'2026-05-11 00:00:00','2026-05-15 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-05-15 00:00:00','2026-05-15 00:00:00'),(77,26,'2026-05-17 22:00:00','2026-06-04 22:00:00',2,12,1,'Scheduled','2026-04-27 11:41:58','2026-04-28 09:57:49','2026-06-03 22:00:00','2026-06-04 22:00:00'),(78,24,'2026-05-25 00:00:00','2026-05-29 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-05-29 00:00:00','2026-05-29 00:00:00'),(79,22,'2026-06-01 00:00:00','2026-06-09 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-06-09 00:00:00','2026-06-09 00:00:00'),(80,27,'2026-06-08 00:00:00','2026-06-12 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-06-12 00:00:00','2026-06-12 00:00:00'),(81,7,'2026-06-15 00:00:00','2026-06-19 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-06-19 00:00:00','2026-06-19 00:00:00'),(82,14,'2026-06-08 00:00:00','2026-07-03 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-07-02 00:00:00','2026-07-03 00:00:00'),(83,25,'2026-06-15 00:00:00','2026-06-24 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-06-24 00:00:00','2026-06-24 00:00:00'),(84,29,'2026-06-22 00:00:00','2026-06-26 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-06-26 00:00:00','2026-06-26 00:00:00'),(85,22,'2026-07-06 00:00:00','2026-07-14 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-07-14 00:00:00','2026-07-14 00:00:00'),(86,26,'2026-07-13 00:00:00','2026-07-31 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-07-30 00:00:00','2026-07-31 00:00:00'),(87,25,'2026-07-20 00:00:00','2026-07-28 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-07-28 00:00:00','2026-07-28 00:00:00'),(88,23,'2026-07-27 00:00:00','2026-07-31 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-07-31 00:00:00','2026-07-31 00:00:00'),(89,27,'2026-08-03 00:00:00','2026-08-07 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-08-07 00:00:00','2026-08-07 00:00:00'),(90,7,'2026-08-11 00:00:00','2026-08-14 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-08-14 00:00:00','2026-08-14 00:00:00'),(91,22,'2026-08-03 00:00:00','2026-08-12 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:56:33','2026-08-12 00:00:00','2026-08-12 00:00:00'),(92,25,'2026-08-17 00:00:00','2026-08-25 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-08-25 00:00:00','2026-08-25 00:00:00'),(93,23,'2026-08-24 00:00:00','2026-08-28 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-08-28 00:00:00','2026-08-28 00:00:00'),(94,28,'2026-08-24 00:00:00','2026-08-25 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 11:56:33','2026-08-25 00:00:00','2026-08-25 00:00:00'),(95,22,'2026-08-31 00:00:00','2026-09-08 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-09-08 00:00:00','2026-09-08 00:00:00'),(96,14,'2026-08-31 00:00:00','2026-09-28 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-09-25 00:00:00','2026-09-28 00:00:00'),(97,25,'2026-09-14 00:00:00','2026-09-22 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-09-22 00:00:00','2026-09-22 00:00:00'),(98,24,'2026-09-28 00:00:00','2026-10-02 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-02 00:00:00','2026-10-02 00:00:00'),(99,22,'2026-10-05 00:00:00','2026-10-13 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-13 00:00:00','2026-10-13 00:00:00'),(100,26,'2026-10-05 00:00:00','2026-10-23 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-22 00:00:00','2026-10-23 00:00:00'),(101,25,'2026-10-19 00:00:00','2026-10-27 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-27 00:00:00','2026-10-27 00:00:00'),(102,27,'2026-10-26 00:00:00','2026-10-30 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-30 00:00:00','2026-10-30 00:00:00'),(103,23,'2026-10-26 00:00:00','2026-10-30 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-10-30 00:00:00','2026-10-30 00:00:00'),(104,7,'2026-11-02 00:00:00','2026-11-05 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-11-05 00:00:00','2026-11-05 00:00:00'),(105,22,'2026-11-02 00:00:00','2026-11-10 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-11-10 00:00:00','2026-11-10 00:00:00'),(106,14,'2026-11-02 00:00:00','2026-11-27 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-11-26 00:00:00','2026-11-27 00:00:00'),(107,25,'2026-11-16 00:00:00','2026-11-24 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-11-24 00:00:00','2026-11-24 00:00:00'),(108,22,'2026-11-30 00:00:00','2026-12-08 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-12-08 00:00:00','2026-12-08 00:00:00'),(109,25,'2026-12-07 00:00:00','2026-12-15 00:00:00',NULL,NULL,1,'Scheduled','2026-04-27 11:41:58','2026-04-27 12:01:08','2026-12-15 00:00:00','2026-12-15 00:00:00');
/*!40000 ALTER TABLE `courseschedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `documentType` varchar(100) DEFAULT NULL,
  `url` text NOT NULL,
  `uploadedBy` int DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `content` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (1,'Course Enrolment Confirmation','Training booking confirmation for a learner and scheduled course.','Course Enrolment Confirmation','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"course-enrolment-confirmation\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"branchName\", \"scheduleStartDate\", \"scheduleEndDate\", \"enrollmentDate\", \"scheduleStatus\", \"todayDate\"], \"templateCategory\": \"Student Pack\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Course Enrolment Confirmation</h2>\n      <p>This letter confirms that <strong>{{studentName}}</strong> has been enrolled for the following training.</p>\n      <table>\n        <tbody>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Branch</th><td>{{branchName}}</td></tr>\n          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>\n          <tr><th>Enrolment Date</th><td>{{enrollmentDate}}</td></tr>\n          <tr><th>Schedule Status</th><td>{{scheduleStatus}}</td></tr>\n        </tbody>\n      </table>\n      <p>Please report to <strong>{{branchName}}</strong> with the required identification and PPE where applicable.</p>\n      <p>Generated on {{todayDate}}.</p>'),(2,'Course Feedback Form','Editable learner feedback form for a completed course.','Course Feedback Form','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"course-feedback-form\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"courseLabel\", \"scheduleStartDate\", \"scheduleEndDate\"], \"templateCategory\": \"Course Control\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Course Feedback Form</h2>\n      <p>Student: <strong>{{studentName}}</strong></p>\n      <p>Course: <strong>{{courseLabel}}</strong></p>\n      <p>Dates: {{scheduleStartDate}} to {{scheduleEndDate}}</p>\n      <table>\n        <tbody>\n          <tr><th>Training Material</th><td contenteditable=\"true\">Excellent / Good / Fair / Poor</td></tr>\n          <tr><th>Lecturer Delivery</th><td contenteditable=\"true\">Excellent / Good / Fair / Poor</td></tr>\n          <tr><th>Venue & Facilities</th><td contenteditable=\"true\">Excellent / Good / Fair / Poor</td></tr>\n          <tr><th>Overall Experience</th><td contenteditable=\"true\">Excellent / Good / Fair / Poor</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Learner Comments:</strong></p>\n      <p contenteditable=\"true\">Add learner comments here.</p>'),(3,'Training Process Control Sheet','Course delivery control sheet linked to a student enrolment and schedule.','Training Process Control Sheet','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"training-process-control-sheet\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"courseLevel\", \"scheduleStartDate\", \"scheduleEndDate\", \"branchName\", \"latestAssessmentType\", \"latestAssessmentResult\"], \"templateCategory\": \"Course Control\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Training Process Control Sheet</h2>\n      <table>\n        <tbody>\n          <tr><th>Student</th><td>{{studentName}}</td></tr>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Course Level</th><td>{{courseLevel}}</td></tr>\n          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>\n          <tr><th>Branch</th><td>{{branchName}}</td></tr>\n          <tr><th>Latest Assessment</th><td>{{latestAssessmentType}} - {{latestAssessmentResult}}</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Control Notes:</strong></p>\n      <p contenteditable=\"true\">Capture training observations, attendance issues, or material checks here.</p>'),(4,'Counselling Register','Editable counselling record for learner support or performance interventions.','Counselling Register','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"counselling-register\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"courseLabel\", \"todayDate\"], \"templateCategory\": \"Course Control\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Counselling Register</h2>\n      <p>Learner: <strong>{{studentName}}</strong></p>\n      <p>Course: <strong>{{courseLabel}}</strong></p>\n      <table>\n        <tbody>\n          <tr><th>Date</th><td>{{todayDate}}</td></tr>\n          <tr><th>Reason for Counselling</th><td contenteditable=\"true\">Add counselling reason.</td></tr>\n          <tr><th>Action Agreed</th><td contenteditable=\"true\">Add agreed action.</td></tr>\n          <tr><th>Follow-up Date</th><td contenteditable=\"true\">Add follow-up date.</td></tr>\n        </tbody>\n      </table>'),(5,'Course Completion Checklist','Checklist used before a training course is formally closed out.','Course Completion Checklist','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"course-completion-checklist\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"courseLabel\"], \"templateCategory\": \"Results & Certificates\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Course Completion Checklist</h2>\n      <p>Student: <strong>{{studentName}}</strong> | Course: <strong>{{courseLabel}}</strong></p>\n      <table>\n        <tbody>\n          <tr><th>Attendance Finalised</th><td contenteditable=\"true\">Yes / No</td></tr>\n          <tr><th>Assessment Recorded</th><td contenteditable=\"true\">Yes / No</td></tr>\n          <tr><th>Result Notice Issued</th><td contenteditable=\"true\">Yes / No</td></tr>\n          <tr><th>Certificate Ready</th><td contenteditable=\"true\">Yes / No</td></tr>\n          <tr><th>Feedback Captured</th><td contenteditable=\"true\">Yes / No</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Close-out Notes:</strong></p>\n      <p contenteditable=\"true\">Record outstanding actions or corrections here.</p>'),(6,'Certificate of Attendance','Attendance confirmation document driven from the enrolment and course schedule.','Certificate of Attendance','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"certificate-of-attendance\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"scheduleStartDate\", \"scheduleEndDate\", \"branchName\", \"certificateNumber\", \"certificateIssuedDate\", \"todayDate\"], \"templateCategory\": \"Results & Certificates\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Certificate of Attendance</h2>\n      <p>This certifies that <strong>{{studentName}}</strong> attended the training course listed below.</p>\n      <table>\n        <tbody>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>\n          <tr><th>Branch</th><td>{{branchName}}</td></tr>\n          <tr><th>Certificate Number</th><td>{{certificateNumber}}</td></tr>\n          <tr><th>Issued Date</th><td>{{certificateIssuedDate}}</td></tr>\n        </tbody>\n      </table>\n      <p>Generated on {{todayDate}}.</p>'),(7,'End of Course Result Notice','Learner result notice using the latest recorded assessment result.','End of Course Result Notice','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"end-of-course-result-notice\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"latestAssessmentDate\", \"latestAssessmentType\", \"latestAssessmentResult\", \"latestAssessmentScore\"], \"templateCategory\": \"Results & Certificates\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>End of Course Exam Result Notice</h2>\n      <table>\n        <tbody>\n          <tr><th>Student</th><td>{{studentName}}</td></tr>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Exam Date</th><td>{{latestAssessmentDate}}</td></tr>\n          <tr><th>Assessment Type</th><td>{{latestAssessmentType}}</td></tr>\n          <tr><th>Result</th><td>{{latestAssessmentResult}}</td></tr>\n          <tr><th>Score</th><td>{{latestAssessmentScore}}</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Remarks:</strong></p>\n      <p contenteditable=\"true\">Add remarks, rewrite conditions, or special instructions here.</p>'),(8,'Exam Rewrite Application','Editable rewrite application linked to the learner and their latest assessment outcome.','Exam Rewrite Application','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"exam-rewrite-application\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"latestAssessmentResult\", \"latestAssessmentScore\"], \"templateCategory\": \"Results & Certificates\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>End of Course Exam Rewrite Application Form</h2>\n      <table>\n        <tbody>\n          <tr><th>Student</th><td>{{studentName}}</td></tr>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Latest Result</th><td>{{latestAssessmentResult}}</td></tr>\n          <tr><th>Latest Score</th><td>{{latestAssessmentScore}}</td></tr>\n          <tr><th>Requested Rewrite Date</th><td contenteditable=\"true\">Add requested date.</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Reason / Notes:</strong></p>\n      <p contenteditable=\"true\">Add the rewrite reason and approval notes here.</p>'),(9,'Lecturer Course Information','Lecturer-facing summary sheet for the allocated course delivery.','Lecturer Course Information','about:blank',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 1, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"templateKey\": \"lecturer-course-information\", \"templateStatus\": \"Active\", \"placeholderKeys\": [\"courseLabel\", \"courseLevel\", \"courseDurationDays\", \"branchName\", \"scheduleStartDate\", \"scheduleEndDate\", \"scheduleStatus\"], \"templateCategory\": \"Lecturer Pack\"}','2026-04-25 14:16:29','2026-04-25 14:16:29','<h2>Lecturer Course Information</h2>\n      <table>\n        <tbody>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Level</th><td>{{courseLevel}}</td></tr>\n          <tr><th>Duration</th><td>{{courseDurationDays}} day(s)</td></tr>\n          <tr><th>Branch</th><td>{{branchName}}</td></tr>\n          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>\n          <tr><th>Schedule Status</th><td>{{scheduleStatus}}</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Lecturer Notes:</strong></p>\n      <p contenteditable=\"true\">Add delivery notes, logistics, or reminders for the lecturer pack.</p>'),(10,'Counselling Register','Editable counselling record for learner support or performance interventions.','Counselling Register','/documents/counselling-register.html',NULL,1,'{\"kind\": \"generated\", \"logoUrl\": \"\", \"version\": 1, \"branchId\": 1, \"courseId\": 3, \"studentId\": 2, \"branchName\": \"ANDTc Vaal\", \"scheduleId\": 1, \"sourceType\": \"student_enrollment\", \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"courseLabel\": \"PT 1&2 - Penetrant Testing Level 1 and 2 Combined\", \"generatedAt\": \"2026-04-25T14:17:34.709Z\", \"studentName\": \"Koos Koek\", \"templateKey\": \"counselling-register\", \"enrollmentId\": 1, \"templateStatus\": \"Active\", \"generatedStatus\": \"Draft\", \"placeholderKeys\": [\"studentName\", \"courseLabel\", \"todayDate\"], \"templateCategory\": \"Course Control\", \"generatedFromTemplateId\": 4, \"generatedFromTemplateKey\": \"counselling-register\", \"generatedFromTemplateTitle\": \"Counselling Register\"}','2026-04-25 14:17:34','2026-04-25 14:17:34','<h2>Counselling Register</h2>\n      <p>Learner: <strong>Koos Koek</strong></p>\n      <p>Course: <strong>PT 1&2 - Penetrant Testing Level 1 and 2 Combined</strong></p>\n      <table>\n        <tbody>\n          <tr><th>Date</th><td>25 Apr 2026</td></tr>\n          <tr><th>Reason for Counselling</th><td contenteditable=\"true\">Add counselling reason.</td></tr>\n          <tr><th>Action Agreed</th><td contenteditable=\"true\">Add agreed action.</td></tr>\n          <tr><th>Follow-up Date</th><td contenteditable=\"true\">Add follow-up date.</td></tr>\n        </tbody>\n      </table>'),(11,'End of Course Result Notice','Learner result notice using the latest recorded assessment result.','End of Course Result Notice','/documents/end-of-course-result-notice.html',NULL,1,'{\"kind\": \"generated\", \"logoUrl\": \"\", \"version\": 1, \"branchId\": 1, \"courseId\": 3, \"studentId\": 2, \"branchName\": \"ANDTc Vaal\", \"scheduleId\": 3, \"sourceType\": \"student_enrollment\", \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"courseLabel\": \"PT 1&2 - Penetrant Testing Level 1 and 2 Combined\", \"generatedAt\": \"2026-04-25T16:56:09.066Z\", \"studentName\": \"Koos Koek\", \"templateKey\": \"end-of-course-result-notice\", \"enrollmentId\": 3, \"templateStatus\": \"Active\", \"generatedStatus\": \"Draft\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"latestAssessmentDate\", \"latestAssessmentType\", \"latestAssessmentResult\", \"latestAssessmentScore\"], \"templateCategory\": \"Results & Certificates\", \"generatedFromTemplateId\": 7, \"generatedFromTemplateKey\": \"end-of-course-result-notice\", \"generatedFromTemplateTitle\": \"End of Course Result Notice\"}','2026-04-25 16:56:09','2026-04-25 16:56:09','<h2>End of Course Exam Result Notice</h2>\n      <table>\n        <tbody>\n          <tr><th>Student</th><td>Koos Koek</td></tr>\n          <tr><th>Student Number</th><td></td></tr>\n          <tr><th>Course</th><td>PT 1&2 - Penetrant Testing Level 1 and 2 Combined</td></tr>\n          <tr><th>Exam Date</th><td>06 Apr 2026</td></tr>\n          <tr><th>Assessment Type</th><td>Practical</td></tr>\n          <tr><th>Result</th><td>Pass</td></tr>\n          <tr><th>Score</th><td>88.00/100.00</td></tr>\n        </tbody>\n      </table>\n      <p><strong>Remarks:</strong></p>\n      <p contenteditable=\"true\">Add remarks, rewrite conditions, or special instructions here.</p>'),(12,'Counselling Register','Editable counselling record for learner support or performance interventions.','Counselling Register','/documents/counselling-register.html',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 2, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"issueNumber\": \"02\", \"templateKey\": \"counselling-register\", \"documentCode\": \"COUNSELLING-REGISTER\", \"effectiveDate\": \"2026-04-26\", \"revisionReason\": null, \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"courseLabel\", \"todayDate\"], \"templateCategory\": \"Course Control\", \"revisedFromTemplateId\": 4, \"rootTemplateDocumentId\": 4}','2026-04-26 19:57:23','2026-04-26 19:57:23','<h2>Counselling Register</h2>\n      <p>Learner: <strong>{{studentName}}</strong></p>\n      <p>Course: <strong>{{courseLabel}}</strong></p>\n      <table>\n        <tbody>\n          <tr><th>Date</th><td>{{todayDate}}</td></tr>\n          <tr><th>Reason for Counselling</th><td contenteditable=\"true\">Add counselling reason.</td></tr>\n          <tr><th>Action Agreed</th><td contenteditable=\"true\">Add agreed action.</td></tr>\n          <tr><th>Follow-up Date</th><td contenteditable=\"true\">Add follow-up date.</td></tr>\n        </tbody>\n      </table>'),(13,'Certificate of Attendance','Attendance confirmation document driven from the enrolment and course schedule.','Certificate of Attendance','/documents/certificate-of-attendance.html',NULL,NULL,'{\"kind\": \"template\", \"logoUrl\": \"\", \"version\": 2, \"accentColor\": \"#0f766e\", \"companyName\": \"ANDTc CRM\", \"issueNumber\": \"02\", \"templateKey\": \"certificate-of-attendance\", \"documentCode\": \"CERTIFICATE-OF-ATTENDANCE\", \"effectiveDate\": \"2026-04-26\", \"revisionReason\": null, \"templateStatus\": \"Active\", \"placeholderKeys\": [\"studentName\", \"studentNumber\", \"courseLabel\", \"scheduleStartDate\", \"scheduleEndDate\", \"branchName\", \"certificateNumber\", \"certificateIssuedDate\", \"todayDate\"], \"templateCategory\": \"Results & Certificates\", \"revisedFromTemplateId\": 6, \"rootTemplateDocumentId\": 6}','2026-04-26 19:57:34','2026-04-26 19:57:34','<h2>Certificate of Attendance</h2>\n      <p>This certifies that <strong>{{studentName}}</strong> attended the training course listed below.</p>\n      <table>\n        <tbody>\n          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>\n          <tr><th>Course</th><td>{{courseLabel}}</td></tr>\n          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>\n          <tr><th>Branch</th><td>{{branchName}}</td></tr>\n          <tr><th>Certificate Number</th><td>{{certificateNumber}}</td></tr>\n          <tr><th>Issued Date</th><td>{{certificateIssuedDate}}</td></tr>\n        </tbody>\n      </table>\n      <p>Generated on {{todayDate}}.</p>');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollments`
--

DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `studentId` int NOT NULL,
  `courseScheduleId` int NOT NULL,
  `enrollmentDate` timestamp NOT NULL DEFAULT (now()),
  `status` enum('Active','Completed','Withdrawn','Suspended') NOT NULL DEFAULT 'Active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollments`
--

LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
INSERT INTO `enrollments` VALUES (1,2,1,'2026-04-23 12:52:33','Active','2026-04-23 12:52:33','2026-04-23 12:52:33'),(2,3,2,'2026-04-23 13:11:38','Active','2026-04-23 13:11:38','2026-04-23 13:11:38'),(3,2,3,'2026-04-25 16:51:48','Completed','2026-04-25 16:51:48','2026-04-25 16:51:48');
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `serialNumber` varchar(100) DEFAULT NULL,
  `make` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `description` text,
  `domain` varchar(100) DEFAULT NULL,
  `calibrationType` varchar(100) DEFAULT NULL,
  `intervalMonths` int DEFAULT NULL,
  `lastServiceDate` date DEFAULT NULL,
  `nextDueDate` date DEFAULT NULL,
  `status` enum('Active','Inactive','Maintenance','Retired') NOT NULL DEFAULT 'Active',
  `branchId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `escalationLevel` int NOT NULL DEFAULT '0',
  `lastEscalationDate` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment`
--

LOCK TABLES `equipment` WRITE;
/*!40000 ALTER TABLE `equipment` DISABLE KEYS */;
INSERT INTO `equipment` VALUES (1,'Photo meter','123',NULL,'P1',NULL,NULL,'Internal',NULL,'2025-01-01','2026-01-01','Active',1,'2026-04-22 09:11:39','2026-04-24 20:09:19',2,'2026-04-24 18:09:20'),(2,'Photo meter','PM02',NULL,'P1',NULL,NULL,'Internal',NULL,'2025-05-01','2026-05-01','Active',1,'2026-04-22 09:12:29','2026-04-22 09:12:29',0,NULL),(3,'Photo meter1','PM1111','Su','P1',NULL,NULL,'Internal',NULL,'2025-09-30','2026-10-30','Active',1,'2026-04-22 11:11:21','2026-04-22 11:11:21',0,NULL);
/*!40000 ALTER TABLE `equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipmentdocuments`
--

DROP TABLE IF EXISTS `equipmentdocuments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipmentdocuments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipmentId` int NOT NULL,
  `label` varchar(255) NOT NULL,
  `documentType` enum('Manual','Certificate','Specification','Maintenance Log','Other') NOT NULL DEFAULT 'Other',
  `url` text NOT NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipmentdocuments`
--

LOCK TABLES `equipmentdocuments` WRITE;
/*!40000 ALTER TABLE `equipmentdocuments` DISABLE KEYS */;
INSERT INTO `equipmentdocuments` VALUES (1,1,'Calibration Certificate','Certificate','https://africanndtc.sharepoint.com/Shared%20Documents/Forms/AllItems.aspx?id=%2FShared%20Documents%2FANDTC%20Vaal%2FFAMILY%5FROOM&viewid=79273716%2Dee78%2D4270%2Db3cd%2Dd2cddbb49b7a','2026-04-22 10:59:37','2026-04-22 10:59:37','2026-04-22 10:59:37');
/*!40000 ALTER TABLE `equipmentdocuments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipmentloans`
--

DROP TABLE IF EXISTS `equipmentloans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipmentloans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipmentId` int NOT NULL,
  `fromBranchId` int NOT NULL,
  `toBranchId` int NOT NULL,
  `loanDate` date NOT NULL,
  `expectedReturnDate` date DEFAULT NULL,
  `returnedAt` datetime DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipmentloans`
--

LOCK TABLES `equipmentloans` WRITE;
/*!40000 ALTER TABLE `equipmentloans` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipmentloans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `externalproviders`
--

DROP TABLE IF EXISTS `externalproviders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `externalproviders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referenceNumber` varchar(60) NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `providerType` enum('Lecturer','Assessor','Calibration','Consumables','Venue','Equipment','Level III Consultant','Document / Printing','Other') NOT NULL DEFAULT 'Other',
  `status` enum('Approved','Conditional','Under Review','Suspended','Inactive') NOT NULL DEFAULT 'Approved',
  `rating` enum('Preferred','Acceptable','Probationary') NOT NULL DEFAULT 'Acceptable',
  `branchId` int DEFAULT NULL,
  `primaryContact` varchar(255) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `serviceScope` text NOT NULL,
  `approvalDate` date DEFAULT NULL,
  `lastEvaluationDate` date DEFAULT NULL,
  `nextEvaluationDate` date DEFAULT NULL,
  `notes` text,
  `correctiveActionNotes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceNumber` (`referenceNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `externalproviders`
--

LOCK TABLES `externalproviders` WRITE;
/*!40000 ALTER TABLE `externalproviders` DISABLE KEYS */;
/*!40000 ALTER TABLE `externalproviders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `importlogs`
--

DROP TABLE IF EXISTS `importlogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `importlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entityType` varchar(100) NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `totalRecords` int NOT NULL,
  `successfulRecords` int NOT NULL,
  `failedRecords` int NOT NULL,
  `columnMapping` json NOT NULL,
  `status` enum('Pending','Processing','Completed','Failed') NOT NULL DEFAULT 'Pending',
  `errorLog` text,
  `uploadedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `importlogs`
--

LOCK TABLES `importlogs` WRITE;
/*!40000 ALTER TABLE `importlogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `importlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpianswers`
--

DROP TABLE IF EXISTS `kpianswers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpianswers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpiRecordId` int NOT NULL,
  `kpiQuestionId` int NOT NULL,
  `answerText` text,
  `answerValue` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpianswers`
--

LOCK TABLES `kpianswers` WRITE;
/*!40000 ALTER TABLE `kpianswers` DISABLE KEYS */;
INSERT INTO `kpianswers` VALUES (1,1,1,'45','45','2026-04-23 15:25:44','2026-04-23 15:25:44');
/*!40000 ALTER TABLE `kpianswers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpiquestions`
--

DROP TABLE IF EXISTS `kpiquestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpiquestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpiTemplateId` int NOT NULL,
  `questionText` text NOT NULL,
  `questionType` enum('Text','MultipleChoice','Rating','YesNo') NOT NULL DEFAULT 'Text',
  `options` json DEFAULT NULL,
  `isRequired` tinyint(1) NOT NULL DEFAULT '1',
  `displayOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpiquestions`
--

LOCK TABLES `kpiquestions` WRITE;
/*!40000 ALTER TABLE `kpiquestions` DISABLE KEYS */;
INSERT INTO `kpiquestions` VALUES (1,1,'Hoe oud is jy','MultipleChoice',NULL,1,3,'2026-04-23 15:25:00','2026-04-23 15:25:00'),(2,2,'What','Rating','{\"options\": []}',1,3,'2026-04-24 13:04:27','2026-04-24 13:04:27'),(3,2,'kugfiyf','Text','{\"options\": []}',1,2,'2026-04-24 13:04:41','2026-04-24 13:04:41');
/*!40000 ALTER TABLE `kpiquestions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpirecords`
--

DROP TABLE IF EXISTS `kpirecords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpirecords` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpiTemplateId` int NOT NULL,
  `lecturerId` int DEFAULT NULL,
  `courseScheduleId` int DEFAULT NULL,
  `evaluationDate` date NOT NULL,
  `status` enum('Draft','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Draft',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpirecords`
--

LOCK TABLES `kpirecords` WRITE;
/*!40000 ALTER TABLE `kpirecords` DISABLE KEYS */;
INSERT INTO `kpirecords` VALUES (1,1,1,1,'2026-04-23','Submitted',NULL,'2026-04-23 15:25:28','2026-04-23 15:25:44');
/*!40000 ALTER TABLE `kpirecords` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpitemplates`
--

DROP TABLE IF EXISTS `kpitemplates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpitemplates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `branchId` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpitemplates`
--

LOCK TABLES `kpitemplates` WRITE;
/*!40000 ALTER TABLE `kpitemplates` DISABLE KEYS */;
INSERT INTO `kpitemplates` VALUES (1,'Test',NULL,NULL,1,'2026-04-22 08:55:49','2026-04-22 08:55:49'),(2,'Newww',NULL,1,1,'2026-04-24 13:03:57','2026-04-24 13:03:57');
/*!40000 ALTER TABLE `kpitemplates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leadactivities`
--

DROP TABLE IF EXISTS `leadactivities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leadactivities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leadId` int NOT NULL,
  `userId` int DEFAULT NULL,
  `activityType` varchar(50) NOT NULL DEFAULT 'Note',
  `subject` varchar(255) DEFAULT NULL,
  `notes` text,
  `dueDate` datetime DEFAULT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT '0',
  `completedAt` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadActivities_lead_idx` (`leadId`),
  KEY `leadActivities_due_idx` (`dueDate`),
  KEY `leadActivities_completed_idx` (`completed`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leadactivities`
--

LOCK TABLES `leadactivities` WRITE;
/*!40000 ALTER TABLE `leadactivities` DISABLE KEYS */;
INSERT INTO `leadactivities` VALUES (2,1,1,'Call','Follow up',NULL,'2026-04-23 00:00:00',1,'2026-04-23 11:08:04','2026-04-23 11:07:40','2026-04-23 11:08:04');
/*!40000 ALTER TABLE `leadactivities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'New',
  `source` varchar(120) DEFAULT NULL,
  `notes` text,
  `first_name` varchar(120) NOT NULL,
  `last_name` varchar(120) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `preferred_contact_method` varchar(30) DEFAULT NULL,
  `method_interested` varchar(120) DEFAULT NULL,
  `interest_type` varchar(30) DEFAULT NULL,
  `is_current_pcn_holder` tinyint(1) NOT NULL DEFAULT '0',
  `bindt_product_completed` tinyint(1) NOT NULL DEFAULT '0',
  `follow_up_date` datetime DEFAULT NULL,
  `auto_follow_up` tinyint(1) NOT NULL DEFAULT '0',
  `status_flag` varchar(20) NOT NULL DEFAULT 'Green',
  `is_blacklisted` tinyint(1) NOT NULL DEFAULT '0',
  `blacklist_reason` text,
  `duplicate_warning` tinyint(1) NOT NULL DEFAULT '0',
  `duplicate_notes` text,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `interested_course_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `contact_id` int DEFAULT NULL,
  `pcn_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leads_company_id_idx` (`company_id`),
  KEY `leads_contact_id_idx` (`contact_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (1,'piet@piet.com',NULL,'Converted',NULL,NULL,'Piet','Pompies',NULL,'123',NULL,'Email',NULL,NULL,0,0,NULL,0,'Green',0,NULL,0,NULL,NULL,'2026-04-20 10:27:30','2026-04-21 06:39:28',NULL,NULL,NULL,NULL),(2,'koos@koos.com',NULL,'Converted',NULL,NULL,'Koos','Roos','Company a','12355',NULL,'WhatsApp','Penetrant Testing Level 1 and 2 Combined',NULL,0,0,NULL,0,'Green',0,NULL,0,NULL,NULL,'2026-04-20 10:36:36','2026-04-23 15:18:13',3,2,NULL,NULL),(3,'123@companya.com','0001234567','New',NULL,NULL,'Mr','a','Company a','1234987',NULL,NULL,NULL,NULL,0,0,'2026-04-27 00:00:00',1,'Green',0,NULL,0,NULL,NULL,'2026-04-20 12:15:39','2026-04-23 12:33:35',NULL,2,NULL,NULL),(4,'koos@koos.com',NULL,'New',NULL,NULL,'Koos','Kombuis',NULL,'12345',NULL,NULL,NULL,NULL,0,0,NULL,0,'Green',0,NULL,1,'Possible duplicate based on name/email/phone (ID 2)',NULL,'2026-04-20 13:57:18','2026-04-20 13:57:18',NULL,NULL,NULL,NULL),(5,'pietpyp@pit.com',NULL,'New',NULL,NULL,'Piet','Pyp',NULL,'123456',NULL,'Email','Penetrant Testing Level 1 and 2 Combined','PCN After Course',0,0,'2026-04-21 00:00:00',1,'Green',0,NULL,0,NULL,NULL,'2026-04-21 03:40:04','2026-04-21 03:40:04',3,NULL,NULL,NULL),(6,'pogenpoel@mail.com',NULL,'New',NULL,NULL,'Piet','Pogenpoel',NULL,'1234567',NULL,'WhatsApp','Penetrant Testing Level 2','PCN After Course',0,1,'2026-04-21 00:00:00',1,'Green',0,NULL,0,NULL,NULL,'2026-04-21 04:45:29','2026-04-21 04:45:29',2,NULL,NULL,NULL);
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lecturers`
--

DROP TABLE IF EXISTS `lecturers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lecturers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `externalLinks` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lecturers`
--

LOCK TABLES `lecturers` WRITE;
/*!40000 ALTER TABLE `lecturers` DISABLE KEYS */;
INSERT INTO `lecturers` VALUES (1,'Hannes','Barnard','hannes.barnard@andtc.com',NULL,'Ultrasonic Testing, Wall Tickness Testing, Radiographic Testing, Penetrant Testing, Magnetic Particle Testing, Visual Testing',1,1,NULL,'2026-04-21 03:50:35','2026-04-23 15:26:17'),(2,'Phil','Skelton','phil@andtc.com',NULL,'Radiographic Testing',1,1,NULL,'2026-04-22 04:58:19','2026-04-22 12:58:31'),(3,'Pieter','Van Der Westhuizen','pieter@andtc.com','+27782815237','Ultrasonic Testing, Wall Tickness Testing, Penetrant Testing, Magnetic Particle Testing',1,1,NULL,'2026-04-28 09:55:19','2026-04-28 09:55:19');
/*!40000 ALTER TABLE `lecturers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiiactivities`
--

DROP TABLE IF EXISTS `leveliiiactivities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiiactivities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
  `activityType` enum('Visit','Call','Email','Assessment','Procedure Review','General') NOT NULL DEFAULT 'General',
  `subject` varchar(255) NOT NULL,
  `activityDate` date NOT NULL,
  `nextActionDate` date DEFAULT NULL,
  `status` enum('Planned','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIActivities_client_idx` (`clientId`),
  KEY `levelIIIActivities_date_idx` (`activityDate`),
  KEY `levelIIIActivities_nextAction_idx` (`nextActionDate`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiiactivities`
--

LOCK TABLES `leveliiiactivities` WRITE;
/*!40000 ALTER TABLE `leveliiiactivities` DISABLE KEYS */;
INSERT INTO `leveliiiactivities` VALUES (1,2,'Visit','General visit','2026-04-16','2026-05-18','Completed',NULL,'2026-04-24 07:34:20','2026-04-24 07:34:20');
/*!40000 ALTER TABLE `leveliiiactivities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiiassessments`
--

DROP TABLE IF EXISTS `leveliiiassessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiiassessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technicianId` int NOT NULL,
  `assessmentDate` date NOT NULL,
  `method` varchar(255) NOT NULL,
  `level` varchar(100) NOT NULL,
  `assessor` varchar(255) NOT NULL,
  `result` enum('Pass','Fail','Observation','Pending Review') NOT NULL DEFAULT 'Pending Review',
  `nextReviewDate` date DEFAULT NULL,
  `evidenceUrl` text,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIAssessments_technician_idx` (`technicianId`),
  KEY `levelIIIAssessments_date_idx` (`assessmentDate`),
  KEY `levelIIIAssessments_review_idx` (`nextReviewDate`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiiassessments`
--

LOCK TABLES `leveliiiassessments` WRITE;
/*!40000 ALTER TABLE `leveliiiassessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `leveliiiassessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiiclients`
--

DROP TABLE IF EXISTS `leveliiiclients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiiclients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `primaryContact` varchar(255) NOT NULL,
  `secondaryContact` varchar(255) DEFAULT NULL,
  `email` varchar(320) NOT NULL,
  `secondaryEmail` varchar(320) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `secondaryPhone` varchar(50) DEFAULT NULL,
  `physicalAddress` text NOT NULL,
  `visitCadence` enum('Weekly','Monthly','Six Monthly') NOT NULL DEFAULT 'Monthly',
  `lastVisit` date DEFAULT NULL,
  `nextVisit` date DEFAULT NULL,
  `procedureUpdatedAt` date DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIClients_company_idx` (`companyName`),
  KEY `levelIIIClients_nextVisit_idx` (`nextVisit`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiiclients`
--

LOCK TABLES `leveliiiclients` WRITE;
/*!40000 ALTER TABLE `leveliiiclients` DISABLE KEYS */;
INSERT INTO `leveliiiclients` VALUES (2,'Abc NDT','Mr bb',NULL,'bb@abcndt.com',NULL,'0001112222',NULL,'1222 b street\nB ville\n1855','Monthly','2026-04-16','2026-05-18','2026-11-19',NULL,'2026-04-24 07:09:41','2026-04-24 07:34:20');
/*!40000 ALTER TABLE `leveliiiclients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiiequipment`
--

DROP TABLE IF EXISTS `leveliiiequipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiiequipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `serialNumber` varchar(100) NOT NULL,
  `status` enum('Available','In Service','Calibration Due','Out of Service') NOT NULL DEFAULT 'Available',
  `sharedWithMainEquipment` tinyint(1) NOT NULL DEFAULT '0',
  `owner` varchar(255) NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `calibrationType` varchar(100) DEFAULT NULL,
  `lastServiceDate` date DEFAULT NULL,
  `nextDueDate` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `levelIIIEquipment_serial_idx` (`serialNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiiequipment`
--

LOCK TABLES `leveliiiequipment` WRITE;
/*!40000 ALTER TABLE `leveliiiequipment` DISABLE KEYS */;
INSERT INTO `leveliiiequipment` VALUES (1,'Photo Meter','PM002','Available',0,'Level III Services',NULL,'2026-04-24 06:35:05','2026-04-24 07:12:24','Internal','2026-04-03','2027-04-02');
/*!40000 ALTER TABLE `leveliiiequipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiispecimens`
--

DROP TABLE IF EXISTS `leveliiispecimens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiispecimens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `specimenNumber` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `specimenType` varchar(255) NOT NULL,
  `status` enum('Available','In Use','Shared','Retired') NOT NULL DEFAULT 'Available',
  `sharedWithMainSpecimens` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `masteringStatus` enum('Mastered','Re-master Required','Pending') NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `levelIIISpecimens_number_idx` (`specimenNumber`),
  KEY `levelIIISpecimens_type_idx` (`specimenType`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiispecimens`
--

LOCK TABLES `leveliiispecimens` WRITE;
/*!40000 ALTER TABLE `leveliiispecimens` DISABLE KEYS */;
INSERT INTO `leveliiispecimens` VALUES (1,'C1','Welded Plate','T-Piece','Available',0,NULL,'2026-04-24 06:36:28','2026-04-24 07:12:50','Mastered');
/*!40000 ALTER TABLE `leveliiispecimens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leveliiitechnicians`
--

DROP TABLE IF EXISTS `leveliiitechnicians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leveliiitechnicians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `method` varchar(255) NOT NULL,
  `level` varchar(100) NOT NULL,
  `certificateNumber` varchar(120) DEFAULT NULL,
  `procedureStatus` varchar(255) DEFAULT NULL,
  `pcnRenewalDate` date DEFAULT NULL,
  `eyeTestValidUntil` date DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `methods` json DEFAULT NULL,
  `hasPcnQualification` tinyint(1) NOT NULL DEFAULT '0',
  `internalAssessmentDate` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `levelIIITechnicians_client_idx` (`clientId`),
  KEY `levelIIITechnicians_name_idx` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leveliiitechnicians`
--

LOCK TABLES `leveliiitechnicians` WRITE;
/*!40000 ALTER TABLE `leveliiitechnicians` DISABLE KEYS */;
INSERT INTO `leveliiitechnicians` VALUES (2,2,'Tech 1','tech1@abcndt.com',NULL,'Ultrasonic Testing, Magnetic Particle Testing, Penetrant Testing','Level 2',NULL,'In order','2026-07-03','2026-07-17',NULL,'2026-04-24 07:11:06','2026-04-24 07:11:06','[\"Ultrasonic Testing\", \"Magnetic Particle Testing\", \"Penetrant Testing\"]',1,NULL);
/*!40000 ALTER TABLE `leveliiitechnicians` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `managementreviews`
--

DROP TABLE IF EXISTS `managementreviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `managementreviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referenceNumber` varchar(60) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('Planned','Held','Closed','Cancelled') NOT NULL DEFAULT 'Planned',
  `branchId` int DEFAULT NULL,
  `meetingDate` date NOT NULL,
  `nextReviewDate` date DEFAULT NULL,
  `chairperson` varchar(255) DEFAULT NULL,
  `attendees` text,
  `agenda` text,
  `inputsSummary` text,
  `decisionsSummary` text,
  `actionSummary` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceNumber` (`referenceNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `managementreviews`
--

LOCK TABLES `managementreviews` WRITE;
/*!40000 ALTER TABLE `managementreviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `managementreviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `methods`
--

DROP TABLE IF EXISTS `methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `color` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `methods`
--

LOCK TABLES `methods` WRITE;
/*!40000 ALTER TABLE `methods` DISABLE KEYS */;
INSERT INTO `methods` VALUES (1,'Ultrasonic Testing','Using ultrasonic flaw detection equipment.','2026-04-22 12:52:42','2026-04-28 19:13:23','#16a34a'),(2,'Penetrant Testing',NULL,'2026-04-22 12:53:38','2026-04-28 19:13:23','#dc2626'),(3,'Wall Tickness Testing',NULL,'2026-04-22 12:53:50','2026-04-28 19:13:23','#0f766e'),(4,'Magnetic Particle Testing',NULL,'2026-04-22 12:54:08','2026-04-28 19:13:23','#2563eb'),(5,'Radiographic Testing',NULL,'2026-04-22 12:54:44','2026-04-28 19:13:23','#facc15'),(6,'Visual Testing',NULL,'2026-04-22 12:55:41','2026-04-28 19:13:23','#6b7280');
/*!40000 ALTER TABLE `methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module_access`
--

DROP TABLE IF EXISTS `module_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `module_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `module` varchar(100) NOT NULL,
  `canView` tinyint(1) NOT NULL DEFAULT '0',
  `canCreate` tinyint(1) NOT NULL DEFAULT '0',
  `canEdit` tinyint(1) NOT NULL DEFAULT '0',
  `canDelete` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module_access`
--

LOCK TABLES `module_access` WRITE;
/*!40000 ALTER TABLE `module_access` DISABLE KEYS */;
INSERT INTO `module_access` VALUES (1,1,'students',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(2,1,'leads',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(3,1,'courses',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(4,1,'schedules',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(5,1,'enrollments',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(6,1,'attendance',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(7,1,'equipment',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:41'),(8,1,'specimens',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(9,1,'kpi',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(10,1,'lecturers',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(11,1,'training',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(12,1,'planner',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(13,1,'reports',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(14,1,'documents',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(15,1,'branches',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(16,1,'admin',1,1,1,1,'2026-04-22 10:50:08','2026-04-23 07:46:42'),(17,2,'students',1,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(18,2,'leads',0,0,0,0,'2026-04-22 12:50:38','2026-04-23 15:27:59'),(19,2,'courses',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(20,2,'schedules',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(21,2,'enrollments',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(22,2,'attendance',0,0,0,0,'2026-04-22 12:50:38','2026-04-23 15:27:59'),(23,2,'equipment',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(24,2,'specimens',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(25,2,'kpi',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(26,2,'lecturers',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(27,2,'training',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(28,2,'planner',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(29,2,'reports',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(30,2,'documents',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(31,2,'branches',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(32,2,'admin',0,0,0,0,'2026-04-22 12:50:38','2026-04-22 12:50:38'),(33,3,'students',1,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(34,3,'leads',1,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(35,3,'courses',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(36,3,'schedules',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(37,3,'enrollments',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(38,3,'attendance',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(39,3,'equipment',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(40,3,'specimens',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(41,3,'kpi',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(42,3,'lecturers',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(43,3,'training',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(44,3,'planner',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(45,3,'reports',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(46,3,'documents',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(47,3,'branches',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(48,3,'admin',0,0,0,0,'2026-04-23 09:12:34','2026-04-23 09:12:34'),(49,2,'companies',0,0,0,0,'2026-04-23 15:27:59','2026-04-23 15:27:59'),(50,2,'assessments',0,0,0,0,'2026-04-23 15:27:59','2026-04-23 15:27:59'),(51,1,'companies',1,1,1,1,'2026-04-28 19:40:52','2026-04-28 19:40:52'),(52,1,'level_ii',1,1,1,1,'2026-04-28 19:40:52','2026-04-28 19:40:52'),(53,1,'level_iii',1,1,1,1,'2026-04-28 19:40:52','2026-04-28 19:40:52'),(54,1,'quality',1,1,1,1,'2026-04-28 19:40:52','2026-04-28 19:40:52');
/*!40000 ALTER TABLE `module_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificationpreferences`
--

DROP TABLE IF EXISTS `notificationpreferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificationpreferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `emailNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `pushNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `soundAlerts` tinyint(1) NOT NULL DEFAULT '1',
  `studentAddedNotif` tinyint(1) NOT NULL DEFAULT '1',
  `leadStatusChangeNotif` tinyint(1) NOT NULL DEFAULT '1',
  `attendanceNotif` tinyint(1) NOT NULL DEFAULT '1',
  `equipmentNotif` tinyint(1) NOT NULL DEFAULT '1',
  `specimenNotif` tinyint(1) NOT NULL DEFAULT '1',
  `kpiNotif` tinyint(1) NOT NULL DEFAULT '1',
  `courseNotif` tinyint(1) NOT NULL DEFAULT '1',
  `enrollmentNotif` tinyint(1) NOT NULL DEFAULT '1',
  `systemAlertNotif` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notificationPreferences_userId_unique` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificationpreferences`
--

LOCK TABLES `notificationpreferences` WRITE;
/*!40000 ALTER TABLE `notificationpreferences` DISABLE KEYS */;
INSERT INTO `notificationpreferences` VALUES (1,1,1,1,1,1,1,1,1,1,1,1,1,1,'2026-04-24 20:09:19','2026-04-24 20:09:19');
/*!40000 ALTER TABLE `notificationpreferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('student_added','lead_status_changed','attendance_marked','equipment_maintenance','specimen_mastered','kpi_completed','course_started','enrollment_confirmed','system_alert') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `entityType` varchar(100) DEFAULT NULL,
  `entityId` int DEFAULT NULL,
  `relatedUserId` int DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `actionUrl` text,
  `metadata` json DEFAULT NULL,
  `priority` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `readAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'equipment_maintenance','URGENT: Equipment 123 Escalated','Equipment \"Photo meter\" (123) is 113 day(s) overdue for calibration.','equipment',1,NULL,0,'/equipment','{\"daysOverdue\": 113, \"serialNumber\": \"123\", \"escalationLevel\": 2}','critical','2026-04-24 20:09:19',NULL),(2,1,'equipment_maintenance','URGENT: Equipment 123 Escalated','Equipment \"Photo meter\" (123) is 113 day(s) overdue for calibration.','equipment',1,NULL,0,'/equipment','{\"daysOverdue\": 113, \"serialNumber\": \"123\", \"escalationLevel\": 2}','critical','2026-04-24 20:09:19',NULL),(3,1,'equipment_maintenance','URGENT: Equipment 123 Escalated','Equipment \"Photo meter\" (123) is 113 day(s) overdue for calibration.','equipment',1,NULL,0,'/equipment','{\"daysOverdue\": 113, \"serialNumber\": \"123\", \"escalationLevel\": 2}','critical','2026-04-24 20:09:19',NULL),(4,1,'equipment_maintenance','URGENT: Equipment 123 Escalated','Equipment \"Photo meter\" (123) is 113 day(s) overdue for calibration.','equipment',1,NULL,0,'/equipment','{\"daysOverdue\": 113, \"serialNumber\": \"123\", \"escalationLevel\": 2}','critical','2026-04-24 20:09:19',NULL),(5,1,'enrollment_confirmed','Enrolment Confirmed','Koos Koek has been enrolled in Penetrant Testing Level 1 and 2 Combined.','enrollment',NULL,NULL,0,'/enrollments',NULL,'normal','2026-04-25 16:51:48',NULL);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificationsubscriptions`
--

DROP TABLE IF EXISTS `notificationsubscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificationsubscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `deviceId` varchar(255) NOT NULL,
  `endpoint` text,
  `auth` text,
  `p256dh` text,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastActive` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificationsubscriptions`
--

LOCK TABLES `notificationsubscriptions` WRITE;
/*!40000 ALTER TABLE `notificationsubscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificationsubscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plannerentries`
--

DROP TABLE IF EXISTS `plannerentries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plannerentries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `entryDate` date NOT NULL,
  `notes` text,
  `reminderAt` datetime DEFAULT NULL,
  `isComplete` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `recurrence` varchar(30) DEFAULT NULL,
  `recurrenceUntil` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plannerentries`
--

LOCK TABLES `plannerentries` WRITE;
/*!40000 ALTER TABLE `plannerentries` DISABLE KEYS */;
INSERT INTO `plannerentries` VALUES (2,1,'Meeting','2026-04-27',NULL,'2026-04-24 08:31:00',0,'2026-04-24 08:32:12','2026-04-24 08:32:12','Weekly','2027-12-24'),(3,1,'Test','2026-04-27',NULL,'2026-04-24 08:35:00',1,'2026-04-24 08:36:01','2026-04-24 08:36:21',NULL,NULL);
/*!40000 ALTER TABLE `plannerentries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qualityactions`
--

DROP TABLE IF EXISTS `qualityactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qualityactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referenceNumber` varchar(60) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` enum('Nonconformance','Corrective Action','Observation','Improvement') NOT NULL DEFAULT 'Nonconformance',
  `source` enum('Customer Complaint','Internal Audit','Supplier','Training','Examination','Level III','Equipment','Document Control','Management Review','Other') NOT NULL DEFAULT 'Other',
  `severity` enum('Minor','Major','Critical') NOT NULL DEFAULT 'Minor',
  `status` enum('Open','In Progress','Awaiting Verification','Closed') NOT NULL DEFAULT 'Open',
  `branchId` int DEFAULT NULL,
  `ownerName` varchar(255) DEFAULT NULL,
  `reportedByUserId` int DEFAULT NULL,
  `reportedDate` date NOT NULL,
  `dueDate` date DEFAULT NULL,
  `closedAt` datetime DEFAULT NULL,
  `description` text NOT NULL,
  `immediateCorrection` text,
  `rootCause` text,
  `correctiveAction` text,
  `verificationNotes` text,
  `verifiedByName` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceNumber` (`referenceNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qualityactions`
--

LOCK TABLES `qualityactions` WRITE;
/*!40000 ALTER TABLE `qualityactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `qualityactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qualityaudits`
--

DROP TABLE IF EXISTS `qualityaudits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qualityaudits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referenceNumber` varchar(60) NOT NULL,
  `title` varchar(255) NOT NULL,
  `auditType` enum('Internal Audit','Process Audit','Training Audit','Equipment Audit','Document Audit','Branch Audit') NOT NULL DEFAULT 'Internal Audit',
  `status` enum('Planned','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `branchId` int DEFAULT NULL,
  `leadAuditor` varchar(255) DEFAULT NULL,
  `auditee` varchar(255) DEFAULT NULL,
  `plannedDate` date NOT NULL,
  `completedDate` date DEFAULT NULL,
  `nextAuditDate` date DEFAULT NULL,
  `scope` text NOT NULL,
  `criteria` text,
  `summary` text,
  `findingsSummary` text,
  `followUpSummary` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceNumber` (`referenceNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qualityaudits`
--

LOCK TABLES `qualityaudits` WRITE;
/*!40000 ALTER TABLE `qualityaudits` DISABLE KEYS */;
/*!40000 ALTER TABLE `qualityaudits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `reportType` varchar(100) NOT NULL,
  `generatedBy` int DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `filters` json DEFAULT NULL,
  `data` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
INSERT INTO `reports` VALUES (1,'Test','Operations Summary',1,1,'{\"branchId\": 1}','{\"notes\": [\"Scope: ANDTc Vaal\", \"Generated: 2026/04/24, 10:58:51\"], \"scope\": {\"branchId\": 1, \"branchName\": \"ANDTc Vaal\"}, \"sections\": [{\"rows\": [{\"label\": \"New\", \"value\": 0}, {\"label\": \"Contacted\", \"value\": 0}, {\"label\": \"Qualified\", \"value\": 0}, {\"label\": \"Converted\", \"value\": 0}, {\"label\": \"Closed Lost\", \"value\": 0}], \"title\": \"CRM Pipeline\"}, {\"rows\": [{\"label\": \"Course Schedules\", \"value\": 1}, {\"label\": \"In Progress Schedules\", \"value\": 0}, {\"label\": \"Active Enrolments\", \"value\": 1}, {\"label\": \"Lecturers\", \"value\": 2}], \"title\": \"Training Delivery\"}, {\"rows\": [{\"label\": \"Equipment\", \"value\": 3}, {\"label\": \"Calibration Overdue\", \"value\": 1}, {\"label\": \"Specimens\", \"value\": 1}, {\"label\": \"Documents\", \"value\": 0}], \"title\": \"Assets & Content\"}, {\"rows\": [{\"label\": \"Companies\", \"value\": 2}, {\"label\": \"Contacts\", \"value\": 2}, {\"label\": \"Open Leads\", \"value\": 0}, {\"label\": \"Overdue Follow-ups\", \"value\": 0}], \"title\": \"CRM Directory\"}], \"highlights\": [{\"label\": \"Students\", \"value\": 0}, {\"label\": \"Leads\", \"value\": 0}, {\"label\": \"Courses\", \"value\": 0}, {\"label\": \"Enrolments\", \"value\": 1}, {\"label\": \"Equipment\", \"value\": 3}, {\"label\": \"Documents\", \"value\": 0}], \"generatedAt\": \"2026-04-24T08:58:51.443Z\"}','2026-04-24 08:58:51','2026-04-24 08:58:51'),(2,'Test1','Training Summary',1,NULL,'{\"branchId\": null}','{\"notes\": [\"Scope: All Branches\", \"Generated: 2026/04/24, 10:59:06\"], \"scope\": {\"branchId\": null, \"branchName\": \"All Branches\"}, \"sections\": [{\"rows\": [{\"label\": \"Scheduled\", \"value\": 2}, {\"label\": \"In Progress\", \"value\": 0}, {\"label\": \"Completed\", \"value\": 0}, {\"label\": \"Cancelled\", \"value\": 0}], \"title\": \"Schedule Status\"}, {\"rows\": [{\"label\": \"Active\", \"value\": 2}, {\"label\": \"Completed\", \"value\": 0}, {\"label\": \"Withdrawn\", \"value\": 0}, {\"label\": \"Suspended\", \"value\": 0}], \"title\": \"Enrolment Status\"}, {\"rows\": [{\"label\": \"Present\", \"value\": 1}, {\"label\": \"Absent\", \"value\": 0}, {\"label\": \"Late\", \"value\": 0}, {\"label\": \"Excused\", \"value\": 0}], \"title\": \"Attendance Status\"}, {\"rows\": [{\"label\": \"Pass\", \"value\": 0}, {\"label\": \"Fail\", \"value\": 0}, {\"label\": \"Incomplete\", \"value\": 0}], \"title\": \"Assessment Results\"}, {\"rows\": [{\"label\": \"Lecturers\", \"value\": 2}, {\"label\": \"Active Lecturers\", \"value\": 2}], \"title\": \"Training Team\"}], \"highlights\": [{\"label\": \"Courses\", \"value\": 3}, {\"label\": \"Live Schedules\", \"value\": 2}, {\"label\": \"Active Enrolments\", \"value\": 2}, {\"label\": \"Attendance Records\", \"value\": 1}, {\"label\": \"Assessments\", \"value\": 0}], \"generatedAt\": \"2026-04-24T08:59:06.819Z\"}','2026-04-24 08:59:06','2026-04-24 08:59:06'),(3,'Test2','CRM Summary',1,NULL,'{\"branchId\": null}','{\"notes\": [\"Scope: All Branches\", \"Generated: 2026/04/24, 10:59:20\"], \"scope\": {\"branchId\": null, \"branchName\": \"All Branches\"}, \"sections\": [{\"rows\": [{\"label\": \"New\", \"value\": 4}, {\"label\": \"Contacted\", \"value\": 0}, {\"label\": \"Qualified\", \"value\": 0}, {\"label\": \"Converted\", \"value\": 2}, {\"label\": \"Closed Lost\", \"value\": 0}], \"title\": \"Lead Status Pipeline\"}, {\"rows\": [{\"label\": \"Overdue\", \"value\": 2}, {\"label\": \"Due Today\", \"value\": 0}, {\"label\": \"Next 7 Days\", \"value\": 1}, {\"label\": \"No Follow-up Date\", \"value\": 1}], \"title\": \"Follow-up Queue\"}, {\"rows\": [{\"label\": \"Phone\", \"value\": 0}, {\"label\": \"Email\", \"value\": 2}, {\"label\": \"WhatsApp\", \"value\": 2}], \"title\": \"Preferred Contact Method\"}, {\"rows\": [{\"label\": \"Active\", \"value\": 2}, {\"label\": \"Prospect\", \"value\": 0}, {\"label\": \"Inactive\", \"value\": 0}], \"title\": \"Company Status\"}], \"highlights\": [{\"label\": \"Open Leads\", \"value\": 4}, {\"label\": \"Overdue Follow-ups\", \"value\": 2}, {\"label\": \"Due Today\", \"value\": 0}, {\"label\": \"Companies\", \"value\": 2}, {\"label\": \"Contacts\", \"value\": 2}, {\"label\": \"Converted Leads\", \"value\": 2}], \"generatedAt\": \"2026-04-24T08:59:20.770Z\"}','2026-04-24 08:59:20','2026-04-24 08:59:20'),(4,'Test4','Equipment Summary',1,NULL,'{\"branchId\": null}','{\"notes\": [\"Scope: All Branches\", \"Generated: 2026/04/24, 10:59:37\"], \"scope\": {\"branchId\": null, \"branchName\": \"All Branches\"}, \"sections\": [{\"rows\": [{\"label\": \"Active\", \"value\": 3}, {\"label\": \"Inactive\", \"value\": 0}, {\"label\": \"Maintenance\", \"value\": 0}, {\"label\": \"Retired\", \"value\": 0}], \"title\": \"Equipment Status\"}, {\"rows\": [{\"label\": \"Overdue\", \"value\": 1}, {\"label\": \"Due In 30 Days\", \"value\": 1}, {\"label\": \"No Due Date\", \"value\": 0}], \"title\": \"Calibration Queue\"}, {\"rows\": [{\"label\": \"Available\", \"value\": 1}, {\"label\": \"In Use\", \"value\": 0}, {\"label\": \"Loaned Out\", \"value\": 0}, {\"label\": \"Quarantine\", \"value\": 0}, {\"label\": \"Retired\", \"value\": 0}], \"title\": \"Specimen Status\"}, {\"rows\": [{\"label\": \"Mastered\", \"value\": 1}, {\"label\": \"Re-master Required\", \"value\": 0}, {\"label\": \"Pending\", \"value\": 0}], \"title\": \"Specimen Mastering\"}], \"highlights\": [{\"label\": \"Equipment\", \"value\": 3}, {\"label\": \"Calibration Overdue\", \"value\": 1}, {\"label\": \"Due In 30 Days\", \"value\": 1}, {\"label\": \"Specimens\", \"value\": 1}, {\"label\": \"Open Equipment Loans\", \"value\": 0}, {\"label\": \"Open Specimen Loans\", \"value\": 0}], \"generatedAt\": \"2026-04-24T08:59:37.243Z\"}','2026-04-24 08:59:37','2026-04-24 08:59:37'),(5,'Test 5','Level III Summary',1,NULL,'{\"branchId\": null}','{\"notes\": [\"Scope: All Branches\", \"Generated: 2026/04/24, 11:00:00\"], \"scope\": {\"branchId\": null, \"branchName\": \"All Branches\"}, \"sections\": [{\"rows\": [{\"label\": \"Weekly\", \"value\": 0}, {\"label\": \"Monthly\", \"value\": 1}, {\"label\": \"Six Monthly\", \"value\": 0}], \"title\": \"Client Visit Cadence\"}, {\"rows\": [{\"label\": \"Client Visits In 30 Days\", \"value\": 1}, {\"label\": \"Activities Due In 30 Days\", \"value\": 1}, {\"label\": \"Qualification Reviews Due In 60 Days\", \"value\": 0}], \"title\": \"Activity & Review Queue\"}, {\"rows\": [{\"label\": \"PCN Route\", \"value\": 1}, {\"label\": \"Internal Route\", \"value\": 0}, {\"label\": \"Eye Tests Due In 60 Days\", \"value\": 0}], \"title\": \"Qualification Route\"}, {\"rows\": [{\"label\": \"Pass\", \"value\": 0}, {\"label\": \"Fail\", \"value\": 0}, {\"label\": \"Observation\", \"value\": 0}, {\"label\": \"Pending Review\", \"value\": 0}], \"title\": \"Assessment Results\"}, {\"rows\": [{\"label\": \"Level III Equipment\", \"value\": 1}, {\"label\": \"Calibration Due In 30 Days\", \"value\": 0}, {\"label\": \"Level III Specimens\", \"value\": 1}, {\"label\": \"Re-master Required\", \"value\": 0}], \"title\": \"Dedicated Assets\"}], \"highlights\": [{\"label\": \"Clients\", \"value\": 1}, {\"label\": \"Visits In 30 Days\", \"value\": 1}, {\"label\": \"Technicians\", \"value\": 1}, {\"label\": \"Reviews Due In 60 Days\", \"value\": 0}, {\"label\": \"Assessments\", \"value\": 0}, {\"label\": \"Activities Due\", \"value\": 1}], \"generatedAt\": \"2026-04-24T09:00:00.281Z\"}','2026-04-24 09:00:00','2026-04-24 09:00:00');
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sharedplannerevents`
--

DROP TABLE IF EXISTS `sharedplannerevents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sharedplannerevents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `eventType` enum('Meeting','Training','Deadline','Reminder','Visit','General') NOT NULL DEFAULT 'General',
  `branchId` int DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `startAt` datetime NOT NULL,
  `endAt` datetime DEFAULT NULL,
  `isAllDay` tinyint(1) NOT NULL DEFAULT '0',
  `location` varchar(255) DEFAULT NULL,
  `notes` text,
  `recurrence` varchar(30) DEFAULT NULL,
  `recurrenceUntil` date DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sharedplannerevents`
--

LOCK TABLES `sharedplannerevents` WRITE;
/*!40000 ALTER TABLE `sharedplannerevents` DISABLE KEYS */;
/*!40000 ALTER TABLE `sharedplannerevents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specimendocuments`
--

DROP TABLE IF EXISTS `specimendocuments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specimendocuments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `specimenId` int NOT NULL,
  `label` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specimendocuments`
--

LOCK TABLES `specimendocuments` WRITE;
/*!40000 ALTER TABLE `specimendocuments` DISABLE KEYS */;
/*!40000 ALTER TABLE `specimendocuments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specimenloans`
--

DROP TABLE IF EXISTS `specimenloans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specimenloans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `specimenId` int NOT NULL,
  `fromBranchId` int NOT NULL,
  `toBranchId` int NOT NULL,
  `loanDate` date NOT NULL,
  `expectedReturnDate` date DEFAULT NULL,
  `returnedAt` datetime DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specimenloans`
--

LOCK TABLES `specimenloans` WRITE;
/*!40000 ALTER TABLE `specimenloans` DISABLE KEYS */;
/*!40000 ALTER TABLE `specimenloans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specimens`
--

DROP TABLE IF EXISTS `specimens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specimens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `specimenTypeId` int NOT NULL,
  `serialNumber` varchar(100) DEFAULT NULL,
  `description` text,
  `status` enum('Available','In Use','Loaned Out','Quarantine','Retired') NOT NULL DEFAULT 'Available',
  `masteringStatus` enum('Mastered','Re-master Required','Pending') NOT NULL DEFAULT 'Pending',
  `branchId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specimens`
--

LOCK TABLES `specimens` WRITE;
/*!40000 ALTER TABLE `specimens` DISABLE KEYS */;
INSERT INTO `specimens` VALUES (1,'Welded Plate',1,'10010',NULL,'Available','Mastered',1,'2026-04-23 15:23:26','2026-04-23 15:23:26');
/*!40000 ALTER TABLE `specimens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specimentypes`
--

DROP TABLE IF EXISTS `specimentypes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specimentypes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `material` varchar(255) DEFAULT NULL,
  `size` varchar(255) DEFAULT NULL,
  `weight` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `specimenTypes_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specimentypes`
--

LOCK TABLES `specimentypes` WRITE;
/*!40000 ALTER TABLE `specimentypes` DISABLE KEYS */;
INSERT INTO `specimentypes` VALUES (1,'Welded Plate',NULL,'2026-04-22 10:16:03','2026-04-23 08:10:42','Mild Streel','250 x 250 x 5','1.1 kg'),(2,'Welded Half Pipe',NULL,'2026-04-22 10:16:27','2026-04-23 08:11:03','Mild Streel','250 x 250 x 5','1.1 kg'),(3,'T-Piece',NULL,'2026-04-22 10:16:39','2026-04-22 10:16:39',NULL,NULL,NULL),(4,'Y-Piece',NULL,'2026-04-22 10:16:48','2026-04-22 10:16:48',NULL,NULL,NULL),(5,'Pipe - Long Weld',NULL,'2026-04-22 10:17:02','2026-04-22 10:17:02',NULL,NULL,NULL),(6,'Pipe - Circ Weld',NULL,'2026-04-22 10:17:21','2026-04-22 10:17:21',NULL,NULL,NULL),(31,'Half Pipe',NULL,'2026-04-23 07:19:11','2026-04-23 07:19:11','Mild Streel','250 x 250 x 5','1.1 kg');
/*!40000 ALTER TABLE `specimentypes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `idNumber` varchar(50) DEFAULT NULL,
  `passportNumber` varchar(50) DEFAULT NULL,
  `dateOfBirth` date DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `blacklisted` tinyint(1) NOT NULL DEFAULT '0',
  `blacklistReason` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `studentNumber` varchar(50) DEFAULT NULL,
  `interestType` varchar(30) DEFAULT NULL,
  `isCurrentPcnHolder` tinyint(1) NOT NULL DEFAULT '0',
  `bindtProductCompleted` tinyint(1) NOT NULL DEFAULT '0',
  `pcnNumber` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,'Piet','Pompies','piet@piet.com','38','1234456789654',NULL,NULL,NULL,1,0,NULL,'2026-04-21 06:39:28','2026-04-23 12:54:01',NULL,NULL,0,0,NULL),(2,'Koos','Koek','kooskoek@mail.com',NULL,'6809145050082',NULL,NULL,NULL,1,0,NULL,'2026-04-21 06:48:32','2026-04-26 19:55:18',NULL,'PCN After Course',0,1,NULL),(3,'k','k','k@k.com',NULL,'546',NULL,NULL,NULL,1,0,NULL,'2026-04-21 07:02:05','2026-04-21 07:02:05',NULL,NULL,0,0,NULL),(4,'p','p','p@p.com',NULL,'987',NULL,NULL,NULL,1,0,NULL,'2026-04-21 07:26:13','2026-04-21 07:26:13',NULL,NULL,0,0,NULL),(5,'p','k','pk@p.com',NULL,'1234',NULL,NULL,NULL,1,0,NULL,'2026-04-21 07:33:36','2026-04-21 07:33:36',NULL,NULL,0,0,NULL),(6,'kool','kop','kool@k.com',NULL,'123654',NULL,NULL,NULL,1,0,NULL,'2026-04-21 07:34:08','2026-04-21 07:34:08',NULL,NULL,0,0,NULL),(7,'Frik','Du','frik@k.com',NULL,'1234567891012',NULL,NULL,NULL,1,0,NULL,'2026-04-21 08:55:45','2026-04-21 08:55:45','STU-2026-0007',NULL,0,0,NULL),(8,'kaak','Raak','kr@k.com',NULL,'9879879879874',NULL,NULL,NULL,1,0,NULL,'2026-04-21 10:40:17','2026-04-21 10:40:17','STU-2026-0008',NULL,0,0,NULL),(9,'los','my','los@los.com',NULL,'1234569874562',NULL,NULL,NULL,1,0,NULL,'2026-04-21 11:18:20','2026-04-21 11:18:20','STU-2026-0009',NULL,0,0,NULL),(10,'Koos','Roos','koos@koos.com',NULL,'12355',NULL,NULL,NULL,1,0,NULL,'2026-04-23 15:18:13','2026-04-23 15:18:13','STU-2026-0010',NULL,0,0,NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainingofferings`
--

DROP TABLE IF EXISTS `trainingofferings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainingofferings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `courseId` int DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `status` enum('Planned','Active','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `branchId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainingofferings`
--

LOCK TABLES `trainingofferings` WRITE;
/*!40000 ALTER TABLE `trainingofferings` DISABLE KEYS */;
INSERT INTO `trainingofferings` VALUES (1,'PT 01',NULL,2,'2026-04-27','2026-05-05','Planned',1,'2026-04-25 07:41:15','2026-04-25 07:41:15');
/*!40000 ALTER TABLE `trainingofferings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text,
  `email` varchar(320) DEFAULT NULL,
  `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  `authId` varchar(36) DEFAULT NULL,
  `avatarUrl` text,
  `calendarFeedToken` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_authId_unique` (`authId`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_calendarFeedToken_unique` (`calendarFeedToken`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Albert','albert@andtc.com','super_admin','2026-04-20 06:46:40','2026-04-30 10:25:23','2026-04-29 05:02:36','02960a7a-6a24-438f-8f8a-f41bac5a1be6','data:image/webp;base64,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','4e96586e1cdb86097108a6ccb6a9f480472f3c8a4837e05d'),(2,'Mieke','info@andtc.com','user','2026-04-22 09:19:54','2026-04-23 15:28:54','2026-04-23 13:28:54','11dc46a9-aa0d-46f2-bd98-5b05928b117d',NULL,NULL),(3,'Test','albert.vaal@gmail.com','user','2026-04-23 08:54:20','2026-04-23 09:14:48','2026-04-23 07:14:49','ae2ad071-a8fb-4981-9048-1c18b57cab59',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-03 15:26:26
