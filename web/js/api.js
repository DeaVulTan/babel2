/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var api = {};
api.apipath = "https://babel.mega.co.nz/api.php";


api.RETRY = -3;
api.EACCESS = -11;
api.ESID = -15;
api.ETOOMANYCONNECTIONS = -19;

api.unique = Date.now();

api.send = function(data, callback){

        var url = api.apipath;
        data = $(this).serialize() + "&" + $.param(data);
	$.ajax({
		type: 'POST',
		url: url,
		data:data,
		crossDomain: true,
		dataType:'json',
		success:function(responseData, textStatus, jqXHR) {
			if (responseData == api.ESID)
			{
				alert("Your session is invalid, remember to set your sid url parameter");
			}
			else if (responseData == api.EACCESS)
			{
				alert("Your session does not have the correct access privileges to perform this action");
			}
			else if (responseData == api.ETOOMANYCONNECTIONS)
			{
				alert("Sorry, you have hit the helpdesk rate-limit. This is designed to help safeguard against improper usage. Please try again later.");
			}
			else if (responseData == api.RETRY)
			{
				alert("Sorry, if this happened instantly the target is probably locked. Retry again soon. Otherwise there is something going wrong.");
			}
			else
			{
				callback(responseData, textStatus, jqXHR);
			}			
		},
		error: function (responseData, textStatus, errorThrown) {
                        {
                            alert(errorThrown);
                        }
		}
	});
};

api.makepayment = function(agentid, amount, author, callback)
{
	var data = {
		'a':'babel_mp',
		'e':agentid,
                'm':amount,
                'u':author
	};

	api.send(data, callback);
};


