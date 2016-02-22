
var mongoose = require('mongoose'),
	crypto = require('crypto'),
	db = mongoose.connection,
	Schema = mongoose.Schema,
	UserSchema,  User,
	express = require("express")
	bodyParser = require('body-parser'),
	session = require('express-session'),
	app = express(),
	cool = require('cool-ascii-faces');
	//port = 3000,
	KedLib = require("./lib");;


app.set('port', (process.env.PORT || 3005));
app.use(express.static(__dirname + '/public'));


//Set up the listeners for the mongo database
db.on('error', function(err){
	console.log("Error during database Connection" + err);
});

db.once('open', function(){
	console.log("Database Successfully Connected");
	configureModels(); // We run operations within this event because we can guarantee that the connection is established

	//KedLib.clearUser(User); //Run if we want to delete all users

	checkCreateDefaultUser(); // Checks to ensure that there is at least the default user within the database
});

//Establish connection with the mongo database called COMP3550 on the local machine
//mongoose.connect('mongodb://127.0.0.1/SWeng1');
mongoose.connect('mongodb://heroku_app35151497:auq6okd8jjscufcluum96ki3ia@ds061278.mongolab.com:61278/heroku_app35151497');//note if the database does not exist it will created it automatically

function configureModels(){
	//Set up the values that are acceptable to the database
	UserSchema = Schema({
		username : { type: String, index: { unique: true }},
		password : String, 
		salt : {type: String , default: KedLib.genRandomString(12)},
		AmtOfFiles : Number,
		Files :[ {number : Number,fileName:String ,key: String} ]
		
	});

	// We set the behaviour before the save event occurs
	// This behaviour will ensure that all passwords are encrypted before saving
	UserSchema.pre('save', function(next){
		//Using "this" gives access to the current model calling the function
		var hpass = crypto
					.createHash('sha1')
					.update(this.password + this.salt)
					.digest('hex');
		this.password = hpass; //Assign the hashed password to the password field of the current model
  		next(); // run the next event (which usually will be the save)
	});

	// To improve our modularity (specifically to adhere to SRP) we will allow the model to retain the knowledge required to authenticate itself

	UserSchema.methods.authenticate = function(password, callback){
		// If based on the results of the authentication we will execute the callback with information that will inform the program of the its state (authentication passed or failed)

		var tempHash = crypto
					.createHash('sha1')
					.update(password + this.salt)
					.digest('hex');
		if (tempHash === this.password){
			if (callback){
				callback(this); //I can pass anything here (as I am creating my own api)
			}
			return true;
		}
		callback(null);
		return false;
	}

	// Associate the Schema we created to a collection(database)
	// And store the reference to the Collection in the User variable as a model.
	User = mongoose.model('User', UserSchema);

}

// ***** Configuring Express *****
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({secret:"sadf3234",saveUninitialized: true,resave: true, username:"" }));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//=================================================================================================================

	

function checkCreateDefaultUser(){
	// We are using this function to create a default user.
	//This make sense to actually access the system. (some installations require the user to actually set the credentials manually)

	User.find({}, function(err, data){
		if (err)return;
		if (data.length < 1){ //Collection is empty therefore we can create a default user
			console.log("No User Detected: Creating Default User");
			var u = new User({
				username : 'admin',
				password : 'password', 
				AmtOfFiles : 0,
				Files : []

			});

			u.save(function(err, user){
				if (err)console.log("Error occured while saving user "+ err);
				else console.log("User saved Successfully");
				console.log(user); 
			});
		}
	});
}

// // ***** Configuring Express *****
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
// app.use(session({secret:"sadf3234",saveUninitialized: true,resave: true }));

function checkAuth(req, res, next){
	if(!req.session.user){ //If user not set in the session we not logged in
		//Display appropriate error along with appropriate error code
		res.status(401).send("You are not authorized to view this page");
	}else{
		//We are logged in so we run the next operation (which is what we defined in the method call)
		next();
	}
}

