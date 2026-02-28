-- Migration: 0010_fix_graenir_skatar_logo.sql
-- Fix Grænir skátar logo_url from broken PNG path to SVG data URI

UPDATE sponsors
SET logo_url = 'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100''%3E%3Crect fill=''%2316a34a'' width=''100'' height=''100'' rx=''10''/%3E%3Ctext x=''50'' y=''55'' text-anchor=''middle'' font-size=''40''%3E%F0%9F%92%9A%3C/text%3E%3Ctext x=''50'' y=''80'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''12'' font-weight=''bold'' fill=''white''%3EGr%C3%A6nir%3C/text%3E%3C/svg%3E'
WHERE id = 'sponsor_graenir_skatar';
