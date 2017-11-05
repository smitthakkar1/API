var mongoose = require('mongoose');
var unique = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;

//The {timestamps: true} option creates a createdAt and updatedAt field on our models that contain timestamps
// which will get automatically updated when our model changes.
// mongoose validations - http://mongoosejs.com/docs/validation.html

// Cookies Vs Tokens - https://auth0.com/blog/angularjs-authentication-with-cookies-vs-token/

var UserSchema = new mongoose.Schema({
    username: {type: String, lowercase:true, unique: true, required: [true,"can't be blank"], match: [/^[a-zA-Z0-9]+$/, "Username is invalid"], index: true},
    email: {type: String, unique: true, required:[true,"can't be blank"], lowercase:true, match:[/^[a-zA-Z0-9]+$/, "Email is invalid"] },
    bio: String,
    image: String,
    hash: String,
    salt: String
}, {timestamps: true});

//method to hash the password

UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = function (password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.generateJWT = function () {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
       id: this.id,
       username: this.username,
       exp: parseInt(exp.getTime() / 1000)
    }, secret);
};

UserSchema.methods.toAuthJSON = function () {
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    };
};

UserSchema.methods.toProfileJSONFor = function () {
  return{
      username: this.username,
      bio: this.bio,
      image: this.image || 'http://demo.joomsky.com/car-manager/wp-content/themes/car-manager/images/not-login-icon.png',
      following: false
  };
};
mongoose.model('User', UserSchema); // register User model.