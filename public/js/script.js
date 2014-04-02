var facebook = {
    loginCallback: function(page){
        console.log('page: ' + page);
        if (page == 'index'){
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    // the user is logged in and has authenticated your
                    // app, and response.authResponse supplies
                    // the user's ID, a valid access token, a signed
                    // request, and the time the access token
                    // and signed request each expire
                    var uid = response.authResponse.userID;
                    var accessToken = response.authResponse.accessToken;
                    console.log('[getLoginStatus] connected, user: ' + uid);
                    console.log('[getLoginStatus] connected, token: ' + accessToken);
                    console.log('[getLoginStatus] redirect to main page');
                    window.location = aboutme.path.main;

                } else if (response.status === 'not_authorized') {
                    // the user is logged in to Facebook,
                    // but has not authenticated your app
                    console.log('[getLoginStatus] not_authorized');
                } else {
                    // the user isn't logged in to Facebook.
                    console.log('[getLoginStatus] not logged in');
                }
            });

            // after user click login, if user login successfully, forward to main page
            FB.Event.subscribe('auth.authResponseChange', function(response) {
                if (response.status === 'connected') {
                    var uid = response.authResponse.userID;
                    console.log('[authResponseChange] connected, user: ' + uid);
                    console.log('[authResponseChange] redirect to main page');
                    window.location = aboutme.path.main;
                }
            });

        } else if (page == 'main'){
            // check login status, if user does not login successfully, forward to index page
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    console.log('[getLoginStatus] connected');
                } else {
                    console.log('[getLoginStatus] not logged in');
                    window.location = aboutme.path.index;
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
                    console.log('[authResponseChange] connected, user: ' + uid);
                    aboutme.login(uid);
                } else if (response.status === 'not_authorized') {
                    // In this case, the person is logged into Facebook, but not into the app, so we call
                    // FB.login() to prompt them to do so.
                    // In real-life usage, you wouldn't want to immediately prompt someone to login
                    // like this, for two reasons:
                    // (1) JavaScript created popup windows are blocked by most browsers unless they
                    // result from direct interaction from people using the app (such as a mouse click)
                    // (2) it is a bad experience to be continually prompted to login upon page load.
                    console.log('[authResponseChange] not_authorized, ask for login');
                    FB.login();
                } else {
                    // In this case, the person is not logged into Facebook, so we call the login()
                    // function to prompt them to do so. Note that at this stage there is no indication
                    // of whether they are logged into the app. If they aren't then they'll see the Login
                    // dialog right after they log in to Facebook.
                    // The same caveats as above apply to the FB.login() call here.
                    console.log('[authResponseChange] seem logout');
                    window.location = aboutme.path.index;
                }
            });
        }
    },
    logout: function(response) {
        console.log(response);
    }
};

