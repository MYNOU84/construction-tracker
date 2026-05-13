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
    call npx prisma db push --accept-data-loss
    call npx tsx src/seed.ts
    echo  Database ready.
) else (
    echo  Database found - skipping setup.
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
