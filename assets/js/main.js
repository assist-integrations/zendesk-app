var email=null,name=null,ticket_no=null,ticket_subject=null
technician_name=null,
subdomain=null;
department=null,
ZAT_DETAILS={},
loginWindow=undefined,
interval=undefined,
api_key=null,
is_eu=false,
domain="com";
$(function() {
    var client = ZAFClient.init();
    client.invoke('resize', { width: '100%', height: '150px' });
    initializeVariables(client); 
    window.addEventListener('message', handleSizingResponse, true);
    window.client=client;
    client.metadata().then(function(metadata){
        api_key = metadata.settings.api_key;
        is_eu = metadata.settings.is_eu;
        var iframeVar=document.getElementById("assist-integration-iframe");
        if(is_eu){
            domain = "eu";
        }
        iframeVar.src="https://assist.zoho."+domain+"/assist-integration?service_name=Zendesk";
    });
});
function initializeVariables(client) {
    client.get('currentUser').then(function(data){
        technician_name=data.currentUser.name;
        if(technician_name.length>25){
            technician_name =technician_name.substr(0,25);
        }
    });
    client.get('currentAccount').then(function(data){
        department=data.currentAccount.subdomain;
        subdomain=data.currentAccount.subdomain;
        if(department.length>25){
            department=department.substr(0,25);
        }
        department+=".zendesk.com";
    });
    client.get('ticket').then(function(data){
        email=data.ticket.requester.email;
        name=data.ticket.requester.name;
        ticket_no=data.ticket.id;
        ticket_subject=data.ticket.subject;
        if(ticket_subject.length>250){
            ticket_subject= ticket_subject.substr(0,150)
        }
        if(name.length>25){
            name=name.substr(0,25);
        }
        if(ticket_no.length>25){
            ticket_no=ticket_no.substr(0,25);
        }
    });
}

function notify(client,msg){
    client.invoke('notify',msg,'alert');
}

function openPage(pageURL){
    window.open(pageURL,"_blank");
}

var handleSizingResponse = function(e) { 
    ZAT_DETAILS=e.data;
    if(ZAT_DETAILS.signedIn===undefined){
        return;
    }
    var source   = $("#messages").html();
    var template = Handlebars.compile(source);
    if(ZAT_DETAILS.signedIn){
        if(ZAT_DETAILS.api_key===api_key){
            if(ZAT_DETAILS.subdomain!==subdomain){
                var context = {p1: "Your subdomain mismatches. Your API key is registered with '"+ZAT_DETAILS.subdomain+"' subdomain.", p2: ""};
                var html    = template(context);
                $("#content").html(html);
                return;
            }
            if(ZAT_DETAILS.user.license_type==="FREE"){
                var context = {p1: "Upgrade your Zoho Assist pricing plan to enjoy Zendesk services.", p2: ""};
                var html    = template(context);
                $("#content").html(html+"<input type=\"button\" class=\"start-btn\" value=\"Upgrade\" onclick=\"openPage('https://www.zoho.com/assist/pricing.html')\" />");
                return;
            }
            if(!ZAT_DETAILS.enabled){
                var context = {p1: "Integration with Zendesk has been disabled.", p2: "Kindly contact your Administrator."};
                var html    = template(context);
                $("#content").html(html);
                return;
            }
            if(ZAT_DETAILS.user.remote_support_license.is_enabled){
                if(ZAT_DETAILS.session!==undefined){
                    if(ZAT_DETAILS.session.success!==undefined){
                        session_id=ZAT_DETAILS.session.success.representation.session_id;
                        loginWindow.location.href=ZAT_DETAILS.session.success.representation.technician_url;
                    }else{
                        loginWindow.close();
                        var error=JSON.parse(ZAT_DETAILS.session.error);
                        showError(error);
                        if(interval!==undefined){
                            clearInterval(interval);
                            interval=undefined;
                        }
                        loginWindow=undefined;
                    }
                    delete ZAT_DETAILS['session'];
                }
                var context = {p1: "Start a session to get connected to your remote customers instantly.", p2: ""};
                var html    = template(context);
                $("#content").html(html+"<form id=\"TheForm\" name=\"TheForm\" method=\"get\" target=\"TheWindow\"></form><input type=\"button\" class=\"start-btn\" value=\"Start Session\" onclick=\"getSessionAPI()\" />");
            }
            else{
                var context = {p1: "You do not have the permission to initiate a session.", p2: "Kindly contact your Administrator."};
                var html    = template(context);
                $("#content").html(html);
            }
        }else{
            var context = {p1: "You're not part of Zoho Assist account that enables this integration.", p2: "Kindly contact your Administrator."};
            var html    = template(context);
            $("#content").html(html);
        }
    }
    else{
        var context = {p1: "Start a session to get connected to your remote customers instantly.", p2: ""};
        var html    = template(context);
        $("#content").html(html+"<input type=\"button\" class=\"start-btn\" value=\"Start Session\" onclick=\"showLoginPage()\" />");
    }
}

function showLoginPage(){
    var source   = $("#messages").html();
    var template = Handlebars.compile(source);
    var context = {p1: "Looks like you haven't signed in to your account.", p2: "Please Login or Create an account."};
    var html = template(context);
    $("#content").html(html+"<input type=\"button\" class=\"start-btn\" value=\"Log In\" onclick=\"openLoginPage()\" />");
}

function refreshIFrame(){
    var iframeVar=document.getElementById("assist-integration-iframe");
    iframeVar.contentWindow.postMessage('refresh','*');
}
function getSessionAPI(){
    var iframeVar=document.getElementById("assist-integration-iframe");
    var data={
        service_id: 'Zendesk',
        customer_email: email,
        customer_name: name,
        mail_subject: ticket_no,
        mail_content: ticket_subject.substr(0,25),
        agent_name: technician_name,
        department: department
    };
    var session_details={
        session: data
    };
    iframeVar.contentWindow.postMessage(session_details,'*');
    loginWindow= window.open("","_blank");
}
function openLoginPage(){
    loginWindow = window.open("https://assist.zoho."+domain+"/html/blank.html","_blank","toolbar=yes,scrollbars=yes,resizable=yes,top=150,left=350,width=800,height=600");
    if(interval!==undefined){
        clearInterval(interval);
        interval=undefined;
    }
    interval = setInterval(function(){
        if(loginWindow.closed){
            clearInterval(interval);
            loginWindow=undefined;
            document.location.reload(true);
        }
    },2000);
}
function showError(data) {
    var error_data = {p1: "Error Code:"+data.error.code,p2: "Error Message:"+data.error.message};
    var source   = $("#messages").html();
    var template = Handlebars.compile(source);
    var html = template(error_data);
    $("#content").html(html);
}
var copyClipboard = function(client){
    var clipboard = new Clipboard('.copy-join-url-btn');
    clipboard.on('success', function(e) {
        client.invoke('notify',"Copied to Clipboard",'alert');
    });
}