@echo off
echo ===================================
echo Chart Recognizer - Tum Servisler
echo ===================================
echo.

REM Mastra'yi baslatma
start cmd /k "title Mastra && color 0B && npx mastra dev"

REM 3 saniye bekle
timeout /t 3 /nobreak > nul

REM Web sunucusunu baslatma
start cmd /k "title Web Server && color 0A && node src/server.js"

REM 2 saniye bekle
timeout /t 2 /nobreak > nul

REM Telegram botunu baslatma
start cmd /k "title Telegram Bot && color 0C && node src/telegramBot.js"

echo.
echo Tum servisler baslatildi!
echo Web arayuzu: http://localhost:3000
echo Chat arayuzu: http://localhost:3000/chat
echo Telegram bot: @DocGraphBot
echo.
echo Servisleri kapatmak icin acilan pencereleri kapatiniz.
echo.
