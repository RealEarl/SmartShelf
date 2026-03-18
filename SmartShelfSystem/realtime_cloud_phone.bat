@echo off
set RAWPYEXE=%~dp0..\..\..\..\.venv\Scripts\python.exe
for %%I in ("%RAWPYEXE%") do set PYEXE=%%~fI
echo Using Python: %PYEXE%
%PYEXE% %~dp0realtime_cloud_phone.py
pause