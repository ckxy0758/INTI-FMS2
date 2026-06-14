-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 13, 2026 at 04:40 PM
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

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`log_id`, `user_id`, `action`, `description`, `ip_address`, `created_at`) VALUES
(1, 1, 'Approved Booking', 'Admin approved booking ID 5 for STEM Lab.', '127.0.0.1', '2026-05-24 08:10:57'),
(2, 2, 'Created Booking', 'Student submitted a booking request for STEM Lab.', '127.0.0.1', '2026-05-24 08:10:57'),
(3, 3, 'Returned Key', 'Staff returned the key for Meeting Room A.', '127.0.0.1', '2026-05-24 08:10:57');

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
  `purpose` text DEFAULT NULL,
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

INSERT INTO `bookings` (`booking_id`, `user_id`, `facility_id`, `program`, `booking_date`, `start_time`, `end_time`, `duration_hours`, `purpose`, `equipment_required`, `booking_status`, `key_status`, `key_collected_at`, `key_returned_at`, `admin_remark`, `created_at`, `updated_at`, `payment_required`, `payment_status`, `payment_amount`) VALUES
(5, 2, 1, 'School of Computing (SOC)', '2026-05-20', '10:00:00', '12:00:00', 2.00, 'Class activity and practical learning session', 'Computer, HDMI Cable', 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-24 07:48:03', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(11, 2, 1, 'School of Engineering', '2026-05-29', '21:57:00', '23:03:00', 1.10, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-24 13:56:10', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(12, 2, 1, 'School of Business', '2026-05-30', '10:15:00', '11:15:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-24 14:14:39', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(13, 2, 1, 'School of Computing (SOC)', '2026-05-26', '08:35:00', '10:35:00', 2.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-25 03:33:41', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(14, 2, 1, 'School of Computing (SOC)', '2026-05-26', '13:51:00', '14:51:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-25 04:51:08', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(15, 2, 1, 'School of Computing (SOC)', '2026-05-26', '18:06:00', '20:01:00', 1.92, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-25 07:06:48', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(16, 2, 1, 'School of Computing (SOC)', '2026-05-25', '16:12:00', '17:12:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-25 07:13:07', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(17, 2, 1, 'School of Computing (SOC)', '2026-05-28', '10:02:00', '13:04:00', 3.03, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-05-28 02:01:49', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(18, 2, 1, 'School of Computing (SOC)', '2026-06-05', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-04 01:50:11', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(19, 2, 1, 'School of Computing (SOC)', '2026-06-04', '12:00:00', '13:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-04 01:55:10', '2026-06-07 05:07:03', 0, 'not_required', 0.00),
(20, 2, 7, 'School of Computing (SOC)', '2026-06-10', '09:00:00', '10:00:00', 1.00, '', NULL, 'pending_payment', 'pending_collection', NULL, NULL, NULL, '2026-06-07 06:32:54', '2026-06-07 06:32:54', 1, 'pending_payment', 5.00),
(21, 2, 8, 'School of Business', '2026-06-08', '09:00:00', '10:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-07 07:06:49', '2026-06-07 07:06:49', 0, 'not_required', 0.00),
(22, 2, 8, 'School of Computing (SOC)', '2026-06-10', '13:00:00', '14:00:00', 1.00, '', NULL, 'approved', 'pending_collection', NULL, NULL, NULL, '2026-06-07 07:10:55', '2026-06-11 15:57:20', 1, 'pending_payment', 5.00),
(23, 2, 9, 'School of Business', '2026-06-08', '13:00:00', '14:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-07 07:12:43', '2026-06-07 07:12:43', 0, 'not_required', 0.00),
(24, 2, 9, 'School of Computing (SOC)', '2026-06-09', '12:00:00', '13:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-07 07:19:58', '2026-06-07 07:19:58', 0, 'not_required', 0.00),
(25, 2, 8, 'School of Business', '2026-06-11', '10:00:00', '11:00:00', 1.00, '', NULL, 'cancelled', 'pending_collection', NULL, NULL, NULL, '2026-06-07 07:20:07', '2026-06-11 15:57:46', 1, 'pending_payment', 5.00),
(26, 2, 10, 'School of Computing (SOC)', '2026-06-09', '12:00:00', '13:00:00', 1.00, '', NULL, 'expired', 'pending_collection', NULL, NULL, NULL, '2026-06-08 13:48:29', '2026-06-11 03:12:03', 0, 'not_required', 0.00),
(27, 2, 10, 'School of Computing (SOC)', '2026-06-10', '10:00:00', '11:00:00', 1.00, '', NULL, 'completed', 'pending_collection', NULL, NULL, NULL, '2026-06-08 13:53:18', '2026-06-11 03:49:17', 0, 'not_required', 0.00),
(28, 2, 10, 'School of Computing (SOC)', '2026-06-09', '11:00:00', '12:00:00', 1.00, '', NULL, 'expired', 'pending_collection', NULL, NULL, NULL, '2026-06-08 14:25:55', '2026-06-11 03:12:03', 0, 'not_required', 0.00),
(29, 2, 10, 'School of Computing (SOC)', '2026-06-09', '08:00:00', '09:00:00', 1.00, '', NULL, 'expired', 'pending_collection', NULL, NULL, NULL, '2026-06-08 14:26:43', '2026-06-11 03:12:03', 0, 'not_required', 0.00),
(30, 2, 10, 'School of Business', '2026-06-11', '13:00:00', '14:00:00', 1.00, '', NULL, 'expired', 'pending_collection', NULL, NULL, NULL, '2026-06-11 03:30:55', '2026-06-11 05:23:30', 0, 'not_required', 0.00),
(31, 3, 10, 'School of Computing (SOC)', '2026-06-11', '15:00:00', '16:00:00', 1.00, '', NULL, 'completed', 'pending_collection', NULL, NULL, NULL, '2026-06-11 05:36:19', '2026-06-11 10:12:11', 0, 'not_required', 0.00),
(32, 3, 12, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'approved', 'collected', NULL, NULL, NULL, '2026-06-11 06:38:12', '2026-06-12 02:30:15', 0, 'not_required', 0.00),
(33, 3, 13, 'School of Computing (SOC)', '2026-06-12', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-11 07:17:41', '2026-06-11 07:17:41', 0, 'not_required', 0.00),
(34, 3, 13, 'School of Computing (SOC)', '2026-06-15', '09:00:00', '10:00:00', 1.00, '', NULL, 'cancelled', 'pending_collection', NULL, NULL, NULL, '2026-06-11 10:14:59', '2026-06-11 10:19:29', 0, 'not_required', 0.00),
(35, 2, 10, 'School of Business', '2026-06-12', '08:00:00', '09:00:00', 1.00, '', NULL, 'cancelled', 'pending_collection', NULL, NULL, NULL, '2026-06-11 14:07:37', '2026-06-11 14:07:53', 0, 'not_required', 0.00),
(36, 2, 9, 'School of Business', '2026-06-12', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-11 14:08:22', '2026-06-11 14:08:22', 0, 'not_required', 0.00),
(37, 2, 7, 'School of Computing (SOC)', '2026-06-12', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending_payment', 'pending_collection', NULL, NULL, NULL, '2026-06-11 14:08:42', '2026-06-11 14:08:42', 1, 'pending_payment', 5.00),
(38, 3, 13, 'School of Computing (SOC)', '2026-06-12', '09:00:00', '10:00:00', 1.00, '', NULL, 'approved', 'collected', NULL, NULL, NULL, '2026-06-11 14:09:41', '2026-06-12 02:34:30', 0, 'not_required', 0.00),
(39, 3, 14, 'School of Business', '2026-06-12', '08:00:00', '09:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-11 15:01:29', '2026-06-12 01:02:01', 0, 'not_required', 0.00),
(40, 3, 12, 'School of Computing (SOC)', '2026-06-12', '10:00:00', '11:00:00', 1.00, '', NULL, 'completed', 'returned', NULL, '2026-06-12 10:29:29', NULL, '2026-06-12 01:07:04', '2026-06-12 02:29:29', 0, 'not_required', 0.00),
(41, 3, 11, 'School of Computing (SOC)', '2026-06-12', '11:00:00', '12:00:00', 1.00, '', NULL, 'completed', 'returned', NULL, '2026-06-12 14:02:07', NULL, '2026-06-12 02:15:40', '2026-06-12 06:02:07', 0, 'not_required', 0.00),
(42, 3, 11, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-12 02:59:13', '2026-06-12 02:59:13', 0, 'not_required', 0.00),
(43, 3, 10, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-12 02:59:33', '2026-06-12 05:59:58', 0, 'not_required', 0.00),
(44, 3, 14, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-12 03:07:24', '2026-06-12 05:59:58', 0, 'not_required', 0.00),
(45, 3, 13, 'School of Engineering', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'pending', 'pending_collection', NULL, NULL, NULL, '2026-06-12 03:07:38', '2026-06-12 03:07:38', 0, 'not_required', 0.00),
(46, 2, 14, 'School of Computing (SOC)', '2026-06-12', '13:00:00', '14:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-12 03:29:23', '2026-06-12 05:59:58', 0, 'not_required', 0.00),
(47, 2, 9, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'approved', 'not_required', NULL, NULL, NULL, '2026-06-12 03:29:41', '2026-06-12 06:00:25', 0, 'not_required', 0.00),
(48, 2, 8, 'School of Computing (SOC)', '2026-06-12', '12:00:00', '13:00:00', 1.00, '', NULL, 'approved', 'not_required', NULL, NULL, NULL, '2026-06-12 03:30:00', '2026-06-12 06:00:27', 1, 'pending_payment', 5.00),
(49, 2, 10, 'School of Computing (SOC)', '2026-06-12', '13:00:00', '14:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-12 03:31:20', '2026-06-12 05:59:58', 0, 'not_required', 0.00),
(50, 3, 14, 'School of Computing (SOC)', '2026-06-12', '14:00:00', '15:00:00', 1.00, '', NULL, 'expired', 'not_required', NULL, NULL, NULL, '2026-06-12 03:42:51', '2026-06-12 06:16:08', 0, 'not_required', 0.00),
(51, 3, 13, 'School of Computing (SOC)', '2026-06-12', '13:00:00', '14:00:00', 1.00, '', NULL, 'completed', 'returned', NULL, '2026-06-12 14:00:55', NULL, '2026-06-12 03:43:11', '2026-06-12 06:00:55', 0, 'not_required', 0.00),
(52, 2, 1, 'School of Computing (SOC)', '2026-06-18', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending', 'not_required', NULL, NULL, NULL, '2026-06-12 06:16:23', '2026-06-12 06:16:23', 0, 'not_required', 0.00),
(53, 2, 7, 'School of Computing (SOC)', '2026-06-19', '08:00:00', '09:00:00', 1.00, '', NULL, 'cancelled', 'not_required', NULL, NULL, NULL, '2026-06-12 06:16:39', '2026-06-12 06:35:31', 1, 'pending_payment', 5.00),
(54, 2, 10, 'School of Computing (SOC)', '2026-06-19', '08:00:00', '09:00:00', 1.00, '', NULL, 'reserved', 'not_required', NULL, NULL, NULL, '2026-06-12 06:16:51', '2026-06-12 06:16:51', 0, 'not_required', 0.00),
(55, 2, 1, 'School of Computing (SOC)', '2026-06-15', '09:00:00', '10:00:00', 1.00, '', NULL, 'pending', 'not_required', NULL, NULL, NULL, '2026-06-12 06:34:07', '2026-06-12 06:34:07', 0, 'not_required', 0.00),
(56, 2, 7, 'School of Computing (SOC)', '2026-06-15', '08:00:00', '09:00:00', 1.00, '', NULL, 'pending_payment', 'not_required', NULL, NULL, NULL, '2026-06-12 06:34:19', '2026-06-12 06:34:19', 1, 'pending_payment', 5.00),
(57, 2, 10, 'School of Computing (SOC)', '2026-06-15', '08:00:00', '09:00:00', 1.00, '', NULL, 'reserved', 'not_required', NULL, NULL, NULL, '2026-06-12 06:34:31', '2026-06-12 06:34:31', 0, 'not_required', 0.00),
(58, 3, 11, 'School of Computing (SOC)', '2026-06-15', '08:00:00', '09:00:00', 1.00, '', NULL, 'completed', 'returned', NULL, '2026-06-12 14:38:50', NULL, '2026-06-12 06:36:25', '2026-06-12 06:38:50', 0, 'not_required', 0.00);

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

--
-- Dumping data for table `class_timetable`
--

INSERT INTO `class_timetable` (`timetable_id`, `facility_id`, `day_of_week`, `start_time`, `end_time`, `class_name`) VALUES
(1, 11, 'Tuesday', '08:00:00', '10:00:00', 'Scheduled Class'),
(2, 12, 'Tuesday', '08:00:00', '10:00:00', 'Scheduled Class'),
(3, 13, 'Tuesday', '08:00:00', '10:00:00', 'Scheduled Class'),
(4, 11, 'Tuesday', '13:00:00', '15:00:00', 'Scheduled Class'),
(5, 12, 'Tuesday', '13:00:00', '15:00:00', 'Scheduled Class'),
(6, 13, 'Tuesday', '13:00:00', '15:00:00', 'Scheduled Class');

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
  `image_path` varchar(255) DEFAULT NULL,
  `availability_status` enum('available','unavailable','maintenance') DEFAULT 'available',
  `key_required` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `visible_to` enum('student','staff','both') DEFAULT 'both',
  `additional_info` text DEFAULT NULL,
  `equipment` text DEFAULT NULL,
  `booking_flow_type` enum('normal_approval','payment_required','direct_reservation','staff_key_approval') DEFAULT 'normal_approval'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `facilities`
--

INSERT INTO `facilities` (`facility_id`, `facility_name`, `facility_type`, `location`, `max_people`, `operating_start`, `operating_end`, `description`, `rules`, `image_path`, `availability_status`, `key_required`, `created_at`, `visible_to`, `additional_info`, `equipment`, `booking_flow_type`) VALUES
(1, 'STEM Lab', 'Laboratory', 'Level 3', 30, '08:00:00', '16:30:00', 'Technology and robotics workspace for hands-on learning and innovation.', '- Booking must be made at least 30 minutes before the session.\r\n- Food and drinks are not allowed.\r\n- Closing time is 4:30 PM.\r\n- Students must present their Student ID to the staff in exchange for an access card.\r\n- The access card must be returned to the AFM office or the security guard after use in order to retrieve the Student ID.', 'uploads/stem_lab.jpg', 'available', 0, '2026-05-24 07:24:25', 'both', NULL, NULL, 'normal_approval'),
(7, 'Table Tennis', 'Sports Facility', 'Level 2', 4, '08:00:00', '16:30:00', 'Indoor recreational facility equipped for table tennis activities.', '- Booking must be made at least 30 minutes before the session.\r\n- Food and drinks are not allowed.\r\n- Charges: RM5 per hour.\r\n- If students fail to collect the balls and equipment within 10 minutes after the booking time, the booking will be cancelled and opened to others.\r\n- Closing time is 4:30 PM.\r\n- Students must provide their Student ID to collect the balls and equipment from the AFM office.\r\n- The same person must return the balls and equipment to retrieve their Student ID.\r\n- Balls and equipment cannot be passed to another person without permission from AFM staff.', 'uploads/table_tennis.jpg', 'available', 0, '2026-06-07 04:32:14', 'both', NULL, NULL, 'payment_required'),
(8, 'Pool Table', 'Sports Facility', 'Level 2', 4, '08:00:00', '16:30:00', 'A recreational facility for students to play pool during available time slots.', '- Booking must be made at least 30 minutes before the session.\r\n- Food and drinks are not allowed.\r\n- Charges: RM5 per hour.\r\n- If students fail to collect the balls and equipment within 10 minutes after the booking time, the booking will be cancelled and opened to others.\r\n- Closing time is 4:30 PM.\r\n- Students must provide their Student ID to collect the balls and equipment from the AFM office.\r\n- The same person must return the balls and equipment to retrieve their Student ID.\r\n- Balls and equipment cannot be passed to another person without permission from AFM staff.', 'images/pool-table.jpg', 'available', 0, '2026-06-07 07:03:36', 'both', NULL, NULL, 'payment_required'),
(9, 'Music Room', 'Music Facility', 'Level 2', 10, '08:00:00', '16:30:00', 'A dedicated room for music practice and student activities.', '- Booking must be made at least 30 minutes before the session.\r\n- No advance booking is allowed.\r\n- Maximum usage time is 2 hours only.\r\n- Food and drinks are not allowed in the room.\r\n- Every Tuesday and Friday, the Music Room is closed for cleaning from 9:00 AM – 10:00 AM and will only operate from 10:00 AM onwards.\r\n- If students fail to collect the key within 10 minutes after the booking time, the booking will be cancelled and opened to others.\r\n- Closing time is 4:30 PM.\r\n- Students must provide their Student ID to collect the key from the AFM office.\r\n- The same person must return the key to retrieve their Student ID.\r\n- Keys cannot be passed to another person without permission from AFM staff.', 'images/music-room.jpg', 'available', 0, '2026-06-07 07:03:36', 'both', NULL, NULL, 'normal_approval'),
(10, 'Cubicle', 'Study Space', 'Level 3', 1, '08:00:00', '16:30:00', 'A private study cubicle for individual study and focused work.', '- Booking must be made at least 30 minutes before the session.\r\n- No admin approval is required.\r\n- Users must check in by scanning the QR code at the cubicle.\r\n- Check-in is allowed from 15 minutes before the booking time until 15 minutes after the booking time.\r\n- If the user does not check in within the allowed time range, the cubicle reservation will be cancelled and opened to others.\r\n- Food and drinks are not allowed.\r\n- Closing time is 4:30 PM.', 'images/cubicle.jpg', 'available', 0, '2026-06-07 07:45:35', 'both', NULL, NULL, 'direct_reservation'),
(11, 'CC Lab', 'Laboratory', 'Level 2', 30, '08:00:00', '16:30:00', 'Computer lab available for staff booking outside scheduled class time.', '- Staff can only book available time slots.\r\n- Bookings cannot overlap with scheduled classes.\r\n- Staff must follow the official lab timetable before making a booking.', 'images/cc-lab.jpg', 'available', 1, '2026-06-11 05:45:14', 'staff', NULL, NULL, 'staff_key_approval'),
(12, 'AI Lab', 'Laboratory', 'Level 2', 30, '08:00:00', '16:30:00', 'Artificial Intelligence lab available for staff booking outside scheduled class time.', '- Staff can only book available time slots.\r\n- Bookings cannot overlap with scheduled classes.\r\n- Staff must follow the official lab timetable before making a booking.', 'images/ai-lab.jpg', 'available', 1, '2026-06-11 05:45:14', 'staff', NULL, NULL, 'staff_key_approval'),
(13, 'LR501', 'Classroom', 'Level 5', 40, '08:00:00', '16:30:00', 'Lecture room available for staff booking outside scheduled class time.', '- Staff can only book available time slots.\r\n- Bookings cannot overlap with scheduled classes.\r\n- Staff must follow the official timetable before making a booking.', 'images/lr501.jpg', 'available', 1, '2026-06-11 05:45:14', 'staff', NULL, NULL, 'staff_key_approval'),
(14, 'Cubicle 2', 'Study Space', 'Level 3', 1, '08:00:00', '16:30:00', 'A private study cubicle for individual study and focused work.', '- Booking must be made at least 30 minutes before the session.\n- No admin approval is required.\n- Users must check in by scanning the QR code at the cubicle.\n- Check-in is allowed from 15 minutes before the booking time until 15 minutes after the booking time.\n- If the user does not check in within the allowed time range, the cubicle reservation will be cancelled and opened to others.\n- Food and drinks are not allowed.\n- Closing time is 4:30 PM.', 'data:image/webp;base64,UklGRpZaAABXRUJQVlA4IIpaAACQeQGdASraAUgBPp1Cm0mlo6IqqrNNSVATiWMYn3KO4A2oPr9R+V17fWj3+Sn8m+kAc/h/MR9t71nqU3IXOl+uDHR70BleeXfy/+48QfQD9d268G/xfgl91nRvtf/w//N4o/M3/i9RH27/vOEVuj/4fUj+Aftf/c+6z5Vvsf2c9fv5D/S+wN/g/ST/p+MP6D7BH87/xPrE/73m', 'available', 0, '2026-06-11 14:53:14', 'both', 'Cubicle uses direct reservation. No admin approval is required, but users must check in within the allowed check-in time.', '', 'direct_reservation');

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
(1, 2, 'STEM Lab Booking Approved', 'Your booking for STEM Lab on 20 May 2026 from 10:00 AM - 12:00 PM has been approved.', 'booking', 1, '2026-05-24 07:56:51', NULL),
(2, 3, 'Waiting List Update', 'You are now first in the waiting list for STEM Lab.', 'waitlist', 1, '2026-05-24 07:56:51', NULL),
(3, 2, 'Key Return Reminder', 'Please return the STEM Lab key before 12:15 PM.', 'key_return', 1, '2026-05-24 07:56:51', NULL),
(4, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-05-25 03:33:41', 13),
(5, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-05-25 04:51:08', 14),
(6, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-05-25 07:06:48', 15),
(7, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-05-25 07:13:07', 16),
(8, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-05-28 02:01:49', 17),
(9, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-04 01:50:11', 18),
(10, 2, 'Booking Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-04 01:55:10', 19),
(11, 2, 'Payment Required', 'Your booking request has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-07 06:32:54', 20),
(12, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-07 07:06:49', 21),
(13, 2, 'Payment Required', 'Your booking request has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-07 07:10:55', 22),
(14, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-07 07:12:43', 23),
(15, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-07 07:19:58', 24),
(16, 2, 'Payment Required', 'Your booking request has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-07 07:20:07', 25),
(17, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-08 13:48:29', 26),
(18, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-08 13:53:18', 27),
(19, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-08 14:25:55', 28),
(20, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-08 14:26:43', 29),
(21, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 03:30:55', 30),
(22, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 05:36:19', 31),
(23, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 06:38:12', 32),
(24, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 07:17:41', 33),
(25, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 10:14:59', 34),
(26, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 14:07:37', 35),
(27, 2, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 14:08:22', 36),
(28, 2, 'Payment Required', 'Your booking request has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-11 14:08:42', 37),
(29, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 14:09:41', 38),
(30, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-11 15:01:29', 39),
(31, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 01:07:04', 40),
(32, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 02:15:40', 41),
(33, 1, 'New Booking Request', 'A new booking request for CC Lab has been submitted and requires review.', '', 1, '2026-06-12 02:59:13', 42),
(34, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 02:59:13', 42),
(36, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 02:59:33', 43),
(37, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 03:07:24', 44),
(38, 1, 'New Booking Request', 'A new booking request for LR501 has been submitted and requires review.', '', 1, '2026-06-12 03:07:38', 45),
(39, 3, 'Booking Request Submitted', 'Your booking request has been submitted successfully.', 'booking', 1, '2026-06-12 03:07:38', 45),
(40, 2, 'Reservation Successful', 'Your reservation of Cubicle 2 has been successful.', 'booking', 1, '2026-06-12 03:29:23', 46),
(41, 1, 'New Booking Request', 'A new booking request for Music Room has been submitted and requires review.', '', 1, '2026-06-12 03:29:41', 47),
(42, 2, 'Booking Submitted', 'Your booking request of Music Room has been submitted successfully.', 'booking', 1, '2026-06-12 03:29:41', 47),
(43, 2, 'Payment Required', 'Your booking request of Pool Table has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-12 03:30:00', 48),
(44, 1, 'New Booking Request', 'A new booking request for Pool Table has been submitted and requires review.', '', 1, '2026-06-12 03:30:00', 48),
(45, 2, 'Reservation Successful', 'Your reservation of Cubicle has been successful.', 'booking', 1, '2026-06-12 03:31:20', 49),
(46, 3, 'Reservation Successful', 'Your reservation of Cubicle 2 has been successful.', 'booking', 1, '2026-06-12 03:42:52', 50),
(47, 1, 'New Booking Request', 'A new booking request for LR501 has been submitted and requires review.', '', 1, '2026-06-12 03:43:11', 51),
(48, 3, 'Booking Submitted', 'Your booking of LR501 has been submitted. Please wait for admin approval.', 'booking', 1, '2026-06-12 03:43:11', 51),
(49, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 04:14:20', 41),
(50, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 04:14:24', 41),
(51, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 04:14:32', 41),
(52, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 04:21:12', 41),
(53, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 04:39:10', 41),
(54, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:27:23', 41),
(55, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:27:27', 41),
(56, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:29:48', 41),
(57, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:51:08', 41),
(58, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:51:11', 41),
(59, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:59:42', 41),
(60, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:59:48', 41),
(61, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 05:59:57', 41),
(62, 3, 'Booking Approved', 'Your booking request of LR501 has been approved. Please go to AFM to collect the key.', '', 1, '2026-06-12 06:00:22', 51),
(63, 2, 'Booking Approved', 'Your booking request of Music Room has been approved.', '', 1, '2026-06-12 06:00:25', 47),
(64, 2, 'Booking Approved', 'Your booking request of Pool Table has been approved.', '', 1, '2026-06-12 06:00:27', 48),
(65, 3, 'Key Return Reminder', 'Reminder: Please return the key for CC Lab as your booking time has ended.', '', 1, '2026-06-12 06:01:45', 41),
(66, 1, 'New Booking Request', 'A new booking request for STEM Lab has been submitted and requires review.', '', 1, '2026-06-12 06:16:23', 52),
(67, 2, 'Booking Submitted', 'Your booking request of STEM Lab has been submitted successfully.', 'booking', 1, '2026-06-12 06:16:23', 52),
(68, 2, 'Payment Required', 'Your booking request of Table Tennis has been submitted. Please proceed to AFM to make payment.', 'booking', 1, '2026-06-12 06:16:39', 53),
(69, 1, 'New Booking Request', 'A new booking request for Table Tennis has been submitted and requires review.', '', 1, '2026-06-12 06:16:39', 53),
(70, 2, 'Reservation Successful', 'Your reservation of Cubicle has been successful.', 'booking', 1, '2026-06-12 06:16:51', 54),
(71, 1, 'New Booking Request', 'A new booking request for STEM Lab has been submitted and requires review.', '', 0, '2026-06-12 06:34:07', 55),
(72, 2, 'Booking Submitted', 'Your booking request of STEM Lab has been submitted successfully.', 'booking', 0, '2026-06-12 06:34:07', 55),
(73, 2, 'Payment Required', 'Your booking request of Table Tennis has been submitted. Please proceed to AFM to make payment.', 'booking', 0, '2026-06-12 06:34:19', 56),
(74, 1, 'New Booking Request', 'A new booking request for Table Tennis has been submitted and requires review.', '', 0, '2026-06-12 06:34:19', 56),
(75, 2, 'Reservation Successful', 'Your reservation of Cubicle has been successful.', 'booking', 0, '2026-06-12 06:34:31', 57),
(76, 3, 'Booking Submitted', 'Your booking of CC Lab has been submitted. Please wait for admin approval.', 'booking', 0, '2026-06-12 06:36:25', 58),
(77, 1, 'New Booking Request', 'A new booking request for CC Lab has been submitted and requires review.', '', 0, '2026-06-12 06:36:25', 58),
(78, 3, 'Booking Approved', 'Your booking request of CC Lab has been approved. Please go to AFM to collect the key.', '', 0, '2026-06-12 06:37:40', 58);

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

--
-- Dumping data for table `qr_codes`
--

INSERT INTO `qr_codes` (`qr_id`, `booking_id`, `qr_token`, `qr_type`, `qr_status`, `expiry_time`, `scanned_at`, `created_at`) VALUES
(1, 5, 'QR_BOOKING_5_RETURN', 'key_return', 'active', '2026-05-20 12:30:00', NULL, '2026-05-24 08:22:27');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `user_code`, `email`, `password`, `role`, `status`, `must_change_password`, `created_at`) VALUES
(1, 'Admin User', 'P24011234', 'P24011234@admin.newinti.edu.my', 'admin123', 'admin', 'active', 1, '2026-05-22 03:06:33'),
(2, 'Student User', 'P24012345', 'P24012345@student.newinti.edu.my', 'student123', 'student', 'active', 0, '2026-05-22 03:06:33'),
(3, 'Staff User', 'P24013456', 'P24013456@staff.newinti.edu.my', 'staff123', 'staff', 'active', 0, '2026-05-22 03:06:33');

-- --------------------------------------------------------

--
-- Table structure for table `waitlist`
--

CREATE TABLE `waitlist` (
  `waitlist_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `facility_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `queue_position` int(11) NOT NULL,
  `status` enum('waiting','notified','accepted','cancelled') DEFAULT 'waiting',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `waitlist`
--

INSERT INTO `waitlist` (`waitlist_id`, `user_id`, `facility_id`, `booking_date`, `start_time`, `end_time`, `queue_position`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 1, '2026-05-20', '10:00:00', '12:00:00', 1, 'waiting', '2026-05-24 07:54:03', '2026-05-24 07:54:03'),
(2, 3, 1, '2026-05-20', '10:00:00', '12:00:00', 2, 'waiting', '2026-05-24 07:54:03', '2026-05-24 07:54:03');

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
-- Indexes for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD PRIMARY KEY (`waitlist_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `class_timetable`
--
ALTER TABLE `class_timetable`
  MODIFY `timetable_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `facilities`
--
ALTER TABLE `facilities`
  MODIFY `facility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `qr_codes`
--
ALTER TABLE `qr_codes`
  MODIFY `qr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `waitlist`
--
ALTER TABLE `waitlist`
  MODIFY `waitlist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- Constraints for table `class_timetable`
--
ALTER TABLE `class_timetable`
  ADD CONSTRAINT `class_timetable_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

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

--
-- Constraints for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD CONSTRAINT `waitlist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `waitlist_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
