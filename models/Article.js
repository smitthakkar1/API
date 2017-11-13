var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug'); // package that we will use to auto generate URL slugs
var User = mongoose.model('User');

var ArticleSchema = new mongoose.Schema({
    slug: {type: String, lowercase: true, unique: true},
    title: String,
    description: String,
    body: String,
    favCount: {type: Number, default: 0},
    tagList: [{type: String}],
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
},{ timestamp: true });

ArticleSchema.plugin(uniqueValidator, {message: 'is already taken'});

ArticleSchema.methods.slugify = function () {
  this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36,6) | 0).toString(36);
};

ArticleSchema.pre('validate', function (next) {
   if(!slug) {
       this.slugify();
   }
   next();
});

ArticleSchema.methods.toJSONFor = function (user) {
    return{
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        favCount: this.favCount,
        tagList: this.tagList,
        author: this.author.toProfileJSONFor(user),
        favorited: user ? user.isFav(this._id) : false,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

ArticleSchema.methods.updateFavCount = function () {
    var article = this;
    return User.count({
        favorites: {$in : [article._id]}}).then(function (count) {
       article.favCount = count;
       return article.save();
    });
};

mongoose.model('Article', ArticleSchema);