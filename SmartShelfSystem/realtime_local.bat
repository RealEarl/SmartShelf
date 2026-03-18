@echo off
echo DO NOT USE UNLESS THE DEVICE CAN HANDLE THE WHOLE SYSTEM LOCALLY
pause

@echo off
set RAWPYEXE=%~dp0..\..\..\..\.venv\Scripts\python.exe
for %%I in ("%RAWPYEXE%") do set PYEXE=%%~fI
echo Using Python: %PYEXE%
%PYEXE% %~dp0realtime_local.py
pause