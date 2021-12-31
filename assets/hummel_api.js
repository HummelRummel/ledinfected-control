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

function paletteUpdate(id, stripe) {
    const p1 = document.getElementById(id+"_"+stripe+"_p1");
    const p2 = document.getElementById(id+"_"+stripe+"_p2");
    const p3 = document.getElementById(id+"_"+stripe+"_p3");
    const p4 = document.getElementById(id+"_"+stripe+"_p4");
    const p5 = document.getElementById(id+"_"+stripe+"_p5");
    const p6 = document.getElementById(id+"_"+stripe+"_p6");
    const p7 = document.getElementById(id+"_"+stripe+"_p7");
    const p8 = document.getElementById(id+"_"+stripe+"_p8");
    const p9 = document.getElementById(id+"_"+stripe+"_p9");
    const p10 = document.getElementById(id+"_"+stripe+"_p10");
    const p11 = document.getElementById(id+"_"+stripe+"_p11");
    const p12 = document.getElementById(id+"_"+stripe+"_p12");
    const p13 = document.getElementById(id+"_"+stripe+"_p13");
    const p14 = document.getElementById(id+"_"+stripe+"_p14");
    const p15 = document.getElementById(id+"_"+stripe+"_p15");
    const p16 = document.getElementById(id+"_"+stripe+"_p16");

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

/**
 * @func hsl2hsv
 * @desc Return an HSV color from an HSL color
 * @param {Number} h - Hue Angle (0 - 255)
 * @param {Number} s - Saturation (0 - 100)
 * @param {Number} l - Lightness (0 - 100)
 * @return {ArrayHSV}
 * @example
 * hsl2hsv(0, 100, 50)
 * @link https://gist.github.com/defims/0ca2ef8832833186ed396a2f8a204117
 */
export function hsl2hsv(hslH, hslS, hslL) {
    const hsv1 = (hslS * (hslL < 50 ? hslL : 100 - hslL) / 100) ;
    const hsvS = hsv1 === 0 ? 0 : 2 * hsv1 / (hslL + hsv1) * 100;
    const hsvV = hslL + hsv1;
    const fixedH = (hslH * 256) / 360
    const fixedS = (hsvS * 256) / 100
    const fixedV = (hsvV * 256) / 100
    return [ fixedH, fixedS, fixedV ];
}
/**
 * @func hsv2hsl
 * @desc Return an HSL color from an HSV color
 * @param {Number} h - Hue Angle (0 - 360)
 * @param {Number} s - Saturation (0 - 100)
 * @param {Number} v - Value (0 - 100)
 * @return {ArrayHSL}
 * @example
 * hsv2hsl(0, 0, 0) // => [0, 100, 50]
 * @link https://gist.github.com/defims/0ca2ef8832833186ed396a2f8a204117
 */
export function hsv2hsl(hsvH, hsvS, hsvV) {
    const hslL = (200 - hsvS) * hsvV / 100;
    const [ hslS, hslV ] = [
        hslL === 0 || hslL === 200 ? 0 : hsvS * hsvV / 100 / (hslL <= 100 ? hslL : 200 - hslL) * 100,
        hslL * 5 / 10
    ];

    const fixedH = (hsvH * 360) / 256
    const fixedS = (hslS * 100) / 256
    const fixedV = (hslV * 100) / 256
    return [ fixedH, fixedS, fixedV ];
}