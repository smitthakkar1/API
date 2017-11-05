//We need to create error handling middleware to convert mongoose validation errors to something our front-end can consume,
// otherwise, our server will return it as a 500 Internal Server Error by default.

var router = require('express').Router();


//When a middleware is defined with four arguments, it will be treated as an error handler (the first argument is always the error
// object). This error handler sits after all of our API routes and is used for catching ValidationErrors thrown by mongoose.
// The error handler then parses the error into something our front-end can understand, and then responds with a 422 status code.

router.use('/', require('./users'));
router.use('/profiles', require('./profiles'));

router.use(function (err, req, res, next) {
   if(err.name === 'ValidationError'){
       return res.status(422).json({
           errors:Object.keys(err.errors).reduce(function (errors, key) {
               errors[key] = err.errors[key].message;
               return errors;
           },{})
       });
   }
   return next(err);
});
module.exports = router;
