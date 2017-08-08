


function easeOutCubic (t, b, c, d) 
{
  return c*((t=t/d-1)*t*t + 1) + b;
}


function translate(html)
{
	var arr = html.split("[$");	
	var items = [];	
	for (var i in arr)
	{
		var tmp = arr[i].split(']');
		if (tmp.length > 1) items.push(tmp[0]);
	}	
	for (var i in items) html = html.replace('[$'+items[i]+']',l[items[i]]);
	return html;
}



function GetNextNode (labelid) 
{
    var label = document.getElementById (labelid);
	var select_id = document.getElementById (labelid+"_option");
    label.innerHTML = select_id.options[select_id.selectedIndex].text;
}


function showmoney(number) 
{
    var number = number.toString(), 
    dollars = number.split('.')[0], 
    cents = (number.split('.')[1] || '') +'00';
    dollars = dollars.split('').reverse().join('')
        .replace(/(\d{3}(?!$))/g, '$1,')
        .split('').reverse().join('');
    return dollars + '.' + cents.slice(0, 2);
}

function getHeight() 
{
  var myHeight = 0;
  if( typeof( window.innerWidth ) == 'number' )  myHeight = window.innerHeight;  
  else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) )  myHeight = document.documentElement.clientHeight;   
  else if (document.body && ( document.body.clientWidth || document.body.clientHeight ) )  myHeight = document.body.clientHeight;
  return myHeight;
}

function divscroll(el)
{
	document.getElementById(el).scrollIntoView();
	$('body').scrollLeft(0);
	$('html').scrollTop(0);	
	if (page == 'start') start_menu(el);
}

function removeHash () { 
    var scrollV, scrollH, loc = window.location;
    if ("pushState" in history)
        history.pushState("", document.title, loc.pathname + loc.search);
    else {
        // Prevent scrolling by storing the page's current scroll offset
        scrollV = document.body.scrollTop;
        scrollH = document.body.scrollLeft;

        loc.hash = "";

        // Restore the scroll offset, should be flicker free
        document.body.scrollTop = scrollV;
        document.body.scrollLeft = scrollH;
    }
}

function browserdetails(useragent)
{
	useragent = ' ' + useragent;
	var os = false;
	var browser = false;
	var icon = '';
	var name = '';
	if (useragent.toLowerCase().indexOf('android') > 0) os = 'Android';
	else if (useragent.toLowerCase().indexOf('windows') > 0) os = 'Windows';	
	else if (useragent.toLowerCase().indexOf('iphone') > 0) os = 'iPhone';
	else if (useragent.toLowerCase().indexOf('ipad') > 0) os = 'iPad';	
	else if (useragent.toLowerCase().indexOf('mac') > 0) os = 'Apple';
	else if (useragent.toLowerCase().indexOf('linux') > 0) os = 'Linux';
	else if (useragent.toLowerCase().indexOf('blackberry') > 0) os = 'Blackberry';
	if (useragent.toLowerCase().indexOf('chrome') > 0) browser = 'Chrome';	
	else if (useragent.toLowerCase().indexOf('safari') > 0) browser = 'Safari';	
	else if (useragent.toLowerCase().indexOf('opera') > 0) browser = 'Opera';
	else if (useragent.toLowerCase().indexOf('firefox') > 0) browser = 'Firefox';	
	else if (useragent.toLowerCase().indexOf('msie') > 0) browser = 'Internet Explorer';
	if ((os) && (browser))
	{
		name = browser + ' on ' + os;
		icon = browser.toLowerCase() + '.png';
	}
	else if (os)
	{	
		name = os;
		icon = os.toLowerCase() + '.png';
	}
	else if (browser)
	{
		name = browser;
		icon = browser.toLowerCase() + '.png';
	}
	else
	{
		name = 'Unknown';
		icon = 'unknown.png';
	}
	var browserdetails = {};	
	browserdetails.name = name;
	browserdetails.icon = icon;	
	return browserdetails;
}


function countrydetails(isocode)
{
	var cdetails = 
	{
		name: isocountries[isocode],
		icon: isocode.toLowerCase() + '.gif'	
	};
	return cdetails;
}


function time2date(unixtime)
{
	var MyDate = new Date(unixtime*1000);	
	var MyDateString = 
	MyDate.getFullYear() + '-'
	+ ('0' + (MyDate.getMonth()+1)).slice(-2) + '-'
	+ ('0' + MyDate.getDate()).slice(-2) + ' '	
	+ ('0' + MyDate.getHours()).slice(-2) + ':'	
	+ ('0' + MyDate.getMinutes()).slice(-2);
    return MyDateString;
}	

function acc_time2date(unixtime)
{
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	var MyDate = new Date(unixtime*1000);		
	var th = 'th';
	if (('' + MyDate.getDate()).slice(-1) == '1') th = 'st';
	else if (('' + MyDate.getDate()).slice(-1) == '2') th = 'nd';
	return months[MyDate.getMonth()] + ' ' + MyDate.getDate() + th + ' ' + MyDate.getFullYear();     
}	





function uplpad(number, length) 
{   
    var str = '' + number;
    while (str.length < length) 
	{
        str = '0' + str;
    }   
    return str;
}


function secondsToTime(secs)
{
	var hours = uplpad(Math.floor(secs / (60 * 60)),2);	
	var divisor_for_minutes = secs % (60 * 60);
	var minutes = uplpad(Math.floor(divisor_for_minutes / 60),2);
	var divisor_for_seconds = divisor_for_minutes % 60;
	var seconds = uplpad(Math.ceil(divisor_for_seconds),2);	
	var returnvar = hours + ':' + minutes + ':' + seconds;
	return returnvar;
}

function bytesToSize(bytes, precision)
{	
	var kilobyte = 1024;
	var megabyte = kilobyte * 1024;
	var gigabyte = megabyte * 1024;
	var terabyte = gigabyte * 1024;
	
	if (bytes > 1024*1024*1024) precision = 2;
	else if (bytes > 1024*1024) precision = 1;
	
	if ((bytes >= 0) && (bytes < kilobyte)) 
	{
		return bytes + ' B';
	} 
	else if ((bytes >= kilobyte) && (bytes < megabyte)) 
	{
		return (bytes / kilobyte).toFixed(precision) + ' KB';
	} 
	else if ((bytes >= megabyte) && (bytes < gigabyte)) 
	{
		return (bytes / megabyte).toFixed(precision) + ' MB';

	} 
	else if ((bytes >= gigabyte) && (bytes < terabyte)) 
	{
		return (bytes / gigabyte).toFixed(precision) + ' GB';
	} 
	else if (bytes >= terabyte) 
	{
		return (bytes / terabyte).toFixed(precision) + ' TB';
	}
	else 
	{
		return bytes + ' B';
	}
}


function logincheckboxCheck (ch_id) 
{
	   var ch_div=ch_id + "_div";
	   if (document.getElementById(ch_id).checked) 
	   {
			document.getElementById(ch_div).className="checkboxOn";  
	   }
	   else 
	   {
			 document.getElementById(ch_div).className="checkboxOff";  
	   }
}
 


function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


function checkMail(email)
{
	var filter  = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	if (filter.test(email)) return false;	
	else return true;	
}

