
var mongoose = require('mongoose'),
	crypto = require('crypto'),
	db = mongoose.connection,
	Schema = mongoose.Schema,
	UserSchema,  UserModel; 


// We can setup listeners to run based on the events of the connection to the mongo database
db.on('error', function(err){
	console.log("Error in database connection");
	console.log(err);
});


// we can only perform operations after we are successfully connected to the database
db.once('open', function (){
	console.log("database connected");
	setupEntities();
	retrievingRecords();
});

//Establish connection with the mongo database called COMP3550 on the local machine
mongoose.connect('mongodb://127.0.0.1/comp3550'); //note if the database does not exist it will created it automatically


function setupEntities(){
	//Define how the Data is stored in the Database
	UserSchema = Schema({
		username: String,
		password: String,
		salt	: String
	});
	//Register the Data Definition as a User within the database
	UserModel = mongoose.model('User', UserSchema);
}

function populateEntities(){
	var usrObj = {
		username: "kyle",
		password: "password",
		salt	: "salt"
	}

	var ku = new UserModel(usrObj);

	//Create a set of default users
	var u1 = new UserModel({
		username: "user1", 
		password: "password",
		salt	: "random"
	});
	//Run the save method of the model that will store the current record into the database
	u1.save(function(err, record){
		if (err)console.log("Record not saved "+ err);
		else
			console.log("successfully saved object "+ record);
	});
	//Rather than storing the password as plain text as in u1 we can hash the password
	var p = "password";
	var	hashedPassword = crypto.createHash('sha1').update(p).digest('hex');

	console.log(hashedPassword);

	// Create the user with the generated hash of the password
	var u2 = new UserModel({
		username: "user2",
		password: hashedPassword,
		salt: "random"
	});

	// Invoke the save of the particular record
	u2.save(function(err, record){
		if (err)console.log("Record not saved "+ err);
		else console.log("successfully saved object "+ record);
	});

	// The problem with the structure above is that we have to remember to apply the hash of the password before
	// Also the problem with just a hash is that it is vulnerable to a dictionary attack

	//We can create code that will perform an operation before the save action takes place
	//We define a callback that will invoke before the save that will generate the hash for uis

	UserSchema.pre('save', function (next) {
		console.log("Running this function before saving the record");

	  	// We Hash the password with the password supplied by the user
	  	this.password = crypto
	  					.createHash('sha1')
	  					.update(this.password + this.salt)
	  					.digest('hex');

	  	next();
	});

	UserModel = mongoose.model('User', UserSchema);

	var u3 = new UserModel({
		username: "user3",
		password: "password",
		salt: "random3"
	});

	u3.save(function(err, record){
		if (err)console.log("Record not saved "+ err);
		else console.log("successfully saved object "+ record);
	});
	
}


function retrievingRecords(){

	//retrieves all of the users in the database
	UserModel.find({}, function(err, users){
		console.log("Found %d Users", users.length);
	});

	var usrObj = {
		username : "user1"
	};

	UserModel.find(usrObj, function(err,res){
		
	});


	UserModel.find({username: "user1"}, function(err, users){
		console.log("Found %d Users", users.length);
	})
}