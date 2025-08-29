require("dotenv").config();

// Create a new vehicle profile
exports.createVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const {
            vehicle_number,
            user_id,
            make,
            model,
            year_of_manuf,
            engine_details,
            transmission_details,
            vehicle_colour,
            vehicle_features,
            condition_,
            owner_
        } = req.body;

        // Validate required fields
        if (!vehicle_number || !make || !model) {
            return res.status(400).json({ 
                message: "Vehicle number, make, and model are required fields" 
            });
        }

        const db = req.db;

        // Check if vehicle_number already exists
        db.execute(
            "SELECT * FROM vehicle_profile WHERE vehicle_number = ?",
            [vehicle_number],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length > 0) {
                    return res.status(400).json({ 
                        message: "❌ Vehicle with this number already exists" 
                    });
                }

                // Insert the new vehicle profile
                db.execute(
                    `INSERT INTO vehicle_profile (
                        vehicle_number, user_id, make, model, year_of_manuf,
                        engine_details, transmission_details, vehicle_colour,
                        vehicle_features, condition_, owner_
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        vehicle_number,
                        user_id || req.user.user_id,
                        make,
                        model,
                        year_of_manuf || null,
                        engine_details || null,
                        transmission_details || null,
                        vehicle_colour || null,
                        vehicle_features || null,
                        condition_ || null,
                        owner_ || null
                    ],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        
                        res.status(201).json({
                            message: "✅ Vehicle profile created successfully",
                            vehicle_number: vehicle_number
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Create Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all vehicle profiles
exports.getAllVehicleProfiles = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        // If user is admin, show all vehicles; otherwise, show only user's vehicles
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile ORDER BY make, model"
            : "SELECT * FROM vehicle_profile WHERE user_id = ? ORDER BY make, model";
        
        const params = req.user.role === 'admin' ? [] : [req.user.user_id];
        
        db.execute(query, params, (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Get Vehicle Profiles Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};