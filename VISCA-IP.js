var sequenceNumber = 1;

function init()
{
    script.setUpdateRate(20);
    if (local.parameters.debugLog.get())
    {
        script.log("VISCA-IP FINAL loaded");
    }
}

function logMessage(msg)
{
    if (local.parameters.debugLog.get())
    {
        script.log(msg);
    }
}

function getCameraAddress(index)
{
    if (index == 1) return local.parameters.camera1Address.get();
    if (index == 2) return local.parameters.camera2Address.get();
    if (index == 3) return local.parameters.camera3Address.get();
    if (index == 4) return local.parameters.camera4Address.get();
    return "";
}

function getCommandPort()
{
    return local.parameters.commandPort.get();
}

function getUseHeader()
{
    return local.parameters.useViscaIpHeader.get();
}

function clampPresetNumber(presetNumber)
{
    var p = presetNumber - 1;
    if (p < 0) p = 0;
    if (p > 254) p = 254;
    return p;
}

function byteToHex(v)
{
    var hex = "0123456789ABCDEF";
    return hex.charAt(Math.floor(v / 16)) + hex.charAt(v % 16);
}

function bytesToHexString(arr)
{
    var s = "";
    var i = 0;
    for (i = 0; i < arr.length; i++)
    {
        if (i > 0) s += " ";
        s += byteToHex(arr[i]);
    }
    return s;
}

function buildPacket(payload)
{
    var packet = [];
    var len = payload.length;

    if (!getUseHeader())
    {
        return payload;
    }

    // 🔥 핵심: bit 연산 제거
    packet.push(0x01);
    packet.push(0x00);

    packet.push(Math.floor(len / 256));
    packet.push(len % 256);

    var seq = sequenceNumber;

    packet.push(Math.floor(seq / 16777216)); // >>24
    packet.push(Math.floor(seq / 65536) % 256); // >>16
    packet.push(Math.floor(seq / 256) % 256); // >>8
    packet.push(seq % 256);

    var i;
    for (i = 0; i < payload.length; i++)
    {
        packet.push(payload[i]);
    }

    sequenceNumber++;
    if (sequenceNumber > 2147483647)
    {
        sequenceNumber = 1;
    }

    return packet;
}

function sendPacketToCamera(cameraIndex, payload)
{
    var ip = getCameraAddress(cameraIndex);
    var port = getCommandPort();

    if (!ip)
    {
        logMessage("Camera " + cameraIndex + " address empty");
        return;
    }

    var packet = buildPacket(payload);

    local.sendBytesTo(ip, port, packet);

    logMessage("SEND -> " + ip + ":" + port + " : " + bytesToHexString(packet));
}

function recallPreset(cameraIndex, presetNumber)
{
    var p = clampPresetNumber(presetNumber);
    var payload = [0x81, 0x01, 0x04, 0x3F, 0x02, p, 0xFF];
    sendPacketToCamera(cameraIndex, payload);
}

function recallPresetAll(presetNumber)
{
    for (var i = 1; i <= 4; i++)
    {
        if (getCameraAddress(i) != "")
        {
            recallPreset(i, presetNumber);
        }
    }
}

function resetSequenceNumber(cameraIndex)
{
    var payload = [0x02, 0x00, 0x00, 0x01, 0x00];
    var ip = getCameraAddress(cameraIndex);
    var port = getCommandPort();

    if (!ip)
    {
        logMessage("Camera " + cameraIndex + " address empty");
        return;
    }

    local.sendBytesTo(ip, port, payload);
    sequenceNumber = 1;

    logMessage("SEQ RESET -> " + ip);
}

function sendRawVisca(cameraIndex, bytes)
{
    var arr = bytes.split(" ");
    var payload = [];
    var i;

    for (i = 0; i < arr.length; i++)
    {
        var v = parseInt(arr[i], 16);
        if (!isNaN(v)) payload.push(v);
    }

    if (payload.length == 0)
    {
        logMessage("Empty RAW VISCA");
        return;
    }

    sendPacketToCamera(cameraIndex, payload);
}