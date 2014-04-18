var
facebook = {
    loginCallback: function(page){
        console.log('[facebook] page: ' + page);
        if (page == 'index'){
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    // the user is logged in and has authenticated your
                    // app, and response.authResponse supplies
                    // the user's ID, a valid access token, a signed
                    // request, and the time the access token
                    // and signed request each expire
                    var uid = response.authResponse.userID
                      , accessToken = response.authResponse.accessToken;
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
},
aboutme = {
    domain: window.location.hostname,
    path: {
        index: '/',
        main: '/main/',
        user_sync_url: '/gapp/user_sync',
        user_login_url: '/gapp/user_login',
        user_logout_url: '/gapp/user_logout',
        upload_url: '/gapp/upload_url',
        photo_search: '/gapp/search',
        photo_view: '/gapp/view',
        photo_delete: '/gapp/delete'
    },
    maxChatHistory: 10,
    maxPhotoSize: 10, // MB
    socketPort: 3000,
    socket: null,
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

        // init upload fancy box
        $('a.create_event').fancybox({
            'transitionIn' : 'fade',
            'transitionOut': 'fade',
            'enableEscapeButton': false,
            'hideOnOverlayClick': false
        });

        // file change listener
        $(':file').change(function(){
            aboutme.upload.file = this.files[0];
        });

        // prepare upload photo
        aboutme.upload.prepare();

        // web socket
        var socket = 'http://' + aboutme.domain + ':' + aboutme.socketPort;
        util.loadScript(socket + '/socket.io/socket.io.js', function(){
            console.log('[main] connect ' + socket);
            aboutme.socket = io.connect(socket);
            aboutme.socket.on('online', aboutme.chat.online);
            aboutme.socket.on('message', aboutme.chat.receive);
            aboutme.socket.on('photo', aboutme.chat.photo);
        });
    },
    chat: {
        history: [],
        keydown: function(obj, e){
            if (e.keyCode == 13 && !e.shiftKey){
                aboutme.chat.send();
                e.preventDefault();
            }
        },
        send: function(){
            var box = $('textarea.chat_message');
            var msg = box.val();
            if (msg){
                var send = {user: aboutme.user, message: msg};
                console.log(send.user.name + ': ' + send.message);
                aboutme.socket.emit('chat', send);
                box.val('');
            }
        },
        receive: function(data){
            console.log('message: ' + data);
            if (!data) return;
            var obj = JSON.parse(data);
            if (!obj.user || !obj.time || !obj.user || !obj.message) return;
            aboutme.chat.history.push(
                '<tr>' +
                    '<td class="col_1">' + obj.user + '</td>' +
                    '<td class="col_2">:</td>' +
                    '<td class="col_3">' + obj.message.replace('\n', '<br>') + '</td>' +
                '</tr>'
            );
            aboutme.chat.reload();
        },
        online: function(data){
            console.log('online: ' + data);
            if (!data) return;
            var obj = JSON.parse(data);
            if (!obj.time || !obj.user) return;
            aboutme.chat.history.push(
                '<tr>' +
                    '<td class="col_1">[' + obj.time + ']</td>' +
                    '<td class="col_4" colspan="2">' + obj.user + ' is online</td>' +
                '</tr>'
            );
            aboutme.chat.reload();
        },
        reload: function(){
            console.log('chat.history.length: ' + aboutme.chat.history.length);
            if (aboutme.chat.history.length >  aboutme.maxChatHistory)
                aboutme.chat.history = aboutme.chat.history.slice(1, aboutme.maxChatHistory + 1);
            var tbl = $('table.chat_history');
            tbl.empty();
//          for (var i = aboutme.chat.history.length - 1; i > -1; i--)
//              tbl.append(aboutme.chat.history[i]);
            aboutme.chat.history.forEach(function(o, i){
                tbl.append(o);
            });
        },
        photo: function(data, emit){
            if (emit){
                var send = {user: aboutme.user, photo: data};
                console.log(send.user.name + ': ' + send.photo);
                aboutme.socket.emit('photo', send);
            } else {
                console.log('photo: ' + data);
                if (!data) return;
                var obj = JSON.parse(data);
                if (!obj.time || !obj.user) return;
                aboutme.chat.history.push(
                    '<tr>' +
                        '<td class="col_1">[' + obj.time + ']</td>' +
                        '<td class="col_4" colspan="2">' + obj.user + ' changed the featured photo</td>' +
                    '</tr>'
                );
                aboutme.chat.reload();
                aboutme.photo.featured(obj.photo);
            }
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
            //console.log(aboutme.user.name + "'s birthday: " + aboutme.user.birthday);
            aboutme.socket.emit('online', aboutme.user);

            // sync user
            aboutme.userSync();

            // login to little circle to get session ID
            aboutme.userLogin(function(){
                // load photo after login
                aboutme.photo.search();
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
        file: null,
        prepare: function(){
            $.ajax({
                type: "GET",
                url: aboutme.path.upload_url
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }
                aboutme.upload.url = data;
                $('a.create_event').css('visibility', 'visible');


            });
        },
        validate: function(){
            var file = aboutme.upload.file;
            if (!file)
                return 'Please select a photo to upload';

            var name = file.name
              , size = file.size / 1024 / 1024
              , mine = file.type
              , type = mine? mine.split('/')[0]: '';
            console.log('[validate] file: ' + name + ' (' + mine + ', ' + type + ') [' + size + ']');

            if (size > aboutme.maxPhotoSize)
                return 'The photo size exceed the limit, please select a photo smaller than ' + aboutme.maxPhotoSize + 'MB';

            if (!type || type.toLowerCase() != 'image')
                return 'Please select a photo to upload';

            // every thing okay
            return null;
        },
        action: function(){
//          if (!confirm(aboutme.string.confirm_upload)){
//              return;
//          }

            // validate the file
            var err = aboutme.upload.validate();
            console.log('[action] err: ' + err);
            if (!util.isMissing(err)){
                $.fancybox.close();
                alert([err]);
                return;
            }

            // prepare form data
            var formData = new FormData($('form.form_upload')[0]);
            formData.append('sid', aboutme.user.sid);

            // close the upload box and show loading
            $.fancybox.close();
            $('div.loading').css('display', 'inline');

            // submit
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
        progressCallback: function(e){
            if (e.lengthComputable){
                var percentage = Math.round(e.loaded / e.total * 100) + '%';
                console.log('[uploading] ' + e.loaded + '/' + e.total + ' = ' + percentage);
                //$('progress').attr({value:e.loaded, max:e.total});
                $('span.progress').html(percentage);
            }
        },
        successCallback: function (data){
            if (!data){
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                return;
            }
            // append and reload
            aboutme.photo.list.push(data);
            aboutme.photo.reload();

            // close the loading box
            $('div.loading').css('display', 'none');

            // hide the upload button and wait for the new upload session
            $('a.create_event').css('visibility', 'visible');

            // get new upload URL
            aboutme.upload.prepare();
        },
        errorCallback: function (error){
            console.log('upload error: ' + JSON.stringify(error));

            if (error.status == 401){
                window.location = aboutme.path.index
                return;
            }

            // close the loading box
            $('div.loading').css('display', 'none');

            var ref = error.statusText? error.statusText: '#500';
            alert(['Your request cannot be processed, please try again later.<br>Ref. ' + ref]);
        }
    },
    photo: {
        num: 0,
        selectedIndex: -1,
        firstAffected: -1,
        secondAffected: -1,
        numOfPhotoPerRow: 4,
        originalWidth: 200,
        list: [],
        getPhotoLink: function(id, i){
            var p = aboutme.path.photo_view + '?sid=' + aboutme.user.sid + '&amp;id=' + id;
            if (i == aboutme.photo.selectedIndex) p += '&amp;size=1';
            return [p + '&amp;size=2',
                    '<img src="' + p + '" alt="" class="photo" id="img_' + i + '" ' +
//                      'onclick="aboutme.photo.click(' + i + ');" ' +
//                      'onmouseover="aboutme.photo.resize(' + i + ');"' +
                    '>'];
        },
        getPhotoCell: function(o, i){
            var links = aboutme.photo.getPhotoLink(o.pkey, i);
            return  '<td ' + (i == aboutme.photo.selectedIndex? 'colspan="2" rowspan="2"': '') + '>' +
                        '<div class="photo photo_' + i + '">' +
                            /*
                            links[1] +
                            '<div class="blackbg blackbg_' + i + '">&nbsp;</div>' +
                            '<div class="date date_' + i + '">' + o.datetime + '</div>' +
                            '<div class="geo geo_' + i + '">' +
                                '<a id="image_' + i + '" href="' + links[0] + '">full size</a>' +
                                (o.geo? ' / <a id="map_' + i + '" href="/app/map/' + o.geo + '">show map</a>': '') +
                            '</div>' +
                            */
                            '<a id="image_' + i + '" href="' + links[0] + '"><img src="/img/enlarge01.png" alt="enlarge" class="enlarge enlarge_' + i + '"></a>' +
                            (o.isOwner? '<img src="/img/delete01.png" alt="delete" class="delete delete_' + i + '" onclick="aboutme.photo.remove(' + i + ')">': '') +
                            links[1] +
                            (o.geo? '<a id="showmap_' + i + '" href="/app/map/' + o.geo + '"><button class="map map_' + i + '">Map</button></a>': '') +
                            '<button class="group group_' + i + '" onclick="aboutme.photo.click(' + i + ');">Expand</button>' +
                            '<div class="date date_' + i + '">' + o.datetime + '</div>' +
                        '</div>' +
                    '</td>';
        },
        search: function(){
            if (!aboutme.user.sid || aboutme.user.sid < 1)
                return;

            $.ajax({
                type: "GET",
                url: aboutme.path.photo_search + '/' + aboutme.user.sid
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }
                aboutme.photo.list = data;
                aboutme.photo.reload();

            }).fail(function(data){
                console.log(JSON.stringify(data));
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + (data.status? data.status: 500)]);
            });
        },
        initFancyBox: function(tag, index, type){
            $('a#' + tag + '_' + index).fancybox({
                'type'          : type? type: tag,
                'transitionIn'  : 'elastic',
                'transitionOut' : 'elastic'
            });
        },
        initEffect: function(i){
//          console.log('initEffect: ' + i);
            $('button.map_' + i).animate({opacity: 0}, "slow");
            $('button.group_' + i).animate({opacity: 0}, "slow");
            $('#img_' + i).fadeTo("slow", 1);
            $('#img_' + i).css("z-index", "2");
            $('div.date_' + i).fadeTo("slow", 0);
            $('img.enlarge_' + i).fadeTo("slow", 0);
            $('img.delete_' + i).fadeTo("slow", 0);
            // mouse over
            $('div.photo_' + i).mouseenter(function(){
                $('button.map_' + i).animate({opacity: 1}, "slow");
                $('button.group_' + i).animate({opacity: 1}, "slow");
                //$('#img_' + i).fadeTo("slow", 0.4);
                $('#img_' + i).toggleClass("imgblur");
                $('#img_' + i).css("z-index", "0");
                $('div.date_' + i).fadeTo("slow", 1);
                $('img.enlarge_' + i).fadeTo("slow", 1);
                $('img.delete_' + i).fadeTo("slow", 1);
            });
            // mouse out
            $('div.photo_' + i).mouseleave(function(){
                $('button.map_' + i).animate({opacity: 0}, "slow");
                $('button.group_' + i).animate({opacity: 0}, "slow");
                //$('#img_' + i).fadeTo("slow", 1);
                $('#img_' + i).toggleClass("imgblur");
                $('#img_' + i).css("z-index", "2");
                $('div.date_' + i).fadeTo("slow", 0);
                $('img.enlarge_' + i).fadeTo("slow", 0);
                $('img.delete_' + i).fadeTo("slow", 0);
            });
        },
        numOfPhotoInRow: function(row){
            return row == aboutme.photo.firstAffected? aboutme.photo.numOfPhotoPerRow - 1:
                   row == aboutme.photo.secondAffected? aboutme.photo.numOfPhotoPerRow - 2: aboutme.photo.numOfPhotoPerRow;
        },
        reload: function(){
            var html = '<table class="table1"><tr>' // cannot append to div directly due to threading problem
              , maps = []
              , idx = aboutme.photo.list.length - 1
              , large = aboutme.photo.list.length > 5; // only show large photo if number of photo > 5

            aboutme.photo.selectedIndex = large? 0: -1;
            aboutme.photo.firstAffected = large? 1: -1;
            aboutme.photo.secondAffected = large? 2: -1;

            // display photo
            var row = 1, col = 1;
            aboutme.photo.list.forEach(function(o, i){
                // content
                if (o.geo) maps.push(i);
                html += aboutme.photo.getPhotoCell(o, i);

                // change row
                if (col % aboutme.photo.numOfPhotoInRow(row) == 0){
//                  console.log('[reload] change row at (' + row + ', ' + col + '), index: ' + i);
                    html += '</tr><tr>';
                    row++;
                    col = 0;
                }
                col++;

                // count
                aboutme.photo.num++;
            });

            // footer
            html += '</tr></table>';

            var div = $('div.gallery');
            div.empty();
            div.append(html);

            // init effects
            aboutme.photo.list.forEach(function(o, i){
                aboutme.photo.initFancyBox('image', i);
                aboutme.photo.initEffect(i);
            });

            // adjust size
            aboutme.photo.resize(-1);

            maps.forEach(function(o){
                aboutme.photo.initFancyBox('showmap', o, 'iframe');
            });
        },
        /*
        showLabel: function(i, show){
            var s = show? 'visible': 'hidden';
            $('div.blackbg_' + i).css('visibility', s);
            $('div.date_' + i).css('visibility', s);
            $('div.geo_' + i).css('visibility', s);
        },
        */
        resize: function(i){
            $('img.photo').each(function(idx, img){
                util.resize(img, idx == i? 1: 0, idx);
            });
        },
        click: function(i){
//          console.log('[click] i: ' + i);
            aboutme.chat.photo(i, true);
        },
        featured: function(i){
            var featured = aboutme.photo.list[0];
            aboutme.photo.list[0] = aboutme.photo.list[i];
            aboutme.photo.list[i] = featured;
            aboutme.photo.reload();
        },
        remove: function(i){
            var pkey = aboutme.photo.list[i].pkey;
            console.log('[remove] photo: ' + pkey);
            $.ajax({
                type: "GET",
                url: aboutme.path.photo_delete + '/' + aboutme.user.sid + '/' + pkey
            }).done(function(data){
                if (!data){
                    alert(['Your request cannot be processed, please try again later.<br>Ref. #' + 500]);
                    return;
                }
                aboutme.photo.list.splice(i, 1);
                aboutme.photo.reload();

            }).fail(function(data){
                console.log(JSON.stringify(data));
                alert(['Your request cannot be processed, please try again later.<br>Ref. #' + (data.status? data.status: 500)]);
            });
        }
    },
    string: {
//        confirm_upload: 'Are you sure?'
    }
},
util = {
    isMissing: function(val){
        if (!val) return true;
        return typeof val == 'string'? val.trim().length < 1: val.length < 1;
    },
    resize: function(x, type, i){
//      console.log('[resize] type: ' + type + ', i: ' + i);
        var img = $(x)
          , large = type == 1 || i == aboutme.photo.selectedIndex
          , w = large? aboutme.photo.originalWidth * 1.05: aboutme.photo.originalWidth
          , r = large? 10: 20;
        if (i == aboutme.photo.selectedIndex) {
            w *= 2;
            r *= 2.2;
            r += 2; // small adjustment
        }
        img.css('height', 'auto');
        img.css('width', w + 'px');
        // find the for the corresponding label and set right of it
        // $('div.' + img.attr('id').replace('img_', 'blackbg_')).css('right', r + 'px');
        // show or hide label
        // aboutme.photo.showLabel(i, type);
    },
    loadScript: function(url, callback){
        console.log('[loadScript] ' + url);
        // add script tag to the head
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // bind the event to the callback function
        // (several events for cross browser compatibility)
        if (callback){
            script.onreadystatechange = callback;
            script.onload = callback;
        }

        // fire the loading
        head.appendChild(script);
    }
};
// override standard alert
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