function updateStatusCallback(){
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            // the user is logged in and has authenticated your
            // app, and response.authResponse supplies
            // the user's ID, a valid access token, a signed
            // request, and the time the access token
            // and signed request each expire
            var uid = response.authResponse.userID;
            var accessToken = response.authResponse.accessToken;
            console.log('[connected] userID: ' + uid + ";" + accessToken);
            testAPI(uid);
        } else if (response.status === 'not_authorized') {
            // the user is logged in to Facebook,
            // but has not authenticated your app
        } else {
            // the user isn't logged in to Facebook.
        }
    });

    // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
    // for any authentication related change, such as login, logout or session refresh. This means that
    // whenever someone who was previously logged out tries to log in again, the correct case below
    // will be handled.
    FB.Event.subscribe('auth.authResponseChange', function(response) {
        // Here we specify what we do with the response anytime this event occurs.
        if (response.status === 'connected') {
            // The response object is returned with a status field that lets the app know the current
            // login status of the person. In this case, we're handling the situation where they
            // have logged in to the app.
            var uid = response.authResponse.userID;
            console.log('userID: ' + uid);
            testAPI(uid);
        } else if (response.status === 'not_authorized') {
            // In this case, the person is logged into Facebook, but not into the app, so we call
            // FB.login() to prompt them to do so.
            // In real-life usage, you wouldn't want to immediately prompt someone to login
            // like this, for two reasons:
            // (1) JavaScript created popup windows are blocked by most browsers unless they
            // result from direct interaction from people using the app (such as a mouse click)
            // (2) it is a bad experience to be continually prompted to login upon page load.
            FB.login();
        } else {
            // In this case, the person is not logged into Facebook, so we call the login()
            // function to prompt them to do so. Note that at this stage there is no indication
            // of whether they are logged into the app. If they aren't then they'll see the Login
            // dialog right after they log in to Facebook.
            // The same caveats as above apply to the FB.login() call here.
            FB.login();
        }
    });
}
/*
FB.logout(function(response) {
    console.log(response);
});
*/
function testAPI(uid){
    console.log('Welcome! Fetching your information.... ');
    FB.api('/me', function(response) {
        console.log('/me: ' + response.name + '.');
    });

    console.log(uid);
    FB.api('/' + uid, function(response) {
        console.log('/' + uid + ': ' + JSON.stringify(response) + '.');
    });

    console.log('loading friends');
    FB.api("/me/friends", function (response) {
        console.log('friends: ' + response.data.length);
        if (response && !response.error) {
            /* handle the result */
        }
    });
}

function loadEvent(){
    $.ajax({
        type: "GET",
        url: '/about_me/event/query'
    }).done(function(data){
        if (!data){
            alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
            return;
        }
        var html = '';
        data.forEach(function(obj, idx){
            html += obj.title + '@' + obj.location + '<br>';
        });
        $('div.event').html(html);
    });
}

function mainPage(){
    $.ajaxSetup({ cache: true });
    $.getScript('//connect.facebook.net/en_UK/all.js', function(){
        FB.init({
            appId : '471865979603234',
            status: true, // check login status
            cookie: true, // enable cookies to allow the server to access the session
            xfbml : true  // parse XFBML
        });
        //$('#loginbutton,#feedbutton').removeAttr('disabled');
        FB.getLoginStatus(updateStatusCallback);
    });

    loadEvent();
}

function saveEvent(){
    var title = $('input.title')
      , location = $('input.location');

    $.ajax({
        type: "GET",
        url: '/about_me/event/create',
        data: {
            title: title.val(),
            location: location.val()
        }
    }).done(function(data){
        if (!data){
            alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
            return;
        }
        title.val(null);
        location.val(null);
        loadEvent();
    });
}
