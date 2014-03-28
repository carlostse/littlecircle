# -*- coding: utf-8 -*-

import webapp2
import user_handler
import photo_handler

app = webapp2.WSGIApplication([
    ('/sync_user', user_handler.SyncUserHandler),
    ('/upload_url', photo_handler.UploadUrlHandler),
    ('/upload', photo_handler.UploadHandler),
    ('/search', photo_handler.ImageSearchHandler),
    ('/view', photo_handler.ImageViewHandler),
    ('/download/([^/]+)?', photo_handler.ImageDownloadHandler)
], debug=True)
