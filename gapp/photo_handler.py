# -*- coding: utf-8 -*-

import sys
import os
import urllib
import webapp2
import json
import logging
import datetime
import core_util
from google.appengine.ext import ndb
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.api import images
import littlecircle

LITTLECIRCLE_THUMBNAIL_W=200
LITTLECIRCLE_THUMBNAIL_H=LITTLECIRCLE_THUMBNAIL_W*3/4
LITTLECIRCLE_PREVIEW_W=LITTLECIRCLE_THUMBNAIL_W*2
LITTLECIRCLE_PREVIEW_H=LITTLECIRCLE_THUMBNAIL_H*2
LITTLECIRCLE_IMG_Q=90

class UploadUrlHandler(webapp2.RequestHandler):
    def get(self):
        link = blobstore.create_upload_url('/upload')
        link = link[link.index('/') + 2:]
        link = link[link.index('/'):]
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(link)

class UploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        # check user login
        sid = self.request.get('sid')
        login = littlecircle.Login.get_by_sid(sid)
        if login is None or login.is_valid() == False:
            logging.error("[UploadHandler] invalid session id: {}".format(sid))
            self.error(401)
            return

        # check user exists
        user = login.user.get()
        if user is None:
            logging.error("[UploadHandler] cannot get user, sid: {}".format(sid))
            self.error(401)
            return

        upload_files = self.get_uploads('file')  # 'file' is file upload field in the form
        blob_info = upload_files[0]
        blob_key = blob_info.key()
        size = blob_info.size
        logging.info("[UploadHandler] file size: {}".format(size))

        # make preview
        img = images.Image(blob_key=blob_key)
        ''' https://developers.google.com/appengine/docs/python/images/imageclass?csw=1#Image_resize
        The resize transform preserves the aspect ratio of the image. 
        If both the width and the height arguments are provided, the transform uses the dimension that results in a smaller image
        '''
        img.resize(width=LITTLECIRCLE_PREVIEW_W, height=LITTLECIRCLE_PREVIEW_H)

        preview = img.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q, parse_source_metadata=True)

        # try to get geo location and date time of the photo
        env = os.environ['SERVER_SOFTWARE']
        dev = (core_util.is_missing(env) == False) and (env.split('/')[0] == 'Development')
        meta = img.get_original_metadata()
        logging.debug("[UploadHandler] env: {}, dev: {}, meta: {}".format(env, dev, meta))

        # date time
        dt = None
        if dev == True:
            dt = datetime.datetime.now()
        elif ('DateTime' in meta):
            dt = core_util.exif_datetime_to_datetime(meta['DateTime'])

        # location
        loc = None
        if dev == True:
            loc = ndb.GeoPt(22.4182277, 114.2080536) # The Chinese University of Hong Kong
        elif ('GPSLatitude' in meta and 'GPSLongitude' in meta):
            loc = ndb.GeoPt(meta['GPSLatitude'], meta['GPSLongitude'])

        # orientation, default is 1
        orientation = 1
        if 'Orientation' in meta:
            orientation = meta['Orientation']

        rotate = core_util.get_rotate(orientation)
        logging.info("[UploadHandler] rotate {}".format(rotate))
        img.rotate(rotate)
        ''' Due to GAE's limitation, parse_source_metadata will only be done in execute_transforms
            it makes preview is generated before img.rotate, therefore, we need to rotate it.
            But no need to parse_source_metadata again '''
        preview = img.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q, parse_source_metadata=False)

        # summary
        logging.info("[UploadHandler] photo taken at {} in location {}, orientation: {}".format(dt, loc, orientation))

        # make thumbnail
        ''' https://developers.google.com/appengine/docs/python/images/imageclass?csw=1#Image_resize
        The resize transform preserves the aspect ratio of the image. 
        If both the width and the height arguments are provided, the transform uses the dimension that results in a smaller image
        '''
        logging.info("[UploadHandler] thumb: {} x {}".format(LITTLECIRCLE_THUMBNAIL_W, LITTLECIRCLE_THUMBNAIL_H))
        img.resize(width=LITTLECIRCLE_THUMBNAIL_W, height=LITTLECIRCLE_THUMBNAIL_H)
        thumb = img.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q)

        # save photo information
        p = littlecircle.Photo(
            key=ndb.Key(littlecircle.Photo, str(blob_key)),
            owner=user.key,
            size=size,
            ori=orientation,
            geo=loc,
            photoDate=dt,
            preview=preview,
            thumbnail=thumb
        )
        k = p.put()
        logging.info("[UploadHandler] photo saved, key: {}".format(k.string_id()))
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(p.to_dict(login)))

class ImageSearchHandler(webapp2.RequestHandler):
    def get(self, url_sid):

        # check user login
        if (core_util.is_missing(url_sid)):
            logging.error("[ImageSearchHandler] missing session id")
            self.error(401)
            return

        sid = str(urllib.unquote(url_sid))
        login = littlecircle.Login.get_by_sid(sid)
        if (login is None or login.is_valid() == False):
            logging.error("[ImageSearchHandler] invalid session id: {}".format(sid))
            self.error(401)
            return

        list = littlecircle.Photo.query(
        littlecircle.Photo.deletedDate == None).order(
        littlecircle.Photo.uploadDate).fetch()

        array = []
        for obj in list:
            array.append(obj.to_dict(login))
        logging.info("[ImageSearchHandler] number of photo: {}".format(len(array)))
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(array))

class ImageViewHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'image/jpeg'

        # get the photo ID
        blob_key = self.request.get('id')
        if (core_util.is_missing(blob_key)):
            logging.error("[ImageViewHandler] missing id")
            self.error(404)
            return

        # check user login
        if (littlecircle.Login.is_valid_sid(self.request.get('sid')) == False):
            logging.error("[ImageViewHandler] invalid session id")
            self.error(401)
            return

        # get the photo size required
        size = self.request.get('size')
        logging.info("[ImageViewHandler] key: {} size: {}".format(blob_key, size))

        # get the stored photo record (not the image)
        img = ndb.Key(littlecircle.Photo, blob_key).get()
        if (img is None):
            logging.error("[ImageViewHandler] cannot find image record: {}".format(blob_key))
            self.error(404)
            return

        # get the full image
        fullImg = images.Image(blob_key=blob_key)
        if (fullImg is None):
            logging.error("[ImageViewHandler] cannot find full image: {}".format(blob_key))
            self.error(404)
            return

        if size == '2':
            logging.info("[ImageViewHandler] send full: {}".format(blob_key))
#           logging.info("[ImageViewHandler] orientation: {}".format(img.ori))
#           self.redirect("/download/{}?ori={}".format(blob_key, img.ori))

            orientation = img.ori
            logging.debug("[ImageViewHandler] orientation: {}".format(orientation))
            rotate = core_util.get_rotate(orientation)

            logging.info("[ImageViewHandler] rotate image {}".format(rotate))
            fullImg.rotate(rotate)

            self.response.headers['Content-Type'] = 'image/jpeg'
            self.response.out.write(fullImg.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q))

        elif size == '1':
            logging.info("[ImageViewHandler] send preview")
            try:
                # get the stored preview
                preview = img.preview
                if (preview is None):
                    logging.info("[ImageViewHandler] preview not found, try to make it")
                    fullImg.resize(width=LITTLECIRCLE_PREVIEW_W)
                    preview = fullImg.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q)
                    if (preview is None):
                        raise Exception("[ImageViewHandler] cannot make preview: {}".format(blob_key))

                    logging.debug("[ImageViewHandler] save back the preview")
                    img.preview = preview
                    img.put()
                else:
                    logging.debug("[ImageViewHandler] found stored preview")

                self.response.out.write(preview)
            except:
                logging.error("[ImageViewHandler] except: {}".format(sys.exc_info()))
                self.error(404)
        else:
            logging.info("[ImageViewHandler] send thumbnail")
            try:
                # get the stored thumbnail
                thumbnail = img.thumbnail
                if (thumbnail is None):
                    logging.info("[ImageViewHandler] thumbnail not found, try to make it")
                    fullImg.resize(width=LITTLECIRCLE_THUMBNAIL_W)
                    thumbnail = fullImg.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q)
                    if (thumbnail is None):
                        raise Exception("[ImageViewHandler] cannot make thumbnail: {}".format(blob_key))

                    logging.debug("[ImageViewHandler] save back the thumbnail")
                    img.thumbnail = thumbnail
                    img.put()
                else:
                    logging.debug("[ImageViewHandler] found stored thumbnail")

                self.response.out.write(thumbnail)
            except:
                logging.error("[ImageViewHandler] except: {}".format(sys.exc_info()))
                self.error(404)
'''
class ImageDownloadHandler(webapp2.RequestHandler): #blobstore_handlers.BlobstoreDownloadHandler
    def get(self, resource):
        resource = str(urllib.unquote(resource))
        if (core_util.is_missing(resource)):
            logging.error("[ImageDownloadHandler] missing resource")
            self.error(404)
            return

        blob_info = blobstore.BlobInfo.get(resource)
        if (blob_info is None):
            logging.error("[ImageDownloadHandler] cannot find image: {}".format(resource))
            self.error(404)
            return

        rotate = 0
        orientation = self.request.get('ori')
        logging.debug("[ImageDownloadHandler] orientation: {}".format(orientation))

        img = images.Image(blob_key=blob_info)
        if orientation == '3':
            logging.info("[ImageDownloadHandler] rotate image")
            rotate = 180

        size = blob_info.size
        name = blob_info.filename
        logging.info("[ImageDownloadHandler] {} ({})".format(name, size))
        # self.send_blob(blob_info, save_as=name)
        img.rotate(rotate)
        self.response.headers['Content-Type'] = 'image/jpeg'
        self.response.out.write(img.execute_transforms(output_encoding=images.JPEG, quality=LITTLECIRCLE_IMG_Q))
'''
class ImageDeleteHandler(webapp2.RequestHandler):
    def get(self, url_sid, url_photo):
        # get the photo ID
        blob_key = str(urllib.unquote(url_photo))
        if (core_util.is_missing(blob_key)):
            logging.error("[ImageDeleteHandler] missing id")
            self.error(404)
            return

        img = ndb.Key(littlecircle.Photo, blob_key).get()
        if (img is None):
            logging.error("[ImageDeleteHandler] missing image: {}".format(blob_key))
            self.error(404)
            return

        # check user login
        sid = str(urllib.unquote(url_sid))
        login = littlecircle.Login.get_by_sid(sid)
        if (login is None or login.is_valid() == False):
            logging.error("[ImageDeleteHandler] invalid session id: {}".format(sid))
            self.error(401)
            return

        # check if the photo is belonged to the user
        k1 = img.owner
        k2 = login.user
        logging.info("[ImageDeleteHandler] owner: {}, login: {}".format(k1.id(), k2.id()))
        if (k1 != k2):
            logging.info("[ImageDeleteHandler] permission denied, image: {}".format(blob_key))
            self.error(550) # permission denied
            return

        # delete photo (set inactive)
        logging.info("[ImageDeleteHandler] delete image: {}".format(blob_key))
        img.deletedBy = k2
        img.deletedDate = datetime.datetime.now()
        img.put()

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(littlecircle.Resp(status=1).to_json())