
function genRandomString(len){
	var alphaNum = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", i, text = "";
	for( i = 0; i < len; i += 1 ){
        text += alphaNum.charAt(Math.floor(Math.random() * alphaNum.length));
	}

    return text;
}

function clearUser(UserModel){
	UserModel.find({}).remove(function(err){
		if (err)console.log(err);
		else console.log("Users cleared");
	})
}

module.exports = {
	"genRandomString": genRandomString,
	"clearUser" : clearUser
}