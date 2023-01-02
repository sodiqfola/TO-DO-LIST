//jshint esversion:8

// all installed dependencies
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
// const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oidc");
const findOrCreate = require("mongoose-findorcreate");
// const mailchimp = require("@mailchimp/mailchimp_marketing");


// for using express
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
// to accses public files(css, js,imgs etc)
app.use(express.static("public"));
// sets the view page to ejs/ enable usage of ejs
app.set("view engine", "ejs");

//this is get the session started and also create cookies
app.use(
  session({
    secret: "damn i hope this shit works",
    resave: false,
    saveUninitialized: false,
    cookie: {}
  })
);

// get passport package started
app.use(passport.initialize());
app.use(passport.session());

// connecting mongoose to localhost 27017 and creating secretUserDB
mongoose.set("strictQuery", true); // disables a certain warning
mongoose.connect("mongodb://localhost:27017/TodoAppDB");

//the schema for the users
const TodoAppSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  googleId: String,
  Task: Array,
});

//schema for new list
const NewListSchema = new mongoose.Schema({
  title: String,
  newTask: Array,
});
//initializes installed plugin
TodoAppSchema.plugin(passportLocalMongoose);
TodoAppSchema.plugin(findOrCreate);

//creating user
const User = new mongoose.model("User", TodoAppSchema);
const NewList =  mongoose.model("NewList", NewListSchema);

const item1 = new User({
  Task: "Welcome to your to do list",
});
const item2 = new User({
  Task: "Hit the + button to add a new item",
});
const itemsarray = [item1, item2];
//getting date
const date = new Date();
const date2 = date.toLocaleDateString('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});

//getting user model to use passport
passport.use(User.createStrategy());

//serializing&deserializing our users with passport
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, email: user.email });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//using google strategy for authentication(0auth)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/ToDoApp", //this has to be the same in has the one in your app credentials(G cloud, API's consent screen)
    },
    function (issuer, profile, cb) {
      // all that would be returned from google
      User.findOrCreate(
        {
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
        },
        function (err, user) {
          console.log(profile);
          return cb(err, user);
        }
      );
    }
  )
);


//needed to route auth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

// redirects user/ open google sign in page
app.get(
  "/auth/google/ToDoApp",
  //authenticating your users
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect To do  page.
    console.log("google authenticated");
    res.redirect("/");
  }
);


app.route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    // creates new user and compares with db
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        //locally authenticate users
        passport.authenticate("local")(req, res, function () {
          res.redirect("/Home");
        });
      }
    });
  });

app
  .route("/Register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    //registers user manually
    User.register(
      { username: req.body.username, email: req.body.email },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          //locally authenticate users
          passport.authenticate("local")(req, res, function (err) {
            console.log(err);

            res.redirect("/Home");
          });
        }
      }
    );
  });

app.get("/Logout", function (req, res, next) {
  //log users out of the session
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

// the route to do home page

app.get("/", function (req, res) {
  res.redirect("/Home");
});
app.get("/Home", function (req, res) {
  //checks if the user is authenticated
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          //if user is found, then it pushess two defualts info to the app
          console.log("found user");
          if (foundUser.Task.length === 0) {
            foundUser.Task.push(item1);
            foundUser.Task.push(item2);
            foundUser.save();

            res.redirect("/Home");
            return;
          } else {
            res.render("index", {
              ListTitle: "Today",
              TodayDate: date2,
              NewTasks: foundUser.Task,
            });
           
          }
        } else {
          res.redirect("/Register");
        }
      }
    });
  } else {
    //if user isn't it authenticated redirects to login in page
    res.redirect("/login");
  }
});



//receives new list value
app.post("/NEW_LIST", function(req, res) {
  const newList = req.body.CustomList;
  //finds the list
   NewList.findOne({ title: newList }, function (err, foundNewList) {
     console.log(foundNewList);
     if (!err) {
       if (!foundNewList) {
         //create a new list
         const List = new NewList({
           title: newList,
          //  newTask: itemsarray,
         });
         List.save();
         res.redirect("/" + newList);
      
       } else {
         //renders an already existing list          
            res.redirect("/" + newList);   
       }
     }
   });
});


