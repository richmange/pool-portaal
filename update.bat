@echo off
rem Handmatig verversen + lokaal bekijken op http://localhost:8765
python scraper\fetch.py && python scraper\build.py && python -m http.server 8765 --directory site
