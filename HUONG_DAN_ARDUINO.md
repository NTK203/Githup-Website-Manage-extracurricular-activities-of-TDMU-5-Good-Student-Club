# Hướng dẫn sử dụng Arduino IDE

## Bước 1: Cài đặt thư viện cần thiết

1. Mở Arduino IDE
2. Vào **Sketch** → **Include Library** → **Manage Libraries**
3. Tìm và cài đặt:
   - **LiquidCrystal_I2C** (của Frank de Brabander)

## Bước 2: Kết nối phần cứng

### Cảm biến siêu âm HC-SR04 (2 cái):
- **Cảm biến VÀO**: 
  - Trig → Chân 9
  - Echo → Chân 10
  - VCC → 5V
  - GND → GND

- **Cảm biến RA**:
  - Trig → Chân 7
  - Echo → Chân 8
  - VCC → 5V
  - GND → GND

### LCD I2C:
- SDA → A4 (Arduino Uno) hoặc SDA (Arduino Nano)
- SCL → A5 (Arduino Uno) hoặc SCL (Arduino Nano)
- VCC → 5V
- GND → GND

### LED:
- Chân dương → Chân 3 (qua điện trở 220Ω)
- Chân âm → GND

### Buzzer:
- Chân dương → Chân 4
- Chân âm → GND

## Bước 3: Nạp code

1. Mở file `people_counter.ino` trong Arduino IDE
2. Chọn board: **Tools** → **Board** → Chọn loại Arduino của bạn (Arduino Uno/Nano)
3. Chọn cổng COM: **Tools** → **Port** → Chọn cổng COM của Arduino
4. Nhấn nút **Upload** (mũi tên phải) hoặc **Ctrl + U**

## Bước 4: Kiểm tra

- Mở Serial Monitor (**Tools** → **Serial Monitor**) để xem thông tin debug
- Điều chỉnh tốc độ baud: **9600**

## Lưu ý

- Nếu LCD không hiển thị, kiểm tra địa chỉ I2C (có thể là 0x3F thay vì 0x27)
- Để tìm địa chỉ I2C, sử dụng code I2C Scanner
- Khoảng cách phát hiện: 0-60cm (có thể điều chỉnh trong code)











