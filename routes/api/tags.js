var router = require('express').Router();
var mongoose = require('mongoose');
var Article = mongoose.model('Article');

//router for getting the set of tags, used on articles.
router.get('/', function (req, res, next) {
   Article.find().distinct('tagList').then(function (tags) {
     return res.json({tags: tag});
   }).catch(next);
});

module.exports = router;