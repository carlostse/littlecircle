# -*- coding: utf-8 -*-

import sys
import urllib
import webapp2
import json
import logging
from google.appengine.ext import ndb
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.api import images
import littlecircle

class UploadUrlHandler(webapp2.RequestHandler):
    def get(self):
        link = blobstore.create_upload_url('/upload')
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

        littlecircle.Photo(
            key=ndb.Key(littlecircle.Photo, str(blob_key)),
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
        list = littlecircle.Photo.query(littlecircle.Photo.event == event).order(littlecircle.Photo.uploadDate).fetch()
        array = []
        for obj in list:
            array.append({
                'pkey': obj.key.id(),
                'owner': obj.owner,
                'event': obj.event
            })
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(array))

class ImageViewHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'image/jpeg'

        blob_key = self.request.get('id')
        if (blob_key is None):
            logging.error("[ImageViewHandler] missing id")
            self.error(404)
            return

        full = self.request.get('full')
        logging.info("[ImageViewHandler] key: {} full: {}".format(blob_key, full))

        if full == '1':
            logging.info("[ImageViewHandler] send full: {}".format(blob_key))
            #blob_info = blobstore.BlobInfo.get(blob_key)
            #self.response.out.write(images.Image(blob_key=blob_key))
            self.redirect('/download/%s' % blob_key)
        else:
            logging.info("[ImageViewHandler] send thumbnail")
            try:
                img = images.Image(blob_key=blob_key)
                if (img is None):
                    raise Exception("[ImageViewHandler] cannot find image: {}".format(blob_key))

                img.resize(width=200)
                thumbnail = img.execute_transforms(output_encoding=images.JPEG, quality=90)
                self.response.out.write(thumbnail)
            except:
                logging.error("[ImageViewHandler] except: {}".format(sys.exc_info()))
                self.error(404)            

class ImageDownloadHandler(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self, resource):
        resource = str(urllib.unquote(resource))
        if (resource is None):
            logging.error("[ImageDownloadHandler] missing resource")
            self.error(404)
            return

        blob_info = blobstore.BlobInfo.get(resource)
        if (blob_info is None):
            logging.error("[ImageDownloadHandler] cannot find image: {}".format(resource))
            self.error(404)
            return

        size = blob_info.size
        name = blob_info.filename
        logging.info("[ImageDownloadHandler] {} ({})".format(name, size))

        #img = images.Image(blob_key=blob_info.key())
        #img.resize(width=200, height=200)
        #thumbnail = img.execute_transforms(output_encoding=images.JPEG)
        #self.response.headers['Content-Type'] = 'image/jpeg'
        self.send_blob(blob_info, save_as=name)
