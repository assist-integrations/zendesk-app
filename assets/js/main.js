var customer_email      =   null,
    customer_name       =   null,
    ticket_no           =   null,
    ticket_subject      =   null,
    subdomain           =   null;
    department          =   null,
    ZAT_DETAILS         =   {},
    loginWindow         =   undefined,
    interval            =   undefined,
    dc                  =   null,
    is_eu               =   false,
    domain              =   "com",
    type                =   "rs";
    app_identity        =   "53b53ffdc6ef6c2f391e1aa3191f7efb3338bb8e",
    server_name         =   "https://assist.zoho.",
    show_reports_flag   =   true;
$(function() {
    var client = ZAFClient.init();
    client.invoke('resize', { width: '100%', height: '150px' });
    initializeVariables(client); 
    window.addEventListener('message', handleSizingResponse, true);
    window.client=client;
    client.metadata().then(function(metadata){
        is_eu = metadata.settings.is_eu;
        dc    = metadata.settings.dc;
        if(dc !== null)
        {
            dc    = dc.replaceAll(/\s/g, '').toLowerCase();
        }
        var iframeVar=document.getElementById("assist-integration-iframe");
        if(is_eu){
            domain = 'eu';
        }else if(dc === 'au'){
            domain += '.au';
        }else if (dc ==='eu' || dc === 'com' || dc === 'jp' || dc === 'in'){
            domain = dc ;
        }
        server_name +=  domain;
        iframeVar.src   =   server_name+"/assist-integration?service_name=Zendesk&app_identity="+app_identity;
    });
});
function initializeVariables(client) {
    client.get('currentAccount').then(function(data){
        subdomain   =   data.currentAccount.subdomain;
    });
    client.get('ticket').then(function(data){
        customer_email  =   data.ticket.requester.email;
        customer_name   =   data.ticket.requester.name;
        ticket_no       =   data.ticket.id;
        ticket_subject  =   data.ticket.subject.substr(0,150);
    });
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
        if(ZAT_DETAILS.user.remote_support_license.edition === "FREE"){
            var context = {p1: "Upgrade your Zoho Assist pricing plan to enjoy Zendesk services.", p2: ""};
            var html    = template(context);
            $("#content").html(html+"<input type=\"button\" class=\"start-btn\" value=\"Upgrade\" onclick=\"openPage('https://www.zoho.com/assist/pricing.html')\" />");
            return;
        }
        if(ZAT_DETAILS.installed_app_detail.installed_app_details!=undefined){
            if(!ZAT_DETAILS.installed_app_detail.installed_app_details.enabled){
                var context = {p1: "Integration with Zendesk has been disabled.", p2: "Kindly contact your Administrator."};
                var html    = template(context);
                $("#content").html(html);
                return;
            }
            if(ZAT_DETAILS.installed_app_detail.installed_app_auth_details.subdomain!==subdomain){
                var context = {p1: "Your subdomain mismatches. Your have registered with '"+ZAT_DETAILS.subdomain+"' subdomain.", p2: ""};
                var html    = template(context);
                $("#content").html(html);
                return;
            }
            if(ZAT_DETAILS.user.remote_support_license.is_enabled){
                if(ZAT_DETAILS.session!==undefined){
                    if(ZAT_DETAILS.session.success!==undefined){
                        session_id=ZAT_DETAILS.session.success.representation.session_id;
                        loginWindow.location.href=ZAT_DETAILS.session.success.representation.technician_url;
                        return;
                    }else{
                        loginWindow.close();
                        document.location.reload(true);
                    }
                    delete ZAT_DETAILS['session'];
                }
                
                var remoteOption = "";
                if(ZAT_DETAILS.user.remote_support_license.edition === "PROFESSIONAL"){
                    window.client.invoke('resize', { width: '100%', height: '210px' });
                    remoteOption = "<label class=\"rs-text\"><span class=\"rs-radio\"><input type=\"radio\" name=\"remote_option\" id=\"rs_radio\" checked onclick=\"selectRemoteOption('rs');\" /></span>Access Remote Screen</label><label style=\"margin-left: 5px;\" class=\"rs-text\"><span class=\"rs-radio\"><input type=\"radio\" name=\"remote_option\" id=\"dm_radio\" onclick=\"selectRemoteOption('dm');\"/></span>Share My Screen</label><br />";
                }
                var context = {p1: "Start a session to get connected to your remote customers instantly.", p2: ""};
                var html = remoteOption + template(context) + "<div class=\"btn-section\"><form id=\"TheForm\" name=\"TheForm\" method=\"get\" target=\"TheWindow\"></form><input type=\"button\" class=\"start-btn\" id=\"start-btn\" value=\"Start Session\" onclick=\"getSessionAPI()\" /></div>";
                $("#content").html(html);
            }
            else{
                var context = {p1: "You do not have the permission to initiate a session.", p2: "Kindly contact your Administrator."};
                var html    = template(context);
                $("#content").html(html);
            }
            if(ZAT_DETAILS.issue_details==undefined){
                getSessionDetailsFromIssue();
            }else{
                sessionIssueReportsHandling(ZAT_DETAILS.issue_details);
            }
        }else{
            var context = {p1: "Looks like you haven't completed installation process.", p2: "Please Install now."};
            var html    = template(context);
            $("#content").html(html+"<input type=\"button\" class=\"start-btn\" value=\"INSTALL\" onclick=\"openInstallationPage()\" />");
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
        app_identity    :   app_identity,
        customer_email  :   customer_email,
        customer_name   :   customer_name,
        issue_id        :   ticket_no,
        issue_topic     :   ticket_subject,
        type            :   type
    };
    var session_details={
        session: data
    };
    iframeVar.contentWindow.postMessage(session_details,'*');
    loginWindow= window.open("","_blank");
}

