var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');
var auth = require('../auth');

//endpoint for creating articles
router.post('/', auth.required, function (req, res, next) {
   User.findById(req.payload.id).then(function (user) {
       if(!user) { return res.sendStatus(401);}

       var article = new Article(req.body.article);
       article.author = user;
       return article.save().then(function () {
           console.log(article.author);
           return res.json({article: article.toJSONFor(user)});
       });
   }).catch(next);
});

//endpoint for intercept and prepopulate article data from the slug
router.param('article', function (req,res,next,slug) {
   Article.findOne({ slug: slug}).populate('author').then(function (article) {
       if(!article) { return res.sendStatus(404);}
       req.article = article;
       return next();
   }).catch(next);
});

//endpoint for retrieve an article by its slug
router.get('/:article', auth.optional, function (req,res,next) {
   Promise.all([
       req.payload ? User.findById(req.payload.id) : null,
       req.article.populate('author').execPopulate()
   ]).then(function (results) {
       var user = results[0];
       return res.json({article: req.article.toJSONFor(user)});
   }).catch(next);
});

//endpoint for updating the article
router.put('/:article', auth.required, function (req,res,next) {
   User.findById(req.payload.id).then(function (yser) {
      if(req.article.author._id.toString() === req.payload.id.toString()){
          if(typeof req.body.article.title !== 'undefined'){
              req.article.title = req.body.article.title;
          }
          if(typeof req.body.article.body !== 'undefined'){
              req.article.body = req.body.article.body;
          }
          if(typeof req.body.article.description !== 'undefined'){
              req.article.description = req.body.article.description;
          }
          req.article.save().then(function (article) {
              return res.json({article: article.toJSONFor(user)});
          }).catch(next);
      }
      else {
          return res.sendStatus(403);
      }
   });
});

//endpoint for deleting articles
//204 status code for req successfully handled and no content returned.
//403 - server understood the req but refuse to authorize it.
router.delete('/:article', auth.required, function (req,res,next) {
   User.findById(req.payload.id).then(function () {
       if(req.article.author._id.toString() === req.payload.id.toString()){
           return req.article.remove().then(function () {
               return res.sendStatus(204)
           });
       }
       else{
           res.sendStatus(403);
       }
   })
});

//endpoint for fav articles
router.post('/:articles/favorite', auth.required, function (req, res, next) {
   var articleId = req.article._id;

   User.findById(req.payload.id).then(function (user) {
       if(!user) return res.sendStatus(401);

       return user.favorite(articleId).then( function () {
           return req.article.updateFavCount().then( function (article) {
               return res.json({article: article.toJSONFor(user)});
           });
       });
   }).catch(next);
});

//endpoint for unfav articles
router.delete('/:articles/favorite', auth.required, function (req, res, next) {
   var articleId = req.article._id;

   User.findById(req.payload.id).then(function (user) {
       if(!user) return res.sendStatus(401);

       return user.favorite(articleId).then( function () {
           return req.article.updateFavCount().then( function (article) {
               return res.json({article: article.toJSONFor(user)});
           });
       });
   }).catch(next);
});

//crete comments
router.post('/:articles/comments', auth.required, function (req,res,next) {
   User.findById(req.payload.id).then(function (user) {
       if(!user) return res.sendStatus(401);

       var comment = new Comment(req.body.comment);
       comment.article = req.article;
       comment.author = user;

       return comment.save().then(function () {
           req.article.comments.push(comment);
           return req.article.save().then(function (article) {
               res.json({comment: comment.toJSONFor(user)});
           });
       });
   }).catch(next);
});

//list out all the comments
router.get('/:articles/comments', auth.optional, function (req, res, next) {
    Promise.resolve( req.payload ? User.findById(req.payload.id) : null).then(function (user) {
        return req.article.populate({
            path: 'comments',
            populate: {
                path: 'author'
            },
            options:{
                sort:{
                    createdAt:'desc'
                }
            }
        }).execPopulate().then(function (article) {
            return res.json({comments: req.article.comments.map(function (comment) { return comment.toJSONFor(user); })});
        });
    }).catch(next);
});

//endpoint to delete the comment. First we will need a param middleware for resolving comment.
router.param('comment', function (req,res,next,id) {
    Comment.findById(id).then(function (comment) {
        if(!comment) return res.sendStatus(404);
        req.comment = comment;
        return next();
    }).catch(next);
});

//now delete a comment
// 204 - The server has successfully fulfilled the request and that there is no additional content to send in the response payload body.
//403 - The server understood the request but refuses to authorize it.

router.delete('/:article/comments/:comment', auth.required, function (req,res,next) {
    if(req.comment.author.toString() === req.payload.id.toString()){
        req.article.comments.remove(req.comment._id);
        req.article.save().then(Comment.find({_id: req.comment._id}).remove().exec()).then(function () {
            res.sendStatus(204);
        });
    } else{
        res.sendStatus(403);
    }
});

//show all the articles
router.get('/feed', auth.required, function (req,res,next) {
   var limit = 20;
   var offset = 0;

    if(typeof req.query.limit != 'undefined'){
        limit = req.query.limit;
    }

    if(typeof req.query.offset != 'undefined'){
        offset = req.query.offset;
    }

    User.findById(req.payload.id).then(function (user) {
        if(!user) return res.sendStatus(401);

        Promise.all([
           Article.find({ auther: {$in: user.following}})
        ]).then(function (results) {
            var articles = results[0];
            var articleCount = results[1];

            return res.json({
                articles: article.map(function (article) {
                    return article.toJSONFor(user);
                }),
                articleCount: articleCount
            });
        }).catch(next);
    })

});

module.exports= router;