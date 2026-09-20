#!/bin/bash
# 切换到脚本所在目录下的 server（不依赖固定部署路径）
cd "$(dirname "$0")/server" || exit 1

# 安装依赖（仅第一次）
if [ ! -d "node_modules" ]; then
    echo "首次运行，安装依赖..."
    npm install
fi

# 停止旧进程
if [ -f "app.pid" ]; then
    kill $(cat app.pid) 2>/dev/null
    rm -f app.pid
    echo "已停止旧进程"
fi

# 后台启动
nohup node server.js > app.log 2>&1 &
echo $! > app.pid
echo "后端已启动，PID: $(cat app.pid)"
echo "日志文件: server/app.log"