app.get("/", function(req, res){
	var options = {
		root: __dirname+'/public/',
		dotfiles: 'deny',
		headers:{
			'x-timestamp':Date.now(),
			'x-sent' : true
		}
	};
	res.sendFile('FileEncryption.html',options,function(err){
		if(err){
			console.log(err);
			res.status(err.status).end();
		}
		else
			console.log("sent login page");
	})
});


//We pass the second function to check authentication as the second parameter
app.get("/priviledge", checkAuth, function(req, res){
	console.log(req.session.username);
	res.status(200).send("priviledged page");
});

app.get("/logout", checkAuth, function(req, res){
	req.session.user=false;
	res.send("logged out");
});


app.post('/login', function (req, res) {
	// We read the username and password from the body
	//Typically we will submit via a form, which will encapsulate the data in the body of the POST request
	var post = req.body;
	console.log(post);
	if (post.username && post.password ){ //check to ensure username is passed
		console.log("Username and password supplied");

		// Attempt to find the username that matches the information supplied
		User.find({"username": post.username}, function(err, users){
			if (err){
				console.log("error occurred: " + err);
				res.status(500).send("unable to log in user");
			}else{
				if (users.length > 0){ // We found a user that matched the username
					console.log("Successfully retrieved user from database");
					var u = users[0]; //we know that the username will be unique
					u.authenticate(post.password, function(result){
						if (result){
							req.session.user = result;
							req.session.username=post.username;
							req.session.save(function(err){
								res.redirect("/priviledge");

							});
						}else{
							res.send("Incorrect Username and password");
						}
					})
				}else{ // No user with the username was found
					console.log("No Username found");
					res.send("Incorrect Username and password");
				}
			}
		});
	}else{
		res.send("must supply username and password");
	}
});

app.post("/signup", function(req, res){
	var post = req.body;
	if (post.username && post.password){
		

		var u = new User({
			username: post.username,
			password: post.password,
			AmtOfFiles : 0,
			Files : []
		});

		u.save(function(err){
			if (err){
				console.log("unable to save user" + err);
				res.status(500).send("Unable to save user");
			}else{
				console.log("user saved Successfully");
				res.status(200).send("saved user");
			}
		});
	}
});
//=================================================================================================================

app.get("/data",function(req,res){
	User.find({}, function(err, data){
		if (err)return;
		res.json(data);
	});
});


app.get("/keys",checkAuth,function(req,res){
	User.find({"username":req.session.username},function(err,data){
		if(err)return;
		var keys=[];
		data[0].Files.forEach(function(el){
			var s={"fileName":el.fileName,"key":el.key};
			keys.push(s);
		})
		res.json(keys);
	});
});

app.get("/files",checkAuth,function(req,res){
	User.find({"username":req.session.username},function(err,data){
		if(err)return;
		var keys=[];
		data[0].Files.forEach(function(el){
			var s={"fileName":el.fileName};
			keys.push(s);
		})
		res.json(keys);
	})
});


app.post("/addKey",checkAuth,function(req,res){
	var post = req.body;

	User.find({"username":req.session.username},function(err,data){
		if(err)return;
		console.log(data);
		obj={
			"number":data[0].AmtOfFiles+1,
			"fileName": post.name,
			"key": post.key
		};
		console.log(obj);
		User.update({username:req.session.username},{$push:{Files:obj}},function(err,a){
			if(err)res.send("error");
			console.log(a);
		});
		User.update({username:req.session.username},{$inc:{AmtOfFiles:1}},function(err,a){
			if(err)res.send("error");
			console.log(a);
		});
		res.send("saved");
	});
	User.find({"username":req.session.username},function(err,data){
		if(err)return;
		console.log(data);
	});
	res.send("user not found");
});

app.get("/deletekey/:file",checkAuth,function(req,res){
	var key= req.param('file');
	User.update({username:req.session.username},{$pull:{Files:{fileName:key}}},function(err,a){
		if(err)send("error")
			console.log(a);
		res.send("deleted");
	});

});

