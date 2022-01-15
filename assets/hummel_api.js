function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomTranslate(b, min, max) {
    return b + "% { transform: translate(" + getRandomInt(min, max) + "px, " + getRandomInt(min, max) + "px); }\n"
}

let newPosX = 0, newPosY = 0, startPosX = 0, startPosY = 0;

let hummelCnt = 0;

let mouseButtonIsDown = false;

hummeln = [];

const maxSpeed = 100;
const borderSizeLeftPercent = 2;
const borderSizeTopPercent = 2;
const hummelImageSize = 40;
const flowerImageSize = 180;

function createHummel(parentElement) {
    hummelCnt += 1;
    hummelID = 'hummel' + hummelCnt;

    xPercent = getRandomInt(5, 95);
    yPercent = getRandomInt(5, 95);

    x = (parentElement.offsetWidth / 100) * xPercent;
    y = (parentElement.offsetHeight / 100) * yPercent;

    elements = createHummelElements(parentElement, hummelID);
    styles = createHummelStyle(hummelID, xPercent, yPercent);

    newHummel = {
        hummelID: hummelID,
        parent: parentElement,
        elements: {
            hummel: elements.hummel,
            //    buzz_zone: elements.buzz_zone,
            body: elements.body,
        },
        startPosX: 0,
        startPosY: 0,
        posX: x,
        posY: y,
        speed: getRandomInt(0, maxSpeed),
        direction: getRandomInt(1, 360),
        loopEnd: 0,
        loopSpeed: 0,
        autoMove: true,
        imageSize: hummelImageSize,

        mouseDownCallback: function (e) {
            mouseButtonIsDown = true;

            e.preventDefault();
            hummel = findHummel(this);

            // get the starting position of the cursor
            hummel.startPosX = e.clientX;
            hummel.startPosY = e.clientY;

            moveCallback = hummel.moveMouseCallback.bind(hummel);

            hummel.autoMove = false;
            document.addEventListener('mousemove', moveCallback);

            mouseUpCallback = function () {
                mouseButtonIsDown = false;
                document.removeEventListener('mousemove', moveCallback);
                document.removeEventListener('mouseup', mouseUpCallback);
                hummel.autoMove = true;
                console.log("automove enabled again");
            }
            document.addEventListener('mouseup', mouseUpCallback);
        },
        moveMouseCallback: function (e) {
            hummel = this;

            // calculate the new position
            newPosX = hummel.startPosX - e.clientX;
            newPosY = hummel.startPosY - e.clientY;

            // with each move we also want to update the start X and Y
            hummel.startPosX = e.clientX;
            hummel.startPosY = e.clientY;
            // console.log(hummel.hummelID + " mouse move");

            // console.log(hummel.elements.hummel.style)
            // set the element's new position:
            hummel.posX = hummel.elements.hummel.offsetLeft - newPosX
            hummel.posY = hummel.elements.hummel.offsetTop - newPosY

            hummel.elements.hummel.style.left = hummel.posX + "px";
            hummel.elements.hummel.style.top = hummel.posY + "px";
        },
        automaticMovementAction: function () {
            hummel = this;
            screenHeight = hummel.parent.offsetHeight;
            minY = (screenHeight / 100) * borderSizeTopPercent;
            maxY = screenHeight - minY - hummel.imageSize;

            screenWidth = hummel.parent.offsetWidth;
            minX = (screenWidth / 100) * borderSizeLeftPercent;
            maxX = screenWidth - minX - hummel.imageSize;

            if (hummel.posX < minX) {
                hummel.direction = getRandomInt(45, 135);
                //console.log("minX reached, new direction: "+ hummel.direction)

                hummel.speed = maxSpeed;
            } else if (hummel.posX > maxX) {
                hummel.direction = getRandomInt(225, 315);
                //console.log("maxX reached, new direction: "+ hummel.direction)

                hummel.speed = maxSpeed;
            } else if (hummel.posY < minY) {
                hummel.direction = getRandomInt(135, 225);
                //console.log("minY reached, new direction: "+ hummel.direction)
                hummel.speed = maxSpeed;
            } else if (hummel.posY > maxY) {
                hummel.direction = getRandomInt(-45, 45);
                //console.log("maxY reached, new direction: "+ hummel.direction)

                hummel.speed = maxSpeed;
            } else {
                seed = getRandomInt(0, 1000)
                if (seed == 0) {
                    oldSpeed = hummel.Speed;
                    hummel.speed = getRandomInt(0, 100);
                    //console.log("change speed from "+oldSpeed+" to "+ hummel.speed)
                } else if (seed == 1) {
                    hummel.direction = getRandomInt(0, 360);
                    //console.log("change direction from "+ oldDirection +" to " + hummel.direction);
                } else if (seed == 2) {
                    hummel.speed = 100;
                    loopValue = 360;
                    if (getRandomInt(1, 2) == 1) {
                        hummel.direction += loopValue;
                    } else {
                        hummel.direction -= loopValue;
                    }
                    hummel.loopSpeed = getRandomInt(3, 10);
                    hummel.loopEnd = getRandomInt(1, 360);
                    console.log(hummel.hummelID + ": do a loop with " + loopValue)
                } else if ((seed > 100) && (seed < 200)) {
                    //console.log("direction correction")
                    hummel.direction += getRandomInt(-2, 2);
                }
            }

            hummel.direction += getRandomInt(-1, 1);

            if (hummel.loopEnd > 0) {
                //console.log(hummel.hummelID + ": loop action")
                if (hummel.direction > hummel.loopEnd) {
                    hummel.direction -= hummel.loopSpeed;
                    if (hummel.direction < hummel.loopEnd) {
                        hummel.direction = hummel.loopEnd;
                    }
                } else if (hummel.direction < hummel.loopEnd) {
                    hummel.direction += hummel.loopSpeed;
                    if (hummel.direction > hummel.loopEnd) {
                        hummel.direction = hummel.loopEnd;
                    }
                }
                if (hummel.direction == hummel.loopEnd) {
                    hummel.loopEnd = 0;
                }
            }

            if (hummel.speed > (maxSpeed / 2)) {
                hummel.speed -= maxSpeed / 20;
            } else if (hummel.speed < (maxSpeed / 2)) {
                hummel.speed += maxSpeed / 20;
            }

            // do the movement
            hummel.posX += (Math.cos((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));
            hummel.posY += (Math.sin((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));

            //  console.log(hummel.direction + ": "+ Math.cos((180 / Math.PI) * hummel.direction) + "/" + Math.sin((180 / Math.PI) * hummel.direction))

            hummel.elements.hummel.style.left = hummel.posX + "px";
            hummel.elements.hummel.style.top = hummel.posY + "px";
            hummel.elements.hummel.style.transform = "rotate(" + (hummel.direction - 45) + "deg)"
        }
    };

    this.elements.hummel.addEventListener('mousedown', newHummel.mouseDownCallback);

    hummeln.push(newHummel)
    return newHummel;
}

function createFlower(parentElement, flowerID) {
    xPercent = getRandomInt(5, 85);
    yPercent = getRandomInt(5, 85);

    x = (parentElement.offsetWidth / 100) * xPercent;
    y = (parentElement.offsetHeight / 100) * yPercent;

    elements = createFlowerElements(parentElement, flowerID);
    styles = createFlowerStyle(flowerID, xPercent, yPercent);

}

function automaticMovement() {
    for (let i = 0; i < hummeln.length; i++) {
        if (hummeln[i].autoMove == true) {
            // move the hummel
            moveAction = hummeln[i].automaticMovementAction.bind(hummeln[i]);

            moveAction();
        } else {
            if (mouseButtonIsDown == false) {
                hummeln[i].autoMove = true;
                console.log(hummeln[i].hummelID + " fix autmovement");
            }
        }
    }
}

function findHummel(el) {
    for (let i = 0; i < hummeln.length; i++) {
        if (el.className == hummeln[i].hummelID) {
            return hummeln[i];
        }
    }
}

function createHummelElements(parentElement, hummelID) {
    const hummelEl = document.createElement("div");
    hummelEl.setAttribute('class', hummelID)

    parentElement.appendChild(hummelEl);

    const hummelBodyEl = document.createElement("img");
    hummelBodyEl.setAttribute('class', hummelID + '_body');
    hummelBodyEl.setAttribute('src', 'assets/img/hummel.gif');

    hummelEl.appendChild(hummelBodyEl);

    return {hummel: hummelEl, body: hummelBodyEl};
}

function createHummelStyle(hummelID, x, y) {
    const style = document.createElement("style");

    style.innerHTML = "\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + hummelID + "{\n"
    style.innerHTML += "    width:50px;\n"
    style.innerHTML += "    height:50px;\n"
    style.innerHTML += "    left:" + x + "%;\n"
    style.innerHTML += "    top:" + y + "%;\n"
    style.innerHTML += "    position:absolute;\n"
//    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "    cursor:move;\n"
    style.innerHTML += "    z-index: 3;\n"
    style.innerHTML += "}\n"

    // add hummel body style
    style.innerHTML += "\n"
    style.innerHTML += "." + hummelID + "_body {\n"
    style.innerHTML += "    width:" + hummelImageSize + "px;\n"
    style.innerHTML += "    height:" + hummelImageSize + "px;\n"
    style.innerHTML += "    left:5px;\n"
    style.innerHTML += "    top:5px;\n"
//    style.innerHTML += "    z-index: 3;\n"
//    style.innerHTML += "    background:#ff0000;\n"
    style.innerHTML += "    animation-name: " + hummelID + "_floating;\n"
    style.innerHTML += "    animation-duration: 10s;\n"
    style.innerHTML += "    animation-iteration-count: infinite;\n"
    style.innerHTML += "    animation-direction: alternate;\n"
    style.innerHTML += "    animation-timing-function: ease-in-out;\n"
    //   style.innerHTML += "    box-shadow: 1px 1px 2px black, 0 0 25px blue, 0 0 5px darkblue;\n"
    style.innerHTML += "}\n"

    // add keyframes for individual hummel floating
    style.innerHTML += "\n"
    style.innerHTML += "@keyframes " + hummelID + "_floating {\n";
    for (n = 0; n < 11; ++n) {
        style.innerHTML += randomTranslate(n * 10, 0, 10);
    }
    style.innerHTML += "}\n";
    document.head.appendChild(style);
}

function toggleSelectedElement(elementID) {
    el = document.getElementById(elementID);
    el.classList.toggle("selected")
}

function showFlowerView(flowerID) {
    document.getElementById("selection_leds_btn").click();
    document.getElementById("parameter_ctrl_btn").click();

    style = document.getElementById('control_view').style;

    style.animation = "fadeInEffect 1s";
    style.display = "block";
}

function hideFlowerView() {
    style = document.getElementById('control_view').style;

    style.animation = "fadeOutEffect 1s";
    setTimeout(function () {
        style.display = "none";
    }, 900);
}

function createFlowerControlElements(parentElement, objectID) {
    const ctrlView = document.createElement("div");
    ctrlView.setAttribute('id', "controlView_" + objectID)
    ctrlView.setAttribute('data-object-id', objectID)
    parentElement.appendChild(ctrlView);

    const selectView = document.createElement("div");
    selectView.classList.add("selection_tab_" + objectID, "tab");
    selectView.setAttribute('data-object-id', objectID)
    ctrlView.appendChild(selectView);

    const selLedBtn = document.createElement("button");
    selLedBtn.setAttribute('id', "selection_leds_btn_" + objectID)
    selLedBtn.classList.add("selection_tablinks_" + objectID);
    selLedBtn.setAttribute('onclick', "selectSelectionTab('selection_leds', " + objectID + ")")
    selLedBtn.innerHTML = "LEDs";
    selectView.appendChild(selLedBtn);

    const selPatternBtn = document.createElement("button");
    selPatternBtn.setAttribute('id', "selection_pattern_btn_" + objectID)
    selPatternBtn.classList.add("selection_tablinks_" + objectID);
    selPatternBtn.setAttribute('onclick', "selectSelectionTab('selection_pattern', " + objectID + ")")
    selPatternBtn.innerHTML = "Pattern";
    selectView.appendChild(selPatternBtn);

    const closeBtn = document.createElement("button");
    closeBtn.setAttribute('onclick', "hideFlowerView()")
    closeBtn.innerHTML = "Close";
    selectView.appendChild(closeBtn);


}

function createFlowerElements(parentElement, flowerID) {
    // createFlowerControlElements(parentElement, flowerID);

    const flowerEl = document.createElement("div");
    flowerEl.setAttribute('class', flowerID)
    parentElement.appendChild(flowerEl);

    const flowerAnchorEl = document.createElement("div");
    flowerAnchorEl.setAttribute('onclick', "showFlowerView('" + flowerID + "')");
    flowerEl.appendChild(flowerAnchorEl);

    const flowerBodyEl = document.createElement("img");
    flowerBodyEl.setAttribute('class', flowerID + '_body');
    flowerBodyEl.setAttribute('src', 'assets/img/flower.gif');
    flowerAnchorEl.appendChild(flowerBodyEl);

    return {flower: flowerEl, body: flowerBodyEl};
}

function createFlowerStyle(flowerID, x, y) {
    const style = document.createElement("style");

    style.innerHTML = "\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + flowerID + "{\n"
    style.innerHTML += "    width:200px;\n"
    style.innerHTML += "    height:200px;\n"
    style.innerHTML += "    left:" + x + "%;\n"
    style.innerHTML += "    top:" + y + "%;\n"
    style.innerHTML += "    position:absolute;\n"
    style.innerHTML += "    z-index: 2;\n"
//    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "}\n"

    // add hummel body style
    style.innerHTML += "\n"
    style.innerHTML += "." + flowerID + "_body {\n"
    style.innerHTML += "    width:" + flowerImageSize + "px;\n"
    style.innerHTML += "    height:" + flowerImageSize + "px;\n"
    style.innerHTML += "    left:5px;\n"
    style.innerHTML += "    top:5px;\n"
//    style.innerHTML += "    z-index: 2;\n"
    // style.innerHTML += "    background:#ff0000;\n"
    style.innerHTML += "    animation-name: " + flowerID + "_floating;\n"
    style.innerHTML += "    animation-duration: 20s;\n"
    style.innerHTML += "    animation-iteration-count: infinite;\n"
    style.innerHTML += "    animation-direction: alternate;\n"
    style.innerHTML += "    animation-timing-function: ease-in-out;\n"
    style.innerHTML += "}\n"

    // add keyframes for individual hummel floating
    style.innerHTML += "\n"
    style.innerHTML += "@keyframes " + flowerID + "_floating {\n";
    for (n = 0; n < 11; ++n) {
        style.innerHTML += randomTranslate(n * 10, 0, 20);
    }
    style.innerHTML += "}\n";
    document.head.appendChild(style);
}

function initialize() {
    const wiese = document.querySelector('.hummel_wiese');

    createHummel(wiese);
    createHummel(wiese);
    createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);
    // createHummel(wiese);

    createFlower(wiese, "flower123");
    setInterval(automaticMovement, 40);
}

function updateObject() {
    var obj = new Object();
    obj.id = "pfv1";
    obj.led_config = new Object();
    obj.led_config.radial_stripes = [];

    tabcontent = document.getElementsByClassName("parameter_ctrl_select");
    for (i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].classList.contains("selected") == true) {
            selectedCtrlType = tabcontent[i].getAttribute("data-ctrl-type")
            break;
        }
    }

    slider = document.getElementById("parameter_ctrl_slider");
    newValue = slider.value;

    var selectedSegments = [];
    tabcontent = document.getElementsByClassName("led_select_field");
    for (i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].classList.contains("selected") == true) {
            selectedSegments.push(tabcontent[i].getAttribute("data-id"))
        }
    }

    var selectedPatternIndecies = [];
    tabcontent = document.getElementsByClassName("pattern_select_field");
    for (i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].classList.contains("selected") == true) {
            selectedPatternIndecies.push(parseInt(tabcontent[i].getAttribute("data-id")));
        }
    }
    for (si = 0; si < selectedSegments.length; si++) {
        stripeObj = new Object();
        stripeObj.stripe_name = selectedSegments[si];
        stripeObj.config = new Object();


        if (selectedCtrlType == "h") {
            stripeObj.config.palette = new Object();
            stripeObj.config.palette.palette = [];
            for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
                newPatternEntry = new Object();
                newPatternEntry.id = selectedPatternIndecies[pi];
                newPatternEntry.h = newValue * 1;
                stripeObj.config.palette.palette.push(newPatternEntry);
            }
            fillMissingPaletteEntries(stripeObj.config.palette)
        } else if (selectedCtrlType == "s") {
            stripeObj.config.palette = new Object();
            stripeObj.config.palette.palette = [];
            for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
                newPatternEntry = new Object();
                newPatternEntry.id = selectedPatternIndecies[pi];
                newPatternEntry.s = newValue * 1;
                stripeObj.config.palette.palette.push(newPatternEntry);
            }
            fillMissingPaletteEntries(stripeObj.config.palette)
        } else if (selectedCtrlType == "v") {
            stripeObj.config.palette = new Object();
            stripeObj.config.palette.palette = [];
            for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
                newPatternEntry = new Object();
                newPatternEntry.id = selectedPatternIndecies[pi];
                newPatternEntry.v = newValue * 1;
                stripeObj.config.palette.palette.push(newPatternEntry);
            }
            fillMissingPaletteEntries(stripeObj.config.palette)
        } else if (selectedCtrlType == "speed") {
            stripeObj.config.base = new Object();
            absSpeed = newValue;
            if (absSpeed < 0) {
                stripeObj.config.base.movement_speed = absSpeed * -1;
                stripeObj.config.base.movement_direction = false;
            } else {
                stripeObj.config.base.movement_speed = absSpeed * 1;
                stripeObj.config.base.movement_direction = true;
            }
        } else if (selectedCtrlType == "overlay") {

        }

        // and now add the config
        obj.led_config.radial_stripes.push(stripeObj);
    }

    console.log(JSON.stringify(obj.led_config))
    post("api/object/" + obj.id + "/stripe", obj.led_config);
}

