@echo off
cd /d "C:\Users\swagger\Documents\promptbook"
git init
git add .
git commit -m "initial commit"
del "%~f0"
