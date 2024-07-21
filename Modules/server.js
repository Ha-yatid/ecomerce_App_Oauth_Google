// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// dotenv.config();

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => console.log('MongoDB connected...'))
//     .catch(err => console.error('MongoDB connection error:', err));

const mongoose = require('mongoose');
const app = require('./index');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected...');
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));
