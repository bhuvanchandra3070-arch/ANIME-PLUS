@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     ANIME.PLUS - AUTOMATIC GITHUB PUSH TOOL
echo ===================================================
echo.

set "GIT_EXE=C:\Users\bhuva\git\cmd\git.exe"
if not exist "!GIT_EXE!" (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        set "GIT_EXE=git"
    ) else (
        echo [ERROR] Git was not found!
        pause
        exit /b 1
    )
)

echo [1/4] Checking repository status...
"!GIT_EXE!" status

echo.
echo [2/4] Staging and committing all project files...
"!GIT_EXE!" add -A
"!GIT_EXE!" commit -m "Update ANIME.PLUS website files" 2>nul

echo.
echo [3/4] Checking remote origin...
"!GIT_EXE!" remote get-url origin 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Remote 'origin' is not set yet.
    echo Please enter your GitHub Repository URL
    echo (Example: https://github.com/your-username/anime-hub.git)
    echo.
    set /p REPO_URL="Enter GitHub Repo URL: "
    if "!REPO_URL!"=="" (
        echo [ERROR] No URL provided. Aborted.
        pause
        exit /b 1
    )
    "!GIT_EXE!" remote add origin "!REPO_URL!"
)

echo.
echo [4/4] Pushing to GitHub (main branch)...
"!GIT_EXE!" branch -M main
"!GIT_EXE!" push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo     SUCCESSFULLY UPLOADED ALL FILES TO GITHUB!
    echo ===================================================
) else (
    echo.
    echo [NOTE] If this is your first push to an existing repo, trying force push...
    "!GIT_EXE!" push -u origin main --force
)

echo.
pause