//Route for new LIST (creates a new list route)
app.get('/:NEW_LIST', function(req, res) {
  const newList =  req.params.NEW_LIST;
  
  NewList.findOne({ title: newList }, function (err, foundNewList) {
    
    if (!err) {
      if (!foundNewList) {
        //create a new list
        const List = new NewList({
          title: newList,
          newTask: itemsarray
        });
        List.save();
        res.render("index", {
          ListTitle: foundNewList.title,
          TodayDate: date2,
          NewTasks: foundNewList.newTask,
        });// renders new list
        return;
      } else {
        //renders an already existing list
        res.render("index", {
          ListTitle: foundNewList.title,
          TodayDate: date2,
          NewTasks: foundNewList.newTask,
        });
        return;
      }
    }else{console.log(err);}
  });
});

// // for the added tasks
app.post("/Home", function (req, res) {
  const newTask = req.body.newTask;
  const listName = req.body.add;

 // stores uses new added task
  const newtask = new User({
    Task: newTask,
  });
  // const newtask2 = new NewList ({
  //   Task: newTask,
  // });

  if(listName === 'Today') {
    User.findById(req.user.id, function (err, user) {
      if (listName === "Today") {
        user.Task.push(newtask);
        user.save(); //saves added task
        console.log("task added");
        res.redirect("/Home");
      } else {
        console.log("errors");
      }
    });
  }else{
     NewList.findOne({ title: listName }, function (err, foundlist) {
       if (!err) {     
         foundlist.newTask.push(newtask); //pushes new task to the list
         foundlist.save();
         res.redirect("/" + listName);
       } else {
         console.log(err);
       }
     });
  }
  
 
});


app.post("/delete", function (req, res) {
  const checkedTask = req.body.deleteIcon; //returns the value of the delete task
  const delList = req.body.delCustomList;//returns the list in which it was created
 
  if (delList === "Today") {
    User.findById(req.user.id, function (err, foundUser) { //finds the user with the given id
      if (err) {
        console.log(err);        
      } else {       
        foundUser.Task.forEach(function (task) {

          if (task.Task[0] === checkedTask) {// task.Task[0] gives the value of the task itself
            //console.log(task.Task);    // returns the task value as an object.               
            console.log("match");                    
            User.updateOne(
              { _id: req.user.id },
              { $pull: { Task: task } },// removes the task from the database
              function (err, results) {
                if (err) {
                  console.log(err);
                } else {
                  res.redirect("/Home");
                }
              }
            );
          
          } else {
            console.log("no match");
            
          }
        });

        
      }
    });
  }else{
    //delete the task from the list
    NewList.findOneAndUpdate({title: delList}, {$pull: {newTask:{ Task: checkedTask }}}, function(err, results){
      if (!err) {
        res.redirect("/" + delList);
      } else {
        console.log(err);
      }
    });
  }
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("server running at port 3000");
});


//code to make mailchimp api work


//sets mailchimp up
// mailchimp.setConfig({
//   apiKey: process.env.API_KEY,
//   server: "us8",
// });

//this sends a response back to my mailchimp list
// const listId = process.env.LIST_ID;
// const subscribingUser = {
//   firstName: req.body.username,
//   lastName: " ",
//   email: req.body.email,
// };

// async function run() {
//   const response = await mailchimp.lists.addListMember(listId, {
//     email_address: subscribingUser.email,
//     status: "subscribed",
//     merge_fields: {
//       FNAME: subscribingUser.firstName,
//       LNAME: subscribingUser.lastName,
//     },
//   });

//   console.log(
//     `Successfully added contact as an audience member & The contact's status is ${response.status}`
//   );
// }
// run();
//ends here

//  if(!err){
//   if(listName === 'Today'){
//     if(user){
//       User.updateOne(
//         { _id: req.user.id },
//         { $push: { Task: newTask } },
//         function(err){
//             if (err) {
//               console.log(err);
//             } else {
//               res.redirect("/");
//             }
//         }
//       );
//     }
//   }
//  }else{
//    console.log(err);
//  }

// for the added tasks
// app.post('/', function(req,res){
//    const newTask = req.body.newTask;
//    const listName = req.body.add;

//    const newtask = new User({
//      Task: newTask,
//    });
//    if(listName === "Today"){
//     newtask.save();
//     res.redirect('/');
//   }else{
//     console.log('errorss');
//   }
// });
