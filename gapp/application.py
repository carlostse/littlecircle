# -*- coding: utf-8 -*-

import webapp2
import user_handler
import photo_handler

app = webapp2.WSGIApplication([
    ('/user_sync', user_handler.UserSyncHandler),
    ('/user_login', user_handler.UserLoginHandler),
    ('/user_logout', user_handler.UserLogoutHandler),
    ('/upload_url', photo_handler.UploadUrlHandler),
    ('/upload', photo_handler.UploadHandler),
    ('/search', photo_handler.ImageSearchHandler),
    ('/view', photo_handler.ImageViewHandler),
    ('/download/([^/]+)?', photo_handler.ImageDownloadHandler)
], debug=True)
