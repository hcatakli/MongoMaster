#!/bin/bash

echo "==================================="
echo "Chart Recognizer - Tüm Servisler"
echo "==================================="
echo

# Mastra'yı başlatma
gnome-terminal --title="Mastra" -- bash -c "npx mastra dev; exec bash" &

# 3 saniye bekle
sleep 3

# Web sunucusunu başlatma
gnome-terminal --title="Web Server" -- bash -c "node src/server.js; exec bash" &

# 2 saniye bekle
sleep 2

# Telegram botunu başlatma
gnome-terminal --title="Telegram Bot" -- bash -c "node src/telegramBot.js; exec bash" &

echo
echo "Tüm servisler başlatıldı!"
echo "Web arayüzü: http://localhost:3000"
echo "Chat arayüzü: http://localhost:3000/chat"
echo "Telegram bot: @DocGraphBot"
echo
echo "Servisleri kapatmak için açılan pencereleri kapatınız."
echo
