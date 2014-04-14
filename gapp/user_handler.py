# -*- coding: utf-8 -*-

import sys
import webapp2
import json
import logging
from google.appengine.ext import ndb
import littlecircle
import core_util

class UserSyncHandler(webapp2.RequestHandler):
    def post(self):
        r = littlecircle.Resp()
        user = self.request.get('user')
        if (core_util.is_missing(user)):
            logging.error("[UserSyncHandler] missing user")
        else:
            logging.info("[UserSyncHandler] user: {}".format(user))
            try:
                u = json.loads(user, object_hook=littlecircle.User.object_decoder)
                if (u is None):
                    logging.error("[UserSyncHandler] cannot restore user from JSON")
                else:
                    u.put()
                    logging.info("[UserSyncHandler] user name: {}".format(u.name()))
                    r.status = 1
            except:
                logging.error("[UserSyncHandler] except: {}".format(sys.exc_info()))
                r.status = 0

        self.response.headers['Content-Type'] = 'application/json'
        logging.info("[UserSyncHandler] status: {}".format(r.status))
        self.response.out.write(r.toJson())

class UserLoginResp(littlecircle.Resp):
    def toJson(self):
        return json.dumps({
            'status': self.status,
            'userId': self.userId,
            'sid': self.sid
        })

class UserLoginHandler(webapp2.RequestHandler):
    def get(self):
        r = UserLoginResp()
        userId = self.request.get('user_id')
        if (core_util.is_missing(userId)):
            logging.error("[UserLoginHandler] missing user_id")
        else:
            userKey = ndb.Key(littlecircle.User, "{}{}".format(littlecircle.User.FB_ID_INIT, userId))
            user = userKey.get()
            if (user is None):
                logging.error("[UserLoginHandler] cannot find user: {}", userId)
            else:
                # logout previous session ID(s)

                '''
                due to the quota limitation in free GAE,
                here we delete instead of set inactive (reduced security)
                '''
#               keys = littlecircle.Login.query(littlecircle.Login.user==userKey)
#               list = keys.fetch()
#               for obj in list:
#                   obj.status = False
#               ndb.put_multi(keys)
                ndb.delete_multi(littlecircle.Login.query(littlecircle.Login.user==userKey).fetch(keys_only=True))

                # create login record and return session ID
                k = littlecircle.Login(
                    user=userKey,
                    status=True
                ).put()
                r.status = 1
                r.userId = userId
                r.sid = str(k.id())
                logging.info("[UserLoginHandler] user {} login".format(userId))

        self.response.headers['Content-Type'] = 'application/json'
        logging.info("[UserLoginHandler] status: {}".format(r.status))
        self.response.out.write(r.toJson())

class UserLogoutHandler(webapp2.RequestHandler):
    def get(self):
        r = littlecircle.Resp()
        sid = self.request.get('sid')
        if (sid is None or sid.isdigit() == False):
            logging.error("[UserLogoutHandler] missing sid")
        else:
            login = littlecircle.Login.get_by_id(int(sid))
            if (login is None):
                logging.error("[UserLogoutHandler] cannot find login: {}".format(sid))
            else:
                login.status = False
                login.put()
                r.status = 1
        self.response.headers['Content-Type'] = 'application/json'
        logging.info("[UserLogoutHandler] status: {}".format(r.status))
        self.response.out.write(r.toJson())