function getAppDetailsFromIdentity(){
    var iframeVar=document.getElementById("assist-integration-iframe");
    var app_details     =   {
        app_identity    : app_identity
    };
    iframeVar.contentWindow.postMessage(app_details,'*');
    loginWindow= window.open("","_blank");
}

function handleSessionReports(){
    if(show_reports_flag){
        document.getElementById("mapping_details").style.display    =   "block";
        document.getElementById("report_flag_img").classList.remove("reportMinimizeImage");
        document.getElementById("report_flag_img").classList.add("reportMaximizeImage");
        window.client.invoke('resize', { width: '100%', height: '300px' });
    }else{
        document.getElementById("mapping_details").style.display    =   "none";
        document.getElementById("report_flag_img").classList.add("reportMinimizeImage");
        document.getElementById("report_flag_img").classList.remove("reportMaximizeImage");
        window.client.invoke('resize', { width: '100%', height: '210px' });
    }

    show_reports_flag   =   !show_reports_flag;
}

function sessionIssueReportsHandling(sessionDetail){
    if(sessionDetail.success!=undefined){
        var response = sessionDetail.success.representation;
        if(response.length>0){
            document.getElementById("session_issue_reports").style.display    =   "block";
            var source   = $("#assist_issue_mapping_reports").html();
            var template = Handlebars.compile(source);
            var detailsForTemplate  =   [];
            for(var index in response){
                var session = response[index].session_details;
                var agent = response[index].agent_details;
                var viewer = response[index].viewer_details;

                var issueSessionDetail  =   {
                    created_time    :  convertTimestamp(session.created_time),
                    session_key     :  session.key,
                    duration        :  getDuration(session.duration)
                };

                detailsForTemplate.push(issueSessionDetail);
            }
            var html    = template(detailsForTemplate);

            $('#mapping_details').html(html);
        }
    }
}

function getSessionDetailsFromIssue(){
    var iframeVar=document.getElementById("assist-integration-iframe");
    var data={
        issue_id        :   ticket_no,
        app_identity    :   app_identity
    };
    var session_details =   {
        issue_details   : data
    };
    iframeVar.contentWindow.postMessage(session_details,'*');
}

function openLoginPage(){
    loginWindow     =       window.open(server_name+"/html/blank.html","_blank","toolbar=yes,scrollbars=yes,resizable=yes,top=150,left=350,width=800,height=600");
    if(interval     !==     undefined){
        clearInterval(interval);
        interval    =       undefined;
    }
    interval        =       setInterval(function(){
        if(loginWindow.closed){
            clearInterval(interval);
            loginWindow     =   undefined;
            document.location.reload(true);
        }
    },2000);
}

function openInstallationPage(){
    loginWindow     =       window.open(server_name+"/oauthTwo/redirection?app_identity="+app_identity+"&subdomain="+subdomain,"_blank","toolbar=yes,scrollbars=yes,resizable=yes,top=150,left=350,width=800,height=600");
    if(interval     !==     undefined){
        clearInterval(interval);
        interval    =       undefined;
    }
    interval = setInterval(function(){
        if(loginWindow.closed){
            clearInterval(interval);
            loginWindow     =   undefined;
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

function selectRemoteOption(option){
    if(option       ===     'dm'){
        
        type        =       'dm';
        
        $("#para-one").html("Start a session to share your computer screen for demo or training.");
    }
    else if(option  ===     'rs'){
        
        type        =       'rs';
        
        $("#para-one").html("Start a session to get connected to your remote customers instantly.");
    }
}

function getDuration(duration){
    if(duration  == undefined || duration == null){
        return "few seconds";
    }

    duration    =   Number(duration);
    var seconds =   duration/1000;
    if(seconds < 1){
        return "few seconds";
    }
    seconds     =   Math.floor(seconds);
    
    var minutes =   seconds/60;
    if(minutes < 1){
        return seconds+" sec";
    }
    
    minutes     =   Math.floor(minutes);
    seconds  =  seconds - (60*minutes);   

    var hours  =    minutes/60;
    if(hours < 1){
        return minutes+" min "+seconds+" sec";
    }

    hours       =   Math.floor(hours);
    minutes     =   minutes -   (60*hours);

    return hours+" hr "+minutes+" min "+seconds+" sec";
}

function convertTimestamp(timestamp) {
    var date = new Date(Number(timestamp));

    var dd = date.getDate();

    var month_list  =   ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    var month   =   month_list[date.getMonth()];
    
    var yyyy = date.getFullYear();
    if(dd<10){
        dd='0'+dd;
    } 

    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    var am_pm = date.getHours() >= 12 ? "PM" : "AM";
    hours = hours < 10 ? "0" + hours : hours;
    var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    var time = hours + ":" + minutes + " " + am_pm;

    return month +" "+dd+", "+yyyy+" "+time;
}
