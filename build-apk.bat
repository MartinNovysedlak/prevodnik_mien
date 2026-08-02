@echo off
REM ============================================================
REM  Build skript pre Prevodník mien
REM  Dvojklik na tento súbor zostaví nové .apk
REM ============================================================
chcp 65001 >nul
setlocal

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
set "ANDROID_HOME=C:\Android\sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%"
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ==================================================
echo   Prevodník mien - build APK
echo ==================================================
echo.

cd /d "%ROOT%"

echo [1/3] Synchronizujem web assety...
call npx cap sync android
if errorlevel 1 goto :error

echo.
echo [2/3] Generujem ikony...
node make_icons.js
if errorlevel 1 goto :error

echo.
echo [3/3] Zostavujem APK...
cd android
call gradlew assembleDebug
if errorlevel 1 goto :error
cd /d "%ROOT%"

echo.
echo Kopírujem APK do projektu...
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "Prevodnik-mien.apk" >nul

echo.
echo ==================================================
echo   HOTOVE! APK je v: %ROOT%\Prevodnik-mien.apk
echo ==================================================
echo.
pause
exit /b 0

:error
echo.
echo !!! ZLYHANIE buildu. Pozri chyby vyssie.
pause
exit /b 1
