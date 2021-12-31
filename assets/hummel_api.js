const getConfig = async () => {
    const response = await fetch(window.location.origin + '/api/config');
    const configs = await response.json(); //extract JSON from the http response

    console.log("read configs:")
    console.log(configs)
    return configs;
}

function addStripe() {
    const stripes = document.getElementById("stripes");
    stripes.innerHTML = "Hello JavaScript";
}

async function updateFields() {
    configs = await getConfig();
    console.log("update field configs:")
    console.log(configs)
    if (configs == null) {
        console.log("no arduino found")
        arduinos = document.getElementById("hummel_arduinos");
        arduinos.innerHTML = "no arduinos found"
        return
    }
    for (var i = 0; i < configs.length; i++) {
        console.log("arduino found")
        console.log(configs[i])
        id = document.getElementById("arduino_id");
        console.log(id)
        id.innerHTML = configs[i].id
        console.log(id)
        devFile = document.getElementById("arduino_dev_file");
        console.log(devFile)
        devFile.innerHTML = configs[i].dev_file
        saveID = document.getElementById("arduino_id_save");
        btn = document.createElement("button")
        btn.innerHTML = "Save"
//        btn.onclick = sendData
        saveID.innerHTML = "";
        saveID.appendChild(btn);
        //       addArduino(configs[i])

        ledPin = document.getElementById("circle_led_pin");
        ledPinEl = document.createElement("input");
        ledPinEl.type = "number"
        ledPinEl.value = configs[i].circle.pin.led_pin
        ledPinEl.addEventListener('input', ledCirclePinUpdate);
        ledPin.innerHTML = ""
        ledPin.appendChild(ledPinEl)

        numLeds = document.getElementById("circle_num_leds");
        numLedsEl = document.createElement("input");
        numLedsEl.type = "number"
        numLedsEl.value = configs[i].circle.pin.num_leds
        numLeds.innerHTML = ""
        numLeds.appendChild(numLedsEl)
    }
}

function ledCirclePinUpdate(e) {
    sendHummelCommand("api/ado/255/circle/pin/led_pin", "led_pin", e.target.value)
}

function addArduino(config) {
    const arduinos = document.getElementById("hummel_arduinos");
    const arduinoTemplate = document.getElementById("arduino_template");
    console.log(arduinoTemplate)
    // arduinoID = arduinoTemplate.getElementById("arduino_id")
    // arduinoDevFile = arduinoTemplate.getElementById("arduino_dev_file")
    arduino = document.createElement("div");
    addArduinoIdElement(arduino, config.id)
    arduinos.appendChild(arduinos, arduino)
}

function addArduinoIdElement(parent, arduinoId) {
    const e = document.getElementById("arduino_id");
    console.log(e)
    e.value = arduinoId;
}

function sendHummelCommand(api, fieldName, value) {
    console.log("sendHummelCommand");
    data = '{ "' + fieldName + '": ' + value + '}'
    var url = window.location.origin + "/" + api;
    fetch(url, {method: 'post', body: data, headers: {'content-type': 'JSON'}});
}

// function addArduinoIdElement(parent, arduinoId) {
//     const e = document.getElementById("uint8_t_element");
//     console.log(e)
//     key = e.querySelector(`#key`)
//     console.log(key)
//     key = innerHTML= "ArduinoID";
//     e.querySelector(`#value`).value= arduinoId;
//     var clone = document.importNode(e.content, true);
//     parent.appendChild(clone)
// }