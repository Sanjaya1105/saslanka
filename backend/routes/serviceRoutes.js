const express = require("express");
const router = express.Router();
const ServiceRecordController = require("../controller/ServiceRecordController");
const authenticateToken = require("../middleware/auth");

// Route to create a new service record with parts usage
router.post("/create", authenticateToken, ServiceRecordController.createServiceRecord);

// Route to add parts to an existing service record and generate invoice
router.post("/:serviceId/add-parts", authenticateToken, ServiceRecordController.addPartsToServiceRecord);

// Route to get all service records
router.get("/", authenticateToken, ServiceRecordController.getAllServiceRecords);

// Route to get a service record by ID
router.get("/:id", authenticateToken, ServiceRecordController.getServiceRecordById);

// Route to get service records by vehicle number
router.get("/vehicle/:vehicleNumber", authenticateToken, ServiceRecordController.getServiceRecordsByVehicle);

// Route to get service records by date range
router.get("/date-range/:startDate/:endDate", authenticateToken, ServiceRecordController.getServiceRecordsByDateRange);

module.exports = router; 