@echo off
title BuildTrack Pro - Construction Tracker

echo.
echo  =====================================
echo   BuildTrack Pro - Construction Tracker
echo  =====================================
echo.

echo [1/3] Installing root dependencies...
call npm install --silent
echo  Done.

echo [2/3] Installing server dependencies...
cd server
call npm install --silent
echo  Done.

echo [3/3] Installing client dependencies...
cd ..\client
call npm install --silent
echo  Done.

cd ..\server

echo.
echo  Generating Prisma client...
call npx prisma generate

if not exist "prisma\dev.db" (
    echo  First run - creating database...
    call node scripts\db-sync.js
    call npx tsx src/seed.ts
    echo  Database ready.
) else (
    echo  Database found - checking schema ^(read-only^)...
    call node scripts\db-sync.js
    if errorlevel 1 (
        echo.
        echo  The existing database needs a schema upgrade before sign-in will work.
        echo  Your data has NOT been changed. To upgrade with an automatic backup, run:
        echo      cd server
        echo      npm run db:upgrade
        echo  then start BuildTrack Pro again.
        cd ..
        pause
        exit /b 1
    )
)

cd ..

echo.
echo  =====================================
echo   Starting servers...
echo  =====================================
echo.
echo  Web App:  http://localhost:5173
echo  API:      http://localhost:5000
echo.
echo  Login: admin@buildtrack.com / admin123
echo.
echo  Press Ctrl+C to stop.
echo.

call npm run dev

echo.
echo  Servers stopped.
pause
