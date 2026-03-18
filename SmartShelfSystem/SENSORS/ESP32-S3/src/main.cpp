#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Replace with your actual network details
const char* ssid = "ANGELFIRE";
const char* password = "16089339";

// Replace 192.168.1.15 with your laptop IPv4 address
const char* serverName = "http://192.168.8.104:5000/sensor_endpoint";

Adafruit_SHT4x sht4 = Adafruit_SHT4x();

const int I2C_SDA_PIN = 8;
const int I2C_SCL_PIN = 9;

const int mq3Pin = 1;
const int mq135Pin = 2;

void setup() {
  Serial.begin(115200);
  delay(2000); 
  
  Serial.println("\n*** FreshBox System Starting ***");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  bool i2c_status = Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 100000);
  if (!i2c_status) {
    Serial.println("I2C Initialization Failed");
  } else {
    Serial.println("I2C Bus Started");
  }

  if (!sht4.begin(&Wire)) {
    Serial.println("SHT40 sensor not found at expected address");
  } else {
    Serial.println("SHT40 sensor detected");
    sht4.setPrecision(SHT4X_HIGH_PRECISION);
    sht4.setHeater(SHT4X_NO_HEATER);
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sensors_event_t humidity, temp;
    String sensorString = "";
    
    if (sht4.getEvent(&humidity, &temp)) {
      sensorString += "TEMP:" + String(temp.temperature) + "|HUM:" + String(humidity.relative_humidity);
    } else {
      sensorString += "TEMP:ERR|HUM:ERR";
    }

    int mq3Value = analogRead(mq3Pin);
    int mq135Value = analogRead(mq135Pin);

    sensorString += "|MQ3:" + String(mq3Value) + "|MQ135:" + String(mq135Value);

    Serial.println("Sending: " + sensorString);

    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"sensor_value\":\"" + sensorString + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }

  delay(2000);
}