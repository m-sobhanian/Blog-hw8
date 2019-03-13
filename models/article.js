const mongoose = require("mongoose")
const Schema = mongoose.Schema;
const article = new Schema({
    name: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    shortTxt: String,
    longTxt: String,
    date: String,
    link: String,
    pic: String

})

module.exports = mongoose.model("article", article);