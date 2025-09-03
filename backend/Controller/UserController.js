const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ✅ Create a New User (Auto-Increment `user_id`)
exports.createUser = async (req, res) => {
    try {
        const { first_name, last_name, nic, phone_number, email, password, role } = req.body;
        const db = req.db;

        // ✅ Validate role
        const validRoles = ['customer', 'technician', 'admin'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ message: "🚨 Invalid role. Must be one of: customer, technician, admin" });
        }

        // ✅ Validate phone number (starts with 0 and 10 digits)
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({ message: "🚨 Invalid phone number. Must start with 0 and be exactly 10 digits." });
        }

        // ✅ Validate NIC (old: 9 digits + V/X, new: 12 digits)
        const nicRegex = /^(?:\d{9}[VvXx]|\d{12})$/;
        if (!nicRegex.test(nic)) {
            return res.status(400).json({ message: "🚨 Invalid NIC. Must be 9 digits + V/X or 12 digits." });
        }

        // ✅ Check if email, phone number, or NIC already exists
        db.execute(
            "SELECT * FROM user WHERE email = ? OR phone_number = ? OR nic = ?",
            [email, phone_number, nic],
            async (err, existingUsers) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (existingUsers.length > 0) {
                    const conflictFields = [];
                    existingUsers.forEach(user => {
                        if (user.email === email) conflictFields.push("email");
                        if (user.phone_number === phone_number) conflictFields.push("phone number");
                        if (user.nic === nic) conflictFields.push("NIC");
                    });

                    return res.status(400).json({ message: `🚨 Already in use: ${conflictFields.join(", ")}` });
                }

                // ✅ Hash Password
                const hashedPassword = await bcrypt.hash(password, 10);

                // ✅ Insert new user
                db.execute(
                    "INSERT INTO user (first_name, last_name, nic, phone_number, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [first_name, last_name, nic, phone_number, email, hashedPassword, role || 'customer'],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });

                        res.status(201).json({
                            message: "✅ User created successfully",
                            user_id: result.insertId,
                            role: role || 'customer'
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};


// ✅ LOGIN USER (Using Cookie-Based Authentication)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = req.db;

        // ✅ Fetch user from MySQL database
        db.execute("SELECT * FROM user WHERE email = ?", [email], async (err, users) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (users.length === 0) {
                return res.status(400).json({ message: "❌ Invalid credentials" });
            }

            const user = users[0];

            // ✅ Compare hashed password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "❌ Invalid credentials" });
            }

            // ✅ Generate JWT Token with enhanced security
            const token = jwt.sign(
                { 
                    user_id: user.user_id, 
                    email: user.email,
                    role: user.role // Include role in the token
                }, 
                process.env.JWT_SECRET, 
                { 
                    expiresIn: "1h",
                    algorithm: 'HS256'
                }
            );

            // ✅ Send token as HTTP-Only Cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: 'strict',
                maxAge: 3600000,
                path: '/',
                domain: process.env.NODE_ENV === "production" ? process.env.DOMAIN : 'localhost'
            }).status(200).json({
                message: "✅ Login successful",
                user: {
                    id: user.user_id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role, // Include role in the response
                    nic: user.nic,
                    phone_number: user.phone_number
                }
            });
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ LOGOUT USER (Clear Cookie)
exports.logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict',
        expires: new Date(0),
        path: '/',
        domain: process.env.NODE_ENV === "production" ? process.env.DOMAIN : 'localhost'
    }).status(200).json({ message: "✅ Logged out successfully" });
};

// ✅ Get All Users
exports.getUsers = async (req, res) => {
    try {
        const db = req.db;
        db.execute("SELECT * FROM user", (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            res.status(200).json(results);
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

