@echo off
REM ============================================================
REM  E听说单词通 - 手机访问启动器（局域网模式）
REM  双击本文件即可启动，手机连同一 WiFi 后打开下方地址。
REM ============================================================
echo.
echo ============================================================
echo   E-TingShuo Word App  -  LAN Phone Server
echo ============================================================
echo.
echo Phone URL(s): connect your phone to the SAME WiFi, then open:
echo.
for /f "usebackq tokens=2 delims=:" %%i in (`ipconfig ^| findstr /i "IPv4"`) do (
  for /f "tokens=1" %%a in ("%%i") do echo    http://%%a:8000
)
echo.
echo On Android Chrome: menu (top-right) -^> "Add to Home screen".
echo (Over plain http the offline cache is disabled; for full PWA
echo  use an HTTPS tunnel or deploy to a static host.)
echo.
echo Press Ctrl+C to stop the server.
echo ============================================================
python -m http.server 8000 --bind 0.0.0.0
