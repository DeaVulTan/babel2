
var FileStore,FileGrid,fileroot,mainpanel,dirtree,mcrec,transferGrid,transferPanel,transferStore,topFolderMenu,loadingDialog,FileSorter,Ajax,json,RootID,NetworkID,TrashbinID,InboxID,currentdirid,maxaction,sharing_email,SharingStore,sharingDialog,currentuser,apackets,memsize,transferMenu,canceltransferid, limitDialog,newfolderDialog,itemMenu;

var fmstarted=false;
var refreshtree=false;
var refreshgr=false;
var refreshtopmenu=false;
var refreshdirsort=false;
var selectedRecords = [];
var useremails = [];
var userids = [];
var emailaddresses = [];
var sharingData = [];
var selectedUploads = [];
var sharednodes = new Object;
var contacts = [];
var globalfolderids = [];
var trashbinfull=false;
var searchPanel;
var InboxCount = 0;
var farray = [];
var fi = 0;
var treenum = 0;
var requesti = makeid(10);
var sortby = "name";
var sortdirection = "ASC";
var expandedtreenodes = [];
var othersharedfolders = [];
var publicuserkey,waiturl;
var jsfm=true;
var FileTooLarge=0;
var transferprogress = [];
var tmpuploads= [];
var dlheight=0;
var fmconfig = {};

if (typeof localStorage != 'undefined')
{
	if (localStorage.fmconfig) fmconfig = JSON.parse(localStorage.fmconfig);	
}


function setOpacity(value) 
{
	testObj.style.opacity = value/10;
	testObj.style.filter = 'alpha(opacity=' + value*10 + ')';
}


function changeOpac(opacity, id) 
{
    var object = document.getElementById(id).style; 
    object.opacity = (opacity / 100); 
    object.MozOpacity = (opacity / 100); 
    object.KhtmlOpacity = (opacity / 100); 
    object.filter = "alpha(opacity=" + opacity + ")"; 
} 

var chromearrowi=0;

function chromearrow()
{
	var chromearrow = document.getElementById('chrome-arrow');
	chromearrow.style.display='';	
	chromearrowmove();
}


function chromearrowmove()
{	
	chromearrowi++;	
	document.getElementById('chrome-arrow').style.display = '';	
	changeOpac(100-(chromearrowi*7),'chrome-arrow');	
	document.getElementById('chrome-arrow').style.top = -200 - (chromearrowi*15) + 'px';
	if (chromearrowi == 10)
	{
		document.getElementById('chrome-arrow').style.display='none';
		chromearrowi=0;
	}
	else setTimeout("chromearrowmove()",50);
}



function storefmconfig(configname,configobject)
{
	if (typeof localStorage == 'undefined') return false;	
	fmconfig[configname] = configobject;
	localStorage.fmconfig = JSON.stringify(fmconfig);
}

function fmtreenode(id,expanded)
{
	var treenodes = {};
	if (fmconfig.treenodes) treenodes = fmconfig.treenodes;
	if (expanded) treenodes[id] = 1;	
	else delete treenodes[id];	
	storefmconfig('treenodes',treenodes);
}

function saveprogress(fileid,bytesloaded,bytestotal)
{
	console.log('saveprogress1 ' + fileid + ' - ' + bytesloaded + '/' + bytestotal);
	if (document.getElementById('dlswf_' + fileid)) 
	{
		document.getElementById('dlswf_' + fileid).style.width = '0px';
		document.getElementById('dlswf_' + fileid).style.height = '0px';
	}
	if (document.getElementById('progressdiv_' + fileid)) document.getElementById('progressdiv_' + fileid).style.display = '';
	if (document.getElementById('progress_' + fileid)) document.getElementById('progress_' + fileid).style.width = Math.round(bytesloaded/bytestotal*200) + 'px';
	if (Ext.get("progressperc_" + fileid)) Ext.get("progressperc_" + fileid).dom.innerHTML = Math.floor(bytesloaded/bytestotal*100) + '%';	
	console.log('saveprogress2 ' + fileid + ' - ' + bytesloaded + '/' + bytestotal);
}

function savecomplete(fileid)
{	
	console.log('save complete');
	if (transferStore.getById(fileid)) transferStore.remove(transferStore.getById(fileid));	
	if (document.getElementById('dlswf_' + fileid))
	{
		document.getElementById('dlswf_' + fileid).clear();
		swfobject.removeSWF('dlswf_' + fileid);	
	}
}

function bwlimitinfo(ctx,r)
{
	/*
	r[0] is total transferred bytes
	r[1] is quota becoming available
	r[2] is the number of seconds r[1] is becoming available in
	r[3] is "downloads ongoing"
	r[4] is current IP limit
	*/		
	var msg = 'You have downloaded ' + bytesToSize(r[0]) + '<br><br>' + bytesToSize(r[1]) + ' will become available in ' + secondsToTime(r[2]) + '.<br><br>The current IP limit is ' + bytesToSize(r[4]);	
	Ext.get('limitmsg').dom.innerHTML = msg;	
	loadingDialog.hide();
	Ext.getBody().mask();
	limitDialog.show();
}

function refreshtreepanel()
{			
	var folderids = [];	
	function chkopf(folderid)
	{						
		var treenode = dirroot.getNodeById(folderid);					
		if (treenode)
		{
			if (treenode.isExpanded()) expandedtreenodes[treenode.data.id] = 1;
			var childnodes = treenode.childNodes;			
			for(var i in childnodes) chkopf(childnodes[i].data.id);	
		}					
	}		
	chkopf('INVROOT');		
	FileStore.suspendEvents();	
	createtree(dirroot,0);				
	expandedtreenodes = [];	
	reinstateFileStore();	
	FileStore.resumeEvents();
}	

function isCircular(fromid,toid)
{
	var node = dirroot.getNodeById(fromid);	
	if (node)
	{	
		var frompath = node.getPath();								
		var topath = dirroot.getNodeById(toid).getPath();								
		if (topath.substr(0,frompath.length) == frompath)
		{
			console.log('circular block');
			return true;				
		}
	}
	return false;
}

function process_ok(ok)
{
	for(i in ok)
	{
		u_sharekeys[ok[i].h] = decrypt_key(u_k_aes,base64_to_a32(ok[i].k));
	}
}

function cleartrashbin()
{
	opendirectory(TrashbinID);				
	Ext.MessageBox.show(
	{		
		id: 'trashbinmsg',
		title:'Confirm deletion',
		msg: 'Are you sure you want to permanently remove all items from your Trash Bin?',
		buttons: Ext.MessageBox.YESNO,
		fn: function(answer) 
		{ 
			if (answer == 'yes')
			{
				// remove permanently:									
				FileGrid.selModel.selectAll();			
				removefromtrash();																	
			}
		},
		icon: Ext.MessageBox.QUESTION
	});
}

function process_u(u,ap)
{
	console.log('process_u');
	console.log(u);
	var mdata = [];
	var edata = [];
	for(i in u)
	{			
		// if user is a contact, add to the contact list (but not if the user is myself)
		if ((u[i].c == 1) && (u[i].u !== currentuser))
		{				
			var node = FileStore.getById(u[i].u);
			if (!node)
			{
				mdata.push(
				{
					id: 		u[i].u,
					name: 		u[i].m,
					size: 		-1,						
					type:		'folder',
					icon: 		'images/mega/clouddrive.png',
					parentid:	'NETWORK',
					folder:		1,
					owner: 		u[i].u,
					date: 		u[i].ts,
					attrs: 		'',
					key: 		'*'
				});
				if (ap) refreshtree=true;
			}
			else
			{
				console.log('already added');
			}
		}
		else if (u[i].c == 0)
		{		
			// delete from contact list:			
			var node = FileStore.getById(u[i].u);			
			if (node) FileStore.remove(node);			
			refreshtree=true;			
			if (currentdirid == NetworkID) refreshgr=true;
		}
		else if (u[i].c == 2)
		{
			currentuser = u[i].u;
		}		
		if (!useremails[u[i].u])
		{
			// if user does not exists, add:
			useremails[u[i].u] 				= u[i].m;				
			userids[u[i].m.toLowerCase()] 	= u[i].u;					
			edata.push( 
			{
				userid: u[i].u,
				email: 	u[i].m
			});
		}
		
	}	

	// append data stores:
	if (mdata.length > 0) FileStore.loadData(mdata,true);	
	if (edata.length > 0) sharing_email.getStore().loadData(edata,true);	
}


function fm_flashdls()
{
	memsize = 0;
	if (dl_method == 1)
	{
		transferStore.each( function (obj) 
		{						
			if (obj.get('transfertype') == 'download') memsize = memsize + parseInt(obj.get('size'));			
		});
	}	
	return memsize;
}



function equalKey(key1,key2)
{
	for(var i in key1)
	{
		if (key1[i] !== key2[i]) return false;
	}
	return true;
}


function fm_beforedlcomplete()
{
	dlheight = Ext.getBody().getHeight();	
}

function fm_chromebar(height)
{
	var h = height - Ext.getBody().getHeight();	
	if ((h > 33) && (h < 41))
	{
		setTimeout("fm_chromebarcatchclick(" + Ext.getBody().getHeight() + ")",500);		
		chromemsgDialog.show();		
	}
}


function fm_chromebarcatchclick(height)
{
	if (Ext.getBody().getHeight() != height)
	{
		Ext.getBody().unmask();
		chromemsgDialog.hide();
		return false;	
	}
	setTimeout("fm_chromebarcatchclick(" + height + ")",200);
}


function fm_dlcomplete(id)
{
	// Ext.Msg.alert('Allow Chrome to Batchdownload','Please click on the "allow" button in the yellow bar above in order allow Chrome to batch download.');
	setTimeout("fm_chromebar(" + dlheight + ")",250);
	if (dl_method == 1)
	{
		document.getElementById('dlswf_' + dl_queue[dl_queue_num].id).style.width = '250px';
		document.getElementById('dlswf_' + dl_queue[dl_queue_num].id).style.height = '20px';
		document.getElementById('progressdiv_' + dl_queue[dl_queue_num].id).style.display='none';
	}
	else
	{	
		transferStore.remove(transferStore.getById(id));			
	}
	transferprogress[id] = undefined;	
}

function fm_dlprogress(fileid, bytesloaded, bytestotal)
{
	document.getElementById('error_' + fileid).style.display = 'none';
	document.getElementById('pending_' + fileid).style.display = 'none';
	document.getElementById('progressdiv_' + fileid).style.display = '';
	if (document.getElementById('progress_' + fileid)) document.getElementById('progress_' + fileid).style.width = Math.round(bytesloaded/bytestotal*200) + 'px';	
	var eltime = (new Date().getTime()-dl_queue[dl_queue_num].starttime)/1000;	
	var bps = Math.round(bytesloaded / eltime);
	var retime = (bytestotal-bytesloaded)/bps;	
	transferprogress[fileid] = Math.floor(bytesloaded/bytestotal*100);	
	Ext.get("speed_" + fileid).dom.innerHTML 	= bytesToSize(bps,1) +'/s';
	Ext.get("eltime_" + fileid).dom.innerHTML 	= secondsToTime(eltime);
	Ext.get("retime_" + fileid).dom.innerHTML 	= secondsToTime(retime);
	Ext.get("progressperc_" + fileid).dom.innerHTML = Math.floor(bytesloaded/bytestotal*100) + '%';
}

function removefromtrash()
{
	var isFolder=false;
	var ops = [];									
	var selrec = selectedRecords;
	for (var i in selrec) 
	{
		if (selrec[i].get('folder') == 1) isFolder = true;
		ops[i] = 
		{	
			a: 'd',
			n: selrec[i].data.id,
			i: requesti
		};			
		if (currentdirid == selrec[i].data.id) currentdirid = selrec[i].data.id;
		process_d(selrec[i].data.id,true);
	}	
	aftermove(isFolder);											
	console.log(ops);										
	api_req(ops);
}	

function fm_dlstart(id,name,filesize)
{ 
  console.log('OnDownloadStart ' + id);      
  transferStore.getById(id).set('exceeded',false);  
  dl_queue[dl_queue_num].starttime = new Date().getTime();   
  transferStore.getById(id).set('started',true);
  transferStore.getById(id).set('error','');  
  document.getElementById('error_' + id).style.display = 'none';
  document.getElementById('pending_' + id).style.display = 'none';
  document.getElementById('progressdiv_' + id).style.display = '';     
  if (fm_flashdls() === 0) transferStore.sort();
}


function showlimit()
{
	if (!limitDialog.rendered) limitDialog.doAutoRender();
	var ctx = 
	{
		callback : processquota1,
		processquotaresult : bwlimitinfo
	};
	checkquota(ctx);	
	loadingDialog.show();	
}




function fm_dlerror(id,error)
{
	var errorstr = 'Internal error ' + error + ', please contact support@mega.co.nz';
	if (error == -502)
	{
		errorstr = '<font style=\"color:red;\">Bandwidth quota exceeded</font>';
		transferStore.getById(id).set('exceeded',true);
	}
	else if (error == -504) errorstr = 'Too many connections for this download';
	else if (error == -500) errorstr = 'Login session expired or invalid';
	else if (error == -503) errorstr = 'Temporarily unavailable';
	else if (error == -501) errorstr = 'Account issue, please check your e-mail';
	else if (error == -300) errorstr = 'File no longer exists';
	else if (error == -302) errorstr = 'File no longer accessible';
	else if (error == -400) errorstr = 'Decryption error';
	if (error == 0) 
	{	
		errorstr = '';
		document.getElementById('error_' + id).innerHTML = '';	
		document.getElementById('error_' + id).style.display = 'none';
		document.getElementById('pending_' + id).style.display = '';
		transferStore.getById(id).set('exceeded',false);
	}
	else
	{
		document.getElementById('error_' + id).innerHTML = errorstr;	
		document.getElementById('error_' + id).style.display = '';
		document.getElementById('pending_' + id).style.display = 'none';		
	}
	document.getElementById('progressdiv_' + id).style.display = 'none';	
	transferStore.getById(id).set('error',errorstr);
}


function fm_getsharenodes(handle)
{
	var node = FileStore.getById(handle);
	var snodes = [];
	if (node)
	{
		while ((node.get('id') != RootID) && (node.get('id') != TrashbinID) && (node.get('id') != NetworkID) && (node.get('id') != InboxID))
		{		
			if ((sharednodes[node.get('id')]) || (node.get('su') != '')) snodes.push(node.get('id'));					
			node = FileStore.getById(node.get('parentid'));
			if (!node) break;
		}
	}
	return snodes;
}

	
	

function fm_getnodes2(handle)
{
	var nodeids = [];	
	function procnode(handle)
	{	
		FileStore.suspendEvents();
		FileStore.filterBy(function(record,id) 
		{						
			if (record.get('parentid') == handle) return true;	
		});											
		FileStore.each( function (obj) 
		{
			if (obj) nodeids.push(obj.data.id);			
			if (obj.get('folder') > 0) procnode(obj.data.id);
		});	
		reinstateFileStore();	
		FileStore.resumeEvents();
	}	
	procnode(handle);
	nodeids.push(handle);				
	return nodeids;
}



function fm_getnodes(handle)
{
	console.log('fm_getnodes');
	console.log(handle);	
	var node2 = FileStore.getById(handle);
	var nodeids = [];	
	if (node2)
	{
		if (node2.get('folder') > 0)
		{	
			function spch4(folderid)
			{		
				nodeids.push(folderid);			
				var childnodes = dirroot.getNodeById(folderid).childNodes;			
				for(var i in childnodes) spch4(childnodes[i].data.id);						
			}	
			spch4(handle);																
			FileStore.suspendEvents();
			FileStore.filterBy(function(record,id) 
			{						
				if ((Ext.Array.contains(nodeids,record.get('parentid'))) && (record.get('folder') == 0)) return true;		
			});			
			var diropen=false;										
			FileStore.each( function (obj) 
			{
				if (obj) nodeids.push(obj.data.id);								
			});	
			reinstateFileStore();	
			FileStore.resumeEvents();	
		}
		else nodeids.push(handle);								
	}
	return nodeids;
}

function process_f_f(fid)
{
	if (!farray[fid].f[farray[fid].i])
	{	
		if (farray[fid].ap) FileStore.suspendEvents();
		FileStore.loadData(farray[fid].mdata,true);
		if (farray[fid].ap) FileStore.resumeEvents();
		console.log('call reqmissingkeys:');
		crypto_reqmissingkeys();		
		if (farray[fid].callback) farray[fid].callback.fn(farray[fid].callback);
		//delete farray[fid];		
		return false;
	}	
	var f = farray[fid].f[farray[fid].i];
	f.attrs 	= f.a;	
	if (f.sk) u_sharekeys[f.h] = crypto_process_sharekey(f.h,f.sk);
	if ((f.t !== 2) && (f.t !== 3) && (f.t !== 4) && (f.k))
	{
		crypto_processkey(u_handle,u_k_aes,f);
		u_nodekeys[f.h] = f.key;
		
		if ((f.n != '') && (f.p == InboxID)) InboxCount++;
	}
	else
	{
		if (f.a)
		{
		  if (!missingkeys[f.h])
		  {
			missingkeys[f.h] =true;
			newmissingkeys = true;
		  }
		}
		f.k = '';
		f.name 	= '';
	}	
	
	if (f.t == 2) 		RootID 		= f.h;
	else if (f.t == 3) 	InboxID 	= f.h;
	else if (f.t == 4) 	TrashbinID 	= f.h;
	else if ((f.t < 2) || (f.t == 5))
	{			
		if (f.t == 5)
		{				
			f.p = f.u;
			f.t = 1;
		}
		if (f.t == 1)
		{
			f.s = -1;				
			globalfolderids[f.h]=1;				
			if ((othersharedfolders[f.h]) && (typeof f.su == 'undefined'))
			{
				console.log('test');
				f.su = othersharedfolders[f.h].su;
				f.r = othersharedfolders[f.h].r;					
			}
		}		
		var icontype = f.t;					
		if (sharednodes[f.h]) icontype = 2;			
		var node = false;
		if (farray[fid].ap) node = FileStore.getById(f.h);
		if (node)
		{
		
			if (f.p == currentuser)
			{
				console.log('ignore, this is a root share.');						
			}
			else if (node.data.name !== f.name) 
			{
				console.log('RELOAD FILEMANAGER!');
			}
			else if (node.data.parentid !== f.p)
			{
				console.log('RELOAD FILEMANAGER!');
			}
			else if (node.data.owner !== f.u)
			{
				console.log('RELOAD FILEMANAGER!');
			}
			else if (node.data.date !== f.ts)
			{
				console.log('RELOAD FILEMANAGER!');
			}
			else if (!equalKey(node.data.key,f.key))
			{
				console.log('RELOAD FILEMANAGER!');
			}
			else if ((f.s) && (node.data.size !== f.s))
			{
				console.log('RELOAD FILEMANAGER!');
			}			
		}
		else
		{	
			farray[fid].mdata.push({
				id: 		f.h,
				name: 		f.name,
				size: 		f.s,
				type: 		filetype(f.name,f.t),
				icon: 		fileicon(f.name,icontype),
				parentid:	f.p,
				folder:		f.t,
				owner: 		f.u,
				date: 		f.ts,
				attrs: 		f.attrs,
				key: 		f.key,
				r: 			f.r,
				su: 		f.su
			});		

			if (f.p == TrashbinID) trashbinfull=true;
			if (((f.t) && (farray[fid].ap)) || (f.p == InboxID)) refreshtree=true;
		}
	}	
	farray[fid].i++;		
	timeoutcount++;	
	if (!(timeoutcount&63))
	{
		setTimeout("process_f_f(" + fid + ")",1);
		timeoutcount2++;
	}
	else process_f_f(fid);
}

