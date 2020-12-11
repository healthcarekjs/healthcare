var mailer = require('nodemailer');
require("dotenv").config();


var transporter  = mailer.createTransport({
    service:'gmail',
    auth:{
        user: process.env.EMAIL,
        pass : process.env.PASSWORD
    }
});

module.exports = transporter;