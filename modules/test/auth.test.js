const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const { expect } = chai;
chai.use(chaiHttp);



describe('Authentication Tests', () => {
    //declare collection user
    let testUser = {
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'testpassword'
    };

    let verificationCode;

    //clear collection before the test 
    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/register', () => {
        it('should register a new user and send a verification email', (done) => {
            chai.request(app)
                .post('/api/register')
                .send(testUser)
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.text).to.equal('User registered. Please check your email to verify your account.');
                    User.findOne({ email: testUser.email }).then(user => {
                        expect(user).to.not.be.null;
                        expect(user.email).to.equal(testUser.email);
                        expect(user.isEmailVerified).to.be.false;
                        verificationCode = user.emailVerificationCode;
                        done();
                    }).catch(done);
                });
        });
    });

    describe('POST /api/verify-email', () => {
        it('should verify user email with the correct code', (done) => {
            chai.request(app)
                .post('/api/verify-email')
                .send({ email: testUser.email, code: verificationCode })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.text).to.equal('Email verified successfully');
                    User.findOne({ email: testUser.email }).then(user => {
                        expect(user).to.not.be.null;
                        expect(user.isEmailVerified).to.be.true;
                        done();
                    }).catch(done);
                });
        });
    });

    describe('POST /api/login', () => {
        it('should log in a user and send a notification email', (done) => {
            chai.request(app)
                .post('/api/login')
                .send({ username: testUser.username, password: testUser.password })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').to.equal('Login successfully. Welcome User.');
                    done();
                });
        });
    });

    describe('POST /api/reset-password-request', () => {
        it('should request a password reset and send a reset code to the user\'s email', (done) => {
            chai.request(app)
                .post('/api/reset-password-request')
                .send({ email: testUser.email })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.text).to.equal('Password reset email sent');
                    User.findOne({ email: testUser.email }).then(user => {
                        expect(user).to.not.be.null;
                        expect(user.resetPasswordCode).to.not.be.undefined;
                        done();
                    }).catch(done);
                });
        });
    });

    describe('POST /api/reset-password', () => {
        it('should reset the user password with the correct reset code', (done) => {
            User.findOne({ email: testUser.email }).then(user => {
                chai.request(app)
                    .post('/api/reset-password')
                    .send({
                        email: testUser.email,
                        code: user.resetPasswordCode,
                        newPassword: 'newpassword'
                    })
                    .end((err, res) => {
                        expect(res).to.have.status(200);
                        expect(res.text).to.equal('Password has been reset successfully');
                        done();
                    });
            }).catch(done);
        });
    });
});
