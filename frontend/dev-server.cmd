@echo off
cd /d C:\Users\tawona\Documents\botimi-chatbot
echo Starting botimi dev server at %date% %time% > dev-server.log
call C:\Users\tawona\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port 3000 >> dev-server.log 2>> dev-server.err.log
echo Exit code %ERRORLEVEL% at %date% %time% >> dev-server.log
