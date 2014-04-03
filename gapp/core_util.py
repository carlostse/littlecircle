# -*- coding: utf-8 -*-

import datetime

def is_missing(str):
    return str is None or len(str) < 1

def str_to_date(str, format):
    return datetime.datetime.strptime(str, format).date()

def exif_datetime_to_datetime(str):
    return datetime.datetime.strptime(str, '%Y:%m:%d %H:%M:%S')