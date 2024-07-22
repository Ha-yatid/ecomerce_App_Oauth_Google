const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
let refreshTokens = [];

const generateAccessToken = (user) => {
    return jwt.sign({ username: user.username, role: user.role }, accessTokenSecret, { expiresIn: '10m' });
};

const generateRefreshToken = (user) => {
    const refreshToken = jwt.sign({ username: user.username, role: user.role }, refreshTokenSecret);
    refreshTokens.push(refreshToken);
    return refreshToken;
};

const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const newUser = new User({ username, password: hashedPassword, role });
        await newUser.save();
        res.status(201).send('User registered');
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

        res.json({ 
            message: `Login successfully. Welcome ${user.role === 'admin' ? 'Admin' : 'User'}.`,
            role: user.role
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const token = (req, res) => {
    try{
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

module.exports = {
    register,
    login,
    token,
    logout
};