var timeoutcount=0;
var timeoutcount2=0;

function process_f(fid,ap,callback)
{
	var f = farray[fid].f;
	if (f.length == 0) return false;
	farray[fid].i=0;
	farray[fid].ap=ap;
	farray[fid].mdata = [];
	if (callback) farray[fid].callback = callback;
	if ((ap) && (f[0].p == currentdirid)) refreshgr=true;
	process_f_f(fid);
}

function process_d(handle,local,sharedfolder)
{	
	console.log('process_d ' + handle);	
	var checktb = false;
	node = FileStore.getById(handle);	
	if (node)
	{
		if (RootbyId(handle) == TrashbinID) checktb=true;		
		if ((node.get('parentid') == currentdirid) && (!local)) refreshgr=true;	
		if (node.data.folder == 0)
		{						
			FileStore.remove(node);
		}
		else
		{
			console.log('process_d folder');		
			//GET ALL CHILDREN NODES FROM A NODE:
			othersharedfolders = [];			
			var folderids = [];	
			function spch2(folderid,ignore)
			{				
				console.log('check for ' + folderid);
				if (ignore) console.log('ignore');
				if ((sharedfolder) && (FileStore.getById(folderid).get('su') != '') && (folderid !== handle) && (!ignore))
				{				
					// shared folder inside shared folder, do not delete but change as share-root-node					
					FileStore.getById(folderid).set('parentid',FileStore.getById(folderid).get('su'));
					FileStore.getById(folderid).commit();					
					refreshtree=true;
					ignore=true;
				}
				else if ((FileStore.getById(folderid).get('su') != '') && (folderid !== handle) && (ignore))
				{
					othersharedfolders[folderid] = { su: FileStore.getById(folderid).get('su'), r: FileStore.getById(folderid).get('r') };
					console.log('othersharedfolders');
					console.log(othersharedfolders);
				}
				else
				{					
					folderids.push(folderid);							
				}				
				var childnodes = dirroot.getNodeById(folderid).childNodes;									
				for(var i in childnodes) spch2(childnodes[i].data.id,ignore);
				
			}		
			spch2(handle,false);					
			console.log(folderids);
			FileStore.suspendEvents();			
			FileStore.filterBy(function(record,id) 
			{						
				if (Ext.Array.contains(folderids,record.get('parentid'))) return true;		
			});			
			var diropen=false;						
			var i = 0;
			FileStore.each( function (obj) 
			{
				if (obj)
				{			
					if (currentdirid == obj.data.id) diropen=true;
					FileStore.remove(obj);				
					i++;
				}
			});	
			reinstateFileStore();
			FileStore.resumeEvents();
			FileStore.remove(node);			
			var treenode = dirroot.getNodeById(handle);			
			if (treenode) treenode.remove(true);			
			if (currentdirid == node.data.id) diropen=true;
			if ((diropen) && (!local))
			{		
				diropen=false;
				Ext.MessageBox.show(
				{						
					title:'Lost Folder',
					msg: 'The Folder you are in has been deleted or moved by another user.',
					buttons: Ext.MessageBox.OK,
					fn: function(answer) 
					{
						processopendir(RootID);						
					}
				});		
			}
			else if(diropen) processopendir(RootID);		
		}
	}	
	if (checktb) checktrashempty();
}


function sharecount(folderid)
{	
	SharingStore.suspendEvents();
	SharingStore.filterBy(function(record,id) 
	{
		if (record.data.folderid == folderid) return true;	
	});		
	var count = SharingStore.getCount();	
	if (sharingDialog.folderid)
	{
		SharingStore.filterBy(function(record,id) 
		{
			if (record.data.folderid == sharingDialog.folderid) return true;	
		});		
	}	
	SharingStore.resumeEvents();	
	return count;
}


function fm_updatekey(handle,key)
{
	var node = FileStore.getById(handle);	
	if (node)
	{
		if (node.get('attrs') == '') return false;	
		var file = new Object;
		file.h = handle;
		file.k = key;
		file.a = node.get('attrs');							
		crypto_processkey(u_handle,u_k_aes,file);			
		u_nodekeys[handle] = file.key;		
		node.set('name',file.name);
		node.set('key',file.key);		
		var icontype = node.get('folder');					
		if (sharednodes[handle]) icontype = 2;			
		node.set('type',filetype(file.name,node.get('folder')));
		node.set('icon',fileicon(file.name,icontype));		
		node.commit();
	}
}


function fm_commitkeyupdate()
{
	refreshgrid();
	FileStore.sort(
	{
		direction: sortdirection,
		property: sortby	
	});	
	refreshtreepanel();
	dirsort(dirroot);
}

var tparentid = false;
var trights = false;
var tmoveid = false;
var rootsharenodes = [];
var actioni = 0;

function processpacket()
{
	if (!apackets[actioni])
	{
		packetcomplete();
		return false;	
	}
	var packet = apackets[actioni];		
	console.log('action packet[' + actioni + ']');		
	if (packet.i == requesti)
	{
		console.log('OWN ACTION PACKET; IGNORE');
	}
	else if (packet.a == 's')
	{		
		var prockey = false;
		if ((typeof u_sharekeys[packet.n] == 'undefined') && (typeof packet.k != 'undefined'))
		{				
			if (!u_sharekeys[packet.n])
			{
				u_sharekeys[packet.n] = crypto_process_sharekey(packet.n,packet.k);						
				prockey=true;
			}
		}						
		if (packet.o == currentuser)
		{
			if (typeof packet.r == "undefined")
			{
				// I deleted my share
				var node = SharingStoreStore.getById(packet.n + '_' + packet.u);
				if (node)
				{
					SharingStore.remove(node);
					if (sharecount(packet.n) == 0)
					{
						sharednodes[packet.n] = false																	
						replacefoldericon(packet.n,'folder');							
					}
				}
				else console.log('could not find node ?!');
			}	
			else if (SharingStore.getById(packet.n + '_' + packet.u))
			{
				// I update the share							
				var node = SharingStore.getById(packet.n + '_' + packet.u);
				if (node)
				{							
					node.set('rights',packet.r);							
					node.commit();								
				}
			}						
			else
			{
				var sdata = [];
				// I make a new share
				sdata.push(
				{
						id: 		packet.n + '_' + packet.u,
						userid:		packet.u,
						folderid:	packet.n,
						rights:		packet.r,
						date: 		packet.ts
				});	
				sharednodes[packet.n]=true;
				SharingStore.loadData(sdata,true);					
				replacefoldericon(packet.n,'sharedfolder');														
			}					
		}
		else if (typeof packet.o != 'undefined')
		{						
			if (typeof packet.r == "undefined")
			{
				// delete a share:		
				var node = FileStore.getById(packet.n);
				
				if (node)
				{
					if (node.get('parentid').length != 11)
					{
						// remove sub-share by update:
						node.set('r',0);
						node.set('su',"");
						node.commit();						
					}
					else process_d(packet.n,false,true);							
				}
				else process_d(packet.n,false,true);	
				
				delete u_sharekeys[packet.n];
			}
			else
			{
				// I receive a share, prepare for receiving tree packet
				var node = FileStore.getById(packet.n);
				if (node)
				{
					// update rights:
					node.set('r',packet.r);
					node.set('su',packet.o);
					node.commit();
				}
				else
				{								
					// look up other root-share-nodes from this user:
					console.log('look up other root-share-nodes from this user:');					
					var treenode = dirroot.getNodeById(packet.o);								
					if (treenode)
					{
						treenode.eachChild(function(tnode)
						{
							rootsharenodes[tnode.data.id]=1;
						});
					}
					tparentid 	= packet.o;
					trights 	= packet.r;				
				}
			}
		}
		else if (prockey)
		{
			var nodes = fm_getnodes2(packet.n);
			for (var i in nodes)
			{
				var node = FileStore.getById(nodes[i]);				
				if (node)
				{							
					var file = new Object;
					file.a = node.get('attrs');
					file.h = nodes[i];					
					crypto_processkey(u_handle,u_k_aes,file);					
					node.set('name',file.name);
					node.set('key',file.key);
					node.commit();				
					delete file;
				}
			}			
			refreshtree=true;		
			refreshtopmenu=true;	
			refreshgr=true;
		}
		
		crypto_share_rsa2aes();	
	}

	else if (packet.a == 'k')
	{
		if (packet.sr)
		{	
			crypto_procsr(packet.sr);								
		}
		else if (packet.cr)
		{					
			crypto_proccr(packet.cr);						
		}
		else
		{	
			var cr = crypto_makecr(packet.n,[packet.h],true);								
			console.log(cr);						
			var ops = [];
			ops.a = 'k';
			ops.cr = cr;								
			console.log('ops:');					
			console.log(ops);			
			api_req([ops]);					
		}
	}				
	else if (packet.a == 't')
	{
		if (tparentid) 
		{						
			for (var b in packet.t.f)
			{
				if (rootsharenodes[packet.t.f[b].h])
				{
					packet.t.f[b].r 	= FileStore.getById(packet.t.f[b].h).get('r');
					packet.t.f[b].su = FileStore.getById(packet.t.f[b].h).get('su');								
					process_d(packet.t.f[b].h);							
				}				
			}					
			var node2 = FileStore.getById(packet.t.f[0].p);			
			if (!node2)
			{
				packet.t.f[0].p 	= tparentid;
			}			
			packet.t.f[0].su = tparentid;
			packet.t.f[0].r 	= trights;			
			tparentid = false;
			trights = false;
			rootsharenodes=[];
		}
		if (tmoveid)
		{
			// handle as move						
			node = FileStore.getById(tmoveid);						
			if (node)
			{
				if (node.data.parentid !== packet.t.f[0].p)
				{				
					var movefromid = node.get('parentid');				
					moveitem(node,packet.t.f[0].p,false);					
					if ((packet.t.f[0].p == TrashbinID) && (!trashbinfull))
					{	
						trashbinfull=true;
						replacefoldericon(TrashbinID,'trashbinfull');
					}					
					var treenode = dirroot.getNodeById(tmoveid);
					if (treenode)
					{
						dirtree.expandPath(treenode.getPath());
						refreshdirsort=true;
					}
					var currentpath = dirroot.getNodeById(currentdirid).getPath();					
					console.log('current path:' + currentpath);					
										
					if ((currentpath.indexOf(packet.t.f[0].p) > -1) || (currentpath.indexOf(movefromid) > -1))
					{
						refreshgr=true;
						refreshtopmenu=true;
					}
					else if(currentdirid == tmoveid) refreshtopmenu=true;
				}						
			}
			tmoveid=false;
		}		
		process_u(packet.t.u,true);	
		farray[fi] = new Object;
		farray[fi].f = packet.t.f;
		process_f(fi,true,{fn : function() 
		{ 
			actioni++;
			processpacket();	
		}});
		fi++;
		return false;			
	}
	
	else if (packet.a == 'c')
	{
		FileStore.suspendEvents();	
		// new contacts:		
		process_u(packet.u,true);	
		FileStore.resumeEvents();			
	}
	
	else if (packet.a == 'd')
	{	
		// delete node:					
		if (apackets[parseInt(i)+1])
		{
			if (apackets[parseInt(i)+1].a == 't')
			{
				if (apackets[parseInt(i)+1].t.f[0].h == packet.n)
				{								
					tmoveid = packet.n;
					console.log('handle as move');
				}						
			}						
		}
		// if this is not a move, then delete:					
		if (!tmoveid) process_d(packet.n,false);					
	}
	else if (packet.a == 'u')
	{
		console.log('update packet');		
		var node = FileStore.getById(packet.n);
		if (node)
		{				
			console.log('node');			
			var file = new Object;
			file.h = packet.n;
			file.k = packet.k;
			file.a = packet.at;			
			u_nodekeys[packet.n] = file.key;
			crypto_processkey(u_handle,u_k_aes,file);
			var icontype = node.get('folder');					
			if (sharednodes[packet.n]) icontype = 2;				
			console.log(file);			
			node.set('name',file.name);
			node.set('key',file.key);
			node.set('attrs',file.a);			
			node.set('type',filetype(file.name,node.get('folder')));
			node.set('icon',fileicon(file.name,icontype));			
			node.commit();			
			if (packet.cr)
			{
				console.log('crypto_proccr');
				console.log(packet.cr);
				crypto_proccr(packet.cr);						
			}									
			console.log('node committed');			
			if (node.data.folder > 0) refreshtree=true;						
			if (node.data.parentid == currentdirid) refreshgr=true;
		}			
	}
	actioni++;
	processpacket();	
}


function packetcomplete()
{
	crypto_sendrsa2aes();
	if (refreshtree)
	{
		refreshtree=false;
		refreshtreepanel();					
	}
	else if (refreshdirsort)
	{
		refreshdirsort=false;
		setTimeout("dirsort(dirroot);",500);	
	}	
	if (refreshtopmenu)
	{
		refreshtopmenu=false;				
		updateTopFolderMenu(currentdirid);					
	}	
	if (refreshgr)
	{
		refreshgr=false;				
		refreshgrid();
		FileStore.sort(
		{
			direction: sortdirection,
			property: sortby	
		});				
	}	
	document.getElementById('overlay').style.cursor='default';
	setTimeout("document.getElementById('overlay').style.display='none';",10);
	setTimeout("getsc()",100);
}




function getlinkcheck(str)
{
	logincheckboxCheck(str);
	createlinks();
}

function createlinks()
{
	var showfilelink = false;
	var showfilekey  = false;
	var showfilename = false;
	var showfilesize = false;		
	
	if (document.getElementById('getlink_filelink').checked) 	showfilelink = true;
	if (document.getElementById('getlink_filename').checked) 	showfilename = true;
	if (document.getElementById('getlink_filesize').checked) 	showfilesize = true;
	if (document.getElementById('getlink_filekey').checked) 	showfilekey  = true;		
	
	var links = '';
	for(var i in selectedRecords)
	{	
		if (showfilename) links += selectedRecords[i].data.name;		
		if (showfilename && showfilesize) links += ' (' + bytesToSize(selectedRecords[i].data.size) + ')\n';
		else if (showfilename) links += '\n';
		console.log(selectedRecords[i].get('ph'));			
		if (showfilelink) links += 'http://me.ga/' + selectedRecords[i].get('ph');					
		if (showfilelink && showfilekey) links += '#';
		console.log(selectedRecords[i].data.key);			
		if (showfilekey) links += a32_to_base64(selectedRecords[i].data.key).replace(",","");					
		if ((!showfilename) && showfilesize) links += ' (' + bytesToSize(selectedRecords[i].data.size) + ')\n';
		else if (showfilekey || showfilelink) links += '\n';	
	}		
	document.getElementById('getlink_textarea').value = links;		
	//getlinkform.getChildByElement('getlinks_field').setValue(links);
}




function execsc(a)
{
	apackets = a;
	tparentid = false;
	trights = false;
	tmoveid = false;
	rootsharenodes = [];
	actioni=0;
	
	if (FileStore.count() > 300)
	{
		document.getElementById('overlay').style.cursor='wait';
		document.getElementById('overlay').style.display='';				
		setTimeout("processpacket()",100);
	}
	else processpacket();
}



function filetype(name,isfolder)
{
	if (isfolder) return "Folder";	
	var ext = fileext(name);
	if (typeof fileexttxt[ext] !== "undefined") return fileexttxt[ext];
	else return 'File';
}

 
 
function fileicon(name,icontype)
{	
	if (icontype == '2') return "images/extension/foldershared.png";	
	else if (icontype) return "images/extension/folder.png";	
	var ext = fileext(name);	
	if (typeof fileextimg[ext] !== "undefined") return fileextimg[ext];
	else return 'images/extension/document.png';
}


function fileext(name)
{	
	if (!name) name = 'unknown';	
	var ext = name.substr(name.lastIndexOf('.') + 1);	
	if (ext == name) ext = '';	
	return ext.toLowerCase();	
	return name;
}

function flash_filetoolarge()
{
	FileTooLarge = 0;	
	if (!fmstarted)
	{
		alert('You can only upload files smaller than 400MB with Internet Explorer. Chrome & Firefox allow you to upload files with any filesize.');
		return false;
	}
	var msg = 'Unfortunately, 1 file cannot be uploaded because it\'s larger than 400MB.';
	if (FileTooLarge > 1) msg = 'Unfortunately, ' + FileTooLarge + ' files cannot be uploaded because they\'re larger than 400MB.';
	var msg2 = '<br> You are restricted to uploading files with our Adobe Flash fallback because your browser does not offer the HTML5 FileReader. If you want to circumvent this limitation (and increase overal browser performance), please consider installing <a href="http://www.google.com/chrome/">Google Chrome</a>.';
	Ext.Msg.show(
	{
		title:'Browser limitation',
		msg: msg + msg2,
		buttons: Ext.Msg.OK,
		icon: Ext.Msg.WARNING
	});		
}

function flash_uploadererror(err)
{
	alert('FLASH ERROR ' + err);
}