function post(url, data) {
    return fetch(url, {method: "POST", headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
}

function fillMissingPaletteEntries(palette) {
    for (i = 1; i < 17; i++) {
        found = false
        for (pi = 0; pi < palette.palette.length; pi++) {
            if ( palette.palette[pi].id == i ) {
                found = true
            }
        }
        if ( found == false ) {
            newPatternEntry = new Object();
            newPatternEntry.id = i
            palette.palette.push(newPatternEntry)
        }
    }
}

function selectParameterCtrlElement(id) {
    // Declare all variables
    var i, tabcontent, tablinks;

    tabcontent = document.getElementsByClassName("parameter_ctrl_select");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("selected");
    }

    slider = document.getElementById("parameter_ctrl_slider");
    if (id == "parameter_ctrl_speed") {
        slider.min = -2
        slider.max = 2
    } else if ((id == "parameter_ctrl_h") || (id == "parameter_ctrl_s") || (id == "parameter_ctrl_v")) {
        slider.min = 0
        slider.max = 255
    }
    document.getElementById(id).classList.add("selected");
}

function selectSelectionTab(tabID) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("selection_tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("selection_tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabID).style.display = "block";
    document.getElementById(tabID + "_btn").className += " active";
}


function selectParameterTab(tabID) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("parameter_tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("parameter_tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabID).style.display = "block";
    document.getElementById(tabID + "_btn").className += " active";
}