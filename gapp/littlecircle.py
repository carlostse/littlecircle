# -*- coding: utf-8 -*-

import datetime
import json
import logging
from google.appengine.ext import ndb
import core_util

class Resp:
    def __init__(self, status = 0):
        self.status = status

    def toJson(self):
        return json.dumps({
            'status': self.status
        })

class User(ndb.Model):
    FB_ID_INIT = 'fb'
    # key: user ID, e.g. fb_id
    firstName = ndb.StringProperty()
    lastName = ndb.StringProperty()
    gender = ndb.StringProperty()
    email = ndb.StringProperty()
    birthday = ndb.DateProperty()

    def name(self):
        n = '';
        if (self.firstName is not None):
            n += self.firstName
        if (self.firstName is not None and self.lastName is not None):
            n += ' '
        if (self.lastName is not None):
            n += self.lastName
        return n

    @staticmethod
    def object_decoder(obj):
        if (obj is None):
            return None

        fb_id = str(obj['fb_id'])
        logging.info("[User] fb_id: {}".format(fb_id))

        if (core_util.is_missing(fb_id)):
            return None

        bday = obj['birthday']
        birthday = None
        if (core_util.is_missing(bday) is False):
            birthday = datetime.datetime.strptime(bday, '%Y-%m-%d').date()
        logging.info("[User] birthday: {}".format(birthday))

        return User(
            key=ndb.Key(User, "{}{}".format(User.FB_ID_INIT, fb_id)),
            firstName=obj['first_name'],
            lastName=obj['last_name'],
            gender=obj['gender'],
            email=obj['email'],
            birthday=birthday)

'''
From Google https://developers.google.com/appengine/docs/python/blobstore/blobkeyclass
You can get the string form of a BlobKey value by passing it to the str() builtin.
The string form avoids special characters used in URLs and HTML,
so it can be used in user-facing data without being escaped.
'''
class Photo(ndb.Model):
    # key: blob_key
    owner = ndb.StringProperty()
    event = ndb.StringProperty()
    size = ndb.IntegerProperty()
    photoDate = ndb.DateTimeProperty(auto_now_add=True)
    uploadDate = ndb.DateTimeProperty(auto_now_add=True)

class Login(ndb.Model):
    user = ndb.KeyProperty()
    status = ndb.BooleanProperty()
    loginDate = ndb.DateTimeProperty(auto_now_add=True)
    logoutDate = ndb.DateTimeProperty()
    lastModifiedDate = ndb.DateTimeProperty(auto_now=True)