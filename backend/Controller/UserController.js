const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();


// ✅ Update User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, nic, phone_number, email } = req.body;
        const db = req.db;

        // ✅ Check if user exists
        db.execute("SELECT * FROM user WHERE user_id = ?", [id], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ User not found!" });
            }

            // ✅ Update user details
            db.execute(
                "UPDATE user SET first_name=?, last_name=?, nic=?, phone_number=?, email=? WHERE user_id=?",
                [first_name, last_name, nic, phone_number, email, id],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });

                    res.status(200).json({ message: "✅ User updated successfully" });
                }
            );
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Delete User
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db;

        // ✅ Check if user exists
        db.execute("SELECT * FROM user WHERE user_id = ?", [id], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ User not found!" });
            }

            // ✅ Delete user
            db.execute("DELETE FROM user WHERE user_id = ?", [id], (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                res.status(200).json({ message: "✅ User deleted successfully" });
            });
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Verify token
exports.verifyToken = async (req, res) => {
    try {
        // If we get here, it means the token was valid (checked by authenticateUser middleware)
        res.status(200).json({ 
            message: "✅ Token is valid",
            user: {
                id: req.user.user_id,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error("Token Verification Error:", error);
        res.status(401).json({ message: "❌ Token verification failed" });
    }
};

// ✅ Update User Password
exports.updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_password, new_password } = req.body;
        const db = req.db;

        if (!current_password || !new_password) {
            return res.status(400).json({ message: "❌ Current password and new password are required" });
        }

        // ✅ Check if user exists
        db.execute("SELECT * FROM user WHERE user_id = ?", [id], async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ User not found!" });
            }

            const user = results[0];

            // ✅ Verify current password
            const isMatch = await bcrypt.compare(current_password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "❌ Current password is incorrect" });
            }

            // ✅ Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // ✅ Update password
            db.execute(
                "UPDATE user SET password = ? WHERE user_id = ?",
                [hashedPassword, id],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });

                    res.status(200).json({ message: "✅ Password updated successfully" });
                }
            );
        });
    } catch (error) {
        console.error("Update Password Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
