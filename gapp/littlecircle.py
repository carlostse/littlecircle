# -*- coding: utf-8 -*-

import datetime
import json
import logging
from google.appengine.ext import ndb
import core_util

class Resp:
    def __init__(self, status = 0):
        self.status = status

    def to_json(self):
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
            birthday=birthday
        )

'''
From Google https://developers.google.com/appengine/docs/python/blobstore/blobkeyclass
You can get the string form of a BlobKey value by passing it to the str() builtin.
The string form avoids special characters used in URLs and HTML,
so it can be used in user-facing data without being escaped.
'''
class Photo(ndb.Model):
    # key: blob_key
    owner = ndb.KeyProperty()
    #event = ndb.KeyProperty()
    size = ndb.IntegerProperty()
    geo = ndb.GeoPtProperty()
    photoDate = ndb.DateTimeProperty(auto_now_add=True)
    preview = ndb.BlobProperty(indexed=False)
    thumbnail = ndb.BlobProperty(indexed=False)
    uploadDate = ndb.DateTimeProperty(auto_now_add=True)
    deletedBy = ndb.KeyProperty()
    deletedDate = ndb.DateTimeProperty()
    def to_dict(self, login):
        return {'pkey': self.key.id(),
                'owner': self.owner.string_id(),
                'isOwner': login is not None and login.user == self.owner,
                'datetime': core_util.date_to_str(self.photoDate),
                'geo': core_util.geo_to_string(self.geo)}
'''
class Event(ndb.Model):
    # key: auto
    name = ndb.StringProperty()
    date = ndb.DateProperty()
    location = ndb.StringProperty()
    desc = ndb.StringProperty()

    @staticmethod
    def object_decoder(obj):
        if (obj is None):
            return None

        day = obj['date']
        date = None
        if (core_util.is_missing(day) is False):
            date = datetime.datetime.strptime(day, '%Y/%m/%d').date()
        logging.info("[Event] date: {}".format(date))

        return Event(
            name=obj['name'],
            date=date,
            location=obj['location'],
            desc=obj['desc']
        )
'''
class Login(ndb.Model):
    # key: auto
    user = ndb.KeyProperty()
    status = ndb.BooleanProperty()
    loginDate = ndb.DateTimeProperty(auto_now_add=True)
    logoutDate = ndb.DateTimeProperty()
    lastModifiedDate = ndb.DateTimeProperty(auto_now=True)

    def is_valid(self):
        return self.status

    @staticmethod
    def get_by_sid(sid):
        if (sid is None or sid.isdigit() == False):
            logging.error("[Login] get_by_sid, missing sid")
            return None

        return Login.get_by_id(int(sid))

    @staticmethod
    def is_valid_sid(sid):
        login = Login.get_by_sid(sid)
        if (login is None):
            logging.error("[Login] is_valid_sid, cannot find login: {}".format(sid))
            return False

        if (login.is_valid() == False):
            logging.error("[Login] is_valid_sid, login expired: {}".format(sid))
            return False

        logging.debug("[Login] is_valid_sid, sid: {}, user: {}".format(sid, login.user))
        return True
