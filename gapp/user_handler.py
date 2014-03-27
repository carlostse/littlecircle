# -*- coding: utf-8 -*-

import sys
import webapp2
import json
import logging
from google.appengine.ext import ndb
import littlecircle
import core_util

class SyncUserHandler(webapp2.RequestHandler):
    def post(self):
        r = littlecircle.Resp()
        user = self.request.get('user')
        if (core_util.is_missing(user)):
            logging.error("[SyncUserHandler] missing user")
        else:
            logging.info("[SyncUserHandler] user: {}".format(user))
            try:
                u = json.loads(user, object_hook=littlecircle.User.object_decoder)
                if (u is None):
                    logging.error("[SyncUserHandler] cannot restore user from JSON")
                else:
                    u.put()
                    logging.info("[SyncUserHandler] user name: {}".format(u.name()))
                    r.status = 1
            except:
                logging.error("[SyncUserHandler] except: {}".format(sys.exc_info()))
                r.status = 0

        self.response.headers['Content-Type'] = 'application/json'
        logging.info("[SyncUserHandler] status: {}".format(r.status))
        self.response.out.write(r.toJson())