var flash_start = [];
var init_anoupload = false;

// callback from flash upon file selection (replacing Filereader)
function flash_newfile(id,name,size)
{	
	if (size > 1024*1024*400)
	{		
		if (!FileTooLarge) setTimeout("flash_filetoolarge()",200);			
		FileTooLarge++;
	}
	else
	{
		if (!fmstarted)
		{
			flash_start[id] = true;			
			if (!init_anoupload) 
			{
				init_anoupload=false;
				anoupload();
			}
		}
		addupload({
		name: name,
		size: size,
		flashid: id
		});	
	}
}

// upload chunk through flash (replacing XHR binary upload support)
function flash_uploadchunk(id,data,url,flashid)
{
	console.log(url);
	console.log(id, data, url);
	var swfid = 'uploaderswf';	
	if (flash_start[flashid]) swfid = 'start_uploaderswf';
	document.getElementById(swfid).uploadchunk(id,data,url);
}

// upload chunk callback from flash: (replacing XHR binary upload support)
function flash_uploaded(id,response)
{
	console.log('flash_uploaded');
	console.log(response);
	ul_flash_uploaddone(id,response);
}



// request chunk of file from flash: (replacing Filereader)
function flash_requestchunk(flashid,bytes,offset)
{
	console.log('flash_requestchunk');	
	flashid = flashid.toString();	
	var bytes = bytes.toString();
	var offset = offset.toString();
	console.log(typeof flashid);
	console.log(flashid);
	console.log(typeof bytes);
	console.log(bytes);
	console.log(typeof offset);
	console.log(offset);	
	var swfid = 'uploaderswf';	
	if (flash_start[flashid]) swfid = 'start_uploaderswf';
	document.getElementById(swfid).requestchunk(flashid, bytes, offset);
}

function flash_load()
{
  console.log('flash file loaded');
}

// request chunk callback from flash: (replacing Filereader)
function flash_chunk(flashid,bytes,offset,data)
{
	console.log('flash_chunk');	
	console.log(data);
	console.log(flashid);
	console.log(offset);	
	//console.log('ul_flash_chunk(\'' + flashid + '\',\'' + data + '\',\'' + offset + '\');');
	 ul_flash_chunk(flashid,data,offset);
	//console.log(flashid);
	//console.log(bytes);
	//console.log(offset);
	//console.log(data);
}




function addupload(file)
{
	var ul_id = ul_queue.length;	
	if (!file.flashid) file.flashid = false;
	var NewUpload = 
	{
		name: file.name,
		size: file.size,
		type: filetype(file.name,false),	
		icon: fileicon(file.name,false),
		parentid: "",
		folder: 0,
		id: ul_id,
		flashid: file.flashid,
		transfertype: 'upload',
		transfericon: 'images/up.png',
		status: 'pending',
		eltime: 'eltime',
		speed: 'speed',
		retime: 'retime'
	};			
	if (fmstarted)
	{
		transferStore.add(NewUpload);	
		transferPanel.expand();			
	}
	else
	{
		tmpuploads.push(NewUpload);	
	}	
	file.target = currentdirid;	
	file.id = ul_id;	
	ul_queue.push(file);		
	if ((fmstarted) && (!ul_uploading)) startupload();
}

Ext.require([
    'Ext.grid.*',
    'Ext.data.*',
	'Ext.tab.*',
	'Ext.window.*',
	'Ext.layout.container.Border',
    'Ext.dd.*',
	'Ext.modelClass.*',
	'Ext.window.MessageBox',
	'Ext.tip.*'
]);

Ext.onReady(function() 
{
	extjsloaded=true;
	init_page();
});

function onUploadStart(id)
{ 
  console.log('OnUploadStart ' + id);     
  ul_queue[id]['starttime'] = new Date().getTime();
  transferStore.getById(id + '').set('started',true);  
  if (fm_flashdls() === 0) transferStore.sort();
}

function onUploadSuccess(id, handle,key)
{	
	transferStore.remove(transferStore.getById(id + ''));	
	transferprogress[id] = undefined;
}

function onUploadProgress(fileid, bytesloaded, bytestotal)
{		
	if (document.getElementById('progress_' + fileid)) document.getElementById('progress_' + fileid).style.width = Math.round(bytesloaded/bytestotal*200) + 'px';	
	var eltime = (new Date().getTime()-ul_queue[fileid]['starttime'])/1000;	
	var bps = Math.round(bytesloaded / eltime);
	var retime = (bytestotal-bytesloaded)/bps;	
	transferprogress[fileid] = Math.floor(bytesloaded/bytestotal*100);	
	console.log('upload progress ' + fileid);
	Ext.get("speed_" + fileid).dom.innerHTML 	= bytesToSize(bps,1) +'/s';
	Ext.get("eltime_" + fileid).dom.innerHTML 	= secondsToTime(eltime);
	Ext.get("retime_" + fileid).dom.innerHTML 	= secondsToTime(retime);
	Ext.get("progressperc_" + fileid).dom.innerHTML = Math.floor(bytesloaded/bytestotal*100) + '%';
}

function reinstateFileStore()
{
	FileStore.filterBy(function(record,id) 
	{
		if ((record.get('parentid') == currentdirid) && (record.get('folder') < 2)  && (record.get('name') != '')) return true;	
	});				
	FileStore.sort(
	{
		direction: sortdirection,
		property: sortby	
	});
}

function replacefoldericon(folderid,icon)
{
	console.log('replace folder icon ' + folderid + ' ' + icon);
	var treeicon = false;
	var gridicon = false;
	if (icon == 'sharedfolder')
	{
		treeicon = 'images/sharedfolder.gif';
		gridicon = 'images/extension/foldershared.png';	
	}	
	else if (icon == 'trashbinfull')
	{
		treeicon = 'images/trashbin_full.png';	
	}	
	else if (icon == 'trashbin')
	{
		treeicon = 'images/trashbin.png';	
	}
	else
	{
		treeicon = 'images/folder.gif';
		gridicon = 'images/extension/folder.png';	
	}
	var node = FileStore.getById(folderid);	
	var parentid = false;	
	if (folderid == TrashbinID) parentid = 'INVROOT';
	else if (node) parentid = node.data.parentid;	
	if (parentid)
	{	
		// replace treeicon		
		if (treeicon)
		{		
			dirroot.getNodeById(parentid).replaceChild(
			{
				id : folderid,
				text : dirroot.getNodeById(folderid).data.text,		
				leaf : false,
				expandable : true,
				icon: treeicon,
				expanded: dirroot.getNodeById(folderid).isExpanded(),
				children : dirroot.getNodeById(folderid).childNodes,
				allowDrag: dirroot.getNodeById(folderid).data.allowDrag
							
			},dirroot.getNodeById(folderid));
		}
		if(gridicon)
		{		
			FileStore.getById(folderid).set('icon',gridicon);		
			FileStore.getById(folderid).commit();			
		}
	}
}

function checktrashempty()
{
	if (trashbinfull)
	{
		if (!dirroot.getNodeById(TrashbinID).hasChildNodes())
		{
			FileStore.suspendEvents();
			FileStore.filterBy(function(record,id) 
			{						
				if (record.get('parentid') == TrashbinID) return true;		
			});
			if (FileStore.count() == 0)
			{
				replacefoldericon(TrashbinID,'trashbin');
				updateTopFolderMenu(currentdirid);				
				trashbinfull=false;
			}			
			reinstateFileStore();			
			FileStore.resumeEvents();	
		}	
	}
}


function dirsort(tree)
{
	tree.sort([{property: 'text',direction: 'ASC'}]);
}


function moveitem(record,toid,ignoreTreeUpdates)
{
	console.log('moveitem()');
	console.log(record);
	console.log(toid);
	console.log(ignoreTreeUpdates);
	if ((RootbyId(toid) == TrashbinID) && (!trashbinfull))
	{
		replacefoldericon(TrashbinID,'trashbinfull');
		trashbinfull=true;
	}
	var checktb=false;
	if (RootbyId(record.get('id')) == TrashbinID) checktb=true;	
	if (!dirroot.getNodeById(toid)) return false;	
	if (toid == TrashbinID)
	{			
		var sharedfolders = [];	
		function spch3(folderid)
		{							
			if (sharednodes[folderid]) sharedfolders.push(folderid);			
			var childnodes = dirroot.getNodeById(folderid).childNodes;			
			for(var i in childnodes) spch3(childnodes[i].data.id);				
		}		
		if (record.get('folder') > 0) spch3(record.get('id'));		
		if (sharedfolders.length > 0)
		{				
			var stxt = '';
			if (sharedfolders.length > 1) stxt = 's';   			
			Ext.Msg.show({
				 title:'Shared folder' + stxt,
				 msg: 'You have removed a folder which contains ' + sharedfolders.length + ' shared folder' + stxt + '.<br>Once you empty the Trash Bin these shares will be disabled.',
				 buttons: Ext.Msg.OK,
				 icon: Ext.Msg.WARNING
			});
		}	
	}
	if (record.get('folder'))
	{	
		var frompath = dirroot.getNodeById(record.get('id')).getPath();
		var topath = dirroot.getNodeById(toid).getPath();
		if (topath.substr(0,frompath.length) == frompath)  return false;				
	}	
	record.set('parentid',toid);
	record.commit();				
	if (record.get('folder')  && (!ignoreTreeUpdates))
	{
		var node = dirroot.getNodeById(record.get('id'));
		var tonode = dirroot.getNodeById(toid);
		var node2 = node.copy(null,true);							
		node.remove();							
		tonode.appendChild(node);
	}
	else
	{
		// moving file
	}
	if (checktb) checktrashempty();
}


function copytouser(recordids,toid,copydel,callbackf)
{
	console.log('copytouser');
	console.log(callbackf);
	var ctx =
	{
		cachepubkeycomplete: function(ctx,pubkey)
		{
			if (pubkey)
			{
				copyitems(ctx.recordids,ctx.toid,ctx.copydel,ctx.callbackf);			
			}
		},
		recordids: recordids,
		toid: toid,
		copydel: copydel,
		callbackf: callbackf
	}	
	api_cachepubkey(ctx,toid);
}



function copyitems(recordids,toid,copydel,callbackf)
{
	loadingDialog.show();	
	treearray = [];
	for(var i in recordids)
	{
		var folderids = [];				
		if (FileStore.getById(recordids[i]).get('folder') == 1)
		{					
			function spch(folderid)
			{		
				folderids.push(folderid);			
				var childnodes = dirroot.getNodeById(folderid).childNodes;			
				for(var i in childnodes) spch(childnodes[i].data.id);						
			}	
			spch(recordids[i]);									
		}									
		FileStore.suspendEvents();
		FileStore.filterBy(function(record,id) 
		{						
			if ((Ext.Array.contains(folderids,record.get('parentid'))) || (record.get('id') == recordids[i])) return true		
		});			
		var diropen=false;										
		FileStore.each( function (obj) 
		{
			if (obj)
			{		
				var parentid = obj.get('parentid');
				if (obj.get('id') == recordids[i]) parentid=false;
				var attrs = new Object;
				attrs.n = obj.get('name');	
				var mkat = enc_attr(attrs,obj.get('key'));
				var attr = ab_to_base64(mkat[0]);						
				if (toid.length == 11)
				{
					console.log('mkat1');
					console.log(mkat[1]);
					var key = base64urlencode(encryptto(toid,a32_to_str(mkat[1])));
				}
				else
				{
					var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
				}
				if (parentid)
				{
					treearray.push(
					{
						h: obj.get('id'),
						t: obj.get('folder'),
						a: attr,
						k: key,
						p: parentid
					});
				}
				else
				{
					treearray.push(
					{
						h: obj.get('id'),
						t: obj.get('folder'),
						a: attr,
						k: key
					});
				}
			}
		});		
		reinstateFileStore();		
		FileStore.resumeEvents();
	}			
	var ops = [];	
	ops[0] = 
	{ 
	  a: 'p',
	  t: toid,
	  n: treearray,
	  i: requesti
	};	
	if (copydel)
	{
		var i = 1;		
		for (var a in recordids)
		{
			ops[i] = 
			{			
				a: 'd',
				n: recordids[a]
			};
			i++;
		}		
	}	 
	var sharingnodes = fm_getsharenodes(toid);		
	if (sharingnodes.length > 0)	
	{		
		var movingnodes = [];
		for (i in treearray) movingnodes.push(treearray[i].h);		
		ops[0].cr =  crypto_makecr(movingnodes,sharingnodes,true);		
	}	
	api_req(ops,
	{ 
		callback : function (json,params)
		{
			if (json[0].u) process_u(json[0].u,true);
		
			if (json[0].f)
			{
				farray[fi] = new Object;	
				farray[fi].f = json[0].f;		
				process_f(fi,true,{fn : function() 
				{
					aftermove(true);
					loadingDialog.hide();  				
				}});	
				fi++;						
			}				   
		}
	});	
	console.log(callbackf);	
	if (callbackf) callbackf();	 	
}

function aftermove(isFolder)
{
	console.log('aftermove()');	
	document.getElementById('overlay').style.cursor='wait';
	document.getElementById('overlay').style.display='';
	setTimeout("refreshgrid()",350);	
	if (isFolder)
	{
		setTimeout("refreshtreepanel()",200);
		setTimeout("dirsort(dirroot);",600);
		setTimeout("updateTopFolderMenu('" + currentdirid + "')",650);
	}	
}

function updateTopFolderMenu(dirid)
{
	topFolderMenu.removeAll(true);	
	var treenode = dirroot.getNodeById(dirid);	
	if (!treenode) return false;	
	var dirarray = treenode.getPath().substr(1).split('/');
	var data = FileStore.data;	
	var prevkey = '';	
	for(var key in dirarray)
	{
		if (key > 0)
		{	
			var dirname = dirroot.getNodeById(dirarray[key]).data.text;
			var iconurl = 'images/folder2.png';		
			if (dirarray[key] == RootID) iconurl = 'images/clouddrive.png';
			else if ((dirarray[key] == TrashbinID) && (trashbinfull)) iconurl = 'images/trashbin_full.png';
			else if (dirarray[key] == TrashbinID) iconurl = 'images/trashbin.png';
			else if (dirarray[key] == InboxID) iconurl = 'images/inbox.png';
			else if (dirarray[key] == NetworkID) iconurl = 'images/user_group.png';
			else if (prevkey == NetworkID) iconurl = 'images/clouddrive.png';
			var submenu = new Array();			
			var subdirs = dirroot.getNodeById(dirarray[key]).childNodes;			
			for(var key2 in subdirs)
			{
				var iconurl2='images/mega/folder2.png';			
				if (dirarray[key] == NetworkID) iconurl2='images/mega/clouddrive.png';
							
				submenu.push({text: subdirs[key2].data.text, icon: iconurl2, dirid: subdirs[key2].data.id, handler: function(b) { opendirectory(b.dirid); }});
			}		
			topFolderMenu.add([
			{
				text: dirname,
				icon: iconurl,
				dirid: dirarray[key],
				menu: submenu,
				xtype: 'splitbutton',
				handler: function(b) { opendirectory(b.dirid); }
			}]);
		}		
		prevkey = dirarray[key];		
	}
}

function refreshgrid()
{
	FileStore.invalidateScrollerOnRefresh = false;
	FileStore.clearFilter(true);
	FileStore.filterBy(function(record,id) 
	{
		if ((record.get('parentid') == currentdirid) && (record.get('folder') < 2)  && (record.get('name') != '')) return true;	
	});
	FileStore.invalidateScrollerOnRefresh = true;
	FileStore.sort(
	{
		direction: sortdirection,
		property: sortby	
	});	
	document.getElementById('overlay').style.cursor='default';
	setTimeout("document.getElementById('overlay').style.display='none';",10);
}

function opendirectory(dirid,force)
{
	if (dirid == currentdirid) return false;		
	document.getElementById('overlay').style.cursor='wait';
	document.getElementById('overlay').style.display='';
	setTimeout("processopendir('" + dirid + "');",100);	
}

function processopendir(dirid)
{
	var treenode = dirroot.getNodeById(dirid);
	if (treenode)
	{	
		document.location.hash = 'fm' + dirid;
		document.title = 'Mega';	
		Ext.suspendLayouts();
		console.log('Opendirectory: ' + dirid);
		FileStore.clearFilter(true);
		FileStore.filterBy(function(record,id) 
		{			
			if ((record.get('parentid') == dirid) && (record.get('folder') < 2) && (record.get('name') != '')) return true;	
		});		
		console.log('filter done');		
		FileStore.sort(
		{
			direction: sortdirection,
			property: sortby	
		});		
		console.log('sort done');		
		updateTopFolderMenu(dirid);		
		currentdirid = dirid;		
		console.log('current path: ' + treenode.getPath());
		dirtree.expandPath(treenode.getPath());	
		treenode.expanded=true;
		dirtree.getSelectionModel().select(treenode);	
		topButtons.show();		
		topBtrash.hide();
		topBcontact.hide();
		if ((dirid == NetworkID) || (dirid.length == 11) || (dirid == InboxID) || (dirid == TrashbinID))
		{		
			if (dirid == NetworkID) topBcontact.show();			
			if (dirid == TrashbinID) topBtrash.show();
			topButtons.hide();
		}
		else if (RootbyId(dirid) == NetworkID)
		{			
			if (RightsbyID(dirid) == 0)	topButtons.hide();		
		}		
		Ext.resumeLayouts(true);
		document.getElementById('overlay').style.cursor='default';
		setTimeout("document.getElementById('overlay').style.display='none';",10);
	}
}

function createfolder(toid,name)
{
	console.log('Create folder in the folder ' + toid + ' with the name ' + name);
	var attrs = { n : name };
	var mkat = enc_attr(attrs,[]);
	var attr = ab_to_base64(mkat[0]);
	var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));	
	var req = { 
	  a: 'p',
	  a: 'p',
	  t: toid,
	  n: [{ h:'xxxxxxxx', t:1, a:attr, k:key }],
	  i: requesti
	};
	var sn = fm_getsharenodes(toid);
	if (sn.length)
	{
		req.cr = crypto_makecr([mkat[1]],sn,false);
		req.cr[1][0] = 'xxxxxxxx';
	}	
	console.log(req);		
	api_req([req],
	{ 
	  callback : function (json,params)
	  {
		if ((typeof json[0] == 'number') && (json[0] < 0))
		{			
			Ext.Msg.show({
				 title:'Internal Error',
				 msg: 'Oops, something went wrong. Sorry about that!',
				 buttons: Ext.Msg.OK
			});
			loadingDialog.hide();	
		}
		else
		{
			farray[fi]   = new Object;
			farray[fi].f = json[0].f;
			process_f(fi,true,{fn : function() 
			{ 
				aftermove(true);	
				loadingDialog.hide();	
			}});
			fi++;	
		}
	  }
	});
}

