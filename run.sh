#!/bin/bash

echo "Starting Document RAG Pipeline..."
echo ""

# Check if backend port is available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Error: Port 5000 is already in use"
    exit 1
fi

# Check if frontend port is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Error: Port 3000 is already in use"
    exit 1
fi

# Start backend
echo "Starting backend on localhost:5000..."
cd backend
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate
python main.py &
BACKEND_PID=$!
sleep 2

# Start frontend
cd ../frontend
echo "Starting frontend on localhost:3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Services started!"
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle cleanup
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
