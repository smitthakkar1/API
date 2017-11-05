var mongoose = require('mongoose');
var passport = require('passport');
var router = require('express').Router();
var User = mongoose.model('User');
var auth = require('../auth');

router.use('/', require('./users'));

router.post('/users', function (req,res,next) {
   var user = new User();
   user.username = req.body.user.username;
   user.email = req.body.user.email;
   user.setPassword(req.body.user.password);

 //When user.save() is called, a promise is returned for us to handle. If the promise is resolved, that means the user was saved
    // successfully, and we return the user's auth JSON. If the promise gets rejected, we use .catch() to pass the error to our error handler.
   user.save().then(function () {
       return res.json({user: user.toAuthJSON()});
   }).catch(next);
});

//First, we're checking to make sure an email and password were provided by the front-end and respond with a 422 status code if
// they're not. Then, we pass the incoming request to passport.authenticate and specify that we want to use the local strategy
// we made previously (in config/passport.js). Since we're using JWTs for authentication and not using sessions, we also specify
// {session: false} to prevent Passport from serializing the user into the session. Finally, we define a callback for the passport
// strategy (this gets used as the done function in our LocalStrategy in config/passport.js) that will respond to the client based
// off if the authentication was successful or not.

router.post('/users/login', function (req, res, next) {
   if(!req.body.user.email){
      return res.status(422).json({errors:{email:"can't be blank"}});
   }
   if(!req.body.user.password){
      return res.status(422).json({errors:{password:"can't be blank"}});
   }
   passport.authenticate('local',{session: false}, function (err, user, info) {
       if(err){ return next(err)};
       if(user){
          user.token =  user.generateJWT();
          return res.json({user: user.toAuthJSON()});
       }
       else{
          return res.status(422).json(info);
       }
   })(req,res,next)
});

router.get('/users', auth.required, function (req,res,next) {
   User.findById(req.payload.id).then(function (user) {
      if(!user) { return res.sendStatus(401);}
      return res.json({user: user.toAuthJSON()});
   }).catch(next);
});

router.put('/user', auth.required, function (req,res,next) {
   User.findById(req.payload.id).then(function (user) {
       if(!user) { return res.sendStatus(401);}

       // only update fields that were actually passed...
       if(typeof req.body.user.username !== 'undefined'){
           user.username = req.body.user.username;
       }
       if(typeof req.body.user.email !== 'undefined'){
           user.email = req.body.user.email;
       }
       if(typeof req.body.user.bio !== 'undefined'){
           user.bio = req.body.user.bio;
       }
       if(typeof req.body.user.password !== 'undefined'){
           user.password = req.body.user.password;
       }
       if(typeof req.body.user.image !== 'undefined'){
           user.image = req.body.user.image;
       }

       return user.save().then(function () {
           return res.json({user: user.toAuthJSON()});
       });
   }).catch(next);
});
module.exports = router;