function processmove(jsonmove)
{	
	console.log('processmove function call');
	console.log(jsonmove);	
	for (i in jsonmove)
	{	
		var sharingnodes 	= fm_getsharenodes(jsonmove[i].t);	
		if (sharingnodes.length > 0)	
		{		
			var movingnodes = fm_getnodes(jsonmove[i].n);	
			console.log('crypto_makecr:');
			console.log(movingnodes);
			console.log(sharingnodes);
			jsonmove[i].cr = crypto_makecr(movingnodes,sharingnodes,true);
		}
	}
	console.log(jsonmove);	
	api_req(jsonmove);
}

function RootbyId(id)
{
	var parentid=id;
	while ((parentid !== NetworkID) && (parentid !== TrashbinID) && (parentid !== RootID) && (parentid !== InboxID))
	{
		parentid = FileStore.getById(parentid).data.parentid;
	}
	return parentid
}

function RightsbyID(id)
{
	var sharinguser = false;
	var parentid = id;	
	while (!sharinguser)
	{
		if (FileStore.getById(parentid).data.su != '')
		{
			console.log('rights: ' + FileStore.getById(parentid).data.r + ' from ' + parentid);		
			return FileStore.getById(parentid).data.r;			
		}		
		parentid = FileStore.getById(parentid).data.parentid;		
		if (parentid == NetworkID)
		{		
			return false;
			console.log('No sharing rights found, shouldn\'t happen.');
		}
	}
}

function createtree(tree,type)
{		
	console.log('createtree ' + type);	
	// copy from root to network -> 1
	// copy from network to root -> 2		
	// move from root to root/trash -> 3
	// move from trash to root -> 4	
	var expanded = false;
	if ((type == 0) || (type == 2) || (type == 3) || (type == 4))
	{
		if (fmconfig.treenodes[RootID]) expanded =true;
		else expanded = false;				
		fileroot = Ext.create('Object', 
		{	
				text: 'Cloud Drive',
				expanded: expanded,
				id: RootID,
				icon: 'images/mega/clouddrive.png',
				children : new Array(),
				allowDrag: false
				
		});
		processdir(fileroot);
	}	
	if ((type == 0) || (type == 1))
	{			
		if (fmconfig.treenodes[NetworkID]) expanded =true;
		else expanded = false;			
		networkroot = Ext.create('Object', 
		{	
				text: 'Contacts',
				expanded: expanded,
				id: NetworkID,
				icon: 'images/user_group.png',
				children : new Array(),
				allowDrag: false
		});
		processdir(networkroot);
	}
	
	if (type == 0)
	{
		var InboxText = 'Inbox';
		if (InboxCount > 0) InboxText = 'Inbox (' + InboxCount + ')';
		if (fmconfig.treenodes[InboxID]) expanded =true;
		else expanded = false;		
		inboxroot = Ext.create('Object', 
		{	
				text: InboxText,
				expanded: expanded,
				id: InboxID,
				icon: 'images/inbox.png',
				children : new Array(),
				allowDrag: false
		});
		processdir(inboxroot);
	}
	
	if ((type == 0) || (type == 3))
	{
		var trashbinico = 'images/trashbin.png';
		if (trashbinfull) trashbinico = 'images/trashbin_full.png';	
		if (fmconfig.treenodes[TrashbinID]) expanded =true;
		else expanded = false;		
		trashbinroot = Ext.create('Object', 
		{	
				text: 'Trash Bin',
				expanded: expanded,
				id: TrashbinID,
				icon: trashbinico,
				children : new Array(),
				allowDrag: false
		});
		if (type == 0) processdir(trashbinroot);
	}
	var rootchildren = new Array();	
	if ((type == 0) || (type == 2) || (type == 3) || (type == 4)) rootchildren.push(fileroot);
	if ((type == 0) || (type == 1)) rootchildren.push(networkroot);
	if ((type == 0) || (type == 3)) rootchildren.push(trashbinroot);
	if (type == 0) rootchildren.push(inboxroot);
	toproot = Ext.create('Object', 
	{	
			text: 'invisisbleroot',
			expanded: true,
			id: 'INVROOT',
			icon: 'images/mega/clouddrive.png',
			children: rootchildren
	});	
	tree.setRootNode(toproot);	
	dirsort(dirroot);
	dirsort(dirroot);
}

function fmsearch(text)
{
	if (text == '')
	{
		// go back to...
	}
	else if (text.length < 3)
	{
		alert('Please enter at least three characters to search.');	
	}
	else
	{	
		if (dirid == currentdirid) return false;			
		processsearch(text);		
	}
}

function processsearch(text)
{
	console.log('fmsearch: ' + text);
	FileStore.clearFilter(true);
	FileStore.filterBy(function(record,id) 
	{
		var name = record.get('name');
		if ((name.toLowerCase().search(text.toLowerCase()) >= 0) && (record.get('folder') < 2) && (name != '')) return true;	
	});		
	FileStore.sort(
	{
		direction: sortdirection,
		property: sortby	
	});	
	topButtons.hide();	
	//FileGrid.columns[5].show();	
	updateTopFolderMenu(RootID);		
	currentdirid = false;			
	console.log('current path: ' + dirroot.getNodeById(RootID).getPath());
	document.getElementById('overlay').style.cursor='default';
	setTimeout("document.getElementById('overlay').style.display='none';",10);
}


function initializefm()
{
	crypto_share_rsa2aes();
	crypto_sendrsa2aes();	
	if (fmdirid) currentdirid = fmdirid;
	else currentdirid = RootID;			
	if (!fmconfig.treenodes)
	{
		fmtreenode(RootID,true);
		fmtreenode(NetworkID,true);
		fmtreenode(InboxID,true);
	}		
	createtree(dirroot,0);
	Ext.QuickTips.init(); 
	FileStore.clearFilter(true);
	FileStore.filterBy(function(record,id) 
	{
		if ((record.get('parentid') == currentdirid) && (record.get('folder') < 2)  && (record.get('name') != '')) return true;	
	});
	updateTopFolderMenu(currentdirid);
	FileStore.sort(
	{
		direction: 'ASC',
		property: 'name'	
	});	
	document.title = 'Mega';	
	if (tmpuploads.length > 0)
	{
		Ext.suspendLayouts();
		for(var i in tmpuploads)
		{			
			transferStore.add(tmpuploads[i]);	
			transferPanel.expand();			
		}
		tmpuploads = [];
		Ext.resumeLayouts(true);
		startupload();
	}
	
}

function processdir(subtree)
{
	//FileStore.clearFilter(true);
	FileStore.filterBy(function(record,id) 
	{
		if ((record.get('parentid') == subtree.id) && (record.get('folder') > 0) && (record.get('name') != '')) return true;	
	});
	FileStore.each( function (obj) 
	{  		
		var folderico = '';
		folderico = 'images/folder.gif';		
		var allowDrag=true;		
		var icoclass = 'folder';		
		if (obj.data.id == TrashbinID)
		{		
			folderico = 'images/trashbin.png';
			allowDrag=false;
		}
		else if (obj.data.parentid == NetworkID)
		{		
			folderico = 'images/mega/clouddrive.png';
			allowDrag=false;
		}		
		else if (sharednodes[obj.data.id])
		{	
			folderico = 'images/sharedfolder.gif';
			icoclass = 'sharefoldericon';
			allowDrag=true;
		}				
		var qtip = '';		
		var fexpanded=false;
		if (fmconfig.treenodes[obj.data.id]) fexpanded =true;
		subtree.children[subtree.children.length] = 
		{
			id : obj.data.id,
			text : obj.data.name,		
			leaf : false,
			expanded: fexpanded,
			expandable : true,
			icon: folderico,
			children : new Array(),
			allowDrag: allowDrag,
			qtip: qtip
		};
		processdir(subtree.children[subtree.children.length-1]);		
	});
}

// create special data store for the main grid to handle sorting of files & folders nicely:
Ext.define('Ext.data.Store2', 
{
    extend: 'Ext.data.Store',	
	sort: function() 
	{
        var me = this,
		prefetchData = me.prefetchData,
		sorters,
		start,
		end,
		tf,
		range;		
		var property = 'name';
		var direction = 'ASC';		
		sortdirection = direction;
		sortby = property;		
		if (arguments[0])
		{
			if (arguments[0].property) 	property = arguments[0].property;												
			if (arguments[0].direction) direction = arguments[0].direction;									
		}
		if ((property == 'name') || (property == 'owner') || (property == 'type'))
		{
			tf = function(s) { return String(s).toUpperCase().replace(this.stripTagsRE, ""); };		
		}
		else
		{
			tf = function(s) { return s; };				
		}
		var args 	= [];
		var sorters = [];
		sorters[0] = Ext.create("Ext.util.Sorter",
		{
			direction: 	'DESC',
			property: 	'folder',
			root: 'data'
		});
		sorters[1] = Ext.create("Ext.util.Sorter",
		{
			direction: 	direction,
			property: 	property,
			root: 'data',			
			transform: tf
		});
		args[0] = sorters;		
		me.callParent(args);        
    }
});

Ext.define('Ext.tree.plugin.TreeViewDragDrop2', 
{
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.treeviewdragdrop2',
    uses: [
        'Ext.tree.ViewDragZone',
        'Ext.tree.ViewDropZone'
    ],
    dragText : '<div id=\"dragtext\">move {0} selected item{1}</div>',
    allowParentInserts: false,
    allowContainerDrops: false,
    appendOnly: false,
    ddGroup : "TreeDD",
    expandDelay : 1000,
    enableDrop: true,
    enableDrag: true,
    nodeHighlightColor: 'c3daf9',
    nodeHighlightOnDrop: Ext.enableFx,
    nodeHighlightOnRepair: Ext.enableFx,
    init : function(view) 
	{
        view.on('render', this.onViewRender, this, {single: true});
    },
    destroy: function() 
	{
        Ext.destroy(this.dragZone, this.dropZone);
    },
    onViewRender : function(view) 
	{
        var me = this;
        if (me.enableDrag) 
		{
            me.dragZone = Ext.create('Ext.tree.ViewDragZone', 
			{
				view: view,
				ddGroup: me.dragGroup || me.ddGroup,
				dragText: me.dragText,
				repairHighlightColor: me.nodeHighlightColor,
				repairHighlight: me.nodeHighlightOnRepair				
			});
        }
        if (me.enableDrop) 
		{
            me.dropZone = Ext.create('Ext.tree.ViewDropZone', 
			{
                view: view,
                ddGroup: me.dropGroup || me.ddGroup,
                allowContainerDrops: me.allowContainerDrops,
                appendOnly: me.appendOnly,
                allowParentInserts: me.allowParentInserts,
                expandDelay: me.expandDelay,
                dropHighlightColor: me.nodeHighlightColor,
                dropHighlight: me.nodeHighlightOnDrop,
				
				isValidDropPoint : function(node, position, dragZone, e, data) 
				{
					if (!node || !data.item)  return false;        	
					var view = this.view,
					targetNode = view.getRecord(node),
					draggedRecords = data.records,
					dataLength = draggedRecords.length,
					ln = draggedRecords.length,
					i, record;        
					if (!(targetNode && position && dataLength))  return false;        
					for (i = 0; i < ln; i++) 
					{
						record = draggedRecords[i];
						if (record.isNode && record.contains(targetNode)) return false;            
					}        
					if (position === 'append' && targetNode.get('allowDrop') === false) return false;        
					else if (position != 'append' && targetNode.parentNode.get('allowDrop') === false) return false;       
					if (Ext.Array.contains(draggedRecords, targetNode)) return false;
					var targetId = targetNode.data.id;
					var sourceId = data.records[0].data.id;					
					var targetRoot = RootbyId(targetId);
					var sourceRoot = RootbyId(sourceId);
					if ((targetRoot == NetworkID) && (targetId.length < 11) && (targetId != NetworkID))
					{
						console.log('check rights');
						var rights = RightsbyID(targetId);						
						if (rights < 1) return false;											
						console.log(rights);
					}
					if (!('parentId' in data.records[0].data))
					{
						if (data.records[0].data.parentid == NetworkID) return false;					
					}					
					if (targetRoot == InboxID) return false;					
					else if ((sourceRoot == TrashbinID) && (targetRoot == TrashbinID)) 	return false;
					else if ((sourceRoot == NetworkID) && (targetRoot == TrashbinID))
					{
						console.log('check rights');
						var rights = RightsbyID(sourceId);						
						if (rights < 2) return false;											
						console.log(rights);
					}
					else if (targetId == NetworkID) return false;					
					return true;
				},				
				onNodeOver : function(node, dragZone, e, data) 
				{		
					var position = this.getPosition(e, node),
					returnCls = this.dropNotAllowed,
					view = this.view,
					targetNode = view.getRecord(node),
					indicator = this.getIndicator(),
					indicatorX = 0,
					indicatorY = 0;
					this.cancelExpand();
					if (position == 'append' && !this.expandProcId && !Ext.Array.contains(data.records, targetNode) && !targetNode.isLeaf() && !targetNode.isExpanded()) 
					{
						this.queueExpand(targetNode);
					}
					if (this.isValidDropPoint(node, position, dragZone, e, data)) 
					{
						this.valid = true;
						this.currentPosition = position;
						this.overRecord = targetNode;
						var targetId = targetNode.data.id;
						var sourceId = data.records[0].data.id;						
						var targetRoot = RootbyId(targetId);
						var sourceRoot = RootbyId(sourceId);						
						console.log('onnodeover ' + targetRoot);
						indicator.setWidth(Ext.fly(node).getWidth());
						indicatorY = Ext.fly(node).getY() - Ext.fly(view.el).getY() - 1;						
						console.log('position: ' + position);						
						if (position == 'before') 
						{
							returnCls = targetNode.isFirst() ? Ext.baseCSSPrefix + 'tree-drop-ok-above' : Ext.baseCSSPrefix + 'tree-drop-ok-between';
							indicator.showAt(0, indicatorY);
							dragZone.proxy.show();
						} 
						else if (position == 'after') 
						{
							returnCls = targetNode.isLast() ? Ext.baseCSSPrefix + 'tree-drop-ok-below' : Ext.baseCSSPrefix + 'tree-drop-ok-between';
							indicatorY += Ext.fly(node).getHeight();
							indicator.showAt(0, indicatorY);
							dragZone.proxy.show();
						} 
						else 
						{
							returnCls = Ext.baseCSSPrefix + 'tree-drop-ok-append';
							indicator.hide();
						}
					} 
					else 
					{
						this.valid = false;
					}					
					if (returnCls == 'x-tree-drop-ok-append')
					{
						console.log(sourceRoot);						
						var dragtext = Ext.get('dragtext').dom.innerHTML;					
						if ((targetRoot == RootID) && (sourceRoot == RootID)) returnCls = 'move';
						else if ((targetRoot == NetworkID) && (sourceRoot == RootID)) returnCls = 'copy';
						else if ((targetRoot == RootID) && (sourceRoot == NetworkID)) returnCls = 'copy';
						else if ((targetRoot == NetworkID) && (sourceRoot == NetworkID)) returnCls = 'copy';
						else returnCls = 'move';						
												
						dragtext = dragtext.replace("move",returnCls);
						dragtext = dragtext.replace("copy",returnCls);
						Ext.get('dragtext').dom.innerHTML = dragtext;
					}
					this.currentCls = returnCls;
					console.log(returnCls);
					return returnCls;
				},
	
				onContainerOver : function(dd, e, data) 
				{
					return e.getTarget('.' + this.indicatorCls) ? this.currentCls : this.dropNotAllowed;
				},
    
				notifyOut: function() 
				{
					this.callParent(arguments);
					this.cancelExpand();
				},
				handleNodeDrop : function(data, targetNode, position) 
				{
					var me = this,
					view = me.view,
					parentNode = targetNode.parentNode,
					store = view.getStore(),
					recordDomNodes = [],
					records, i, len,
					insertionMethod, argList,
					needTargetExpand,
					transferData,
					processDrop;
					if (data.copy) 
					{
						records = data.records;
						data.records = [];
						for (i = 0, len = records.length; i < len; i++) 
						{
							data.records.push(Ext.apply({}, records[i].data));
						}
					}
					me.cancelExpand();
					if (position == 'before') 
					{
						insertionMethod = parentNode.insertBefore;
						argList = [null, targetNode];
						targetNode = parentNode;
					}
					else if (position == 'after') 
					{
						if (targetNode.nextSibling) 
						{
							insertionMethod = parentNode.insertBefore;
							argList = [null, targetNode.nextSibling];
						}
						else 
						{
							insertionMethod = parentNode.appendChild;
							argList = [null];
						}
						targetNode = parentNode;
					}
					else 
					{
						if (!targetNode.isExpanded()) 
						{
							needTargetExpand = true;
						}
						insertionMethod = targetNode.appendChild;
						argList = [null];
					}

					transferData = function() 
					{
						var node,
							r, rLen, color, n;
						for (i = 0, len = data.records.length; i < len; i++) 
						{
							argList[0] = data.records[i];
							node = insertionMethod.apply(targetNode, argList);
							
							if (Ext.enableFx && me.dropHighlight) 
							{
								recordDomNodes.push(view.getNode(node));
							}
						}
						if (Ext.enableFx && me.dropHighlight) 
						{
							rLen  = recordDomNodes.length;
							color = me.dropHighlightColor;

							for (r = 0; r < rLen; r++) 
							{
								n = recordDomNodes[r];

								if (n) 
								{
									Ext.fly(n.firstChild ? n.firstChild : n).highlight(color);
								}
							}
						}
					};
					if (needTargetExpand) 
					{
						targetNode.expand(false, transferData);
					}
					else 
					{
						transferData();
					}
				}
				
            });
        }
    }
});

