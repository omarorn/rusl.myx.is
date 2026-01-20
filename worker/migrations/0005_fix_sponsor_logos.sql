-- Migration: 0005_fix_sponsor_logos.sql
-- Fix sponsor logo URLs to use embedded SVG data URIs instead of broken external URLs

-- Update Litla Gámaleigan logo
UPDATE sponsors
SET logo_url = 'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100''%3E%3Crect fill=''%232563eb'' width=''100'' height=''100'' rx=''10''/%3E%3Ctext x=''50'' y=''55'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''36'' font-weight=''bold'' fill=''white''%3ELG%3C/text%3E%3C/svg%3E'
WHERE id = 'sponsor_litla';

-- Update 2076 ehf logo
UPDATE sponsors
SET logo_url = 'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100''%3E%3Crect fill=''%2310b981'' width=''100'' height=''100'' rx=''10''/%3E%3Ctext x=''50'' y=''60'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''28'' font-weight=''bold'' fill=''white''%3E2076%3C/text%3E%3C/svg%3E'
WHERE id = 'sponsor_2076';
