(function(window){
	
	function createRowElement(key){
		var str =  "<tr>";
			str += "<td>"+key+"</td>";
			str += "</tr>";
		return str;
	}
	
	$(document).ready(function(){
		console.log("The document is ready");
		
		$(".login").click(function(){
			var username = document.getElementById("log").username.value;  
			var password = document.getElementById("log").password.value;  
			console.log(username+","+password);
			data = {"username":username,"password":password};
			console.log(data);
			$.post('http://anth-hosa-sw-eng.herokuapp.com/login',data,function (form, result){
				console.log(result + form);
				if(form === "priviledged page")
					window.location = "Files.html";
				else{
					alert("Invalid Username or Password.");
				}
			});
		});	
		
		$("#show").click(function(){
			$.get('http://anth-hosa-sw-eng.herokuapp.com/files', function (result){
				var tbodyId = "#keys";
				$(tbodyId).empty();
				if(result === null)
					alert("No Keys To Show");
				else{
					var el, i;
					for(i=0; i<result.length; i++){
						el=result[i];
						var key = el.fileName;
						var row = createRowElement(key);
						$(tbodyId).append(row);
					}
				}
			});			
		});
		
		$("#submit").click(function(){
			var keyname = $("#file").val();
				$.get('http://anth-hosa-sw-eng.herokuapp.com/deletekey/'+keyname, function ( result){
				if(result==="success"){
					$.get('/files', function (result){
						var tbodyId = "#keys";
						$(tBodyId).empty();
						if(result === null)
							alert("No Keys To Show");
						else{
							var el, i;
							for(i=0; i<result.length; i++){
								el=result[i];
								var key = el.fileName;
								var row = createRowElement(key);
								$(tbodyId).append(row);
							}
						}
					});	
				}				
			});		
		});
		
		$("#logout").click(function(){
			$.get('http://anth-hosa-sw-eng.herokuapp.com/logout', function (result){
				if(result === "logged out")
					window.location = "FileEncryption.html";
			});
		});
		
	});
	
	
})(this);