Ext.define('Ext.grid.plugin.DragDrop2', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.gridviewdragdrop2',

    uses: [
        'Ext.view.DragZone',
        'Ext.view.DropZone'
    ],    
	dragText : '<div id=\"dragtext\">move {0} selected item{1}</div>',
    ddGroup : "GridDD",
    enableDrop: true,
    enableDrag: true,
    init : function(view) 
	{
        view.on('render', this.onViewRender, this, {single: true});
    },
    destroy: function() 
	{
        Ext.destroy(this.dragZone, this.dropZone);
    },
    enable: function() 
	{
        var me = this;
        if (me.dragZone)  me.dragZone.unlock();        
        if (me.dropZone)  me.dropZone.unlock();        
        me.callParent();
    },
    disable: function() 
	{
        var me = this;
        if (me.dragZone) me.dragZone.lock();        
        if (me.dropZone) me.dropZone.lock();        
        me.callParent();
    },
    onViewRender : function(view) 
	{
        var me = this;
        if (me.enableDrag) 
		{
            me.dragZone = Ext.create('Ext.view.DragZone', 
			{
                view: view,
                ddGroup: me.dragGroup || me.ddGroup,
                dragText: me.dragText
            });
        }
        if (me.enableDrop) 
		{
            me.dropZone = Ext.create('Ext.view.DropZone', 
			{
				onContainerOver : function(dd, e, data) 
				{			
					return false;
				},
				onNodeOver: function(node, dragZone, e, data)
				{
					if (FileStore.getById(data.records[0].data.id).get('parentid') == NetworkID)
					{
						console.log('no dragging allowed of network-friends');
						return false;
					}					
					overRecord = view.getRecord(node);		
					if (!overRecord)
					{						
						console.log('dragging to empty area?');
						return false;
					}									
					var targetId = overRecord.data.id;
					var targetRoot = RootbyId(targetId);					
					var sourceId = data.records[0].data.id;
					var sourceRoot = RootbyId(sourceId);
					if ((targetRoot == InboxID) || (targetRoot == TrashbinID))
					{
						console.log('no dragging allowed within the INBOX or TRASHBIN');
						return false;
					}					
					var me = this;
					if(overRecord.data.folder)
					{						
							// check against circular moving:															
							if (FileStore.getById(data.records[0].get('id')).get('folder'))
							{	
								if (isCircular(data.records[0].get('id'),overRecord.data.id)) return false;
							}
							me.valid=true;					
							var returnCls = 'x-tree-drop-ok-append';
							var dragtext = Ext.get('dragtext').dom.innerHTML;					
							if ((targetRoot == RootID) && (sourceRoot == RootID)) returnCls = 'move';
							else if ((targetRoot == NetworkID) && (sourceRoot == RootID)) returnCls = 'copy';
							else if ((targetRoot == RootID) && (sourceRoot == NetworkID)) returnCls = 'copy';
							else returnCls = 'move';																				
							dragtext = dragtext.replace("move",returnCls);
							dragtext = dragtext.replace("copy",returnCls);
							Ext.get('dragtext').dom.innerHTML = dragtext;	
							return returnCls;	
					}
					else return false;
				},
				handleNodeDrop : function(data, record, position) 
				{		
					console.log('DROP DROP DROP');
					console.log(data);
					console.log(record);
					console.log(position);
				
					if (typeof overRecord === 'undefined') 
					{
						console.log('undefined variable');
						return false;
					}					
					var isFolder=false;
					var targetId = overRecord.data.id;
					var targetRoot = RootbyId(targetId);					
					var sourceId = data.records[0].data.id;
					var sourceRoot = RootbyId(sourceId);
					var copydel = false;
					
					if ((sourceRoot == NetworkID) && (targetId == TrashbinID))
					{
						if (RightsbyID(sourceId) > 1)  copydel = true;						
					}	
					
					if (((sourceRoot == NetworkID) && (targetRoot == RootID)) || (sourceRoot == NetworkID) || (targetRoot == NetworkID) || copydel)
					{					
						var copyids = [];						
						for (var i in data.records)
						{
							if (data.records[i].get('folder') == 1)
							{
								isFolder = true;
							}
							copyids[i] = data.records[i].data.id;						
						}						
						console.log(copyids);		
						copyitems(copyids,overRecord.data.id,copydel);														
						console.log('copy ;-)');					
					}
					else 
					{					
						var jsonmove = [];					
						var i = 0;
						for (key in data.records) 
						{					
							var record = FileStore.getById(data.records[key].get('id'));						
							moveitem(record,overRecord.data.id,false);	
							jsonmove[i] = 
							{ 
								a: 'm',
								n: 	data.records[key].get('id'),
								t: 	overRecord.data.id,
								i:  requesti
							}		
							i++;							
						}		
						processmove(jsonmove);													
						aftermove(isFolder);										
						return false;					
					}
				
				},
                view: view,
				moveOnly: true,
                ddGroup: me.dropGroup || me.ddGroup
            });
        }
    }
});

Ext.define('MegaFS', 
{
    extend: 'Ext.data.Model',
    fields: [	
	{name: 'name',  	type: 'string'},
    {name: 'size',  	type: 'number'},
    {name: 'type',  	type: 'string'},
    {name: 'date',  	type: 'number'},
	{name: 'icon',  	type: 'string'},
	{name: 'owner',  	type: 'string'},
	{name: 'parentid', 	type: 'string'},
	{name: 'folder', 	type: 'Integer'},
	{name: 'r', 		type: 'Integer'},
	{name: 'su', 		type: 'string'},
	{name: 'id', 		type: 'string'},
	{name: 'ph', 		type: 'string'},
	{name: 'attrs', 	type: 'string'},
	{name: 'key', 		type: 'Array'}
	]
});

Ext.define('TransferFS', {
    extend: 'Ext.data.Model',
    fields: [	
	{name: 'name',  		type: 'string' },
    {name: 'size',  		type: 'string'},
    {name: 'type',  		type: 'string'},
	{name: 'transfertype', 	type: 'string'},
	{name: 'transfericon', 	type: 'string'},
    {name: 'speed',  		type: 'string'},
	{name: 'eltime',  		type: 'string'},
	{name: 'retime',  		type: 'string'},
	{name: 'status',  		type: 'string'},
	{name: 'icon',  		type: 'string'},
	{name: 'parentid', 		type: 'string'},
	{name: 'folder', 		type: 'Integer'},
	{name: 'progress', 		type: 'Integer'},
	{name: 'id', 			type: 'string'},
	{name: 'key', 			type: 'Array'},
	{name: 'started',  		type: 'Boolean'},
	{name: 'error',  		type: 'string'},
	{name: 'exceeded',  	type: 'Boolean'}
	]
});

Ext.define('SharingFS', 
{
    extend: 'Ext.data.Model',
    fields: [	
	{name: 'id', 		type: 'string'},
	{name: 'folderid', 	type: 'string'},
	{name: 'userid',  	type: 'string'},
    {name: 'rights',  	type: 'string'},
    {name: 'date',	type: 'string'}
	]
});

