# basic-device

This codebase can be used as a starter for creating a simulated device to connect on an Azure IoT Hub. The device can be setup to be a regular device, an Edge module or a leaf device for a gateway (using a cert). It contains a base implementation for sending telemetry and sending/receiving a twin.

## Setup
- Install NodeJS LTS
- Install these packages before building this repo

  ```
  npm i typescript -g
  ```
- Clone this repo

## Install the node packages
After cloning, using CMD/Shell to navigate to the cloned folder and install the packages
```
npm ci
```

## Update the device connection type code
Use a text editor or vscode to update Line 119 of [device.ts](device.ts)
```
connect('dpsS');
```
Select on of the following options
- dpsS; Use DPS to connect with SaS. Update *dps* in the code
- dpsC; Use DPS to connect with Connection String. Update *dps* in the code
- connS; Use a device connection string and connect with SaS. Update *deviceConnString* in the code
- connC; Use a device connection string. Update *deviceConnString* in the code
- module; Use this device as an Edge module. No other code change required

## Build the code
```
npm run build
```

## Run the device
```
npm run start
```

### __Using basic-device as a Leaf Device connecting through an Edge Gateway__
Set up the device connection per desired and update *gatewayHostName* in the code to be the DNS name of the Edge device acting as a gateway.

Finally, ensure you have set the following environment variable *before* running the code and ensure the pem is at the location
```
set NODE_EXTRA_CA_CERTS=<full path to root cert pem file>
```
or
```
export NODE_EXTRA_CA_CERTS=<full path to root cert pem file>
```
This is a basic manifest file that can be used in your Edge deployment [nomodule_manifest](nomodule_manifest.json). To learn more about connecting downstream devices, visit the following [documentation](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-connect-downstream-device?view=iotedge-2018-06)
