function initialize() {
    const wiese = document.querySelector('.hummel_wiese');

    createSegment(wiese, 400, 100, 0);
    createSegment(wiese, 470, 170, 45);
    createSegment(wiese,470, 270, 90);
    createSegment(wiese, 400, 340,135);
    createSegment(wiese,300, 340, 180);
    createSegment(wiese,230, 270, 225);
    createSegment(wiese,230, 170, 270);
    createSegment(wiese,300, 100, 315);

    createSlider(wiese, 395,50, 40, 550)
}

function createSegment(parentElement, x, y, deg) {
    flowerID = "flower_seg_" + deg
    const segEl = document.createElement("img");
    segEl.setAttribute('class', flowerID)
    segEl.setAttribute('src', "assets/img/segment-select-unpressed.gif")
    segEl.style.transform = "rotate(" + deg + "deg)"
    parentElement.appendChild(segEl);

    const style = document.createElement("style");
    style.innerHTML = "\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + flowerID + "{\n"
    style.innerHTML += "    left:" + x + "px;\n"
    style.innerHTML += "    top:" + y + "px;\n"
    style.innerHTML += "    position:absolute;\n"
//    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "}\n"

    document.head.appendChild(style);

}

function createSlider(parentElement,x,y,xSize,ySize){
    sliderID = "slider"
    const sliderFrameEl = document.createElement("div");
    sliderFrameEl.setAttribute('class', sliderID)
    sliderFrameEl.style.transform = "rotate(0deg)"
    parentElement.appendChild(sliderFrameEl);

    const sliderKnobEl = document.createElement("img");
    sliderKnobEl.setAttribute('class', sliderID+"_knob")
    sliderKnobEl.setAttribute('src', "assets/img/hummel.gif")
    sliderKnobEl.style.transform = "rotate(0deg)"
    sliderFrameEl.appendChild(sliderKnobEl);

    const style = document.createElement("style");
    style.innerHTML = "\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + sliderID + "{\n"
    style.innerHTML += "    left:" + x + "px;\n"
    style.innerHTML += "    top:" + y + "px;\n"
    style.innerHTML += "    width:" + xSize + "px;\n"
    style.innerHTML += "    height:" + ySize + "px;\n"
    style.innerHTML += "    position:absolute;\n"
    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "}\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + sliderID + "_knob{\n"
    style.innerHTML += "    left:" + 0 + "px;\n"
    style.innerHTML += "    top:" + 0 + "px;\n"
    style.innerHTML += "    position:relative;\n"
//    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "}\n"

    document.head.appendChild(style);

    sliderKnobEl.addEventListener('mousedown', mouseDownCallback);
}

currentDeg = 0;
startY = 0;

function mouseDownCallback (e) {
    e.preventDefault();

    // get the starting position of the cursor
    startY = e.clientY;

    document.addEventListener('mousemove', moveCallback);

    mouseUpCallback = function () {
        document.removeEventListener('mousemove', moveCallback);
        document.removeEventListener('mouseup', mouseUpCallback);
    }
    document.addEventListener('mouseup', mouseUpCallback);
}

function moveCallback(e) {
    const slider = document.querySelector('.slider');

    // calculate the new position
    newMod = (startY - e.clientY) / 100;
    currentDeg += newMod;
    if (currentDeg < 1) {
        currentDeg = 1;
        startY = e.clientY
    }
    if (currentDeg > 360) {
        currentDeg = 360;
        startY = e.clientY
    }

    slider.style.transform = "rotate(" + currentDeg + "deg)"
}