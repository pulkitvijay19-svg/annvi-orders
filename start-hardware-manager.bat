@echo off
set NODE_PATH_EXE=%~f0
for /f "delims=" %%i in ('where node') do set NODE_PATH_EXE=%%i

cd /d "%~dp0hardware-manager"
set ANNVI_NODE_EXE=%NODE_PATH_EXE%
node hardware-manager.cjs
pause