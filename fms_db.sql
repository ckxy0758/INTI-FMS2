-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 10, 2026 at 09:00 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fms_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `facility_id` int(11) NOT NULL,
  `program` varchar(100) DEFAULT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_hours` decimal(4,2) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `equipment_required` text DEFAULT NULL,
  `booking_status` enum('pending','pending_payment','payment_submitted','approved','reserved','checked_in','key_collected','completed','cancelled','expired','rejected') DEFAULT 'pending',
  `key_status` enum('not_required','pending_collection','collected','returned') DEFAULT 'not_required',
  `key_collected_at` datetime DEFAULT NULL,
  `key_returned_at` datetime DEFAULT NULL,
  `admin_remark` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payment_required` tinyint(1) DEFAULT 0,
  `payment_status` enum('not_required','pending_payment','payment_submitted','verified') DEFAULT 'not_required',
  `payment_amount` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `facility_id`, `program`, `booking_date`, `start_time`, `end_time`, `duration_hours`, `remark`, `equipment_required`, `booking_status`, `key_status`, `key_collected_at`, `key_returned_at`, `admin_remark`, `created_at`, `updated_at`, `payment_required`, `payment_status`, `payment_amount`) VALUES
(301, 2, 5, 'School of Computing (SOC)', '2026-06-22', '09:00:00', '10:00:00', 1.00, 'Individual study session', NULL, 'completed', 'not_required', NULL, NULL, NULL, '2026-06-21 06:20:00', '2026-06-22 02:05:00', 0, 'not_required', 0.00),
(302, 11, 7, 'School of Computing (SOC)', '2026-06-22', '10:00:00', '12:00:00', 2.00, 'AI practical class preparation', NULL, 'completed', 'returned', '2026-06-22 09:50:00', '2026-06-22 12:05:00', NULL, '2026-06-21 07:05:00', '2026-06-22 04:05:00', 0, 'not_required', 0.00),
(303, 2, 2, 'School of Computing (SOC)', '2026-06-23', '15:00:00', '16:00:00', 1.00, 'Recreation booking', NULL, 'completed', 'not_required', NULL, NULL, NULL, '2026-06-22 03:30:00', '2026-06-23 08:05:00', 1, 'verified', 5.00),
(304, 2, 4, 'School of Computing (SOC)', '2026-06-24', '10:00:00', '12:00:00', 2.00, 'Music practice', NULL, 'completed', 'returned', '2026-06-24 09:55:00', '2026-06-24 12:10:00', NULL, '2026-06-23 05:15:00', '2026-06-24 04:10:00', 0, 'not_required', 0.00),
(305, 11, 8, 'School of Computing (SOC)', '2026-06-24', '08:00:00', '09:00:00', 1.00, 'Cloud lab replacement class', 'Smart Pen', 'rejected', 'not_required', NULL, NULL, 'Facility unavailable due to maintenance', '2026-06-23 08:20:00', '2026-06-24 00:20:00', 0, 'not_required', 0.00),
(306, 2, 3, 'School of Computing (SOC)', '2026-06-25', '14:00:00', '15:00:00', 1.00, 'Table tennis practice', NULL, 'cancelled', 'not_required', NULL, NULL, 'Cancelled by user', '2026-06-24 04:30:00', '2026-06-25 01:10:00', 1, 'pending_payment', 5.00),
(307, 2, 5, 'School of Computing (SOC)', '2026-06-26', '11:00:00', '12:00:00', 1.00, 'Quiet study session', NULL, 'expired', 'not_required', NULL, NULL, 'User did not check in within the QR check-in time range', '2026-06-25 02:05:00', '2026-06-26 03:16:00', 0, 'not_required', 0.00),
(308, 11, 9, 'School of Computing (SOC)', '2026-06-27', '09:00:00', '10:00:00', 1.00, 'Tutorial class', 'Smart Pen', 'completed', 'returned', '2026-06-27 08:50:00', '2026-06-27 10:05:00', NULL, '2026-06-26 01:40:00', '2026-06-27 02:05:00', 0, 'not_required', 0.00),
(309, 2, 1, 'School of Computing (SOC)', '2026-06-29', '08:30:00', '10:00:00', 1.50, 'Robotics group discussion', NULL, 'completed', 'returned', '2026-06-29 08:20:00', '2026-06-29 10:05:00', NULL, '2026-06-28 07:25:00', '2026-06-29 02:05:00', 0, 'not_required', 0.00),
(310, 2, 2, 'School of Computing (SOC)', '2026-06-30', '10:00:00', '12:00:00', 2.00, 'Pool practice with classmate', NULL, 'completed', 'not_required', NULL, NULL, NULL, '2026-06-29 04:00:00', '2026-06-30 04:05:00', 1, 'verified', 10.00),
(311, 11, 7, 'School of Computing (SOC)', '2026-07-01', '08:00:00', '10:00:00', 2.00, 'AI lab demonstration', NULL, 'completed', 'returned', '2026-07-01 07:50:00', '2026-07-01 10:05:00', NULL, '2026-06-30 06:15:00', '2026-07-01 02:05:00', 0, 'not_required', 0.00),
(312, 2, 4, 'School of Computing (SOC)', '2026-07-01', '13:00:00', '15:00:00', 2.00, 'Band rehearsal', NULL, 'rejected', 'not_required', NULL, NULL, 'Music Room was reserved for a college event', '2026-06-30 09:10:00', '2026-07-01 00:40:00', 0, 'not_required', 0.00),
(313, 2, 5, 'School of Computing (SOC)', '2026-07-02', '14:00:00', '15:00:00', 1.00, 'Revision session', NULL, 'completed', 'not_required', NULL, NULL, NULL, '2026-07-01 10:20:00', '2026-07-02 07:05:00', 0, 'not_required', 0.00),
(314, 11, 8, 'School of Computing (SOC)', '2026-07-03', '08:00:00', '09:00:00', 1.00, 'Cloud computing lab exercise', 'Smart Pen', 'completed', 'returned', '2026-07-03 07:52:00', '2026-07-03 09:05:00', NULL, '2026-07-02 04:45:00', '2026-07-03 01:05:00', 0, 'not_required', 0.00),
(315, 2, 3, 'School of Computing (SOC)', '2026-07-04', '13:00:00', '14:00:00', 1.00, 'Table tennis practice', NULL, 'completed', 'not_required', NULL, NULL, NULL, '2026-07-03 03:20:00', '2026-07-04 06:05:00', 1, 'verified', 5.00),
(316, 2, 2, 'School of Computing (SOC)', '2026-07-05', '15:00:00', '16:00:00', 1.00, 'Pool table session', NULL, 'cancelled', 'not_required', NULL, NULL, 'Cancelled by user before payment verification', '2026-07-04 05:35:00', '2026-07-05 02:15:00', 1, 'pending_payment', 5.00),
(317, 11, 7, 'School of Computing (SOC)', '2026-07-06', '08:00:00', '10:00:00', 2.00, 'AI workshop preparation', NULL, 'completed', 'returned', '2026-07-06 07:50:00', '2026-07-06 10:10:00', NULL, '2026-07-05 01:30:00', '2026-07-06 02:10:00', 0, 'not_required', 0.00),
(318, 2, 1, 'School of Computing (SOC)', '2026-07-07', '09:00:00', '10:00:00', 1.00, 'STEM discussion', NULL, 'rejected', 'not_required', NULL, NULL, 'Facility not available at the selected time', '2026-07-06 08:40:00', '2026-07-07 00:30:00', 0, 'not_required', 0.00),
(319, 2, 5, 'School of Computing (SOC)', '2026-07-08', '16:00:00', '17:00:00', 1.00, 'Study before viva', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-07-08 01:00:00', '2026-07-08 09:17:18', 0, 'not_required', 0.00),
(320, 11, 9, 'School of Computing (SOC)', '2026-07-08', '13:00:00', '14:00:00', 1.00, 'Revision class', 'Smart Pen', 'completed', 'returned', '2026-07-08 12:50:00', '2026-07-08 14:05:00', NULL, '2026-07-07 07:10:00', '2026-07-08 06:05:00', 0, 'not_required', 0.00),
(321, 2, 5, 'School of Computing (SOC)', '2026-07-09', '13:00:00', '14:00:00', 1.00, 'QR Code live demo booking - Cubicle check-in', NULL, 'expired', 'not_required', NULL, NULL, 'Use this booking for QR check-in during viva 1:00 PM - 2:00 PM', '2026-07-09 04:20:00', '2026-07-09 06:16:28', 0, 'not_required', 0.00),
(322, 2, 4, 'School of Computing (SOC)', '2026-07-09', '13:30:00', '14:30:00', 1.00, 'Backup QR demo booking - Music Room', NULL, 'key_collected', 'collected', NULL, NULL, 'Backup booking for QR/key flow demo if the first booking is missed', '2026-07-09 04:25:00', '2026-07-08 13:56:12', 0, 'not_required', 0.00),
(323, 11, 9, 'School of Computing (SOC)', '2026-07-09', '13:00:00', '14:00:00', 1.00, 'Staff teaching demo during viva', 'Smart Pen', 'key_collected', 'collected', NULL, NULL, 'Use this booking to demonstrate staff key collection flow', '2026-07-09 03:50:00', '2026-07-08 13:56:09', 0, 'not_required', 0.00),
(324, 2, 1, 'School of Computing (SOC)', '2026-07-09', '14:00:00', '15:00:00', 1.00, 'Backup QR demo booking - STEM Lab', NULL, 'key_collected', 'collected', NULL, NULL, 'Backup booking for QR demo near the end of viva', '2026-07-09 04:30:00', '2026-07-08 14:17:21', 0, 'not_required', 0.00),
(325, 2, 2, 'School of Computing (SOC)', '2026-07-09', '15:00:00', '16:00:00', 1.00, 'Pool table proof of payment demo', NULL, 'payment_submitted', 'not_required', NULL, NULL, 'Use this booking to demonstrate payment/proof submission review', '2026-07-09 04:35:00', '2026-07-09 04:50:00', 1, 'payment_submitted', 5.00),
(326, 2, 2, 'School of Computing (SOC)', '2026-07-10', '10:00:00', '11:00:00', 1.00, 'Pool table booking', NULL, 'approved', 'not_required', NULL, NULL, NULL, '2026-07-09 09:20:00', '2026-07-08 14:17:09', 1, 'pending_payment', 5.00),
(327, 11, 7, 'School of Computing (SOC)', '2026-07-10', '08:00:00', '10:00:00', 2.00, 'AI Lab class request', NULL, 'completed', 'returned', NULL, '2026-07-08 22:19:21', NULL, '2026-07-09 09:40:00', '2026-07-08 14:19:21', 0, 'not_required', 0.00),
(328, 2, 4, 'School of Computing (SOC)', '2026-07-11', '10:00:00', '12:00:00', 2.00, 'Music practice session', NULL, 'key_collected', 'collected', NULL, NULL, NULL, '2026-07-10 01:15:00', '2026-07-08 14:17:26', 0, 'not_required', 0.00),
(329, 2, 5, 'School of Computing (SOC)', '2026-07-12', '09:00:00', '10:00:00', 1.00, 'Weekend study session', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-07-11 05:10:00', '2026-08-05 01:30:01', 0, 'not_required', 0.00),
(330, 11, 8, 'School of Computing (SOC)', '2026-07-12', '08:00:00', '09:00:00', 1.00, 'Cloud lab class', 'Smart Pen', 'completed', 'returned', NULL, '2026-07-08 22:21:30', NULL, '2026-07-11 06:30:00', '2026-07-08 14:21:30', 0, 'not_required', 0.00),
(331, 11, 8, 'School of Computing (SOC)', '2026-07-09', '08:00:00', '09:00:00', 1.00, '', 'Smart Pen', 'completed', 'returned', NULL, '2026-07-08 22:27:08', NULL, '2026-07-08 14:25:20', '2026-07-08 14:27:08', 0, 'not_required', 0.00),
(332, 32, 4, 'School of Computing (SOC)', '2026-07-09', '08:00:00', '09:00:00', 1.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:38:19', NULL, '2026-07-08 14:31:47', '2026-07-08 14:38:19', 0, 'not_required', 0.00),
(333, 32, 8, 'School of Computing (SOC)', '2026-07-09', '08:00:00', '09:00:00', 1.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:37:56', NULL, '2026-07-08 14:32:02', '2026-07-08 14:37:56', 0, 'not_required', 0.00),
(334, 32, 7, 'School of Computing (SOC)', '2026-07-09', '08:00:00', '10:00:00', 2.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:38:09', NULL, '2026-07-08 14:32:11', '2026-07-08 14:38:09', 0, 'not_required', 0.00),
(335, 32, 9, 'School of Computing (SOC)', '2026-07-09', '09:00:00', '10:00:00', 1.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:36:22', NULL, '2026-07-08 14:32:20', '2026-07-08 14:36:22', 0, 'not_required', 0.00),
(336, 32, 9, 'School of Computing (SOC)', '2026-07-09', '09:00:00', '10:00:00', 1.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:43:10', NULL, '2026-07-08 14:39:49', '2026-07-08 14:43:10', 0, 'not_required', 0.00),
(337, 32, 9, 'School of Computing (SOC)', '2026-07-10', '13:00:00', '14:00:00', 1.00, '', '', 'completed', 'returned', NULL, '2026-07-08 22:44:10', NULL, '2026-07-08 14:40:51', '2026-07-08 14:44:10', 0, 'not_required', 0.00),
(338, 32, 2, 'School of Computing (SOC)', '2026-07-09', '08:00:00', '09:00:00', 1.00, '', '', 'cancelled', 'not_required', NULL, NULL, NULL, '2026-07-08 15:56:21', '2026-07-08 16:31:20', 1, 'pending_payment', 0.00),
(339, 32, 5, 'School of Business', '2026-07-10', '08:00:00', '09:00:00', 1.00, '', '', 'cancelled', 'not_required', NULL, NULL, NULL, '2026-07-08 16:00:50', '2026-07-08 16:30:58', 0, 'not_required', 0.00),
(340, 32, 2, 'School of Computing (SOC)', '2026-07-09', '09:00:00', '10:00:00', 1.00, '', '', 'pending_payment', 'not_required', NULL, NULL, NULL, '2026-07-08 23:58:18', '2026-07-08 23:58:18', 1, 'pending_payment', 0.00),
(341, 32, 5, 'School of Computing (SOC)', '2026-07-09', '09:00:00', '10:00:00', 1.00, '', '', 'expired', 'not_required', NULL, NULL, NULL, '2026-07-09 00:00:42', '2026-07-09 02:25:59', 0, 'not_required', 0.00),
(342, 32, 5, 'School of Computing (SOC)', '2026-07-09', '12:00:00', '13:00:00', 1.00, '', '', 'expired', 'not_required', NULL, NULL, NULL, '2026-07-09 02:57:44', '2026-07-09 06:16:28', 0, 'not_required', 0.00),
(343, 32, 9, 'School of Computing (SOC)', '2026-07-10', '09:00:00', '10:00:00', 1.00, '', '', 'pending', 'pending_collection', NULL, NULL, NULL, '2026-07-09 06:34:38', '2026-07-09 06:34:38', 0, 'not_required', 0.00),
(344, 32, 8, 'School of Computing (SOC)', '2026-07-10', '08:00:00', '09:00:00', 1.00, '', '', 'pending', 'pending_collection', NULL, NULL, NULL, '2026-07-09 06:34:46', '2026-07-09 06:34:46', 0, 'not_required', 0.00),
(345, 32, 7, 'School of Computing (SOC)', '2026-07-10', '08:00:00', '10:00:00', 2.00, '', '', 'pending', 'pending_collection', NULL, NULL, NULL, '2026-07-09 06:34:54', '2026-07-09 06:34:54', 0, 'not_required', 0.00),
(346, 11, 9, 'School of Computing (SOC)', '2026-08-11', '09:00:00', '10:00:00', 1.00, '', '', 'pending', 'pending_collection', NULL, NULL, NULL, '2026-08-05 03:03:46', '2026-08-05 03:03:46', 0, 'not_required', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `class_timetable`
--

CREATE TABLE `class_timetable` (
  `timetable_id` int(11) NOT NULL,
  `facility_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `class_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `facilities`
--

CREATE TABLE `facilities` (
  `facility_id` int(11) NOT NULL,
  `facility_name` varchar(100) NOT NULL,
  `facility_type` varchar(50) NOT NULL,
  `location` varchar(100) NOT NULL,
  `max_people` int(11) DEFAULT NULL,
  `operating_start` time NOT NULL,
  `operating_end` time NOT NULL,
  `description` text DEFAULT NULL,
  `rules` text DEFAULT NULL,
  `image_path` mediumtext DEFAULT NULL,
  `availability_status` enum('available','unavailable','maintenance') DEFAULT 'available',
  `key_required` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `visible_to` enum('student','staff','both') DEFAULT 'both',
  `additional_info` text DEFAULT NULL,
  `equipment` text DEFAULT NULL,
  `booking_flow_type` enum('normal_approval','payment_required','direct_reservation','staff_key_approval') DEFAULT 'normal_approval',
  `time_slots` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`time_slots`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `facilities`
--

INSERT INTO `facilities` (`facility_id`, `facility_name`, `facility_type`, `location`, `max_people`, `operating_start`, `operating_end`, `description`, `rules`, `image_path`, `availability_status`, `key_required`, `created_at`, `visible_to`, `additional_info`, `equipment`, `booking_flow_type`, `time_slots`) VALUES
(1, 'STEM Lab', 'Lab / Classroom', 'Level 3', 18, '08:30:00', '16:30:00', 'Technology & robotics workspace for hands-on learning and innovation.', 'Booking must be made at least 30 minutes before the session.\nFood and drinks are not allowed.\nClosing time is 4:30 PM.\nStudents must present their Student ID to the staff in exchange for an access card.\nThe access card must be returned to the AFM office or the security guard after use in order to retrieve the Student ID.', 'uploads/facility_31_1782729208066.jpg', 'available', 1, '2026-06-29 07:35:24', 'both', 'STEM Lab requires admin approval. Users will be notified once the booking request has been reviewed.', '', 'normal_approval', NULL),
(2, 'Pool Table', 'Sports Facility', 'Level 2', 1, '08:30:00', '16:30:00', 'Recreational lounge space equipped with a standard-sized pool table, cues, and billiard balls for student downtime and friendly matches.', 'Booking must be made at least 30 minutes before the session.\nFood and drinks are not allowed.\nIf students fail to collect the balls and equipment within 10 minutes after the booking time, the booking will be cancelled and opened to others.\nStudents must provide their Student ID to collect the balls and equipment from the AFM office.\nThe same person must return the balls and equipment to retrieve their Student ID.\nBalls and equipment cannot be passed to another person without permission from AFM staff.', 'uploads/facility_32_1782729199675.jpg', 'available', 0, '2026-06-29 07:35:24', 'both', 'Pool Table is available for recreational use. Payment of RM5/hr is required.', '', 'payment_required', NULL),
(3, 'Table Tennis', 'Sports Facility', 'Level 5', 1, '08:30:00', '16:30:00', 'Active recreation zone featuring indoor table tennis setups perfect for solo practice, friendly singles, or doubles games.', 'Booking must be made at least 30 minutes before the session.\nFood and drinks are not allowed.\nIf students fail to collect the balls and equipment within 10 minutes after the booking time, the booking will be cancelled and opened to others.\nStudents must provide their Student ID to collect the balls and equipment from the AFM office.\nThe same person must return the balls and equipment to retrieve their Student ID.\nBalls and equipment cannot be passed to another person without permission from AFM staff.', 'uploads/facility_33_1782729186783.jpg', 'available', 0, '2026-06-29 07:35:24', 'both', 'Table Tennis is available for recreational use. Payment of RM5/hr is required.', '', 'payment_required', NULL),
(4, 'Music Room', 'Music Facility', 'Level 3', 10, '08:30:00', '16:30:00', 'Creative music space designed for instrument practice, rehearsals, and collaborative performances in a comfortable learning environment.', 'Booking must be made at least 30 minutes before the session.\nMaximum usage time is 2 hours only.\nFood and drinks are not allowed in the room.\nEvery Tuesday and Friday, the Music Room is closed for cleaning from 9:00 AM - 10:00 AM and will only operate from 10:00 AM onwards.\nIf students fail to collect the key within 10 minutes after the booking time, the booking will be cancelled and opened to others.\nStudents must provide their Student ID to collect the key from the AFM office.\nThe same person must return the key to retrieve their Student ID.\nKeys cannot be passed to another person without permission from AFM staff.', 'uploads/facility_34_1782729170030.jpg', 'available', 1, '2026-06-29 07:35:24', 'both', 'Music Room is primarily used for instrument practice and rehearsals.', '', 'normal_approval', NULL),
(5, 'Cubicles 1', 'Study Space', 'Level 3', 1, '08:00:00', '18:00:00', 'Quiet study space featuring individual cubicles designed for focused learning, revision sessions, and independent academic work.', 'Booking must be made at least 30 minutes before the session.\nNo admin approval is required.\nUsers must check in by scanning the QR code at the cubicle.\nCheck-in is allowed from 15 minutes before the booking time until 15 minutes after the booking time.\nIf the user does not check in within the allowed time range, the cubicle reservation will be cancelled and opened to others.\nFood and drinks are not allowed.', 'uploads/facility_35_1782729158940.jpg', 'available', 0, '2026-06-29 07:35:24', 'both', 'Cubicles are available for individual study use. Direct reservation — no approval needed.', '', 'direct_reservation', NULL),
(6, 'Lecture Theatre', 'Lab / Classroom', 'Level 5', 1, '08:00:00', '18:00:00', 'Large-capacity learning venue designed for lectures, presentations, seminars, and academic events.', 'Bookings are only permitted during available time slots.\nAvailable slots are determined based on the academic timetable and college events.\nPriority is given to scheduled classes and official college activities.\nFood and drinks are not allowed inside the lecture theatre.\nUsers must vacate the venue promptly at the end of their booking period.', 'uploads/facility_36_1782729145649.jpg', 'available', 1, '2026-06-29 07:35:24', 'staff', 'Priority is given to classes, examinations, and official college activities.', 'Smart Pen', 'staff_key_approval', '[{\"start\":\"08:00\",\"end\":\"10:00\"}]'),
(7, 'Artificial Intelligence Lab', 'Lab / Classroom', 'Level 5', 1, '08:00:00', '18:00:00', 'Advanced computing workspace designed for artificial intelligence, machine learning, and data-driven projects.', 'Only staff members are permitted to make reservations.\nReservations can only be made through the available time slots provided by the system.\nTime slots occupied by scheduled classes or academic activities are not available for booking.\nAvailable booking slots are automatically determined based on the official laboratory timetable.\nStaff must ensure that the selected time slot is approved before using the facility.', 'uploads/facility_37_1782729135221.jpg', 'available', 1, '2026-06-29 07:35:24', 'staff', 'The lab is primarily used for teaching and learning activities. Booking availability is subject to the official laboratory timetable.', '', 'staff_key_approval', '[{\"start\":\"08:00\",\"end\":\"10:00\"}]'),
(8, 'Cloud Computing Lab', 'Lab / Classroom', 'Level 2', 1, '08:00:00', '18:00:00', 'Modern computing laboratory designed for cloud computing, virtualization, networking, and infrastructure-related learning activities.', 'Only staff members are permitted to make reservations.\nReservations can only be made through the available time slots provided by the system.\nTime slots occupied by scheduled classes or academic activities are not available for booking.\nAvailable booking slots are automatically determined based on the official laboratory timetable.\nStaff must ensure that the selected time slot is approved before using the facility.', 'uploads/facility_38_1782728801113.jpg', 'available', 1, '2026-06-29 07:35:24', 'staff', 'The lab is primarily used for teaching and learning activities. Booking availability is subject to the official laboratory timetable.', 'Smart Pen', 'staff_key_approval', '[{\"start\":\"08:00\",\"end\":\"09:00\"}]'),
(9, 'LR 501', 'Lab / Classroom', 'Level 5', 1, '08:00:00', '18:00:00', 'Technology-enhanced learning space equipped with interactive teaching tools and digital collaboration technologies.', 'Only staff members are permitted to make reservations.\nReservations can only be made through the available time slots provided by the system.\nTime slots occupied by scheduled classes or academic activities are not available for booking.\nAvailable booking slots are automatically determined based on the official laboratory timetable.\nStaff must ensure that the selected time slot is approved before using the facility.', 'uploads/facility_39_1782728793505.jpg', 'available', 1, '2026-06-29 07:35:24', 'staff', 'LR 501 is primarily used for teaching and learning activities. Booking availability is subject to the official laboratory timetable.', 'Smart Pen', 'staff_key_approval', '[{\"start\":\"09:00\",\"end\":\"10:00\"},{\"start\":\"13:00\",\"end\":\"14:00\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `notification_type` enum('booking','waitlist','key_return','reminder','system') DEFAULT 'booking',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `booking_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `title`, `message`, `notification_type`, `is_read`, `created_at`, `booking_id`) VALUES
(357, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-06-22 from 09:00 to 10:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 1, '2026-06-21 06:20:00', 301),
(358, 2, 'Booking Completed', 'Your booking for Cubicles 1 has been completed successfully.', 'booking', 1, '2026-06-22 02:05:00', 301),
(359, 11, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab on 2026-06-22 from 10:00 to 12:00 has been submitted.', 'booking', 1, '2026-06-21 07:05:00', 302),
(360, 11, 'Booking Completed', 'Your booking for Artificial Intelligence Lab has been completed successfully.', 'booking', 1, '2026-06-22 04:05:00', 302),
(361, 1, 'Key Returned', 'The key for booking #302 has been returned.', 'key_return', 1, '2026-06-22 04:05:00', 302),
(362, 2, 'Booking Submitted', 'Your booking request for Pool Table on 2026-06-23 from 15:00 to 16:00 has been submitted.', 'booking', 1, '2026-06-22 03:30:00', 303),
(363, 2, 'Payment Verified', 'Your payment for Pool Table has been verified.', 'booking', 1, '2026-06-23 08:05:00', 303),
(364, 2, 'Booking Completed', 'Your booking for Pool Table has been completed successfully.', 'booking', 1, '2026-06-23 08:05:00', 303),
(365, 2, 'Booking Submitted', 'Your booking request for Music Room on 2026-06-24 from 10:00 to 12:00 has been submitted.', 'booking', 1, '2026-06-23 05:15:00', 304),
(366, 2, 'Booking Completed', 'Your booking for Music Room has been completed successfully.', 'booking', 1, '2026-06-24 04:10:00', 304),
(367, 1, 'Key Returned', 'The key for booking #304 has been returned.', 'key_return', 1, '2026-06-24 04:10:00', 304),
(368, 11, 'Booking Submitted', 'Your booking request for Cloud Computing Lab on 2026-06-24 from 08:00 to 09:00 has been submitted.', 'booking', 1, '2026-06-23 08:20:00', 305),
(369, 1, 'New Booking Request', 'A new booking request for Cloud Computing Lab has been submitted by user ID 11.', 'system', 1, '2026-06-23 08:20:00', 305),
(370, 11, 'Booking Rejected', 'Your booking for Cloud Computing Lab was rejected. Reason: Facility unavailable due to maintenance.', 'booking', 1, '2026-06-24 00:20:00', 305),
(371, 2, 'Booking Submitted', 'Your booking request for Table Tennis on 2026-06-25 from 14:00 to 15:00 has been submitted.', 'booking', 1, '2026-06-24 04:30:00', 306),
(372, 1, 'New Booking Request', 'A new booking request for Table Tennis has been submitted by user ID 2.', 'system', 1, '2026-06-24 04:30:00', 306),
(373, 2, 'Payment Required', 'Please proceed to AFM to make payment for your Table Tennis booking. Amount: RM5.00.', 'booking', 1, '2026-06-24 04:30:00', 306),
(374, 2, 'Booking Cancelled', 'Your booking for Table Tennis has been cancelled.', 'booking', 1, '2026-06-25 01:10:00', 306),
(375, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-06-26 from 11:00 to 12:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 1, '2026-06-25 02:05:00', 307),
(376, 2, 'Reservation Expired', 'Your reservation for Cubicles 1 expired because QR check-in was not completed within the allowed time range.', 'booking', 1, '2026-06-26 03:16:00', 307),
(377, 11, 'Booking Submitted', 'Your booking request for LR 501 on 2026-06-27 from 09:00 to 10:00 has been submitted.', 'booking', 1, '2026-06-26 01:40:00', 308),
(378, 11, 'Booking Completed', 'Your booking for LR 501 has been completed successfully.', 'booking', 1, '2026-06-27 02:05:00', 308),
(379, 1, 'Key Returned', 'The key for booking #308 has been returned.', 'key_return', 1, '2026-06-27 02:05:00', 308),
(380, 2, 'Booking Submitted', 'Your booking request for STEM Lab on 2026-06-29 from 08:30 to 10:00 has been submitted.', 'booking', 1, '2026-06-28 07:25:00', 309),
(381, 2, 'Booking Completed', 'Your booking for STEM Lab has been completed successfully.', 'booking', 1, '2026-06-29 02:05:00', 309),
(382, 1, 'Key Returned', 'The key for booking #309 has been returned.', 'key_return', 1, '2026-06-29 02:05:00', 309),
(383, 2, 'Booking Submitted', 'Your booking request for Pool Table on 2026-06-30 from 10:00 to 12:00 has been submitted.', 'booking', 1, '2026-06-29 04:00:00', 310),
(384, 2, 'Payment Verified', 'Your payment for Pool Table has been verified.', 'booking', 1, '2026-06-30 04:05:00', 310),
(385, 2, 'Booking Completed', 'Your booking for Pool Table has been completed successfully.', 'booking', 1, '2026-06-30 04:05:00', 310),
(386, 11, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab on 2026-07-01 from 08:00 to 10:00 has been submitted.', 'booking', 1, '2026-06-30 06:15:00', 311),
(387, 11, 'Booking Completed', 'Your booking for Artificial Intelligence Lab has been completed successfully.', 'booking', 1, '2026-07-01 02:05:00', 311),
(388, 1, 'Key Returned', 'The key for booking #311 has been returned.', 'key_return', 1, '2026-07-01 02:05:00', 311),
(389, 2, 'Booking Submitted', 'Your booking request for Music Room on 2026-07-01 from 13:00 to 15:00 has been submitted.', 'booking', 1, '2026-06-30 09:10:00', 312),
(390, 1, 'New Booking Request', 'A new booking request for Music Room has been submitted by user ID 2.', 'system', 1, '2026-06-30 09:10:00', 312),
(391, 2, 'Booking Rejected', 'Your booking for Music Room was rejected. Reason: Music Room was reserved for a college event.', 'booking', 1, '2026-07-01 00:40:00', 312),
(392, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-07-02 from 14:00 to 15:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 1, '2026-07-01 10:20:00', 313),
(393, 2, 'Booking Completed', 'Your booking for Cubicles 1 has been completed successfully.', 'booking', 1, '2026-07-02 07:05:00', 313),
(394, 11, 'Booking Submitted', 'Your booking request for Cloud Computing Lab on 2026-07-03 from 08:00 to 09:00 has been submitted.', 'booking', 1, '2026-07-02 04:45:00', 314),
(395, 11, 'Booking Completed', 'Your booking for Cloud Computing Lab has been completed successfully.', 'booking', 1, '2026-07-03 01:05:00', 314),
(396, 1, 'Key Returned', 'The key for booking #314 has been returned.', 'key_return', 1, '2026-07-03 01:05:00', 314),
(397, 2, 'Booking Submitted', 'Your booking request for Table Tennis on 2026-07-04 from 13:00 to 14:00 has been submitted.', 'booking', 1, '2026-07-03 03:20:00', 315),
(398, 2, 'Payment Verified', 'Your payment for Table Tennis has been verified.', 'booking', 1, '2026-07-04 06:05:00', 315),
(399, 2, 'Booking Completed', 'Your booking for Table Tennis has been completed successfully.', 'booking', 1, '2026-07-04 06:05:00', 315),
(400, 2, 'Booking Submitted', 'Your booking request for Pool Table on 2026-07-05 from 15:00 to 16:00 has been submitted.', 'booking', 1, '2026-07-04 05:35:00', 316),
(401, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted by user ID 2.', 'system', 1, '2026-07-04 05:35:00', 316),
(402, 2, 'Payment Required', 'Please proceed to AFM to make payment for your Pool Table booking. Amount: RM5.00.', 'booking', 1, '2026-07-04 05:35:00', 316),
(403, 2, 'Booking Cancelled', 'Your booking for Pool Table has been cancelled.', 'booking', 1, '2026-07-05 02:15:00', 316),
(404, 11, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab on 2026-07-06 from 08:00 to 10:00 has been submitted.', 'booking', 1, '2026-07-05 01:30:00', 317),
(405, 11, 'Booking Completed', 'Your booking for Artificial Intelligence Lab has been completed successfully.', 'booking', 1, '2026-07-06 02:10:00', 317),
(406, 1, 'Key Returned', 'The key for booking #317 has been returned.', 'key_return', 1, '2026-07-06 02:10:00', 317),
(407, 2, 'Booking Submitted', 'Your booking request for STEM Lab on 2026-07-07 from 09:00 to 10:00 has been submitted.', 'booking', 1, '2026-07-06 08:40:00', 318),
(408, 1, 'New Booking Request', 'A new booking request for STEM Lab has been submitted by user ID 2.', 'system', 1, '2026-07-06 08:40:00', 318),
(409, 2, 'Booking Rejected', 'Your booking for STEM Lab was rejected. Reason: Facility not available at the selected time.', 'booking', 1, '2026-07-07 00:30:00', 318),
(410, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-07-08 from 16:00 to 17:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 1, '2026-07-08 01:00:00', 319),
(411, 2, 'QR Check-in Reminder', 'Please scan the QR code for your Cubicles 1 booking on 2026-07-08 from 16:00 to 17:00.', 'reminder', 0, '2026-07-08 01:00:00', 319),
(412, 11, 'Booking Submitted', 'Your booking request for LR 501 on 2026-07-08 from 13:00 to 14:00 has been submitted.', 'booking', 1, '2026-07-07 07:10:00', 320),
(413, 11, 'Booking Completed', 'Your booking for LR 501 has been completed successfully.', 'booking', 1, '2026-07-08 06:05:00', 320),
(414, 1, 'Key Returned', 'The key for booking #320 has been returned.', 'key_return', 1, '2026-07-08 06:05:00', 320),
(415, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-07-09 from 13:00 to 14:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 0, '2026-07-09 04:20:00', 321),
(416, 2, 'QR Check-in Reminder', 'Please scan the QR code for your Cubicles 1 booking on 2026-07-09 from 13:00 to 14:00.', 'reminder', 0, '2026-07-09 04:20:00', 321),
(417, 2, 'Booking Submitted', 'Your booking request for Music Room on 2026-07-09 from 13:30 to 14:30 has been submitted.', 'booking', 0, '2026-07-09 04:25:00', 322),
(418, 1, 'New Booking Request', 'A new booking request for Music Room has been submitted by user ID 2.', 'system', 1, '2026-07-09 04:25:00', 322),
(419, 2, 'Booking Approved', 'Your booking for Music Room has been approved. Please proceed to AFM for key collection if required.', 'booking', 0, '2026-07-09 04:40:00', 322),
(420, 11, 'Booking Submitted', 'Your booking request for LR 501 on 2026-07-09 from 13:00 to 14:00 has been submitted.', 'booking', 0, '2026-07-09 03:50:00', 323),
(421, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted by user ID 11.', 'system', 1, '2026-07-09 03:50:00', 323),
(422, 11, 'Booking Approved', 'Your booking for LR 501 has been approved. Please proceed to AFM for key collection if required.', 'booking', 0, '2026-07-09 04:10:00', 323),
(423, 2, 'Booking Submitted', 'Your booking request for STEM Lab on 2026-07-09 from 14:00 to 15:00 has been submitted.', 'booking', 0, '2026-07-09 04:30:00', 324),
(424, 1, 'New Booking Request', 'A new booking request for STEM Lab has been submitted by user ID 2.', 'system', 1, '2026-07-09 04:30:00', 324),
(425, 2, 'Booking Approved', 'Your booking for STEM Lab has been approved. Please proceed to AFM for key collection if required.', 'booking', 0, '2026-07-09 04:45:00', 324),
(426, 2, 'Booking Submitted', 'Your booking request for Pool Table on 2026-07-09 from 15:00 to 16:00 has been submitted.', 'booking', 0, '2026-07-09 04:35:00', 325),
(427, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted by user ID 2.', 'system', 1, '2026-07-09 04:35:00', 325),
(428, 2, 'Payment Submitted', 'Your proof of payment for Pool Table has been submitted and is pending admin verification.', 'booking', 0, '2026-07-09 04:50:00', 325),
(429, 1, 'Payment Review Needed', 'Proof of payment for booking #325 is waiting for admin verification.', 'system', 1, '2026-07-09 04:50:00', 325),
(430, 2, 'Booking Submitted', 'Your booking request for Pool Table on 2026-07-10 from 10:00 to 11:00 has been submitted.', 'booking', 0, '2026-07-09 09:20:00', 326),
(431, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted by user ID 2.', 'system', 1, '2026-07-09 09:20:00', 326),
(432, 2, 'Payment Required', 'Please proceed to AFM to make payment for your Pool Table booking. Amount: RM5.00.', 'booking', 0, '2026-07-09 09:20:00', 326),
(433, 11, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab on 2026-07-10 from 08:00 to 10:00 has been submitted.', 'booking', 0, '2026-07-09 09:40:00', 327),
(434, 1, 'New Booking Request', 'A new booking request for Artificial Intelligence Lab has been submitted by user ID 11.', 'system', 1, '2026-07-09 09:40:00', 327),
(435, 1, 'Approval Required', 'Booking #327 for Artificial Intelligence Lab is pending admin approval.', 'system', 1, '2026-07-09 09:40:00', 327),
(436, 2, 'Booking Submitted', 'Your booking request for Music Room on 2026-07-11 from 10:00 to 12:00 has been submitted.', 'booking', 0, '2026-07-10 01:15:00', 328),
(437, 1, 'New Booking Request', 'A new booking request for Music Room has been submitted by user ID 2.', 'system', 1, '2026-07-10 01:15:00', 328),
(438, 2, 'Booking Approved', 'Your booking for Music Room has been approved. Please proceed to AFM for key collection if required.', 'booking', 0, '2026-07-10 01:40:00', 328),
(439, 2, 'Reservation Successful', 'Your reservation for Cubicles 1 on 2026-07-12 from 09:00 to 10:00 has been created successfully. Please scan the QR code during the allowed check-in time.', 'booking', 0, '2026-07-11 05:10:00', 329),
(440, 2, 'QR Check-in Reminder', 'Please scan the QR code for your Cubicles 1 booking on 2026-07-12 from 09:00 to 10:00.', 'reminder', 0, '2026-07-11 05:10:00', 329),
(441, 11, 'Booking Submitted', 'Your booking request for Cloud Computing Lab on 2026-07-12 from 08:00 to 09:00 has been submitted.', 'booking', 0, '2026-07-11 06:30:00', 330),
(442, 1, 'New Booking Request', 'A new booking request for Cloud Computing Lab has been submitted by user ID 11.', 'system', 1, '2026-07-11 06:30:00', 330),
(443, 11, 'Booking Approved', 'Your booking for Cloud Computing Lab has been approved. Please proceed to AFM for key collection if required.', 'booking', 0, '2026-07-11 07:00:00', 330),
(444, 2, 'Booking Approved', 'Your booking request of Pool Table has been approved.', '', 0, '2026-07-08 14:17:09', 326),
(445, 11, 'Booking Approved', 'Your booking request of Artificial Intelligence Lab has been approved. Please go to AFM to collect the key.', '', 0, '2026-07-08 14:17:11', 327),
(446, 11, 'Booking Submitted', 'Your booking request for Cloud Computing Lab has been submitted successfully. Please wait admin to approve.', 'booking', 0, '2026-07-08 14:25:20', 331),
(447, 1, 'New Booking Request', 'A new booking request for Cloud Computing Lab has been submitted and requires review.', 'system', 0, '2026-07-08 14:25:20', 331),
(448, 11, 'Booking Approved', 'Your booking request of Cloud Computing Lab has been approved. Please go to AFM to collect the key.', '', 0, '2026-07-08 14:26:00', 331),
(449, 32, 'Booking Approved', 'Your booking has been approved. Please proceed to AFM to collect your key.', 'booking', 1, '2026-07-08 14:31:47', 332),
(450, 32, 'Booking Submitted', 'Your booking request for Cloud Computing Lab has been submitted successfully. Please wait admin to approve.', 'booking', 1, '2026-07-08 14:32:02', 333),
(451, 1, 'New Booking Request', 'A new booking request for Cloud Computing Lab has been submitted and requires review.', 'system', 0, '2026-07-08 14:32:02', 333),
(452, 32, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab has been submitted successfully. Please wait admin to approve.', 'booking', 1, '2026-07-08 14:32:11', 334),
(453, 1, 'New Booking Request', 'A new booking request for Artificial Intelligence Lab has been submitted and requires review.', 'system', 0, '2026-07-08 14:32:11', 334),
(454, 32, 'Booking Submitted', 'Your booking request for LR 501 has been submitted successfully. Please wait admin to approve.', 'booking', 1, '2026-07-08 14:32:20', 335),
(455, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted and requires review.', 'system', 0, '2026-07-08 14:32:20', 335),
(456, 32, 'Booking Approved', 'Your booking request of LR 501 has been approved. Please go to AFM to collect the key.', '', 1, '2026-07-08 14:32:46', 335),
(457, 32, 'Booking Approved', 'Your booking request of Cloud Computing Lab has been approved. Please go to AFM to collect the key.', '', 1, '2026-07-08 14:32:49', 333),
(458, 32, 'Booking Approved', 'Your booking request of Artificial Intelligence Lab has been approved. Please go to AFM to collect the key.', '', 1, '2026-07-08 14:32:51', 334),
(459, 32, 'Booking Submitted', 'Your booking request for LR 501 has been submitted successfully. Please wait admin to approve.', 'booking', 1, '2026-07-08 14:39:49', 336),
(460, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted and requires review.', 'system', 0, '2026-07-08 14:39:49', 336),
(461, 32, 'Booking Submitted', 'Your booking request for LR 501 has been submitted successfully. Please wait admin to approve.', 'booking', 1, '2026-07-08 14:40:51', 337),
(462, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted and requires review.', 'system', 0, '2026-07-08 14:40:51', 337),
(463, 32, 'Booking Approved', 'Your booking request of LR 501 has been approved. Please go to AFM to collect the key.', '', 1, '2026-07-08 14:41:05', 337),
(464, 32, 'Booking Approved', 'Your booking request of LR 501 has been approved. Please go to AFM to collect the key.', '', 1, '2026-07-08 14:41:07', 336),
(465, 32, 'Payment Required', 'Please proceed to AFM to make payment so that your booking request only can be approved.', 'booking', 1, '2026-07-08 15:56:21', 338),
(466, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted, if user have make payment then approved.', 'system', 0, '2026-07-08 15:56:21', 338),
(467, 32, 'Reservation Successful', 'Your have successfully reserved Cubicles 1. Please remember to check in.', 'booking', 1, '2026-07-08 16:00:50', 339),
(468, 1, 'Booking Cancelled', 'User has cancelled a previously approved booking.', 'system', 0, '2026-07-08 16:30:58', 339),
(469, 32, 'Cancellation Confirmed', 'You have successfully cancelled your booking.', '', 1, '2026-07-08 16:30:58', 339),
(470, 1, 'Booking Cancelled', 'User has cancelled a previously approved booking.', 'system', 0, '2026-07-08 16:31:20', 338),
(471, 32, 'Cancellation Confirmed', 'You have successfully cancelled your booking.', '', 1, '2026-07-08 16:31:20', 338),
(472, 32, 'Payment Required', 'Please proceed to AFM to make payment so that your booking request only can be approved.', 'booking', 1, '2026-07-08 23:58:18', 340),
(473, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted, if user have make payment then approved.', 'system', 0, '2026-07-08 23:58:18', 340),
(474, 32, 'Reservation Successful', 'Your have successfully reserved Cubicles 1. Please remember to check in.', 'booking', 1, '2026-07-09 00:00:42', 341),
(475, 32, 'Reservation Successful', 'Your have successfully reserved Cubicles 1. Please remember to check in.', 'booking', 0, '2026-07-09 02:57:44', 342),
(476, 32, 'Booking Submitted', 'Your booking request for LR 501 has been submitted successfully. Please wait admin to approve.', 'booking', 0, '2026-07-09 06:34:38', 343),
(477, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted and requires review.', 'system', 0, '2026-07-09 06:34:38', 343),
(478, 32, 'Booking Submitted', 'Your booking request for Cloud Computing Lab has been submitted successfully. Please wait admin to approve.', 'booking', 0, '2026-07-09 06:34:46', 344),
(479, 1, 'New Booking Request', 'A new booking request for Cloud Computing Lab has been submitted and requires review.', 'system', 0, '2026-07-09 06:34:46', 344),
(480, 1, 'New Booking Request', 'A new booking request for Artificial Intelligence Lab has been submitted and requires review.', 'system', 0, '2026-07-09 06:34:54', 345),
(481, 32, 'Booking Submitted', 'Your booking request for Artificial Intelligence Lab has been submitted successfully. Please wait admin to approve.', 'booking', 0, '2026-07-09 06:34:54', 345),
(482, 11, 'Booking Submitted', 'Your booking request for LR 501 has been submitted successfully. Please wait admin to approve.', 'booking', 0, '2026-08-05 03:03:46', 346),
(483, 1, 'New Booking Request', 'A new booking request for LR 501 has been submitted and requires review.', 'system', 0, '2026-08-05 03:03:46', 346);

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `expires_at`) VALUES
(11, 'p24016574@student.newinti.edu.my', 'c238c6f6eae8a4640572ecbc0e119b3d5ae3be0672af3695b0d0f3700b72ba04', '2026-06-28 21:37:11'),
(12, 'p24016574@student.newinti.edu.my', '65c4e12c3a9e2ec471dbf488801e49a796635ef83cbcb75385c3b3d99fd6324a', '2026-06-28 21:37:12'),
(13, 'p24016574@student.newinti.edu.my', '35b594f04e874a1fcf2275b463a1a2d8f8b183cab3905bb646825e3fdb38fc88', '2026-06-28 21:37:16'),
(14, 'P24016574@student.newinti.edu.my', 'a0e4d29e2273ffa036911dec576b456aeafa72e861aceed3b96762f19d7a30d8', '2026-06-28 21:37:26'),
(15, 'p24016574@student.newinti.edu.my', '6733e45b1916e5efbd72659227339df05e0f80f41fb946c080ca9273d6eaffc0', '2026-06-28 21:37:35'),
(16, 'p24016574@student.newinti.edu.my', '25fae0d2ef69ef1f14e9291971d76c9192ea74aa6f0bd37fcfc2786a2116f8ab', '2026-06-28 21:44:24'),
(17, 'p24016574@student.newinti.edu.my', '76b97e460079d18b7562158b38d0c73d09b31883499d087de70cd57c526fe0d9', '2026-06-30 17:54:46'),
(18, 'p24016574@student.newinti.edu.my', '0237c8835fad9c41a5470820b35ec3a61eec2cd28d4cfc5e36517c23da76c239', '2026-06-30 17:55:59'),
(19, 'p24016574@student.newinti.edu.my', 'ff5fc1b6c013dff302fe191a98097b1c1f6b2f9a31b909461236dcecd05eae9a', '2026-06-30 17:57:25'),
(20, 'p24016574@student.newinti.edu.my', '2140e85015ff2715b8e2514945936556f374e662da4a4cb6fda029e342f3e71f', '2026-06-30 17:57:27'),
(21, 'p24016574@student.newinti.edu.my', '4cf18f8655b8397ec050e950350b08b7e515d81404ba115dc341e533384c7d46', '2026-06-30 17:57:27'),
(22, 'p24016574@student.newinti.edu.my', '7a81c1990b881767cfa1a0a8f10d87114abe1d95a4c9c9d95ba56ab3cd0424f0', '2026-06-30 17:57:28'),
(23, 'p24016574@student.newinti.edu.my', '48fd9e66c9df6ab61e88652ffb7c1321bacab4c7f59beb64d358103c57c5ff88', '2026-06-30 17:57:28'),
(24, 'p24016574@student.newinti.edu.my', '02091f986ec1d08b8e69f36a013c804c0a29f31a3c46afdc38578041f6247bb6', '2026-06-30 17:58:25'),
(25, 'p24016574@student.newinti.edu.my', '243e7c317445e8795c82343287fff3c4bfee5ed75543b20e5715300fd9709c99', '2026-06-30 17:58:27'),
(26, 'p24016574@student.newinti.edu.my', 'b1e2aa2e28c19ec0d029150876854a0eafdd4e8618fdc50939d424a0d1664675', '2026-06-30 17:58:27'),
(27, 'p24016574@student.newinti.edu.my', '0427176cd974f6549174f3c0366e5ad3e836ba8dba8510a5d8986df435dbe291', '2026-06-30 17:58:27'),
(28, 'p24016574@student.newinti.edu.my', 'bedafb463ed75e57e46cf5c23a58bf02bb3066e7e82b65071475b48c7d6e21dd', '2026-06-30 17:58:28'),
(29, 'p24016574@student.newinti.edu.my', 'aebc09914eaba8cc9a81a57acb90761b48dd773332ac5d3eb6d3204ee1719582', '2026-06-30 18:00:34'),
(30, 'p24016574@student.newinti.edu.my', '7653a84f81a9b09f7cbbc466ddb62d700d630af6e04bd5eab1cf8435c7f4f591', '2026-06-30 18:00:35'),
(31, 'p24016574@student.newinti.edu.my', '3d81a35d1ef9127fdfb88fc5602fc3c68953fb5bdc589c9a09f9e02205832514', '2026-06-30 18:00:35'),
(32, 'p24016574@student.newinti.edu.my', '212ac9ac0bda5cb307845fd27d0a72f8d04bdcb429e45227fa7604bcfa51fc40', '2026-06-30 18:00:36'),
(33, 'p24016574@student.newinti.edu.my', '46e6ffe1ee54c7265e9d9bb7a28e5ba9478666f78bd3d2b4e13e4c9beb2ca7eb', '2026-06-30 18:00:36'),
(34, 'p24016574@student.newinti.edu.my', '07b55dad4779e855f87425442360d234c84e3f601aa44a784630d4c114bf88b2', '2026-06-30 18:00:36'),
(35, 'p24016574@student.newinti.edu.my', '3c26500ebfb05979e5ef4369389bce830907d315a31d27466a0afb4dbca2e302', '2026-06-30 18:00:36'),
(36, 'p24016574@student.newinti.edu.my', 'd817ed93e2b9c8683651f7f0f96b3180da7c994b26c8cb1919d5a81288262202', '2026-06-30 18:00:36'),
(37, 'p24016574@student.newinti.edu.my', '2bc39b4773f9c9618f42dbf111303b433577b6f7f7db1000fb79f564301d6b58', '2026-06-30 18:00:36'),
(38, 'p24016574@student.newinti.edu.my', '291ea57f8270be8ca14e2a20bbf2e3f0a00a5818ae1c48dee1ebefa928506e45', '2026-06-30 18:00:37'),
(39, 'p24016574@student.newinti.edu.my', '7b38eb6c331b5653d96e202d95cd86b5f0c8a79419dc9afc5691464f01a80afc', '2026-06-30 18:00:38'),
(40, 'p24016574@student.newinti.edu.my', '18a7c82ad18a420777e0bb6227c0c8b825301ad42233827e921d05aa90028d9a', '2026-06-30 18:01:11'),
(41, 'p24016574@student.newinti.edu.my', 'bfc17bb7dbeea7eb865829aab2910f4a4acdb88a09cb934565fbb5668502657e', '2026-06-30 18:01:14'),
(42, 'p24016574@student.newinti.edu.my', 'f912fde015feb5da9cce52ea02534e498ebf1bbe18a07d66c76384598bfd7358', '2026-07-01 12:37:26'),
(43, 'p24016574@student.newinti.edu.my', '208f180a8d794728773b67ddb6209ac281c96182b3b7a42b844de20d4528320f', '2026-07-01 13:06:51');

-- --------------------------------------------------------

--
-- Table structure for table `qr_codes`
--

CREATE TABLE `qr_codes` (
  `qr_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `qr_token` varchar(255) NOT NULL,
  `qr_type` enum('key_return','booking_verification') DEFAULT 'key_return',
  `qr_status` enum('active','used','expired') DEFAULT 'active',
  `expiry_time` datetime NOT NULL,
  `scanned_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `user_code` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','student','staff') NOT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `must_change_password` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reset_token` varchar(64) DEFAULT NULL,
  `reset_token_expires` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `user_code`, `email`, `password`, `role`, `status`, `must_change_password`, `created_at`, `reset_token`, `reset_token_expires`) VALUES
(1, 'Admin User', 'P24016571', 'p24016571@admin.newinti.edu.my', 'admin123', 'admin', 'active', 1, '2026-05-22 03:06:33', NULL, NULL),
(2, 'Student User', 'P24016572', 'p24016572@student.newinti.edu.my', 'student123', 'student', 'active', 0, '2026-05-22 03:06:33', NULL, NULL),
(11, 'Staff User', 'P24016574', 'P24016574@student.newinti.edu.my', 'staff123', 'staff', 'active', 0, '2026-05-22 03:06:33', NULL, NULL),
(32, 'Xy', 'P24016691', 'P24016691@student.newinti.edu.my', 'P24016691p!', 'staff', 'active', 0, '2026-07-08 14:29:55', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `class_timetable`
--
ALTER TABLE `class_timetable`
  ADD PRIMARY KEY (`timetable_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `facilities`
--
ALTER TABLE `facilities`
  ADD PRIMARY KEY (`facility_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_booking` (`booking_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `token` (`token`);

--
-- Indexes for table `qr_codes`
--
ALTER TABLE `qr_codes`
  ADD PRIMARY KEY (`qr_id`),
  ADD UNIQUE KEY `qr_token` (`qr_token`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `user_code` (`user_code`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=347;

--
-- AUTO_INCREMENT for table `class_timetable`
--
ALTER TABLE `class_timetable`
  MODIFY `timetable_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `facilities`
--
ALTER TABLE `facilities`
  MODIFY `facility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=484;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `qr_codes`
--
ALTER TABLE `qr_codes`
  MODIFY `qr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `qr_codes`
--
ALTER TABLE `qr_codes`
  ADD CONSTRAINT `qr_codes_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
