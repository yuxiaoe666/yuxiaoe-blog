#!/bin/bash
cd "$(dirname "$0")/server" || exit 1

if [ -f "app.pid" ]; then
    PID=$(cat app.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "已停止进程 PID: $PID"
    else
        echo "进程 PID: $PID 已不存在"
    fi
    rm -f app.pid
else
    echo "未找到 app.pid，尝试强制停止..."
    pkill -f "node server.js" && echo "已停止" || echo "未找到运行中的进程"
fi