function startfm()
{
	fmstarted=true;
	Ext.Msg.id = 'messagebox';
	function getitemtxt()
	{
		var fnum=0;
		var dnum=0;
		for (var i in selectedRecords)
		{
		   if (selectedRecords[i].get('folder')) dnum++;
		   else fnum++;								
		}
		var t='';
		if (fnum > 1) t += fnum + ' files';
		else if (fnum == 1) t += '1 file';
		if (fnum && dnum) t += ' and ';
		if (dnum > 1) t += dnum + ' folders';
		else if (dnum == 1) t += '1 folder';		
		if ((fnum == 0) && (dnum == 0)) return false;
		else return t;
	}
	
	function renderRights(value,p, record)
	{
		if (value == '0') return 'Read-only';
		else if (value == '1') return 'Read & Write';
		else if (value == '2') return 'Full access';
	}

	function renderFileName(value,p, record)
	{
		var t = new Ext.Template("<div style=\"position:relative; height:21px;\"><img src=\"images/spacer.gif\" alt=\"*\" width=\"25\" height=\"23\" align=\"absmiddle\" />&nbsp;&nbsp;{1} <img src=\"{0}\" alt=\"*\" width=\"24\" height=\"24\" style=\"position:absolute; left:0px; top:-2px;\" /></div>");
		return t.apply([record.get('icon'), value] );
	}

	function renderStatus(value,p, record)
	{	
		var displayprogress 	= 'display:none;';
		var displaypending 		= 'display:none;';
		var displayerror 	= 'display:none;';	
		if (record.get('error') !== '') displayerror ='';
		else if (record.get('started')) displayprogress ='';
		else displaypending = '';	
		var perc = 0;	
		if (transferprogress[record.get('id')]) perc = transferprogress[record.get('id')];	
		var rstr = "<div class=\"progress-block\" style=\"" + displayprogress + "\" id=\"progressdiv_" + record.get('id') + "\"><div class=\"progressbar-percents\" id=\"progressperc_" + record.get('id') + "\">" + perc + "%</div><div class=\"progressbar\"><div class=\"progressbarfill\" id=\"progress_" + record.get('id') + "\" style=\"width:"+ (perc*2) + "px;\"></div></div><div class=\"clear\"></div></div>";		
		rstr += "<div style=\"" + displayerror + "\" id=\"error_" + record.get('id') + "\">" + record.get('error') + "</div>";	
		rstr += "<div style=\"" + displaypending + "\" id=\"pending_" + record.get('id') + "\">pending</div>";	
		var fh = '0';
		var fw = '0';	
		if (Ext.isSafari)
		{
			fh = '1';
			fw = '1';
		}	
		if (dl_method == 1)
		{
			rstr = "<div id=\"dlflash_" + record.get('id') + "\"><object data=\"downloader.swf\" id=\"dlswf_" + record.get('id') + "\" type=\"application/x-shockwave-flash\" height=\"" + fh + "\" width=\"" + fw + "\"><param name=\"wmode\" value=\"transparent\"><param value=\"always\" name=\"allowscriptaccess\"><param value=\"all\" name=\"allowNetworking\"></object></div>" + rstr;
		}
		return rstr;	
	}

	function renderSpeed(value,p, record)
	{
		return "<div style=\"margin:0px; padding:0px;\" id=\"speed_" + record.get('id') + "\"></div>";	
	}

	function renderEltime(value,p, record)
	{
		return "<div style=\"margin:0px; padding:0px;\" id=\"eltime_" + record.get('id') + "\"></div>";	
	}

	function renderRetime(value,p, record)
	{
		return "<div style=\"margin:0px; padding:0px;\" id=\"retime_" + record.get('id') + "\"></div>";	
	}

	function renderTransferType(value,p, record)
	{
		var t = new Ext.Template("<img src=\"{0}\" alt=\"* \" align=\"absmiddle\" />&nbsp;&nbsp;{1}");	
		return t.apply([record.get('transfericon'), value] );
	}
		
	function renderFileType(value)
	{
		var t = new Ext.Template("<i>{0}</i>");
		return t.apply([value]);
	}

	function renderFileSize(value)
	{
		var t = new Ext.Template("{0}");
		if (value == -1) value = '';
		if (value !== '')  value = bytesToSize(value);
		return t.apply([value]);
	}

	function renderDate(value)
	{
		var t = new Ext.Template("{0}");	
		return t.apply([time2date(value)]);
	}

	function renderOwner(value)
	{
		var t = new Ext.Template("{0}");
		return t.apply([useremails[value]]);
	}
	
	function renderURL(value,p,record)
	{
		if (!record.get('folder') && (typeof record.get('key') != 'undefined') && (record.get('ph') != '')) return '<a href="http://me.ga/' + record.get('ph') + '#' + a32_to_base64(record.get('key')).replace(",","") + '" target="_blank"><img src="images/url.png"></a>';
		else return '';	
	}

	// create the data storestore
	FileStore = Ext.create('Ext.data.Store2', 
	{
		model: 'MegaFS',    
		sortOnFilter:false,			
		sortOnLoad: false
	});
			itemMenu = Ext.create('Ext.menu.Menu',
			{		
				id:'itemMenu',
				folderid: '',
				items: [    
				{
					id: 'itemMenu_open',
					icon: 'images/open.png',
					text: 'Open',
					handler: function() 
					{ 
						itemMenu.hide();  
						var selrec = selectedRecords;
						for (var i in selrec)
						{
							if (selrec[i].get('folder'))
							{						
								opendirectory(selrec[i].get('id'));
								return true;
							}
						}
					}
				},
				{
					id: 'itemMenu_download',
					icon: 'images/download.png',
					text: 'Download',
					handler: function() 
					{ 
						itemMenu.hide(); 
						
						var selrec = selectedRecords;
						
						var simulateid;
						
						for (var i in selrec)
						{
							// download folders?
							if (!selrec[i].get('folder'))
							{
								console.log('Download ' + selrec[i].get('name'));	
								adddownload(selrec[i]);
							}
						}					
					}
				},
				{
					id: 'itemMenu_link',
					icon: 'images/link.png',
					text: 'Get link',
					handler: function() 
					{ 
						loadingDialog.show();
						requestlinks();
						itemMenu.hide();
					}
				},
				{
					id: 'itemMenu_sharing',
					icon: 'images/share.png',
					text: 'Sharing',
					handler: function() 
					{ 
						if (!u_privk)
						{					
							Ext.Msg.confirm('Sharing disabled', 'You need a registered account to use the sharing feature. Would you like to register now?', function(but) 
							{
								if (but === 'yes')  window.location = '/register';															
							});					
						}
						else
						{				
							sharingDialog.folderid = selectedRecords[0].data.id;							
							sharingDialog.show();				
							itemMenu.hide();
						}						
					}
				},
				{
					id: 'itemMenu_rename',
					icon: 'images/_fonts.png',
					text: 'Rename',
					handler: function() 
					{ 
						itemMenu.hide(); 					
						if (selectedRecords[0].get('folder')) renameDialog.setTitle('Rename Folder');
						else renameDialog.setTitle('Rename File');					
						Ext.getBody().mask(); 					
						renameDialog.show();
						renameDialog.value = 'dada';
						renameform.getChildByElement('renamefield').setValue(selectedRecords[0].get('name'));
					}
				},
				{
					id: 'itemMenu_move',
					icon: 'images/move.png',
					text: 'Move',
					handler: function() 
					{ 
						itemMenu.hide(); 
						Ext.getBody().mask(); 
						mcDialog.operation = 'move'; 
						mcDialog.show(); 
					}
				},
				{
					id: 'itemMenu_copy',
					icon: 'images/copy.png',
					text: 'Copy',
					handler: function() 
					{ 
						itemMenu.hide(); 
						Ext.getBody().mask(); 
						mcDialog.operation = 'copy'; 
						mcDialog.show(); 
					}
				},
				{
					id: 'itemMenu_permissions',
					icon: 'images/permissions.png',
					text: 'Permissions',
					handler: function() 
					{ 											
						var rights = RightsbyID(selectedRecords[0].get('id'));
						if (rights == 0) Ext.Msg.alert('Permissions','You have read-only access to this folder.');
						else if (rights == 1) Ext.Msg.alert('Permissions','You have read & write access to this folder.');
						else Ext.Msg.alert('Permissions','You have full control over this folder.');				
						itemMenu.hide();
					}
				},
				{
					id: 'itemMenu_createfolder',
					icon: 'images/newfolder_dropdown.png',
					text: 'New folder',
					handler: function() 
					{ 					
						Ext.getBody().mask(); 
						newfolderDialog.inid = itemMenu.folderid;
						newfolderDialog.show();
						newfolderform.getChildByElement('folderfield').labelEl.update("Folder Name");
						newfolderform.getChildByElement('folderfield').labelEl.show();
						newfolderDialog.setTitle('Create New Folder');					
					}
				},
				{
					id: 'itemMenu_cleartrash',
					icon: 'images/_editdelete.png',
					text: 'Clear Trash Bin',
					handler: function() 
					{ 	
						cleartrashbin();
					}
				},
				{
					id: 'itemMenu_contact',
					icon: 'images/user_group.png',
					text: 'Add contact',
					handler: function() 
					{ 		
						Ext.getBody().mask(); 
						newcontactDialog.show();					
						itemMenu.hide();
					}
				},
				{
					id: 'itemMenu_delcontact',
					icon: 'images/_editdelete.png',
					text: 'Delete contact',
					handler: function() 
					{ 							
						console.log(selectedRecords);			
						var qstr = 'Are you sure you want to delete this user from your contact list?';					
						if (selectedRecords.length > 1) qstr = 'Are you sure you want to delete these users from your contact list?';		
					
						Ext.MessageBox.show(
						{							
							title:'Delete contact',
							msg: qstr,
							buttons: Ext.MessageBox.YESNO,
							fn: function(answer) 
							{ 
								if (answer == 'yes')
								{
									var ops = [];	
		
									for (var i in selectedRecords)
									{																			
										ops.push({
										 a: 'ur',
										 u: selectedRecords[i].data.id,
										 l: '0',
										 i: requesti
										});									
										process_d(selectedRecords[i].data.id,true);
									}												
									api_req(ops);
									aftermove(true);
								}
							},
							icon: Ext.MessageBox.QUESTION
						});					
					}
				},
				{
					id: 'itemMenu_remove',
					icon: 'images/_editdelete.png',
					text: 'Remove',
					handler: function() 
					{ 
					   var isFolder = false;
					   itemMenu.hide();					
					   if (RootbyId(selectedRecords[0].data.id) == TrashbinID)
					   {
							Ext.MessageBox.show(						
							{					
								id: 'trashbinmsg',
								title:'Confirm deletion',
								msg: 'You are about to permanently remove ' + getitemtxt() + ' from the trashbin.<br />Would you like to proceed?',
								buttons: Ext.MessageBox.YESNO,
								fn: function(answer) 
								{ 
									if (answer == 'yes')
									{
										// remove permanently:									
										removefromtrash();																	
									}
								},
								icon: Ext.MessageBox.QUESTION
							});
					   }
					   else
					   {	
							var jsonmove = [];
							var selrec = selectedRecords;
							for (var i in selrec)
							{
								if (selrec[i].get('folder') == 1) isFolder =true;
								jsonmove[i] = 
								{ 
									a: 'm',
									n: 	selrec[i].get('id'),
									t: 	TrashbinID,
									i:  requesti
								};
								moveitem(selrec[i],TrashbinID,false);	
							}
							if (!trashbinfull)
							{
								replacefoldericon(TrashbinID,'trashbinfull');
								trashbinfull=true;
							}
							processmove(jsonmove);									
							aftermove(isFolder);
							
					   }
					}
				}
			,'-',
			{
				id: 'itemMenu_reload',
				icon: 'images/_reload.png',
				text: 'Reload',
				handler: function() 
				{ 	
					itemMenu.hide(); 
					reloadfm();						
				}
			}
		]
		});
	function reloadfm()
	{
		loadingDialog.show();
		FileStore.removeAll();	
		dirroot.removeAll();
		SharingStore.removeAll();
		loadfm();
	}
	
	function rightclickmenu(grid,record,item,index,e,eOpts)
	{
		console.log('right click menu');		
		console.log(record.data);
		if (!record.data) return false;
		console.log(record.data.id);		
		var sourceRoot = RootbyId(record.data.id);		
		e.preventDefault();		
		itemMenu.items.get('itemMenu_open').hide();
		itemMenu.items.get('itemMenu_download').hide();
		itemMenu.items.get('itemMenu_rename').hide();
		itemMenu.items.get('itemMenu_link').hide();
		itemMenu.items.get('itemMenu_sharing').hide();
		itemMenu.items.get('itemMenu_permissions').hide();	
		itemMenu.items.get('itemMenu_move').hide();
		itemMenu.items.get('itemMenu_copy').hide();
		itemMenu.items.get('itemMenu_remove').hide();
		itemMenu.items.get('itemMenu_cleartrash').hide();
		itemMenu.items.get('itemMenu_contact').hide();
		itemMenu.items.get('itemMenu_delcontact').hide();		
		itemMenu.items.get('itemMenu_createfolder').hide();
		if (grid.xtype == 'treeview')
		{
			FileGrid.selModel.deselectAll();
			selectedRecords = new Array();
			selectedRecords[0] = FileStore.getById(record.data.id);
		}
		if (record.data.id == RootID)
		{
			itemMenu.folderid = record.data.id;
			itemMenu.items.get('itemMenu_createfolder').show();
		}
		else if ((record.data.id == TrashbinID) && (trashbinfull))
		{	
			itemMenu.items.get('itemMenu_cleartrash').show();			
		}
		else if (record.data.id == NetworkID)
		{
			itemMenu.items.get('itemMenu_contact').show();	
		}
		else  if ((record.data.id == RootID) || (record.data.id == InboxID) || (record.data.id == TrashbinID))
		{	
			return false;
		}	
		else if (FileStore.getById(record.data.id).data.parentid == NetworkID)
		{	
			itemMenu.items.get('itemMenu_delcontact').show();
		}
		else if (grid.xtype == 'treeview')
		{
			if (sourceRoot != TrashbinID) itemMenu.items.get('itemMenu_copy').show();		
			if (sourceRoot == NetworkID) 
			{		
				if (RightsbyID(record.data.id) > 1)
				{
					itemMenu.items.get('itemMenu_createfolder').show();
					itemMenu.items.get('itemMenu_rename').show();
					itemMenu.folderid = record.data.id;
				}
				
				itemMenu.items.get('itemMenu_permissions').show();			
			}
			else
			{					
				itemMenu.folderid = record.data.id;
				itemMenu.items.get('itemMenu_rename').show();
				itemMenu.items.get('itemMenu_createfolder').show();		
				itemMenu.items.get('itemMenu_move').show();
				itemMenu.items.get('itemMenu_remove').show();		
			}				
			if (sourceRoot == RootID) itemMenu.items.get('itemMenu_sharing').show();		
		}
		else
		{	
			itemMenu.items.get('itemMenu_copy').show();	
			if ((sourceRoot != NetworkID) || ((sourceRoot == NetworkID) && (RightsbyID(record.data.id) == 2)))
			{
				if ((record.get('folder') > 0) && (record.get('su') != ''))
				{
					itemMenu.items.get('itemMenu_permissions').show();
				}
				else
				{		
					itemMenu.items.get('itemMenu_move').show();
					itemMenu.items.get('itemMenu_remove').show();
					if (selectedRecords.length == 1) itemMenu.items.get('itemMenu_rename').show();				
				}
			}
			if (record.get('folder') && (selectedRecords.length == 1)) itemMenu.items.get('itemMenu_open').show();
			else if (!record.get('folder'))
			{
				itemMenu.items.get('itemMenu_download').show();	
				itemMenu.items.get('itemMenu_link').show();	
			}			
			if (record.get('folder') && (selectedRecords.length == 1) && (sourceRoot == RootID)) itemMenu.items.get('itemMenu_sharing').show();
		}
		itemMenu.showAt(e.getPageX(),e.getPageY());
	}		
	// Column Model shortcut array
	var transferColumns = [
		{text: "Name", flex: 1, sortable: false, dataIndex: 'name', renderer: renderFileName, hideable: false},
		{text: "Size", width: 100, sortable: false, dataIndex: 'size', renderer: renderFileSize, hideable: false},
		{text: "Transfer type", width: 150, sortable: false, dataIndex: 'transfertype', renderer: renderTransferType, hideable: false},
		{text: "Status", width: 282, sortable: false, dataIndex: 'status', renderer: renderStatus, hideable: false},
		{text: "Speed", width: 110, sortable: false, dataIndex: 'speed', renderer: renderSpeed, hideable: false},
		{text: "Elapsed time", width: 110, sortable: false, dataIndex: 'eltime', renderer: renderEltime, hideable: false},
		{text: "Remaining time", width: 110, sortable: false, dataIndex: 'retime', renderer: renderRetime, hideable: false}
	];

	// Column Model shortcut array
	var columns = [
		{text: "Name", flex: 1, sortable: true, dataIndex: 'name', renderer: renderFileName},
		{text: "Size", width: 100, sortable: true, dataIndex: 'size', renderer: renderFileSize},
		{text: "Type", width: 100, sortable: true, dataIndex: 'type', renderer: renderFileType},
		{text: "Last modified", width: 130, sortable: true, dataIndex: 'date', renderer: renderDate},
	];	
	var sharingColumns = [
		{text: "E-mail", flex: 1, sortable: true, dataIndex: 'userid', renderer: renderOwner},
		{text: "Rights", width: 120, sortable: true, dataIndex: 'rights', renderer: renderRights},
		{text: "Last modified", width: 120, sortable: true, dataIndex: 'date', renderer: renderDate}
	];		
	topFolderMenu = Ext.create("Ext.container.ButtonGroup", { id: 'topfoldermenu' });		
	
	var fm_fileuploader = '<input type="file" id="fileselect1" style="height:29px; width:112px; -moz-opacity:0; filter:alpha(opacity: 0); opacity: 0; cursor:hand;" size="42" multiple>';		
	
	var fm_folderuploader = '<input type="file" id="fileselect2" webkitdirectory style="height:29px; width:112px; -moz-opacity:0; filter:alpha(opacity: 0); opacity: 0; cursor:hand;" size="42" multiple>';
			
	if (ul_method) fm_fileuploader = '<object data="uploader.swf" id="uploaderswf" type="application/x-shockwave-flash" width="112" height="29" ><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"></object>';
	
	var topButtonitems = [];		
	topButtonitems[0] =
	{
		text: 'New Folder',
		icon: 'images/newfolder.png',
		scale: 'small',
		handler: function() 
		{				
			Ext.getBody().mask(); 
			newfolderDialog.inid = currentdirid;
			newfolderDialog.show();
			newfolderform.getChildByElement('folderfield').labelEl.update("Folder Name");
			newfolderform.getChildByElement('folderfield').labelEl.show();
			newfolderDialog.setTitle('Create New Folder');
		}				
	};		
	topButtonitems[1] = 
	{
		text: 'New Upload',
		icon: 'images/mega/up.png',
		scale: 'small',
		href: 'javascript:void(0);',
		styleHtmlContent: false,
		renderTpl: 	'<em id="{id}-btnWrap" class="{splitCls}">' +
					'<tpl if="href">' +
					'<a id="{id}-btnEl" href="{href}" target="{target}"<tpl if="tabIndex"> tabIndex="{tabIndex}"</tpl> role="link">' +							
					'<span id="{id}-btnInnerEl" class="{baseCls}-inner">' +
					'{text}' +
					'</span>' +							
					'<div style="width:112px; height:29px; position:absolute; left:0px; top:0px; z-index:999999999;">' + fm_fileuploader + '</div>' +							
					'<span id="{id}-btnIconEl" class="x-btn-icon" style="background-image:url(\'images/mega/up.png\');"></span>' +
					
					'</a>' +
					'</tpl>' +						
					'</em>'	,
		handler: function() 
		{				
			//Ext.getBody().mask(); 
			//uploadDialog.show();					
		}				
	};
	
	var inputTest = document.createElement('input');	
	if (typeof inputTest.webkitdirectory != 'undefined')
	{	
		topButtonitems[1].text = 'File Upload';
		topButtonitems[2] =
		{
			text: 'Folder Upload',
			icon: 'images/mega/up.png',
			scale: 'small',
			href: 'javascript:void(0);',
			styleHtmlContent: false,
			renderTpl: 	'<em id="{id}-btnWrap" class="{splitCls}">' +
						'<tpl if="href">' +
						'<a id="{id}-btnEl" href="{href}" target="{target}"<tpl if="tabIndex"> tabIndex="{tabIndex}"</tpl> role="link">' +							
						'<span id="{id}-btnInnerEl" class="{baseCls}-inner">' +
						'{text}' +
						'</span>' +							
						'<div style="width:112px; height:29px; position:absolute; left:0px; top:0px; z-index:999999999;">' + fm_folderuploader + '</div>' +							
						'<span id="{id}-btnIconEl" class="x-btn-icon" style="background-image:url(\'images/mega/up.png\');"></span>' +
						
						'</a>' +
						'</tpl>' +						
						'</em>'	,
			handler: function() 
			{				
				//Ext.getBody().mask(); 
				//uploadDialog.show();					
			}				
		};
	}
	
	topButtons = Ext.create("Ext.container.ButtonGroup",
	{
			id: 'topbuttons',
			xtype:'buttongroup',
			items: topButtonitems
	});
	
	topBcontact = Ext.create("Ext.container.ButtonGroup",
	{
			id: 'topBcontact',
			xtype:'buttongroup',
			hidden: true,			
			items: [
			{
				text: 'Add contact',
				icon: 'images/user_group.png',
				scale: 'small',
				handler: function() 
				{				
					Ext.getBody().mask(); 
					newcontactDialog.show();					
					itemMenu.hide();
				}				
			}
			]
	});
	
	topBtrash = Ext.create("Ext.container.ButtonGroup",
	{
			id: 'topBtrash',
			xtype:'buttongroup',
			hidden: true,			
			items: [
			{
				text: 'Clear Trash Bin',
				icon: 'images/_editdelete.png',
				scale: 'small',
				handler: function() 
				{				
					cleartrashbin();
				}				
			}
			]
	});
		
	searchPanel = Ext.create('Ext.Panel',
	{		
		id: 'searchpanel',
		frame: false,
		border: false,
		bodyStyle: 'background:transparent;',
		padding: 0,
		html: '<input type="text" onfocus="this.value=(this.value==\'Search\') ? \'\' : this.value;" onblur="this.value=(this.value==\'\') ? \'Search\' : this.value;" value="Search" onkeydown="if(event.keyCode == 13) fmsearch(this.value);">'		
	});

	// declare the source Grid
	FileGrid = Ext.create('Ext.grid.Panel', 
	{
		id: 'filegrid',
		renderTpl: ['<div id="filedrag"><div id="{id}-body" class="{baseCls}-body<tpl if="bodyCls"> {bodyCls}</tpl>', ' {baseCls}-body-{ui}<tpl if="uiCls">', '<tpl for="uiCls"> {parent.baseCls}-body-{parent.ui}-{.}</tpl>', '</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>', '</div></div>'],
		multiSelect: true,
		invalidateScrollerOnRefresh: false,
		verticalScroller: 
		{
			xtype: 'paginggridscroller',
			activePrefetch: false
		},			
		viewConfig: 
		{
			plugins: 
			{
				ptype: 'gridviewdragdrop2',			
				dragGroup: 'bkmDDGroup',
				dropGroup: 'bkmDDGroup',
				ddGroup: 'bkmDDGroup',
				enableDrop : true,
				appendOnly: true
			}
		},	
		flex:1,
		store            : FileStore,
		columns          : columns,
		stripeRows       : true,	
		dockedItems: [{
			xtype: 'toolbar',
			dock: 'top',
			items: [
				topFolderMenu, topButtons, topBcontact, topBtrash, { xtype: 'tbfill' }, searchPanel
			]
		}],
		margins          : '0 2 0 0',
		listeners: {
				itemdblclick 		 : function(var1,record) 
				{ 
					if (record.data.folder)
					{
						opendirectory(record.data.id);
					}
					else
					{
					  adddownload(record);
					}
				},		
				itemclick: function (th,rec,item,index, e, eOpts)
				{				
					var selar = th.selModel.getSelection();					
					var selar2 = [];					
					for (var i in selar)
					{
						if (selar[i].get('id') !== rec.get('id')) selar2.push(selar[i]);												
					}
					if ((th.selModel.getCount() > 1) && (!e.shiftKey) && (!e.ctrlKey))
					{
						th.selModel.deselect(selar2);
					}	
				},			
				itemcontextmenu 		: rightclickmenu,
				selectionchange : function (grid, selected) { selectedRecords=selected; }
			}
	});
		
	transferStore = Ext.create('Ext.data.Store', 
	{
		model: 'TransferFS',
		sorters: 
		[{
			property: 'started',
			direction: 'DESC'
		},
		{
			property: 'transfertype',
			direction: 'ASC'
		}]
	});
	
	transferMenu = Ext.create('Ext.menu.Menu',
	{
		id:'sharingMenu',
		items: [    
		{
			id: 'itemMenu_delete',
			icon: 'images/_editdelete.png',
			text: 'Cancel transfer',
			handler: function() 
			{ 
				var node = transferStore.getById(canceltransferid);			
				if (node)
				{
					if (node.get('transfertype') == 'download')
					{
						for (var i in dl_queue)
						{
							if (dl_queue[i])
							{
								if (dl_queue[i].id == canceltransferid)
								{
									if (i == dl_queue_num) dl_cancel();
									dl_queue[i] = false;
									transferprogress[node.get('id')] = undefined;
									transferStore.remove(node);
									startdownload();
									return false;
								}
							}
						}
						transferStore.remove(node);					
					}
					else if (node.get('transfertype') == 'upload')
					{
						for (var i in ul_queue)
						{
							if (ul_queue[i])
							{
								if (ul_queue[i].id == canceltransferid)
								{
									if (i == ul_queue_num) ul_cancel();
									ul_queue[i] = false;			
									transferprogress[node.get('id')] = undefined;
									transferStore.remove(node);
									startupload();
									return false;
								}
							}
						}
						transferStore.remove(node);					
					}
				}
			}		
		}]
	});
	
	transferGrid = Ext.create('Ext.grid.Panel', 
	{
		id: 'transfergrid',
		simpleSelect: false,		
		flex:1,
		store            : transferStore,
		columns          : transferColumns,
		height: 172,
		stripeRows       : true,
		verticalScroller: 
		{
			xtype: 'paginggridscroller',
			activePrefetch: false
		},
		margins          : '0 2 0 0',
		width: '100%',
		selType: 'rowmodel' ,
		listeners:
		{
			itemclick: function (th,rec,item,index)
			{
				th.selModel.allowDeselect = true;	
				if (rec.get('exceeded')) showlimit();
			},
			itemcontextmenu : function (grid,record,item,index,e,eOpts)
			{		
				console.log(record.get('id'));
				canceltransferid = record.get('id');
				e.preventDefault();
				transferMenu.showAt(e.getPageX(),e.getPageY());
			}
		}
	});	

	transferPanel = Ext.create('Ext.Panel',
	{	
		id: 'transferpanel',
		title: 'File transfers',    
		width: '100%',
		height:200,
		minHeight:150,
		autoScroll:false,
		collapsed: true,
		containerScroll: false,
		collapseDirection: 'bottom',	
		collapsible: true,
		floatable: false,   	
		defaults     : { flex : 1 },
		items        : [ transferGrid ]	
	});	

	var displayPanel = Ext.create('Ext.Panel', 
	{
		id: 'displaypanel',
		width        : '100%',   
		margins		 : '0 0 0 0',
		layout       : 
		{
			type: 'hbox',
			align: 'stretch',
			padding: 0
		},
		defaults     : { flex : 1 },
		items        : [ FileGrid ]
	});

	var a=0;
	function adddownload(record)
	{	
		var node = transferStore.getById(record.get('id'));
		if (!node)
		{
			var MegaDownload = 
				{
				  name : 	record.get('name'),
				  size: 	record.get('size'),
				  type: 	record.get('type'),	
				  icon: 	record.get('icon'),
				  key: 		record.get('key'),
				  parentid: "",
				  folder: 	record.get('folder'),
				  id: 		record.get('id'),
				  transfertype: 'download',
				  transfericon: 'images/down.png',
				  status: 	'pending'
				};		
				a++;
			transferStore.add(MegaDownload);		
			dl_queue.push(
			{
				id:		record.get('id'),
				key: 	record.get('key'),
				n: record.get('name'),
				onDownloadProgress: fm_dlprogress,
				onDownloadComplete: fm_dlcomplete,
				onBeforeDownloadComplete: fm_beforedlcomplete,
				onDownloadError: fm_dlerror,
				onDownloadStart: fm_dlstart				
			});
			startdownload();
		}
		transferPanel.expand();	
	}
	dirroot = Ext.create('Ext.data.TreeStore');
	mcdirroot = Ext.create('Ext.data.TreeStore');
	dirtree = Ext.create('Ext.tree.Panel',
	{		
			rootVisible:false,
			viewConfig: {forceFit: true},
			title: 'File manager',
			region:'west',			
			margins: '5 0 0 5',
			width: fmconfig.treewidth || 250,
			collapsible: false,   // make collapsible
			autoScroll:false,
			animate:true, 		
			containerScroll: true,
			id: 'dirtree',
			layout: 'fit',		
			droppedRecords: undefined,
			viewConfig: {
				plugins: 
				{
					ptype: 'treeviewdragdrop2',          
					dropgroup: 'bkmDDGroup',
					ddGroup: 'bkmDDGroup',
					enableDrag : true,
					appendOnly: true
				},
				listeners:
				{		
					afteritemexpand: function (node, index, item, eOpts )
					{
						fmtreenode(node.get('id'),true);					
					},
					afteritemcollapse: function (node, index, item, eOpts )
					{
						fmtreenode(node.get('id'),false);
					},
					resize: function (el, width, height)
					{
						storefmconfig('treewidth',width);
					},
					beforedrop: function(node, data, overModel, dropPos, dropHandlers) 
					{
						var sendtouser=false;					
						var targetId = '';
						var sourceId = '';					
						var targetRoot = '';
						var sourceRoot = '';
						if (overModel)
						{				
							targetId = overModel.get('id');						
							targetRoot = RootbyId(targetId);
												
							if ((targetId == InboxID) || (targetId == NetworkID)) return false;
																
							if ((targetId !== TrashbinID) && (targetId !== RootID))
							{				
								if (FileStore.getById(targetId).data.parentid == NetworkID)
								{
									sendtouser= FileStore.getById(targetId).data.id;
									console.log('send to user ' + sendtouser);
								}														
							}
						}
						// only for drag-drop from grid to treepanel
						if (!('parentId' in data.records[0].data))
						{
							sourceId = data.records[0].data.id;
							sourceRoot = RootbyId(sourceId);							
							this.droppedRecords = data.records;
							data.records = [];		
						}
						else
						{
							sourceId = data.records[0].data.id;
							sourceRoot = RootbyId(sourceId);
							if (sendtouser) 
							{
								// item(s) to private INBOX (treepanel to treepanel)							
								dropHandlers.wait = true;
								Ext.Msg.confirm('Confirmation', 'Do you want to copy the selected folder to the private inbox of ' + useremails[sendtouser] + '?', function(but) 
								{
									if (but === 'yes') 
									{						
										copytouser([data.records[0].data.id],overModel.get('id'));								
									}
								});
								dropHandlers.cancelDrop();
								return false;
							}
							else if (targetRoot == NetworkID)
							{
								// item(s) to SHARED folder (treepanel to treepanel)
								dropHandlers.wait = true;
								Ext.Msg.confirm('Confirmation', 'Do you want to copy the selected folder to this shared folder?', function(but) 
								{
									if (but === 'yes') 
									{						
										copyitems([data.records[0].data.id],overModel.get('id'));								
									}
								});
								dropHandlers.cancelDrop();							
								return false;
							}
							else if ((sourceRoot == NetworkID) && (targetRoot == RootID))
							{
								// item(s) from NETWORK to ROOT (treepanel to treepanel)
								dropHandlers.wait = true;							
								copyitems([data.records[0].data.id],overModel.get('id'));							
								dropHandlers.cancelDrop();							
								return false;
							}
							else
							{
								setTimeout("dirsort(dirroot);",100);
								setTimeout("updateTopFolderMenu('" + currentdirid + "')",150);						
							}
						}
					},
					drop: function(node, data, overModel, dropPos, dropHandlers) 
					{				
						var sendtouser=false;					
						var targetId = '';
						var sourceId = '';					
						var targetRoot = '';
						var sourceRoot = '';
						if (overModel)
						{				
							targetId = overModel.get('id');						
							targetRoot = RootbyId(targetId);
							console.log(targetRoot);
							if ((targetId == InboxID) || (targetId == NetworkID)) return false;	
							if ((targetId !== TrashbinID) && (targetId !== RootID))
							{				
								if (FileStore.getById(targetId).data.parentid == NetworkID)
								{
									sendtouser= FileStore.getById(targetId).data.id;
									console.log('send to user ' + sendtouser);
								}														
							}
						}						
						var ignoreTreeUpdates=false;
						if (data.records[0])
						{
							// drag-drop within treepanel
							console.log('move ' + data.records[0].data.id + ' to ' + overModel.get('id')); 							
							moveitem(FileStore.getById(data.records[0].data.id),overModel.get('id'),true);							
							var jsonmove = [];					
							jsonmove[0] = 
							{ 
								a: 'm',
								n: 	data.records[0].data.id,
								t: 	overModel.get('id'),
								i:  requesti
							}												
							processmove(jsonmove);
						}
						else
						{					
							sourceId = this.droppedRecords[0].get('id');
							sourceRoot = RootbyId(sourceId);	
							var copydel = false;					
							if ((sourceRoot == NetworkID) && (targetId == TrashbinID))
							{
								if (RightsbyID(sourceId) > 1)  copydel = true;						
							}							
							if (sendtouser)
							{
								// item(s) to private INBOX (gridpanel to treepanel)							
								Ext.Msg.confirm('Confirmation', 'Do you want to copy the selected item(s) to the private inbox of ' + useremails[sendtouser] + '?', function(but) 
								{
									var recordids = new Array();
									for(var i in selectedRecords) recordids[i] = selectedRecords[i].data.id;						
									if (but === 'yes') 
									{			
										console.log('copytouser call');
										copytouser(recordids,overModel.get('id'));								
									}
								});						
							}
							else if (targetRoot == NetworkID)
							{
								// item(s) to SHARED folder (gridpanel to treepanel)
								Ext.Msg.confirm('Confirmation', 'Do you want to copy the selected item(s) to this shared folder?', function(but) 
								{
									var recordids = new Array();
									for(var i in selectedRecords) recordids[i] = selectedRecords[i].data.id;						
									if (but === 'yes') 
									{						
										copyitems(recordids,overModel.get('id'));								
									}
								});
							}
							else if (((sourceRoot == NetworkID) && (targetRoot == RootID)) || (copydel))
							{
								// item(s) from NETWORK to ROOT (gridpanel to treepanel)
								// if copydel is set, it is a deletion from a shared folder with full control (copy, then delete)
								var recordids = new Array();
								for(var i in selectedRecords) recordids[i] = selectedRecords[i].data.id;						
								copyitems(recordids,overModel.get('id'),copydel);							
							}
							else
							{		
								var i=0;
								var jsonmove = [];								
								var isFolder = false;								
								// Regular move operation with everything else (gridpanel to treepanel)							
								Ext.iterate(this.droppedRecords, function(record) 
								{										
									if (record.get('folder') == 1) isFolder = true;								
									console.log('move ' + record.get('id') + ' to ' + overModel.get('id')); 
									moveitem(record,overModel.get('id'),false);
									jsonmove[i] = 
									{ 
										a: 'm',
										n: 	record.get('id'),
										t: 	overModel.get('id'),
										i:  requesti
									};				
									i++;
								});							
								processmove(jsonmove);			
								aftermove(isFolder);
								this.droppedRecords = undefined;
							}
						}
					},
					itemcontextmenu : rightclickmenu
				}
			},
			listeners: {
					select: function(panel,record,index,Obj) 
					{
					
					},					
					itemclick: function ( panel, record, item, index, e, eOpts )
					{				
						opendirectory(record.get('id'));		
					}
				},
				store: dirroot
	});

	/*
	==================
	GET LINK(S)
	==================
	*/
	
	
	function requestlinks()
	{
		ops = [];
		for(var i in selectedRecords)
		{	
			ops.push(
			{
				a: 'l',
				n: selectedRecords[i].get('id')
			});
		}	
		api_req(ops,
		{ 
		  callback : function (json,params)
		  {	
			for(var i in selectedRecords)
			{
				selectedRecords[i].set("ph",json[i]);		
			}
			console.log(json);
			loadingDialog.hide();  		
			Ext.getBody().mask();
			getLinkDialog.show();	 		
		  }	 
		});
	}

	var getLinkDialog = Ext.create('widget.window',
	{
		id: 'getlinkdialog',
		title: 'Links',
		closable: true,
		closeAction: 'hide',
		width: 600,
		height: 330,
		minWidth: 600,
		minHeight: 220,
		
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{ 		
				Ext.getBody().unmask();
			},
			activate: function() 
			{		
				createlinks();		
			}
		},
		html: '<div class="getlinks-checkbox"><div id="getlink_filelink_div" class="checkboxOn"><input type="checkbox" id="getlink_filelink" onClick="getlinkcheck(\'getlink_filelink\');" class="checkboxOn" checked ></div><div class="register-terms-text"> File link </div></div><div class="getlinks-checkbox"><div id="getlink_filekey_div" class="checkboxOn"><input type="checkbox" id="getlink_filekey" onClick="getlinkcheck(\'getlink_filekey\');" class="checkboxOn" checked ></div><div class="register-terms-text"> File key </div></div><div class="getlinks-checkbox"><div id="getlink_filename_div" class="checkboxOff"><input type="checkbox" id="getlink_filename" onClick="getlinkcheck(\'getlink_filename\');" class="checkboxOff" ></div><div class="register-terms-text"> File name </div></div><div class="getlinks-checkbox"><div id="getlink_filesize_div" class="checkboxOff"><input type="checkbox" id="getlink_filesize" onClick="getlinkcheck(\'getlink_filesize\');" class="checkboxOff" ></div><div class="register-terms-text"> File size </div></div><div class="getlinkdialog-input"><textarea id="getlink_textarea" onclick="this.select();" readonly></textarea></div><div class="clear"></div>'
	});

	/*
	==================
	MOVING FILES/FOLDERS
	==================
	*/
	var mctree = Ext.create('Ext.tree.Panel',
	{
		id: 'mctree',
		rootVisible: false,
		title: 'Move to location',
		region: 'west',
		title: 'Select destination',
		width: 400,		
		split: true,
		collapsible: false,
		floatable: false,     
		//rootVisible: true,
		store: mcdirroot,
		listeners: 
		{ 
			select: function(movet,rec) { mcrec = rec; }
		}
	});

	var fmtopmenu = pages['topl'];
	if (u_type == 0) fmtopmenu = pages['top'];
	mainpanel = Ext.create('Ext.panel.Panel', 
	{
		id: 'mainpanel',
		width: '100%',
		height: '100%',
		layout: 'border',
		listeners:
		{
			afterrender: function()
			{
				//if ($j) $j('#language_hover').tooltip({ position: "bottom center" });
			}	
		},
		defaults: { split: true },
		items:  [dirtree,{
			region: 'center',     
			xtype: 'panel',
			layout: 'fit',
			id: 'center-region-container',
			margins: '0 0 0 0',
			items: [displayPanel]
		}],
		dockedItems: [{
			region: 'center',     
			xtype: 'panel',
			dock: 'bottom',
			layout: 'fit',
			margins: '0 0 0 0',
			items: [transferPanel]
		},
		{
			region: 'center',     
			xtype: 'panel',
			dock: 'top',
			width: '100%',
			height: '50',
			layout: 'fit',
			margins: '0 0 0 0',
			items: [
			{
				frame: false,
				border: false,
				bodyStyle: 'background:transparent;',
				padding: 0,
				html: fmtopmenu
			}]
		}
		],
		renderTo: 'fmholder'
	});

	Ext.EventManager.onWindowResize(function(w, h)
	{
		mainpanel.doComponentLayout();
	});

	limitDialog = Ext.create('widget.window',
	{
		id: "limitdialog",
		title: 'Complimentary bandwidth quota exceeded',
		closable: true,
		closeAction: 'hide',
		width: 600,
		operation: 'move',
		minWidth: 600,
		height: 400,
		minHeight: 400,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{ 
				Ext.getBody().unmask();
			},
			activate: function() 
			{
				
			}
		},
		bodyStyle: 'padding: 5px;',
		html: '<font style=\"font-size:15px; font-weight:normal; text-decoration:none;\">' + 
		'Your download cannot proceed, because it would take you over the current free transfer allowance for your IP address.' +
		'This limit is dynamic and depends on the amount of unused bandwidth we have available.' +
		'Only transfers made during the last five to six hours count.' + 
		'In that time window, <br><br><div id="limitmsg"></div><br><br>For your convenience, your queued downloads will be put on hold until you have enough quota available, and then resume automatically.<br><br>' +
		'If you do not wish to wait, you may wish to consider signing up for a bandwidth package that also gives you ample extra storage.<br><br>'+ 
		'<b>Upgrade to Pro</b></font><br><br>',
	});

	chromeDialog = Ext.create('widget.window',
	{
		id: "chromedialog",
		title: 'Mega rocks with Google Chrome',
		closable: true,
		closeAction: 'hide',
		width: 700,
		operation: 'move',
		minWidth: 700,
		height: 455,
		minHeight: 455,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{ 
				Ext.getBody().unmask();
			},
			activate: function() 
			{
				Ext.getBody().mask();			
			}
		},
		bodyStyle: '',
		html: '<div class="browsers-top-txt"><span class="red">Warning:</span> You are using an outdated browser, which adversely affects your file transfer performance.<br />Please upgrade to Google Chrome.</div><div class="browsers-logo-block"><div></div></div><div class="browsers-bott-txt">While other browser vendors are still struggling to implement the full spectrum of HTML5’s functionality, Google Chrome has it all - today. To enjoy Mega’s full power (such as automated batch up - and downloading), we strongly suggest abandoning your current, outdated browser and upgrading to Chrome as soon as possible.</div><div class="browsers-bottom-block"><div id="checkbox_br_div" class="checkboxOff"><input type="checkbox" id="checkbox_br" onClick="logincheckboxCheck(\'checkbox_br\');" class="checkboxOn"></div><div class="browsers-label"> Do not show this message again </div><a href="javascript:chromeDialog.close();" class="browsers-button">No, Thanks</a><a href="http://www.google.com/chrome" class="browsers-button" target="_blank">Download Chrome</a><div class="clear"></div></div>'
	});

	chromemsgDialog = Ext.create('widget.window',
	{
		id: "chromemsgdialog",
		title: 'Download files',
		closable: false,
		width: 470,
		operation: 'move',
		minWidth: 470,
		height: 90,
		left:100,
		minHeight: 90,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{ 
				Ext.getBody().unmask();
			},
			activate: function() 
			{
				chromemsgDialog.setPosition(205,300);
				Ext.getBody().mask();		
				setTimeout("chromearrow()",500);
			},
			
		},
		bodyStyle: '',
		html: '<div class="chromemsgdialog-txt">Click “Allow” for download completion</div><div class="chromedialog-buttons" onclick="chromearrowmove();"><div class="chromedialog-cursor"><div style="display:none; position:absolute; left:-85px; top:-250px; width:123px; height:118px; background-image:url(\'images/chrome-arrow.png\');" id="chrome-arrow"></div></div></div><div class="clear"></div>'
	});

	var mcDialog = Ext.create('widget.window',
	{
		id: "mcdialog",
		title: 'Move Items',
		closable: true,
		closeAction: 'hide',
		width: 350,
		operation: 'move',
		minWidth: 350,
		height: 350,
		minHeight: 350,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{ 
				mctree.getSelectionModel().deselect(mcrec);
				mcrec=false;
				Ext.getBody().unmask(); 
			},
			activate: function() 
			{
				console.log('initalize ' + mcDialog.operation + ' tree');						
				// copy from root to network -> 1
				// copy from network to root -> 2			
				// move from root to root/trash -> 3
				// move from trash to root -> 4					
				var sourceId 	= selectedRecords[0].get('id');			
				var sourceRoot 	= RootbyId(sourceId);				
				var otype=0;				
				if ((sourceRoot == RootID) && (mcDialog.operation == 'copy')) 			otype = 1;
				else if((sourceRoot == NetworkID) && (mcDialog.operation == 'copy')) 	otype = 2;			
				else if((sourceRoot == RootID) && (mcDialog.operation == 'move')) 		otype = 3;
				else if((sourceRoot == TrashbinID) && (mcDialog.operation == 'move')) 	otype = 4;											
				FileStore.suspendEvents();						
				createtree(mctree,otype);				
				expandedtreenodes = [];							
				reinstateFileStore();				
				FileStore.resumeEvents();	
				mctree.selectPath('/');	
				console.log(Ext.getCmp('mcButton'));				
				mcDialog.dockedItems.items[0].text = 'test';				
				if (mcDialog.operation == 'move')
				{
					mcDialog.setTitle('Move ' + getitemtxt());			
					Ext.getCmp('mcButton').setText('Move');				
				}
				else
				{
					mcDialog.setTitle('Copy ' + getitemtxt());
					Ext.getCmp('mcButton').setText('Copy');
				}			
			}
		},
		bodyStyle: 'padding: 5px;',
		items: [mctree],
		dockedItems: [ 
			{
				xtype: 'toolbar',
				dock: 'bottom',
				ui: 'footer',
				layout: { pack: 'center' },
				items: [{
							minWidth: 100,
							text: 'Move',
							id: 'mcButton',
							listeners: {
								click: function() 
								{ 			
									console.log(selectedRecords);
								
									if (!mcrec)
									{
										Ext.Msg.alert('Error','Please select the destination folder.');
									}	
									else if(mcrec.get('id') == NetworkID)
									{	
										Ext.Msg.alert('Error','Please select a valid destination target.');
									}
									else if(selectedRecords[0].get('id') == mcrec.get('id'))
									{			
										Ext.Msg.alert('Error','The destination folder cannot be the same as the origin folder.');								
									}							
									else if((mcDialog.operation == 'move') && (isCircular(selectedRecords[0].get('id'),mcrec.get('id'))))
									{
										Ext.Msg.alert('Circular error','Circular error: the destination cannot be a sub-folder of the moving folder.');								
									}
									else if (mcDialog.operation == 'move')
									{
										var selrec = selectedRecords;
										var jsonmove = [];		
										var isFolder = false;
										for (var i in selectedRecords)
										{
											if (selrec[i].get('folder') == 1) isFolder = true;
											moveitem(selrec[i],mcrec.get('id'),false);									
											jsonmove[i] = 
											{ 
												a: 'm',
												n: 	selrec[i].get('id'),
												t: 	mcrec.get('id'),
												i:  requesti
											}
										}								
										processmove(jsonmove);				
										aftermove(isFolder);
										mcDialog.close();
									}
									else if (mcDialog.operation == 'copy')
									{
										var recordids = [];									
										for(var i in selectedRecords)
										{
											recordids[i] = selectedRecords[i].get('id');
										}		
										
										if (mcrec.get('id').length == 11) copytouser(recordids,mcrec.get('id'),false,function() { mcDialog.close() } );
										else copyitems(recordids,mcrec.get('id'),false,function() { mcDialog.close() } );								
									}
								}
							}
						},{ minWidth: 100,
							text: 'Cancel',
							listeners: { 
								click: function() { mcDialog.close(); }
							}
						}]
			}]
	});
	/*
	==================
	SHARING 
	==================
	*/
	function doshare()
	{
		console.log('doshare');		
		var userid = '';		
		console.log(sharing_email.getValue());		
		if (checkMail(sharing_email.getRawValue()))
		{
			// not a valid e-mail addres
			Ext.Msg.alert('Error','Please enter a valid e-mail address.');
			return false;					
		}
		if (userids[sharing_email.getRawValue().toLowerCase()]) userid = userids[sharing_email.getRawValue()];
		else userid = sharing_email.getRawValue();		
		sharednodes[sharingDialog.folderid] = true;
		var targets = []	
		targets[0] = new Object;
		targets[0].u = userid;
		targets[0].r = sharingform.getChildByElement('sharing_rights').value;		
		sharingDialog.setLoading('Please wait...');
		var nodeids = fm_getnodes(sharingDialog.folderid);
		console.log(targets);
		api_setshare1(sharingDialog.folderid,targets,nodeids, 
		{ 
			userid : userid,
			done: function(context) 
			{
				var userid = context.userid;
				context.req.i = requesti;							
				api_req([context.req],
				{ 
				  callback : function (json,params)
				  {
					api_setshare2(json,sharingDialog.folderid);					
					console.log('decode:');
					console.log(json);
					if ((typeof json[0] == 'number') && (json[0] < 0))
					{			
						sharingDialog.setLoading(false);
						Ext.Msg.show({
							 title:'Internal Error',
							 msg: 'Oops, something went wrong. Sorry about that!',
							 buttons: Ext.Msg.OK
						});					
					}
					else if (json[0].r[0] == '0')
					{
						if (typeof json[0].u !== "undefined")
						{				
							// add new user			
							console.log('add new user');	
							console.log(json[0].u[0].u);							
							userid = json[0].u[0].u
							userids[json[0].u[0].m.toLowerCase()] = json[0].u[0].u;
							useremails[json[0].u[0].u] = json[0].u[0].m;					
							sharing_email.getStore().add(
							{
								userid: json[0].u[0].u,
								email: json[0].u[0].m					
							});
						}
						console.log('userid: ' + userid);
						console.log('look up if share excists: ' + sharingDialog.folderid + '_' + userid);									
						sharing_email.reset();								
						var record = SharingStore.getById(sharingDialog.folderid + '_' + userid);						
						if (record)
						{
							console.log('update');		
							console.log(record);
							SharingStore.getById(sharingDialog.folderid + '_' + userid).set('rights',sharingform.getChildByElement('sharing_rights').value);
							SharingStore.getById(sharingDialog.folderid + '_' + userid).commit();		
						}
						else
						{
							console.log('insert');
							SharingStore.add([
							{
								id:			sharingDialog.folderid + '_' + userid,
								userid: 	userid,
								rights: 	sharingform.getChildByElement('sharing_rights').value,
								date:		Math.round(new Date().getTime()/1000),
								folderid: 	sharingDialog.folderid
							}]);					
							replacefoldericon(sharingDialog.folderid,'sharedfolder');															
						}
						sharingDialog.setLoading(false);
					}									
				  }
				});					
			}
		});
	}

	SharingStore = Ext.create('Ext.data.Store', 
	{
		model: 'SharingFS',	
		sortOnFilter:false,			
		sortOnLoad: false
	});

	var sharingMenu = Ext.create('Ext.menu.Menu',
	{
		id:'sharingMenu',
		items: [    
		{
			id: 'itemMenu_delete',
			icon: 'images/_editdelete.png',
			text: 'Remove share',
			handler: function() 
			{ 
				var node = SharingStore.getById(sharingGrid.selectedid);		
				if (node) 
				{				
					var folderid = node.data.folderid;
					SharingStore.remove(node);					
					// delete share:
					var reqs = [];	
					reqs[0] = 
					{
						u: node.data.userid,
						r: ''
					}								
					var ops = [];	
					ops[0] = 
					{	
						a: 's',
						n: sharingDialog.folderid,
						s: reqs,
						i: requesti
					};				
					console.log(ops);				
					api_req(ops);					
					if (SharingStore.count() == 0)
					{	
						sharednodes[folderid] = false;					
						delete u_sharekeys[folderid];
						FileStore.getById(folderid).set('icon','images/extension/folder.png');
						FileStore.getById(folderid).commit();					
						replacefoldericon(folderid,'folder');			
					}
				}
			}
		}]
	});

	var sharingGrid = Ext.create('Ext.grid.Panel', 
	{
		id: 'sharinggrid',
		multiSelect: false,
		simpleSelect: false,		
		flex:0,
		store            : SharingStore,
		columns          : sharingColumns,
		stripeRows       : true,
		margins          : '0 2 0 0',
		width: '100%',
		height: 100,
		region: 'center',
		selectedid: '',
		listeners:
		{
			selectionchange : function (grid, selected) 
			{ 				
				if (selected.length == 0)
				{
					sharing_email.reset();
					sharingform.getChildByElement('sharing_rights').reset();
				}
				else
				{
					sharingGrid.selectedid = selected[0].data.id;
					sharing_email.setValue(selected[0].data.userid);
					sharingform.getChildByElement('sharing_rights').setValue(selected[0].data.rights);			
				}
				console.log(selected);
			},
			itemcontextmenu : function (grid,record,item,index,e,eOpts)
			{		
				e.preventDefault();
				sharingMenu.showAt(e.getPageX(),e.getPageY());
			},
			itemclick: function (th,rec,item,index)
			{
				th.selModel.allowDeselect = true;		
			}	
		}
	});	
	
	sharing_email = Ext.create('Ext.form.field.ComboBox',
	{
			id: 'sharing_email',
			xtype:          'combo',
			mode:           'local',
			value:          '',
			triggerAction:  'all',
			forceSelection: false,
			editable:       true,
			fieldLabel:     'E-mail address:',
			name:           'sharing_email',
			id:           	'sharing_email',
			displayField:   'email',
			valueField:     'userid',
			queryMode: 		'local',
			store:          Ext.create('Ext.data.Store', 
			{
				fields : ['email', 'userid']
			}),
			listeners:
			{
				specialkey: function(f,e)
				{   
					if(e.getKey()==e.ENTER) 
					{
						doshare();
					}
				}  		
			}
	});

	var sharingform = Ext.create('Ext.form.Panel', 
	{      
		id: 'sharingform',
		frame:true,
		title: 'Share to new user:',
		bodyStyle:'padding:5px 5px 0',
		width: 350,
		fieldDefaults: 
		{
			msgTarget: 'side',
			labelWidth: 100
		},
		defaultType: 'textfield',
		defaults: 
		{
			anchor: '100%'
		},
		region: "south",

		items: [
		sharing_email,
		{
			xtype:          'combo',
			mode:           'local',
			value:          '0',
			triggerAction:  'all',
			forceSelection: true,
			editable:       false,
			fieldLabel:     'Rights:',
			name:           'sharing_rights',
			id:           	'sharing_rights',
			displayField:   'name',
			valueField:     'value',
			queryMode: 'local',
			store:          Ext.create('Ext.data.Store', 
			{
				fields : ['name', 'value'],
				data   : [{name : 'Read-only',   value: '0'},{name : 'Read & Write',  value: '1'},{name : 'Full access',  value: '2'}]
			})
		}],
		buttons: [
		{	
			id: 'grantbtn',
			text: 'Grant access',
			listeners: 
			{ 
				click: function() 
				{ 
					doshare();
				}
			}
		},{
			id: 'closebtn',
			text: 'Close',
			listeners: 
			{ 
				click: function() 
				{ 
					sharingDialog.close();
				}
			}
		}]
	});

	sharingDialog = Ext.create('widget.window',
	{
		id: 'sharingdialog',
		title: 'Sharing',
		closable: true,
		closeAction: 'hide',
		width: 700,
		minWidth: 700,
		folderid: false,
		height: 295,
		minHeight: 295,
		layout: 'border',
		listeners: 
		{
			beforeclose: function() 
			{ 
				Ext.getBody().unmask(); 				
			},
			activate: function() 
			{		
				Ext.getBody().mask();
				sharingform.getChildByElement('sharing_email').reset();
				sharingform.getChildByElement('sharing_email').focus(false,300);		
				SharingStore.filterBy(function(record,id) 
				{
					if (record.data.folderid == sharingDialog.folderid) return true;	
				});
			}
		},
		bodyStyle: 'padding: 5px;',
		items: [sharingGrid,sharingform]
	});
	
	/*
	=================
	NEW CONTACT
	=================
	*/
	function processcontact(handle)
	{
		var req = 
		{ 
		  a: 'ur',
		  u: handle,
		  l: '1',
		  i: requesti
		};
		console.log(req);			
		api_req([req],
		{ 
		  callback : function (json,params)
		  {	
			console.log('process contact:');
			console.log(json);		
			if (json[0].u)
			{
				 process_u([{ c: 1, m: json[0].m, u: json[0].u, ts: (new Date().getTime()/1000) }],false);
				 aftermove(true);
			}
			else if ((json[0] == 0) || (json[0] == -303))
			{
				var talready='';			
				if (json[0] == -303) talready = 'already ';		
				Ext.MessageBox.show(
				{							
					title:'Contact invited',
					msg: 'This user has ' + talready + 'been invited and will appear in your contact list once registered.',
					buttons: Ext.MessageBox.OK,				
					icon: Ext.MessageBox.INFO
				});			
			}
			else if (json[0] == -2)
			{
				Ext.MessageBox.show(
				{							
					title:'Error',
					msg: 'You cannot add yourself to your contact list.',
					buttons: Ext.MessageBox.OK,				
					icon: Ext.MessageBox.INFO
				});		
			}		
			console.log(json);		
			loadingDialog.hide();  
		  }		  
		});
	}

	function addcontact()
	{
		addcontactemail = newcontactform.getChildByElement('contactfield').value;
		if (checkMail(addcontactemail))
		{
			Ext.Msg.alert('Error','Please enter a valid e-mail address.');
			return false;
		}
		newcontactDialog.close();
		loadingDialog.show();		
		processcontact(addcontactemail);
	}

	var newcontactform =  Ext.create('Ext.form.Panel', 
	{
		id: 'newcontactform',
		layout: 'absolute',        
		defaultType: 'textfield',
		border: false,
		items: [{
				fieldLabel: 'E-mail address',
				fieldWidth: 50,          
				x: 5,
				y: 22,
				name: 'contactfield',
				id: 'contactfield',
				anchor: '-5',
				hasfocus: true,
				listeners:{  
				scope:this,  
				specialkey: function(f,e)
				{   
					if(e.getKey()==e.ENTER) addcontact();              
				}  
		}  
		}]
	});

	var newcontactDialog = Ext.create('widget.window',
	{
		id: 'newcontactdialog',
		title: 'Add contact',
		closable: true,
		closeAction: 'hide',
		width: 300,
		minWidth: 300,
		height: 130,
		minHeight: 130,
		maxHeight: 130,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{
				Ext.getBody().unmask(); 		
			},
			activate: function()
			{
				newcontactform.getChildByElement('contactfield').reset();		
				newcontactform.getChildByElement('contactfield').focus(false,300);
			}
		},		
		bodyStyle: 'padding: 0px;',
		items: [newcontactform],
		dockedItems: [ 
			{
				xtype: 'toolbar',
				dock: 'bottom',
				ui: 'footer',
				layout: { pack: 'center' },
				items: [{
							minWidth: 100,
							text: 'Add',
							listeners: {
								click: function() 
								{ 
										addcontact();
								}
							}
						},{ minWidth: 100,
							text: 'Cancel',
							listeners: 
							{ 
								click: function() { newcontactDialog.close(); }
							}
						}]
			}]
	});

	/*
	==================
	NEW FOLDER 
	==================
	*/
	var newfolderform =  Ext.create('Ext.form.Panel', 
	{
		id: 'newfolderform',
		layout: 'absolute',        
		defaultType: 'textfield',
		border: false,
		items: [{
				fieldLabel: 'Folder Name',
				fieldWidth: 50,          
				x: 5,
				y: 22,
				name: 'folderfield',
				id: 'folderfield',
				anchor: '-5',
				hasfocus: true,
				listeners:{  
				scope:this,  
				specialkey: function(f,e)
				{   
					if(e.getKey()==e.ENTER) requestfolder(newfolderDialog.inid);              
				}  
		}  
		}]
	});

	function requestfolder(inid)
	{	
		var newdir 	= newfolderform.getChildByElement('folderfield').value;
		newfolderDialog.close();
		loadingDialog.show();					
		createfolder(inid,newdir);
	}

	newfolderDialog = Ext.create('widget.window',
	{
		id: 'newfolderdialog',
		title: 'Create New Folder',
		closable: true,
		closeAction: 'hide',
		width: 350,
		minWidth: 300,
		height: 130,
		minHeight: 130,
		maxHeight: 130,
		layout: 'fit',
		inid: '',
		listeners: 
		{
			beforeclose: function() 
			{
				Ext.getBody().unmask(); 		
			},
			activate: function()
			{
				newfolderform.getChildByElement('folderfield').reset();		
				newfolderform.getChildByElement('folderfield').focus(false,300);
			}
		},		
		bodyStyle: 'padding: 0px;',
		items: [newfolderform],
		dockedItems: [ 
			{
				xtype: 'toolbar',
				dock: 'bottom',
				ui: 'footer',
				layout: { pack: 'center' },
				items: [{
							minWidth: 100,
							text: 'Create',
							listeners: {
								click: function() 
								{ 
										requestfolder(newfolderDialog.inid);
								}
							}
						},{ minWidth: 100,
							text: 'Cancel',
							listeners: 
							{ 
								click: function() { newfolderDialog.close(); }
							}
						}]
			}]
	});

	/*
	==================
	RENAME
	==================
	*/
	var renameform =  Ext.create('Ext.form.Panel', 
	{
		id: 'renameform',
		layout: 'absolute',        
		defaultType: 'textfield',
		border: false,
		items: [{
				fieldLabel: '',
				fieldWidth: 50,          
				x: 5,
				y: 22,
				name: 'renamefield',
				id: 'renamefield',
				anchor: '-5',
				hasfocus: true,
				listeners:{  
				scope:this,  
				specialkey: function(f,e)
				{   
					if(e.getKey()==e.ENTER) dorename();       
				}  
		}  
		}]
	});

	function dorename()
	{
		var newname	= renameform.getChildByElement('renamefield').value;	
		var isFolder=false;		
		if (selectedRecords[0].get('folder'))
		{
			isFolder=true;			
			var subdirs = dirroot.getNodeById(currentdirid).childNodes;
			for(var key in subdirs)
			{
				if ((subdirs[key].data.text == newname) && (subdirs[key].data.id !== selectedRecords[0].get('id')))
				{
					Ext.Msg.alert('Error','This folder name is already in use. Please try again.');
					return false;
				}
			}
		}		
		FileStore.getById(selectedRecords[0].get('id')).set('name',newname);
		FileStore.getById(selectedRecords[0].get('id')).commit();	
		aftermove(isFolder);		
		renameDialog.close();
		console.log('rename');
		var attrs = new Object;
		attrs.n = newname;
		var mkat = enc_attr(attrs,selectedRecords[0].get('key'));
		var attr = ab_to_base64(mkat[0]);
		var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
		var ops = [];	
		ops[0] = 
		{	
			a: 'a',
			n: selectedRecords[0].get('id'),
			attr: attr,
			key: key,
			i: requesti
		};	
		api_req(ops);
	}

	var renameDialog = Ext.create('widget.window',
	{
		id: 'renamedialog',
		title: 'Rename',
		closable: true,
		closeAction: 'hide',
		width: 380,
		minWidth: 380,
		height: 140,
		minHeight: 140,
		maxHeight: 140,
		layout: 'fit',
		listeners: 
		{
			beforeclose: function() 
			{
				Ext.getBody().unmask(); 		
			},
			activate: function()
			{
				renameform.getChildByElement('renamefield').focus(false,300);
			}
		},		
		bodyStyle: 'padding: 0px;',
		items: [renameform],
		dockedItems: [ 
			{
				xtype: 'toolbar',
				dock: 'bottom',
				ui: 'footer',
				layout: { pack: 'center' },
				items: [{
							minWidth: 100,
							text: 'Rename',
							listeners: {
								click: dorename						
							}
						},{ minWidth: 100,
							text: 'Cancel',
							listeners: 
							{ 
								click: function() { renameDialog.close(); }
							}
						}]
			}]
	});
	loadingDialog = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait..."});
	loadingDialog.show();

	function loadfm()
	{
		//api_req(	
		api_req('fm',
		{ 
			callback : function (json,params)
			{		
				Ext.suspendLayouts();			
				FileStore.suspendEvents();			
				console.log(json);		
				process_u(json.u,false);			
				process_ok(json.ok);			
				for(i in json.s)
				{	
					sharingData.push({
							id: 		json.s[i].h + '_' + json.s[i].u,
							userid:		json.s[i].u,
							folderid:	json.s[i].h,
							rights:		json.s[i].r,
							date: 		json.s[i].ts
						});	
					sharednodes[json.s[i].h]=true;							
				}			
				SharingStore.loadData(sharingData);			
				NetworkID = 'NETWORK';
				maxaction = json.sn;			
				var callback = new Object;			
				if (json.cr) callback.cr = json.cr;
				if (json.sr) callback.sr = json.sr;			
				callback.fn = function (cb)
				{								
					if (cb.cr) crypto_procmcr(cb.cr);			
					if (cb.sr) crypto_procsr(cb.sr);				
					// find share-root-nodes, and plug them to the user-node in "contacts":		
					FileStore.filterBy(function(record,id) 
					{
						if ((record.get('folder') == 1) && (record.get('su') != '')) return true;									
					});			
					FileStore.each( function (obj) 
					{ 
						if (!globalfolderids[obj.get('parentid')])
						{					
							obj.set('parentid',obj.get('su'));
							obj.commit();
						}
					});				
					getsc();	
					FileStore.resumeEvents();
					initializefm();			
					if (window.File && window.FileList && window.FileReader) InitFileDrag();
					Ext.resumeLayouts(true);			
					loadingDialog.hide();					
				}
				farray[fi] 	= new Object;
				farray[fi].f = json.f;
				process_f(fi,false,callback);
				fi++;
			}
	   });
	   
	}
	loadfm();
}
