require("dotenv").config();

// Create appointment (Customer only)
exports.createAppointment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is a customer
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: "Forbidden: Only customers can create appointments" });
        }

        const {
            vehicle_number,
            vehicle_type,
            service_type,
            phone_number,
            appointment_date,
            appointment_time,
            status_ = 'Pending'  // Default status
        } = req.body;

        // Validate appointment date
        const currentDate = new Date();
        const selectedDate = new Date(appointment_date);
        
        if (selectedDate < currentDate.setHours(0,0,0,0)) {
            return res.status(400).json({ 
                message: "Invalid date. Appointment date must be today or a future date." 
            });
        }

        // Validate time slot format
        const validTimeSlots = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];
        if (!validTimeSlots.includes(appointment_time)) {
            return res.status(400).json({ 
                message: "Invalid time slot. Available slots are: 8:00 AM, 9:30 AM, 11:00 AM, 12:30 PM, 2:00 PM, 3:30 PM" 
            });
        }

        const db = req.db;

        // Check if the time slot is already booked for the selected date
        db.execute(
            `SELECT COUNT(*) as count 
             FROM appointment 
             WHERE appointment_date = ? 
             AND appointment_time = ?
             AND status_ != 'Cancelled'`,
            [appointment_date, appointment_time],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results[0].count > 0) {
                    return res.status(400).json({ 
                        message: "This time slot is already booked. Please select a different time." 
                    });
                }

                // If time slot is available, create the appointment
                db.execute(
                    `INSERT INTO appointment (
                        user_id, vehicle_number, vehicle_type, service_type, phone_number, status_,
                        appointment_date, appointment_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.user.user_id,
                        vehicle_number,
                        vehicle_type,
                        service_type,
                        phone_number || req.user.phone_number, // Use provided phone number or user's phone number
                        status_,
                        appointment_date,
                        appointment_time
                    ],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        res.status(201).json({ 
                            message: "✅ Appointment created successfully",
                            appointment_id: result.insertId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Create Appointment Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};




exports.getAvailableTimeSlots = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { date } = req.params;
        const allTimeSlots = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];

        // Validate date format
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }

        // Check if date is not in the past
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return res.status(400).json({ message: "Cannot check availability for past dates" });
        }

        const db = req.db;
        db.execute(
            `SELECT appointment_time 
             FROM appointment 
             WHERE appointment_date = ?
             AND status_ != 'Cancelled'`,
            [date],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                // Get booked time slots
                const bookedSlots = results.map(row => row.appointment_time.slice(0, 5));
                
                // Filter out booked slots to get available slots
                const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

                // If the date is today, filter out past time slots
                if (selectedDate.toDateString() === new Date().toDateString()) {
                    const currentHour = new Date().getHours();
                    const currentMinutes = new Date().getMinutes();
                    
                    const availableSlotsForToday = availableSlots.filter(slot => {
                        const [hours, minutes] = slot.split(':').map(Number);
                        return (hours > currentHour) || (hours === currentHour && minutes > currentMinutes);
                    });

                    return res.status(200).json({
                        date: date,
                        available_slots: availableSlotsForToday
                    });
                }

                res.status(200).json({
                    date: date,
                    available_slots: availableSlots
                });
            }
        );
    } catch (error) {
        console.error("Get Available Time Slots Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};