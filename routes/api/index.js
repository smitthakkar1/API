//We need to create error handling middleware to convert mongoose validation errors to something our front-end can consume,
// otherwise, our server will return it as a 500 Internal Server Error by default.

var router = require('express').Router();


//When a middleware is defined with four arguments, it will be treated as an error handler (the first argument is always the error
// object). This error handler sits after all of our API routes and is used for catching ValidationErrors thrown by mongoose.
// The error handler then parses the error into something our front-end can understand, and then responds with a 422 status code.

router.use('/', require('./users'));
router.use('/profiles', require('./profiles'));
router.use('/articles', require('./articles'));
router.use('/tags', require('./tags'));

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

router.get('/', auth.optional, function (req,res,next) {
   var query = {};
   var limit = 20;
   var offset = 0;

   if(typeof req.query.limit != 'undefined'){
       limit = req.query.limit;
   }

    if(typeof req.query.offset != 'undefined'){
        offset = req.query.offset;
    }

    if(typeof req.query.tag != 'undefined'){
        query.tagList = {"$in" : [req.query.tag]};
    }

    Promise.all([
        req.query.author ? User.findOne({username: req.query.author}) : null,
        req.query.favorited ? User.findOne({username: req.query.favorited}) : null
    ]).then(function (results) {
       var author = results[0];
       var favoriter = results[1];

       if(author){
           query.author = author._id;
       }

       if(favoriter){
           query._id = {$in: favoriter.favorites};
       } else if(req.query.favorited){
           query._id = {$in: []};
       }
    });

    return Promise.all([
       Article.find(query).limit(Number(limit)).skip(Number(offset))
           .sort({createdAt: 'desc'}).populate('author').exec(),
        Article.count(query).exec(),
        Article.count(query).exec(),
        req.payload ? User.findById(req.payload.id) : null,
    ]).then(function (results) {
        var articles = results[0];
        var articlesCount = results[1];
        var user = results[2];

        return res.json({
           articles: articles.map(function (article) {
               return article.toJSONFor(user);
           }),
            articlesCount: articlesCount
        });
    }).catch(next);
});


module.exports = router;
