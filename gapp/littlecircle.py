import os
import urllib
import webapp2
import json
import logging
from google.appengine.ext import ndb
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.api import images

URL_PREFIX = '/gapp'

class Photo(ndb.Model):
    pkey = ndb.BlobKeyProperty()
    owner = ndb.StringProperty()
    event = ndb.StringProperty()
    size = ndb.IntegerProperty()
    photoDate = ndb.DateTimeProperty(auto_now=True)
    uploadDate = ndb.DateTimeProperty(auto_now=True)

class UploadUrlHandler(webapp2.RequestHandler):
    def get(self):
        link = blobstore.create_upload_url(URL_PREFIX + '/upload')
        link = link[link.index('/') + 2:]
        link = link[link.index('/'):]
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(link)

class UploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        fid = self.request.get('fid')
        upload_files = self.get_uploads('file')  # 'file' is file upload field in the form
        logging.info("[UploadHandler] upload_files: {}".format(upload_files))

        blob_info = upload_files[0]
        blob_key = blob_info.key()
        size = blob_info.size
        logging.info("[UploadHandler] size: {}".format(size))

        Photo(
            #key=ndb.Key(Photo, blob_key.str()),
            pkey=blob_key,
            owner=fid,
            event="1",
            size=size
        ).put()

        #img = images.Image(blob_key=blob_key)
        #meta = img.get_original_metadata()
        #img.resize(width=200)
        #thumbnail = img.execute_transforms(output_encoding=images.JPEG, quality=90)
        #self.response.headers['Content-Type'] = 'image/jpeg'
        #self.response.out.write(thumbnail)

        self.response.out.write(blob_key)

class ImageSearchHandler(webapp2.RequestHandler):
    def get(self):
        event = self.request.get('event')
        logging.info("[ImageSearchHandler] event: {}".format(event))
        list = Photo.query(Photo.event == event).order(Photo.uploadDate).fetch()
        array = []
        for photo in list:
            array.append({
                'pkey': str(photo.pkey),
                'owner': photo.owner,
                'event': photo.event
            })
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(array))

class ImageViewHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'image/jpeg'

        blob_key = self.request.get('id')
        full = self.request.get('full')
        logging.info("[ImageViewHandler] key: {} full: {}".format(blob_key, full))

        if full == '1':
            logging.info("[ImageViewHandler] send full: {}".format(blob_key))
            #blob_info = blobstore.BlobInfo.get(blob_key)
            #self.response.out.write(images.Image(blob_key=blob_key))
            self.redirect(URL_PREFIX + '/download/%s' % blob_key)
        else:
            logging.info("[ImageViewHandler] send thumbnail")
            img = images.Image(blob_key=blob_key)
            img.resize(width=200)
            thumbnail = img.execute_transforms(output_encoding=images.JPEG, quality=90)
            self.response.out.write(thumbnail)

class ImageDownloadHandler(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self, resource):
        resource = str(urllib.unquote(resource))
        blob_info = blobstore.BlobInfo.get(resource)

        size = blob_info.size
        logging.info("[ImageDownloadHandler] size: {}".format(size))

        #img = images.Image(blob_key=blob_info.key())
        #img.resize(width=200, height=200)
        #thumbnail = img.execute_transforms(output_encoding=images.JPEG)

        self.send_blob(blob_info)

app = webapp2.WSGIApplication([
    (URL_PREFIX + '/upload_url', UploadUrlHandler),
    (URL_PREFIX + '/upload', UploadHandler),
    (URL_PREFIX + '/search', ImageSearchHandler),
    (URL_PREFIX + '/view', ImageViewHandler),
    (URL_PREFIX + '/download/([^/]+)?', ImageDownloadHandler)
], debug=True)
