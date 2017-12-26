var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require("crypto"); 
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    email: {type: String, unique: true, lowercase: true},
    password: {type: String},
    facebook: String,
    tokens: Array,
    profile: {
        name: {type: String, default: ''},
        picture: {type: String, default: ''}
    },
    address: {type: String},
    history: [{
        paid: {type: Number, default: 0},
        item: {type: Schema.Types.ObjectId, ref: 'Product'}
    }]
});

/* Hashing the password */
UserSchema.pre('save', function (next) {
    var user = this;
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(10, (err, salt) => {
        if (err) return next(err);
        bcrypt.hash(user.password, salt, null, (err, hash) => {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

/* Comparing Password with database's user's Password */
UserSchema.methods.comparePassword =  function(password) {
    return bcrypt.compareSync(password, this.password);
}

UserSchema.methods.gravatar = function(size) {
    if (!this.size) size = 200;
    if (!this.email) return "https://gravatar.com/?s" + size + "&d=retro";
    var md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return "https://gravatar.com/avatar/" + md5 + "?s=" + size + "&d=retro";
}

module.exports = mongoose.model('User', UserSchema);