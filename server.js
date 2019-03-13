const express = require("express")
const morgan = require("morgan")
var bodyParser = require('body-parser')
const mongoose = require("mongoose")
const passport = require("passport")
const session = require('express-session')
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user")
const Article = require("./models/article")
const fs = require("fs")
const ObjectID = require('mongodb').ObjectID;
const path = require("path")

const multer = require('multer')

// SET STORAGE ENGINE
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

//Init Upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1000000,
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }
}).single("picture");

//Check File Type

function checkFileType(file, cb) {
    //Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;

    //Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    //Check mimetype
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb("Error: Images Only")
    }
}



mongoose.connect('mongodb://localhost/hw8');

const app = express();
app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.use(express.static('public'));



app.use(session({
    secret: '@l!',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 6000000
    }
}));

app.use(passport.initialize());
app.use(passport.session());



app.use(bodyParser.urlencoded({
    'extended': 'false'
})); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json




passport.use('local-login', new LocalStrategy(function (username, password, done) {

    User.findOne({
        username: username
    }, function (err, user) {

        if (err) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>err');
            return done(err);
        }

        if (!user) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>!user');
            return done(null, false, {})
        }

        if (user.password !== password) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>pass');
            return done(null, false, {})
        }

        console.log('+++++++++++++++++++++user');
        return done(null, user)
    })
}));

passport.serializeUser(function (user, done) {
    console.log(user.id);
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

function isLogedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.redirect("/login");
    }
}

app.get('/login', function (req, res) {
    res.render("login.ejs")
})

app.post('/authentication', passport.authenticate('local-login', {
    failureRedirect: '/coming-soon'
}), function (req, res) {
    console.log(req.body);
    res.redirect('/article');
});

app.get('/coming-soon', function (req, res) {
    res.send('comming soon')
})


app.get('/article', isLogedIn, function (req, res) {
    Article.find({}, function (err, articles) {
            if (err)
                res.send(err);
            res.render('article.ejs', {
                articles
            })

        })
        .populate('author');

    //  روش زیر هم درسته
    // Article.find({}, function (err, articles) {
    //     if (err)
    //         res.send(err);

    //     articles.forEach(function (article, index) {
    //         User.findById(article.author, function (err, user) {
    //             if (err)
    //                 res.send(err);

    //             article.author = user.firstName;
    //             if (index == articles.length - 1) {
    //                 res.render("article.ejs", {
    //                     articles
    //                 })
    //             }
    //         })
    //     })

    // })

})


app.get('/', function (req, res) {
    res.render("index.ejs")
})

app.get("/register", function (req, res) {
    res.render("register.ejs")
})

app.post("/get-data", function (req, res) {
    if (!req.body) return res.sendStatus(400)

    const REQ_BODY_USER = req.body;
    const NEW_USER = new User({
        firstName: REQ_BODY_USER.firstname,
        lastName: REQ_BODY_USER.lastname,
        username: REQ_BODY_USER.username,
        password: REQ_BODY_USER.password
    })
    NEW_USER.save(function (err, user) {
        if (err)
            return console.log(err)

        res.render("register.ejs", {
            msg: "Seccess"
        });
    })
})

app.get("/create-article", isLogedIn, function (req, res) {

    res.render("create-article.ejs")
})

app.post("/save-article", isLogedIn, function (req, res) {
    if (!req.body) return res.sendStatus(400)


    upload(req, res, function (err) {
        if (err) {
            res.render("create-article.ejs", {
                msg: err
            })
        } else {
            if (req.file == undefined) {
                res.render("create-article.ejs", {
                    msg: "Error: No File Selected!"
                })
            } else {
                const REQ_BODY_ARTICLE = req.body;
                const NEW_ARTICLE = new Article({
                    name: REQ_BODY_ARTICLE.name,
                    author: req.user._id,
                    shortTxt: REQ_BODY_ARTICLE.abstract,
                    longTxt: REQ_BODY_ARTICLE.article,
                    date: REQ_BODY_ARTICLE.date,
                    link: REQ_BODY_ARTICLE.name,
                    pic: "uploads/" + req.file.filename

                })
                NEW_ARTICLE.save(function (err, article) {
                    if (err)
                        return console.log(err)
                    res.render("create-article.ejs", {
                        msg: "File Uploaded!"
                    })
                })

            }
        }

    })


})


app.get("/article/:cont", isLogedIn, function (req, res) {

    let news;
    Article.findOne({
        name: req.params.cont
    }, function (err, article) {
        if (err)
            res.send(err);
        res.render("read-article.ejs", {
            name: article.name,
            author: article.author.firstName + " " + article.author.lastName,
            shortTxt: article.shortTxt,
            longTxt: article.longTxt,
            date: article.date,
            pic: "../" + article.pic

        })
        //روش زیر هم درسته
        // User.findById(article.author, function (err, user) {
        //     if (err)
        //         res.send(err);
        //     res.render("read-article.ejs", {
        //         name: article.name,
        //         author: user.firstName,
        //         shortTxt: article.shortTxt,
        //         longTxt: article.longTxt,
        //         date: article.date,
        //         pic: "../" + article.pic

        //     })

        // })

    }).populate('author');

})


app.get("/view-articles", isLogedIn, function (req, res) {
    if (!req.body) return res.sendStatus(400)
    Article.find({
        author: req.user._id
    }, function (err, articles) {
        if (err)
            res.send(err);
        res.render("view-articles2.ejs", {
            articles
        })

        // articles.forEach(function (article, index) {
        //     User.findById(article.author, function (err, user) {
        //         if (err)
        //             res.send(err);

        //         console.log(user.firstName);
        //         article.author = user.firstName;
        //         console.log(article.author);
        //         if (index == articles.length - 1) {
        //             res.render("view-articles2.ejs", {
        //                 articles
        //             })
        //         }
        //     })
        // })



    }).populate('author');
})



app.listen(80);