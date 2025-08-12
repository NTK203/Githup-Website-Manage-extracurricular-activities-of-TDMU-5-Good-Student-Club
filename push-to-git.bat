@echo off
echo ========================================
echo    PUSH CODE LEN GITHUB - SV5TOT-TDMU
echo ========================================
echo.

echo [1/4] Kiem tra trang thai Git...
git status
echo.

echo [2/4] Them tat ca files vao staging...
git add .
echo.

echo [3/4] Nhap commit message:
set /p commit_msg="Commit message: "
git commit -m "%commit_msg%"
echo.

echo [4/4] Push len GitHub...
git push origin main
echo.

echo ========================================
echo    HOAN THANH! Code da duoc push.
echo ========================================
pause
