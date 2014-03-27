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
                    console.log('[response.status] connected, user: ' + uid);
                    console.log('[response.status] connected, token: ' + accessToken);
                    console.log('redirect to main page');
                    window.location = aboutme.path.main;

                } else if (response.status === 'not_authorized') {
                    // the user is logged in to Facebook,
                    // but has not authenticated your app
                    console.log('[response.status] not_authorized');
                } else {
                    // the user isn't logged in to Facebook.
                    console.log('[response.status] not logged in');
                }
            });

            // after user click login
            FB.Event.subscribe('auth.authResponseChange', function(response) {
                if (response.status === 'connected') {
                    var uid = response.authResponse.userID;
                    console.log('[authResponseChange, connected] user: ' + uid);
                    console.log('redirect to main page');
                    window.location = aboutme.path.main;
                }
            });

        } else if (page == 'main'){
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
                    console.log('[authResponseChange, connected] user: ' + uid);
                    aboutme.login(uid);

                } else if (response.status === 'not_authorized') {
                    // In this case, the person is logged into Facebook, but not into the app, so we call
                    // FB.login() to prompt them to do so.
                    // In real-life usage, you wouldn't want to immediately prompt someone to login
                    // like this, for two reasons:
                    // (1) JavaScript created popup windows are blocked by most browsers unless they
                    // result from direct interaction from people using the app (such as a mouse click)
                    // (2) it is a bad experience to be continually prompted to login upon page load.
                    console.log('[authResponseChange, not_authorized] not_authorized, login');
                    FB.login();
                } else {
                    // In this case, the person is not logged into Facebook, so we call the login()
                    // function to prompt them to do so. Note that at this stage there is no indication
                    // of whether they are logged into the app. If they aren't then they'll see the Login
                    // dialog right after they log in to Facebook.
                    // The same caveats as above apply to the FB.login() call here.
                    console.log('[authResponseChange] seem logout');
                    window.location = '/';
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
        main: '/app/main',
        sync_user_url: '/gapp/sync_user',
        upload_url: '/gapp/upload_url',
        photo_search: '/gapp/search',
        photo_view: '/gapp/view',
        event_query: '/app/event/query',
        event_create: '/app/event/create'
    },
    socket: null,
    socketPort: 3000,
    user: {
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
    syncUser: function(callback){
        var u = aboutme.user;
        delete u.name;
        $.ajax({
            type: "POST",
            url: aboutme.path.sync_user_url,
            data: {
                user: JSON.stringify(u),
            }
        }).done(function(data){
            if (!data || data.status != 1){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            if (callback)callback();
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
        // load photo
        aboutme.photo.search({ event: '1'});
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
            aboutme.syncUser(aboutme.loadEvent);
            aboutme.socket.emit('online', aboutme.user);
        });

//         console.log('loading friends');
//         FB.api("/me/friends", function (response) {
//             console.log('friends: ' + response.data.length);
//             if (response && !response.error) {
//                 // handle the result
//             }
//         });
    },
    loadEvent: function(){
        var html = '';
        if (aboutme.user.fb_id){
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
            // append photo
            $('div.gallery').append(aboutme.photo.getPhotoLink(data, aboutme.photo.num));
            aboutme.photo.initFancyBox(aboutme.photo.num++);

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
        search: function(data){
            $.ajax({
                type: "GET",
                url: aboutme.path.photo_search,
                data: data
            }).done(function(data){
                if (!data || data.length < 1){
                    return;
                }
                var div = $('div.gallery');
                data.forEach(function(o){
                    div.append(aboutme.photo.getPhotoLink(o.pkey, aboutme.photo.num));
                    aboutme.photo.initFancyBox(aboutme.photo.num++);
                });
            });
        },
        getPhotoLink: function(id, index){
            var
            p = aboutme.path.photo_view + '?id=' + id,
            d = p + '&full=1';
            return '<a id="img_' + index + '" href="' + d + '"><img src="' + p + '"></a>';
        },
        initFancyBox: function(index){
            $('a#img_' + index).fancybox({
                'type'          : 'image',
                'transitionIn'  : 'elastic',
                'transitionOut' : 'fade'
            });
        }
    },
    string: {
        confirm_upload: 'Are you sure?'
    }
};
