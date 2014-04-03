# -*- coding: utf-8 -*-

import datetime

def is_missing(str):
    return str is None or len(str) < 1

def date_to_str(d):
    if (d is None):
        return ''
    return d.strftime('%Y/%m/%d')

def str_to_date(str, format):
    if (is_missing(str) or is_missing(format)):
        return None
    return datetime.datetime.strptime(str, format).date()

def exif_datetime_to_datetime(str):
    if (is_missing(str)):
        return None
    return datetime.datetime.strptime(str, '%Y:%m:%d %H:%M:%S')

def geo_to_string(geo):
    if (geo is None):
        return ''
    return "{},{}".format(geo.lat, geo.lon)