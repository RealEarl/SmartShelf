@echo off

:: Assuming .venv is in the exact same folder as this .bat file now.
:: Notice the ..\ commands have been removed.
set RAWPYEXE=%~dp0.venv\Scripts\python.exe

for %%I in ("%RAWPYEXE%") do set PYEXE=%%~fI
echo Using Python: %PYEXE%

:: Quotation marks added to both the Python executable and the script path
"%PYEXE%" "%~dp0SmartShelfSystem\SCRIPTS\aruco_subsystem.py"

pause