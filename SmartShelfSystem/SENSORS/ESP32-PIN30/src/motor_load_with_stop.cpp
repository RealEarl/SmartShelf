#include <Arduino.h>
#include <AccelStepper.h>
#include "HX711.h"

const int motorPin1 = 16;
const int motorPin2 = 17;
const int motorPin3 = 18;
const int motorPin4 = 19;

const int LOADCELL_DOUT_PIN = 22;
const int LOADCELL_SCK_PIN = 21;

AccelStepper myStepper(AccelStepper::HALF4WIRE, motorPin1, motorPin3, motorPin2, motorPin4);
HX711 scale;

float my_calibration_factor = 25.49; 
float trigger_weight = 100.0; 

float targetSpeed = 400.0; 
float targetAcceleration = 200.0;
const int stepsPerRevolution = 4096;

bool is_platform_empty = true;

void setup() {
  Serial.begin(115200);
  
  myStepper.setMaxSpeed(1000.0);
  myStepper.setSpeed(targetSpeed);
  myStepper.setAcceleration(targetAcceleration);
  
  Serial.println("Booting SmartShelf...");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(my_calibration_factor);
  scale.tare(); 
  
  Serial.println("System Ready. Waiting for fruit...");
}

void loop() {
  float current_weight = scale.get_units(3);
  
  if (current_weight >= trigger_weight && is_platform_empty == true) {
    
    Serial.print("Fruit detected. Weight: ");
    Serial.print(current_weight, 1);
    Serial.println(" g");
    
    Serial.println("Waiting 0.5 seconds for fruit to settle...");
    delay(500); 
    
    myStepper.setCurrentPosition(0);

    // Stop 1
    myStepper.runToNewPosition(0);
    delay(500); 
    Serial.println("TRIGGER_CAMERA_1");
    delay(500); 

    // Stop 2
    myStepper.runToNewPosition(1365);
    delay(500);
    Serial.println("TRIGGER_CAMERA_2");
    delay(500);

    // Stop 3
    myStepper.runToNewPosition(2730);
    delay(500);
    Serial.println("TRIGGER_CAMERA_3");
    delay(500);

    // Finish
    myStepper.runToNewPosition(stepsPerRevolution);
      
    Serial.println("Scanning Complete."); 
    Serial.println("Please remove the fruit.");
    
    is_platform_empty = false; 
  }
  
  if (current_weight < (trigger_weight / 2.0) && is_platform_empty == false) {
    
    Serial.print("Platform cleared. Current Weight: ");
    Serial.print(current_weight, 1);
    Serial.println(" g");
    Serial.println("Ready for next fruit.");
    
    is_platform_empty = true; 
    delay(1000); 
  }
}