app.get("/key/:file",checkAuth,function(req,res){
	var key = req.param('file');
	User.find({"username":req.session.username},function(err,data){
		if(err)return;
		var keys=[];
		var a;
		data[0].Files.forEach(function(el){
			if(el.fileName===key)
			a = {"key":el.key};
		})
		res.json(a);
	});

})
// app.get("/delete")

/*

app.post("/save",function(req,res){
	var post = req.body;

	Room.find({"room":post.room
				// "building": post.building,
				// "faculty": post.faculty,
				}, function(err, data){
		if (err){
			console.log("unable to save room" + err);
			return;
		}
		if (data.length === 0){ //room doesnt exist
			console.log("here");
			var u = new Room({
				room: post.room,
				building: post.building,
				faculty: post.faculty,
				picture: post.picture,
				latitude: post.latitude,
				longitude: post.longitude
				
			});

		u.save(function(err){
			if (err){
				console.log("unable to save room" + err);
				res.status(500).send("Unable to save room");
			}else{
				console.log("room saved Successfully");
				res.send("saved room");
			}
		});
			

			
		}
		else{
			res.send("room already exist");
		}


	});

});



app.get("/room/:key",function(req,res){
	var key= req.param('key');
	console.log(key);
	key=key.replace("%2", " ");
	Room.find({"room":key}, function(err, data){
		if (err)return;
		res.json(data);
	});


});

app.get("/faculty/:key",function(req,res){
	var key= req.param('key');
	console.log(key);
	key=key.replace("%2", " ");
	Room.find({"faculty":key}, function(err, data){
		if (err || data.length===0)return;
		res.json(data);
	});


});

app.get("/building/:key",function(req,res){
	var key= req.param('key');
	console.log(key);
	key=key.replace("%2", " ");
	Room.find({"building":key}, function(err, data){
		if (err || data.length===0){
			res.json(data);
			return;}
		res.json(data);
	});


});

app.get("/delete/:key",function(req,res){
	Room.find({"room":req.param('key')}).remove(function(err){
		if (err)console.log(err);
		else res.send("item : "+req.param('key')+"deleted");
	});
});

app.get("/deleteall",function(req,res){
	Room.find({}).remove(function(err){
		if (err)console.log(err);
		else res.send("All items deleted");
	});
});
app.get("/", function(req, res){
	

console.log("[200] " + req.method + " to " + req.url);
  res.writeHead(200, "OK", {'Content-Type': 'text/html'});
  res.write('<html><head><title>Hello Noder!</title></head><body>');
  res.write('<h1>Welcome Noder, who are you?</h1>');
  res.write('<form action="/save" method="POST">');//url!!!
  res.write('Faculty: <input type="text" name="faculty" /><br />');
  res.write('Building: <input type="text" name="building" /><br />');
  res.write('Room: <input type="text" name="room" /><br />');
  res.write('Longitude: <input type="text" name="longitude" /><br />');
  res.write('Latitude: <input type="text" name="latitude" /><br />');
  res.write('Picture: <input type="text" name="picture" /><br />');
  res.write('<input type="submit" />');
  res.write('</form> ');

//   res.write('<form action="/room" method="GET">');
//   res.write('room: <input type="text" name="room" /><br />');
//   res.write('<input type="submit" />');
// res.write('</form> ');

//   res.write('<form action="/faculty" method="GET">');
//   res.write('faculty: <input type="text" name="faculty" /><br />');
//   res.write('<input type="submit" />');
// res.write('</form> ');

  //  res.write('<form action="/building" method="GET">');
  // res.write('building: <input type="text" name="building" /><br />');
  // res.write('<input type="submit" />');
  // res.write('</form> ');


  	res.write('</body></html');
  res.end();


});




// app.listen(port);
// console.log("Application started at http://127.0.0.1:" + port);
*/




app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
