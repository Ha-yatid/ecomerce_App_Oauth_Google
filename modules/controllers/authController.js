const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

require('dotenv').config();

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
let refreshTokens = [];

// Configurer Nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

const generateAccessToken = (user) => {
    return jwt.sign({ username: user.username, role: user.role }, accessTokenSecret, { expiresIn: '10m' });
};

const generateRefreshToken = (user) => {
    const refreshToken = jwt.sign({ username: user.username, role: user.role }, refreshTokenSecret);
    refreshTokens.push(refreshToken);
    return refreshToken;
};

// Envoyer l'email de vérification
const sendVerificationEmail = (user, code) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Email Verification',
        text: `Please verify your email using the following code: ${code}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending verification email:', error);
        } else {
            console.log('Verification email sent:', info.response);
        }
    });
};

const sendLoginNotification = (user) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Login Notification',
        text: `You have logged in at ${new Date().toISOString()}`
    };
    transporter.sendMail(mailOptions);
};
// Send Password Reset Email
const sendPasswordResetEmail = (user, token) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Password Reset',
        text: `You can reset your password using the following code: ${token}`
    };
    transporter.sendMail(mailOptions);
};

const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const emailVerificationCode = Math.random().toString(36).substring(2, 15); // Générer un code aléatoire
        const newUser = new User({ username, email, password: hashedPassword, role, emailVerificationCode });
        await newUser.save();

        sendVerificationEmail(newUser, emailVerificationCode);

        res.status(201).send('User registered. Please check your email to verify your account.');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid credentials');
        }
        const accessToken = generateAccessToken({ username: user.username, role: user.role });
        const refreshToken = generateRefreshToken({ username: user.username, role: user.role });

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

        sendLoginNotification(user);

        res.json({ 
            message: `Login successfully. Welcome ${user.role === 'admin' ? 'Admin' : 'User'}.`,
            role: user.role
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
        await user.save();

        sendPasswordResetEmail(user, resetToken);

        res.send('Password reset email sent.');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await User.findOne({ email, resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }
        user.password = await bcrypt.hash(newPassword, 8);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.send('Password reset successful');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const token = (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).send('Refresh token required');
        }
        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).send('Invalid refresh token');
        }
        jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
            if (err) {
                return res.status(403).send('Invalid refresh token');
            }
            const accessToken = generateAccessToken({ username: user.username, role: user.role });
            res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });
            res.json({ accessToken });
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send(err.message);
    }
};

const logout = (req, res) => {
    const { refreshToken } = req.cookies;
    refreshTokens = refreshTokens.filter(t => t !== refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(204).send();
};

const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }
        if (user.emailVerificationCode !== code) {
            return res.status(400).send('Invalid verification code');
        }
        user.isEmailVerified = true;
        user.emailVerificationCode = undefined;
        await user.save();
        res.send('Email verified successfully');
    } catch (err) {
        res.status(500).send(err.message);
    }
};



module.exports = {
    register,
    login,
    token,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword
};
