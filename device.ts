import { Mqtt, clientFromConnectionString } from 'azure-iot-device-mqtt';
import { Client } from 'azure-iot-device';
import { Message, ModuleClient, SharedAccessSignature } from 'azure-iot-device';
import { anHourFromNow, ConnectionString } from 'azure-iot-common';
import { Mqtt as MqttDps } from 'azure-iot-provisioning-device-mqtt';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient } from 'azure-iot-provisioning-device';
import * as Crypto from 'crypto';

// Only required when connecting in sas or conn connection modes
const deviceConnString = '';

// Only required when this device is a leaf device connecting through an edgeHub
const gatewayHostName: any = '';

// Only required when connecting is dps connection mode
const dps = {
    dpsScopeId: '',
    deviceId: '',
    sasKey: '',
    rootKey: false,
    dpsPayload: {}
};

// Only required when needing to add options to the connection client
const options = {};

async function connect(connectType: string) {
    let client = null;
    switch (connectType) {
        case 'module':
            const IOTEDGE_WORKLOADURI = process.env.IOTEDGE_WORKLOADURI;
            const IOTEDGE_DEVICEID = process.env.IOTEDGE_DEVICEID;
            const IOTEDGE_MODULEID = process.env.IOTEDGE_MODULEID;
            const IOTEDGE_MODULEGENERATIONID = process.env.IOTEDGE_MODULEGENERATIONID;
            const IOTEDGE_IOTHUBHOSTNAME = process.env.IOTEDGE_IOTHUBHOSTNAME;
            const IOTEDGE_AUTHSCHEME = process.env.IOTEDGE_AUTHSCHEM;

            if (!IOTEDGE_WORKLOADURI || !IOTEDGE_DEVICEID || !IOTEDGE_MODULEID || !IOTEDGE_MODULEGENERATIONID || !IOTEDGE_IOTHUBHOSTNAME || !IOTEDGE_AUTHSCHEME) { console.error('Not a module'); return; }
            client = await ModuleClient.fromEnvironment(Mqtt);
            break;
        case 'dpsS':
        case 'dpsC':
            client = await getDps(connectType);
            client.setOptions(options);
            break;
        case 'sas':
            const cn = ConnectionString.parse(deviceConnString);
            const sas: any = SharedAccessSignature.create(gatewayHostName || cn.HostName, cn.DeviceId, cn.SharedAccessKey, anHourFromNow());
            client = Client.fromSharedAccessSignature(sas, Mqtt);
            client.setOptions(options);
            break;
        case 'conn': {
            client = clientFromConnectionString(deviceConnString);
            client.setOptions(options);
            break;
        }
    }

    if (gatewayHostName) {
        console.log('Specified GatewayHostName' + (process.env.NODE_EXTRA_CA_CERTS === '' ? ': Missing ENV var for certs' : ': Certs ENV var found'));
    }

    mainRunloop(client);
}

function getDps(type: string) {
    return new Promise((resolve, reject) => {
        console.log('Connecting via DPS');
        const transformedSasKey = dps.rootKey ? computeDerivedSymmetricKey(dps.sasKey, dps.deviceId) : dps.sasKey;
        const provisioningSecurityClient = new SymmetricKeySecurityClient(dps.deviceId, dps.sasKey);
        const provisioningClient = ProvisioningDeviceClient.create('global.azure-devices-provisioning.net', dps.dpsScopeId, new MqttDps(), provisioningSecurityClient);

        provisioningClient.setProvisioningPayload(dps.dpsPayload);
        provisioningClient.register((err: any, result) => {
            if (err) { reject(err); return; }
            if (type === 'dpsS') {
                const sas: any = SharedAccessSignature.create(gatewayHostName !== '' ? gatewayHostName : result.assignedHub, result.deviceId, transformedSasKey, anHourFromNow());
                resolve(Client.fromSharedAccessSignature(sas, Mqtt));
            } else {
                const connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + transformedSasKey + (gatewayHostName !== '' ? ';GatewayHostName=' + gatewayHostName : '');
                resolve(Client.fromConnectionString(connectionString, Mqtt));
            }
        });
    })
}

async function mainRunloop(client) {
    console.log('Starting client for device');
    await client.open();
    const twin = await client.getTwin();

    twin.on('properties.desired', (delta: any) => {
        console.log('Received payload: ' + JSON.stringify(delta));
    });

    setInterval(() => {
        const payload = { "randomTelemetry": Math.floor(Math.random() * 100) };
        let msg = new Message(JSON.stringify(payload));
        client.sendEvent(msg);
        console.log('Sending telemetry payload: ' + msg.getData());
    }, 15000);

    setInterval(() => {
        const payload = { "randomProperty": Math.floor(Math.random() * 100) };
        twin.properties.reported.update(payload, () => {
            console.log('Sending reported payload: ' + JSON.stringify(payload));
        });
    }, 60000);
};

function computeDerivedSymmetricKey(masterKey, regId) {
    return Crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
        .update(regId, 'utf8')
        .digest('base64');
}

console.log('Connecting device');
connect('dpsS'); // Device connection options: connS|connC|dpsS|dpsC|module