var aboutme = {
    domain: 'project.aboutme.com.hk',
    path: {
        index: '/',
        main: '/app/main',
        user_sync_url: '/gapp/user_sync',
        user_login_url: '/gapp/user_login',
        user_logout_url: '/gapp/user_logout',
        upload_url: '/gapp/upload_url',
        photo_search: '/gapp/search',
        photo_view: '/gapp/view'
    },
    socket: null,
    socketPort: 3000,
    user: {
        sid: 0, // it won't be 0
        getName: function(){
            var n = '';
            if (this.first_name) n += this.first_name;
            if (this.first_name && this.last_name) n += ' ';
            if (this.last_name) n += this.last_name;
            return n;
        },
        syncFacebookUser: function(fb){
            if (!fb){
                console.log('[syncFacebookUser] data is null');
                return;
            }
            var bday = moment(fb.birthday, 'MM/DD/YYYY');
            this.fb_id = fb.id;
            this.first_name = fb.first_name;
            this.last_name = fb.last_name;
            this.name = this.getName();
            this.gender = fb.gender;
            this.email = fb.email;
            this.birthday = bday.isValid()? bday.format('YYYY-MM-DD'): null;
        },
        logout: function(postAction){
            this.fb_id = null;
            this.first_name = null;
            this.last_name = null;
            this.gender = null;
            this.email = null;
            this.birthday = null;
            if (postAction) postAction();
        }
    },
    userSync: function(callback){
        $.ajax({
            type: "POST",
            url: aboutme.path.user_sync_url,
            data: {
                user: JSON.stringify(aboutme.user),
            }
        }).done(function(data){
            if (!data || data.status != 1){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            if (callback)callback();
        });
    },
    userLogin: function(callback){
        if (aboutme.user.sid > 0){
            Console.log('already login');
            return;
        }
        $.ajax({
            type: "GET",
            url: aboutme.path.user_login_url,
            data: {
                user_id: aboutme.user.fb_id,
            }
        }).done(function(data){
            if (!data || data.status != 1){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            aboutme.user.sid = data.sid
            console.log('sid: ' + aboutme.user.sid);
            if (callback)callback();
        });
    },
    userLogout: function(callback){
        if (aboutme.user.sid < 1)
            return;
        $.ajax({
            type: "GET",
            url: aboutme.path.user_logout_url,
            data: {
                sid: aboutme.user.sid,
            }
        }).done(function(data){
            if (callback)callback(); // will always run
            if (!data || data.status != 1){
                // don't alert user
                console.log('user logout failed: ' + (data? data.status: -1));
                return;
            }
            console.log('user logout status: ' + data.status);
        });
    },
    initFacebook: function(){
        FB.init({
            appId : '471865979603234',
            status: true, // check login status
            cookie: true, // enable cookies to allow the server to access the session
            xfbml : true  // parse XFBML
        });
    },
    index: function(){
        $.ajaxSetup({ cache: true });
        $.getScript('//connect.facebook.net/en_UK/all.js', function(){
            aboutme.initFacebook();
            FB.getLoginStatus(facebook.loginCallback('index'));
        });
    },
    main: function(){
        $.ajaxSetup({ cache: true });
        $.getScript('//connect.facebook.net/en_UK/all.js', function(){
            aboutme.initFacebook();
            FB.getLoginStatus(facebook.loginCallback('main'));
        });

        // prepare upload photo
        aboutme.upload.prepare();

        // web socket
        var socket = 'http://' + aboutme.domain + ':' + aboutme.socketPort;
        console.log('connect ' + socket);
        aboutme.socket = io.connect(socket);
        aboutme.socket.on('message', function (data) {
            console.log('message: ' + data);
            if (data) {
                $('div.chat_history').append(data + '<br>');
            }
        });
        /*
        aboutme.socket.on('alive', function() {
            aboutme.socket.emit('offline', aboutme.user);
            alert('emit offline: ' + JSON.stringify(aboutme.user));
        });
        */
    },
    chat: function(){
        var msg = $('input.chat_message').val();
        if (msg){
            var send = {user: aboutme.user, message: msg};
            console.log(JSON.stringify(send));
            console.log(send.user.name + ': ' + send.message);
            aboutme.socket.emit('chat', send);
        }
    },
    login: function(uid){
        console.log('[login] loading user [' + uid + '] from facebook...');
//         FB.api('/me', function(response) {
//             console.log('[login] /me: ' + response.name + '.');
//         });
        FB.api('/' + uid, function(response) {
            console.log('[login] /' + uid + ': ' + JSON.stringify(response) + '.');
            aboutme.user.syncFacebookUser(response);
            console.log(aboutme.user.name + "'s birthday: " + aboutme.user.birthday);
            aboutme.socket.emit('online', aboutme.user);

            // sync user
            aboutme.userSync(aboutme.loadEvent);

            // login to little circle to get session ID
            aboutme.userLogin(function(){
                // load photo after login
                aboutme.photo.search({ event: '1', sid: aboutme.user.sid});
            });
        });
//      console.log('loading friends');
//      FB.api("/me/friends", function (response) {
//          console.log('friends: ' + response.data.length);
//          if (response && !response.error) {
//              // handle the result
//          }
//      });
    },
    logout: function(){
        console.log('logout: ' + aboutme.user.sid);
        aboutme.userLogout(function(){
            console.log('logout facebook');
            FB.logout(function(response) {
               console.log('FB.logout: ' + response);
            });
        });
    },
    loadEvent: function(){
        var html = '';
        if (aboutme.user.fb_id){
            /*
            console.log('[loadEvent] load from server');
            $.ajax({
                type: "GET",
                url: aboutme.path.event_query,
                data: {
                    user_id: aboutme.user.fb_id
                }
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }

                data.forEach(function(obj, idx){
                    html += obj.title + '@' + obj.location + '<br>';
                });
                $('div.event').html(html);
            });
            */
        }
        $('div.event').html(html);
    },
    saveEvent: function(){
        var title = $('input.title')
          , location = $('input.location')
          , event = {
                title: title.val(),
                location: location.val(),
          };

        console.log(JSON.stringify(event));
        //aboutme.pushPost(event);
        console.log(aboutme.socket);
        aboutme.socket.emit('send', {message: event.title});
        /*
        $.ajax({
            type: "GET",
            url: aboutme.path.event_create,
            data: {
                user_id: aboutme.user.fb_id,
                event: event
            }
        }).done(function(data){
            if (!data){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            title.val(null);
            location.val(null);
            aboutme.loadEvent();
        });
        */
    },
    pushPost: function(event){
        console.log('push post to facebook');
        var msg = aboutme.user.name + ' is ' + event.title + ' at ' + event.location;
        FB.api('/me/feed', 'post', {message: msg}, function(response){
            if (!response || response.error){
                console.log('[pushPost] error: ' + JSON.stringify(response.error));
            } else {
                console.log('[pushPost] success');
            }
        });
    },
    upload: {
        url: '',
        action: function(){
            if (!confirm(aboutme.string.confirm_upload)){
                return;
            }
            var formData = new FormData($('form.form_upload')[0]);
            $.ajax({
                url: aboutme.upload.url,
                type: 'POST',
                xhr: function() {
                    // Custom XMLHttpRequest
                    var myXhr = $.ajaxSettings.xhr();
                    // Check if upload property exists
                    if (myXhr.upload){
                        // For handling the progress of the upload
                        myXhr.upload.addEventListener('progress', aboutme.upload.progressCallback, false);
                    }
                    return myXhr;
                },
                // events
                // beforeSend: null,
                success: aboutme.upload.successCallback,
                error: aboutme.upload.errorCallback,
                // Form data
                data: formData,
                // Options to tell jQuery not to process data or worry about content-type.
                cache: false,
                contentType: false,
                processData: false
            });
        },
        prepare: function(){
            var form = $('form.form_upload');
            form.hide();
            $.ajax({
                type: "GET",
                url: aboutme.path.upload_url
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }
                aboutme.upload.url = data;
                form.show();
            });
        },
        validate: function(){
            /*
            $(':file').change(function(){
                var file = this.files[0];
                var name = file.name;
                var size = file.size;
                var type = file.type;
                alert(name);
            });
            */
        },
        progressCallback: function(e){
            //if (e.lengthComputable)
            //    $('progress').attr({value:e.loaded,max:e.total});
        },
        successCallback: function (data){
            if (!data){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            // append the new uploaded photo
            $('div.gallery').append(aboutme.photo.getPhotoLink(data, aboutme.photo.num));
            aboutme.photo.initFancyBox(aboutme.photo.num++);

            // close the create box
            $.fancybox.close();

            // get new upload URL
            aboutme.upload.prepare();
        },
        errorCallback: function (error){
            //alert('errorHandler: ' + JSON.stringify(error));
            alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
        }
    },
    photo: {
        num: 0,
        getPhotoLink: function(id, index){
            var
            p = aboutme.path.photo_view + '?sid=' + aboutme.user.sid + '&id=' + id,
            d = p + '&full=1';
            return '<a id="img_' + index + '" href="' + d + '"><img src="' + p + '"></a>';
        },
        search: function(data){
            if (!data.sid || data.sid < 1)
                return;
            $.ajax({
                type: "GET",
                url: aboutme.path.photo_search,
                data: data
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }
                var div = $('div.gallery');

                // create event
                div.append('<a class="create_event" href="#create_event"><img src="/img/add_event.png" class="add_event"></a>');
                $("a.create_event").fancybox({
                    'transitionIn' : 'fade',
                    'transitionOut': 'fade',
                    'enableEscapeButton': false,
                    'hideOnOverlayClick': false
                });

                // display photo
                data.forEach(function(o){
                    div.append(aboutme.photo.getPhotoLink(o.pkey, aboutme.photo.num));
                    aboutme.photo.initFancyBox(aboutme.photo.num++);
                });
            });
        },
        initFancyBox: function(index){
            $('a#img_' + index).fancybox({
                'type'          : 'image',
                'transitionIn'  : 'elastic',
                'transitionOut' : 'elastic'
            });
        }
    },
    string: {
        confirm_upload: 'Are you sure?'
    }
};

var util = {
    isMissing: function(val){
        if (!val) return true;
        return typeof val == 'string'? val.trim().length < 1: val.length < 1;
    }
};

function alert(messages){
    var
    success = typeof messages == 'string',
    msg = util.isMissing(messages)? null: success? messages: messages.join('<br>'),
    icons = $('img.icon');
    $('div.dialog-message').html(msg);
    $('div.dialog-head').html(success? "INFORMATION": "ERROR");
    $($('img.icon').get(0)).css('display', success? 'none': 'inline');
    $($('img.icon').get(1)).css('display', success? 'inline': 'none');
    $('div.base').css('display', msg? 'inline': 'none');
}