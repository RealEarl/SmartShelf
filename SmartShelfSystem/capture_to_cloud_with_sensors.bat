@echo off
set RAWPYEXE=%~dp0..\..\..\..\.venv\Scripts\python.exe
for %%I in ("%RAWPYEXE%") do set PYEXE=%%~fI
echo Using Python: %PYEXE%
%PYEXE% %~dp0capture_to_cloud_with_sensors.py
pause