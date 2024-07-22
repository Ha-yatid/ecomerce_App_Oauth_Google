const express = require('express');
const passport = require('passport');
const path = require('path'); 
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
//const authMiddleware = require('./middlewares/authMiddleware');


const app = express();
require('./auth');
require('dotenv').config();

app.use(express.json());
app.use(express.static(path.join(__dirname,'..', 'client')));


function isLoggedIn(req, res,next){
   req.user ? next() : res.sendStatus(401);
}




app.get('/', (req, res) => {
    console.log('Request received for /');
    res.sendFile(path.join(__dirname, '..','client', 'index.html'));
    console.log('Response sent for /');
});

app.use(session({
    secret: 'mysecret',
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false}
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', authRoutes); 


app.get('/auth/google',
    passport.authenticate('google', { scope:
        [ 'email', 'profile' ] }
));
  
app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/protected',
        failureRedirect: '/auth/google/failure'
}));

app.get('/auth/google/failure',isLoggedIn,(req,res)=>{
res.send('Something went wrong !');
});

app.get('/auth/protected',isLoggedIn,(req,res)=>{
    let name = req.user.displayName;
    res.send(`Hello ${name} !`);
});

module.exports = app;
