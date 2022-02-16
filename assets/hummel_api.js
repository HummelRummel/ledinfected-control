const assetImgBaseDir = "/assets/img/abstracts/"

// the base class that holds all the info
class OverviewView {
    constructor(parent) {
        this.parent = parent;

        this.view = document.createElement("div");
        this.view.classList.add("overviewView");
        this.parent.appendChild(this.view);

        this.abstracts = [];
    }

    async initialize() {
        this.controls = new AbstractControls(this.view);

        this.connection = new APIConnection();
        const config = await this.connection.get("");
        for (let i = 0; i < config.abstracts.length; i++) {
            this.abstracts.push(new Abstract(this.view, config.abstracts[i]));
        }
    }
}

// instance of the base class
overview = new OverviewView(document.body)

function globalSyncAbstracts() {
    // MOA fix needs a refactoring
    let cmd = new Object();
    cmd.arduinos = [];
    for (let i = 0; i < overview.abstracts.length; i++) {
        for (let j = 0; j < overview.abstracts[i].config.stripes.length; j++) {
            console.log(overview.abstracts[i].config.stripes[j]);
            for (let k = 0; k < overview.abstracts[i].config.stripes[j].setup.arduino_stripes.length; k++) {
                let stripeArduinoID = overview.abstracts[i].config.stripes[j].setup.arduino_stripes[k].arduino_id;
                let found = false;
                for (let l = 0; l < cmd.arduinos.length; l++) {
                    if (cmd.arduinos[l].arduino_id == stripeArduinoID) {
                        found = true;
                        let newStripeSync = new Object();
                        newStripeSync.stripe_id = overview.abstracts[i].config.stripes[j].setup.arduino_stripes[k].arduino_stripe_id;
                        newStripeSync.sync = overview.abstracts[i].config.stripes[j].setup.arduino_stripes[k].sync;
                        cmd.arduinos[l].stripes.push(newStripeSync);
                    }
                }
                if (!found) {
                    let newArduinoSync = new Object();
                    newArduinoSync.arduino_id = stripeArduinoID;
                    newArduinoSync.stripes = [];
                    let newStripeSync = new Object();
                    newStripeSync.stripe_id = overview.abstracts[i].config.stripes[j].setup.arduino_stripes[k].arduino_stripe_id;
                    newStripeSync.sync = overview.abstracts[i].config.stripes[j].setup.arduino_stripes[k].sync;
                    newArduinoSync.stripes.push(newStripeSync);
                    cmd.arduinos.push(newArduinoSync);
                }
            }
        }
    }
    console.log(cmd);
}

// initialization of the UI
async function initializeUI() {
    // create global styles
    const style = document.createElement("style");
    style.innerHTML += "\n"
    // add
    style.innerHTML += "@keyframes animation_wind {\n";
    for (let n = 0; n < 11; ++n) {
        style.innerHTML += randomTranslate(n * 10, 0, 40);
    }
    style.innerHTML += "}\n";
    document.head.appendChild(style);

    overview.initialize();
}

class Abstract {
    constructor(htmlParent, config) {
        this.config = config;
        this.id = config.abstract_id;
        this.htmlParent = htmlParent;

        this.overviewObject = new AbstractOverviewObject(this, config);
        this.stripeView = new AbstractStripeViewObject(this, config);
    }
}

class AbstractOverviewObject {
    constructor(parent, config) {
        this.parent = parent
        this.htmlEl = new HTMLAbstractOverviewObject(parent.htmlParent, config)
    }
}

class HTMLAbstractOverviewObject {
    constructor(htmlParent, config) {
        this.htmlParent = htmlParent;

        // static part
        this.abstractOverviewEl = document.createElement("div");
        this.abstractOverviewEl.classList.add('abstractBase', 'tooltip', config.abstract_id)
        this.abstractOverviewEl.setAttribute('onclick', "overview.controls.showAbstract('" + config.abstract_id + "');");
        this.abstractOverviewEl.style.width = (config.info.image.overview.dimension.width + 40) + "px";
        this.abstractOverviewEl.style.height = (config.info.image.overview.dimension.height + 40) + "px";
        this.abstractOverviewEl.style.left = config.setup.position.x + "px";
        this.abstractOverviewEl.style.top = config.setup.position.y + "px";
        this.abstractOverviewEl.style.position = "absolute";
        this.abstractOverviewEl.style.zIndex = 2;
        const span = document.createElement("span");
        span.classList.add("tooltiptext");
        span.innerHTML = config.info.name;
        this.abstractOverviewEl.appendChild(span);
        this.htmlParent.appendChild(this.abstractOverviewEl);

        // moving part
        this.abstractOverviewBodyEl = document.createElement("img");
        console.log(config.info);
        this.abstractOverviewBodyEl.setAttribute('src', config.info.image.image_base_path + "/overview.png");
        // Image map currently disabled, probably also not needed for the overview
        //  this.abstractOverviewBodyEl.setAttribute('usemap', "#imgmap-flower");
        this.abstractOverviewBodyEl.style.width = config.info.image.overview.dimension.width + "px";
        this.abstractOverviewBodyEl.style.height = config.info.image.overview.dimension.height + "px";
        this.abstractOverviewBodyEl.style.left = "10px";
        this.abstractOverviewBodyEl.style.top = "10px";
        this.abstractOverviewBodyEl.style.animationName = "animation_wind";
        this.abstractOverviewBodyEl.style.animationDuration = "20s";
        this.abstractOverviewBodyEl.style.animationIterationCount = "infinite";
        this.abstractOverviewBodyEl.style.animationDirection = "alternate";
        this.abstractOverviewBodyEl.style.animationTimingFunction = "ease-in-out";
        this.abstractOverviewEl.appendChild(this.abstractOverviewBodyEl);
    }
}

function toggleAllSelectedStripes() {
    let noneSelected = true;
    for (let i = 0; i < overview.abstracts[0].stripeView.stripes.length; i++) {
        if (overview.abstracts[0].config.stripes[i].config != null) {
            if (overview.abstracts[0].stripeView.stripes[i].selected == true) {
                noneSelected = false;
            }
        }
    }
    if (noneSelected == true) {
        for (let i = 0; i < overview.abstracts[0].stripeView.stripes.length; i++) {
            overview.abstracts[0].stripeView.stripes[i].selected = true;
        }
    } else {
        for (let i = 0; i < overview.abstracts[0].stripeView.stripes.length; i++) {
            overview.abstracts[0].stripeView.stripes[i].selected = false;
        }
    }
    overview.abstracts[0].stripeView.updateBackground();
}

function togglePatternSelect(id) {
    let section = id.substring(0, 1);
    let segment = parseInt(id.substring(2, 4)) - 1;

    let fields = overview.controls.controls[0].selectionView.patternSelect.fields
    if (section == "0") {
        overview.controls.controls[0].selectionView.patternSelect.fields[segment].active = !fields[segment].active;
    } else if (section == "1") {
        if (fields[segment * 2].active || fields[segment * 2 + 1].active) {
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 2].active = false;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 2 + 1].active = false;
        } else {
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 2].active = true;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 2 + 1].active = true;
        }
    } else if (section == "2") {
        if (fields[segment * 4].active || fields[segment * 4 + 1].active || fields[segment * 4 + 2].active || fields[segment * 4 + 3].active) {
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4].active = false;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 1].active = false;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 2].active = false;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 3].active = false;
        } else {
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4].active = true;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 1].active = true;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 2].active = true;
            overview.controls.controls[0].selectionView.patternSelect.fields[segment * 4 + 3].active = true;
        }
    } else {
        oneActive = false;
        for (let i = 0; i < 16; i++) {
            if (fields[i].active) {
                oneActive = true;
            }
        }
        for (let i = 0; i < 16; i++) {
            overview.controls.controls[0].selectionView.patternSelect.fields[i].active = !oneActive;
        }
    }

    overview.controls.controls[0].selectionView.patternSelect.updateImage();
}

function toggleSelectedStripeOld(stripe_id) {
    for (let i = 0; i < overview.abstracts[0].stripeView.stripes.length; i++) {
        if (overview.abstracts[0].config.stripes[i].config != null) {
            if (overview.abstracts[0].stripeView.stripes[i].stripe_id == stripe_id) {
                if (overview.abstracts[0].stripeView.stripes[i].selected == true) {
                    overview.abstracts[0].stripeView.stripes[i].selected = false;
                } else {
                    overview.abstracts[0].stripeView.stripes[i].selected = true;
                }
                //    overview.abstracts[0].stripeView.stripes[i].selected != overview.abstracts[0].stripeView.stripes[i].selected;
                overview.abstracts[0].stripeView.updateBackground();
                return;
            }
        }
    }
}

function toggleSelectedStripe(abstract_id, stripe_id) {
    console.log("toggleSelectedStripe");
    console.log(overview.abstracts)
    for (let i = 0; i < overview.abstracts.length; i++) {
        if (overview.abstracts[i].id == abstract_id) {
            if (stripe_id == "all") {
                let sel = false;
                for (let j = 0; j < overview.abstracts[i].stripeView.stripes.length; j++) {
                    if (overview.abstracts[i].stripeView.stripes[j].selected == true) {
                        sel = true;
                    }
                }
                for (let j = 0; j < overview.abstracts[i].stripeView.stripes.length; j++) {
                    overview.abstracts[i].stripeView.stripes[j].selected = !sel;
                }
                overview.abstracts[i].stripeView.updateBackground();
                return;
            }
            console.log(overview.abstracts[i].stripeView.stripes.length)
            for (let j = 0; j < overview.abstracts[i].stripeView.stripes.length; j++) {
                if (overview.abstracts[i].stripeView.stripes[j].stripe_id == stripe_id) {
                    overview.abstracts[i].stripeView.stripes[j].selected = !overview.abstracts[i].stripeView.stripes[j].selected;
                    overview.abstracts[i].stripeView.updateBackground();
                    return
                }
            }
            return
        }
    }
}

class AbstractStripeViewObject {
    constructor(parent, config) {
        this.parent = parent;
        this.stripes = [];
        for (let i = 0; i < config.stripes.length; i++) {
            let stripe = new Object();
            stripe.stripe_id = config.stripes[i].stripe_id;
            stripe.selected = true;
            this.stripes.push(stripe);
        }
        this.parent = parent
        this.htmlObject = new HTMLAbstractStripeViewObject(this, this.stripes, config)
        this.updateBackground();
    }

    getSelectedStripes() {
        let stripe_ids = [];
        for (let i = 0; i < this.stripes.length; i++) {
            if (this.stripes[i].selected == true) {
                stripe_ids.push(this.stripes[i].stripe_id);
            }
        }
        return stripe_ids;
    }

    updateBackground() {
        let image_base_path = this.parent.config.info.image.image_base_path;

        let backgroundString = "";
        let noneSelected = true;
        for (let i = 0; i < this.stripes.length; i++) {
            if (this.parent.config.stripes[i].config != null) {
                if (this.stripes[i].selected == true) {
                    noneSelected = false;
                    if (backgroundString != "") {
                        backgroundString += ", ";
                    }
                    backgroundString += "url(" + image_base_path + "/" + this.stripes[i].stripe_id + "-selected.png)";
                } else {
                    if (backgroundString != "") {
                        backgroundString += ", ";
                    }
                    backgroundString += "url(" + image_base_path + "/" + this.stripes[i].stripe_id + "-notselected.png)";
                }
            }
        }

        if (noneSelected == true) {
            if (backgroundString != "") {
                backgroundString += ", ";
            }
            backgroundString += "url(" + image_base_path + "/selected-all.png)";
        } else {
            if (backgroundString != "") {
                backgroundString += ", ";
            }
            backgroundString += "url(" + image_base_path + "/notselected-all.png)";
        }
        if (backgroundString != "") {
            backgroundString += ", ";
        }
        backgroundString += "url(" + image_base_path + "/background.png)"
        console.log(backgroundString);
        this.htmlObject.imageEl.style.backgroundImage = backgroundString
    }

    getHTMLElement() {
        return this.htmlObject.baseEl;
    }
}

class HTMLAbstractStripeViewObject {
    constructor(parent, stripes, config) {
        let imgMapName = config.abstract_id + "-map";
        this.imgMap = document.createElement("map");
        this.imgMap.setAttribute('name', imgMapName);
        for (let i = 0; i < config.info.image.stripe_view.img_map.length; i++) {
            var area = document.createElement("area");
            area.setAttribute('target', "_blank");
            area.setAttribute('shape', "poly");
            area.setAttribute('alt', config.info.image.stripe_view.img_map[i].stripe_id);
            area.setAttribute('title', config.info.image.stripe_view.img_map[i].stripe_id);
            area.setAttribute('coords', config.info.image.stripe_view.img_map[i].area);
            area.setAttribute('onclick', "toggleSelectedStripe('" + config.abstract_id + "','" + config.info.image.stripe_view.img_map[i].stripe_id + "');");
            this.imgMap.appendChild(area);
        }
        document.body.appendChild(this.imgMap);

        this.baseEl = document.createElement("div");
        this.baseEl.style.width = "100%";
        this.baseEl.style.height = "100%";
        this.imageEl = document.createElement("img");
        this.imageEl.setAttribute('src', config.info.image.image_base_path + "/empty.png");
        this.imageEl.useMap = "#" + imgMapName;
        this.imageEl.style.maxHeight = "100%";
        this.imageEl.style.maxWidth = "100%";
        this.imageEl.style.backgroundSize = "contain";

        this.baseEl.appendChild(this.imageEl);
        // make the image map dynamic
    }
}

class AbstractControls {
    constructor(htmlParent) {
        this.htmlParent = htmlParent;

        this.view = document.createElement("div");
        this.view.classList.add("abstractControlsView");
        this.htmlParent.appendChild(this.view);

        this.controls = [];
        this.controls.push(new AbstractControlView(this.view, "0px"));
        //this.controls.push(new AbstractControlView(this.view, "480px"));
    }

    async showAbstract(abstractID) {
        let openInNewTab = false;
        let i = 0;

        for (i = 0; i < overview.abstracts.length; i++) {
            if (overview.abstracts[i].id == abstractID) {
                break;
            }
        }
        if (overview.abstracts[i].id != abstractID) {
            console.log("abstract not found: " + abstractID);
            return;
        }

        if (openInNewTab == true) {
            console.log("abstract open in new tab TBD")
        } else {
            overview.abstracts[i].config = await overview.connection.get("/abstract/" + abstractID);
            this.controls[0].showAbstract(overview.abstracts[i]);
            overview.abstracts[i].stripeView.updateBackground();
        }
    }

    hide(abstractID) {
        for (let i = 0; i < this.controls.length; i++) {
            if (this.controls[i].linkedAbstract != null) {
                if (this.controls[i].linkedAbstract.id == abstractID) {
                    this.controls[i].hide();
                }
            }
        }
    }
}

class AbstractControlView {
    constructor(htmlParent, offset) {
        this.htmlParent = htmlParent;
        let htmlTemplate = document.getElementById("control_view_template");
        this.htmlView = htmlTemplate.cloneNode(true);
        this.htmlView.id = "";
        this.htmlView.classList.add("controlView")
        this.htmlView.style.left = offset;
        this.htmlView.style.display = "none";

        this.selectionView = new AbstractControlSelectionView(this)
        this.parameterView = new AbstractControlParameterView(this)

        this.htmlParent.appendChild(this.htmlView);
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;
        this.htmlView.id = "ctrlview_" + this.linkedAbstract.id;
        console.log(this.htmlView.getElementsByClassName("close_btn"));
        console.log("overview.controls.hide('" + this.linkedAbstract.id + "')");
        this.htmlView.getElementsByClassName("close_btn")[0].setAttribute('onclick', "overview.controls.hide('" + this.linkedAbstract.id + "');");
        this.htmlView.getElementsByClassName("closeBtn")[0].setAttribute('onclick', "overview.controls.hide('" + this.linkedAbstract.id + "');");
        // this.htmlView.getElementsByClassName("selection_stripes_btn")[0].setAttribute('onclick', "selectSelectionTab('" + this.linkedAbstract.id + "', 'selection_stripes');");
        // this.htmlView.getElementsByClassName("selection_pattern_btn")[0].setAttribute('onclick', "selectSelectionTab('" + this.linkedAbstract.id + "', 'selection_pattern');");
        // this.htmlView.getElementsByClassName("parameter_ctrl_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_ctrl');");
        // this.htmlView.getElementsByClassName("parameter_presets_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_presets');");
        // this.htmlView.getElementsByClassName("parameter_admin_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_admin');");
        this.htmlView.style.animation = "fadeInEffect 1s";
        this.htmlView.style.display = "block";
        this.selectionView.showAbstract(abstract);
        this.parameterView.showAbstract(abstract);
    }

    hide() {
        this.htmlView.style.animation = "fadeOutEffect 1s";
        //this.htmlView.style.display = "block";
        let style = this.htmlView.style
        let localThis = this;

        setTimeout(function () {
            style.display = "none";

            let stripesSelectAbstract = localThis.htmlView.getElementsByClassName('selection_stripes')[0];
            stripesSelectAbstract.removeChild(localThis.linkedAbstract.stripeView.getHTMLElement())

            localThis.linkedAbstract = null;
            localThis.config = null;
            localThis.htmlView.id = "";

        }, 900);
    }
}

function selectSelectionTab(abstractID, tabID) {
    for (let i = 0; i < overview.controls.controls.length; i++) {
        if (overview.controls.controls[i].linkedAbstract != null) {
            if (overview.controls.controls[i].linkedAbstract.id == abstractID) {
                overview.controls.controls[i].selectionView.selectSelectionTab(tabID);
            }
        }
    }
}

function selectParameterTab(abstractID, tabID) {
    for (let i = 0; i < overview.controls.controls.length; i++) {
        if (overview.controls.controls[i].linkedAbstract != null) {
            if (overview.controls.controls[i].linkedAbstract.id == abstractID) {
                overview.controls.controls[i].selectionView.selectParameterTab(tabID);
            }
        }
    }
}

function toggleSelectedElement(abstractID, elementID) {
    for (let i = 0; i < overview.controls.controls.length; i++) {
        if (overview.controls.controls[i].linkedAbstract != null) {
            if (overview.controls.controls[i].linkedAbstract.id == abstractID) {
                overview.controls.controls[i].htmlView.getElementsByClassName(elementID)[0].classList.toggle("selected");
            }
        }
    }
}

function selectParameterCtrlElement(abstractID, elementID) {
    for (let i = 0; i < overview.controls.controls.length; i++) {
        if (overview.controls.controls[i].linkedAbstract != null) {
            if (overview.controls.controls[i].linkedAbstract.id == abstractID) {
                overview.controls.controls[i].parameterView.selectParameterCtrlElement(elementID)
            }
        }
    }
}

function updateParameter(abstractID) {
    for (let i = 0; i < overview.controls.controls.length; i++) {
        if (overview.controls.controls[i].linkedAbstract != null) {
            if (overview.controls.controls[i].linkedAbstract.id == abstractID) {
                overview.controls.controls[i].parameterView.updateParameter();
            }
        }
    }
}

class AbstractControlSelectionView {
    constructor(parent) {
        this.parent = parent;
        this.htmlNode = this.parent.htmlView;

        this.patternSelect = new AbstractControlPatternSelectionView(this.parent)
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        let stripesSelectAbstract = this.htmlNode.getElementsByClassName('selection_stripes')[0];
        let stripeHtml = this.linkedAbstract.stripeView.getHTMLElement()
        console.log(this.linkedAbstract);
        if (this.linkedAbstract.config.stripes.length == 1) {
            stripeHtml.style.display = "none";
        }
        stripesSelectAbstract.appendChild(stripeHtml);

        let ledPatternFields = this.htmlNode.getElementsByClassName('pattern_select_field');
        for (let i = 0; i < ledPatternFields.length; i++) {
            for (let j = 0; j < ledPatternFields[i].classList.length; j++) {
                if ((ledPatternFields[i].classList[j] != 'round_button') && (ledPatternFields[i].classList[j] != 'pattern_select_field') && (ledPatternFields[i].classList[j] != 'selected')) {
                    ledPatternFields[i].setAttribute('onclick', "toggleSelectedElement('" + this.linkedAbstract.id + "', '" + ledPatternFields[i].classList[j] + "');");
                }
            }
        }
        this.selectSelectionTab("selection_stripes");
        this.selectParameterTab("parameter_ctrl");
    }

    selectSelectionTab(tabID) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = this.htmlNode.getElementsByClassName("selection_tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        this.htmlNode.getElementsByClassName("selection_stripes")[0].style.display = "block";

        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = this.htmlNode.getElementsByClassName("selection_tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        // Show the current tab, and add an "active" class to the button that opened the tab
        this.htmlNode.getElementsByClassName(tabID)[0].style.display = "block";
        this.htmlNode.getElementsByClassName(tabID + "_btn")[0].className += " active";
        // this is needed to update the dynamic image map
        if (tabID == "selection_stripes") {
            //  $(window).trigger('resize');
        }
        if (tabID == "selection_pattern") {
            //  $(window).trigger('resize');
        }
    }

    selectParameterTab(tabID) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = this.htmlNode.getElementsByClassName("parameter_tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = this.htmlNode.getElementsByClassName("parameter_tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        // Show the current tab, and add an "active" class to the button that opened the tab
        this.htmlNode.getElementsByClassName(tabID)[0].style.display = "block";
        this.htmlNode.getElementsByClassName(tabID + "_btn")[0].className += " active";
    }

    // getSelectedStripes() {
    //
    //     let selectedStripes = [];
    //     this.patternSelect.fields[i]
    //     for (let i = 0; i < ledSelectFields.length; i++) {
    //         this.patternSelect.fields[i].active
    //         if (ledSelectFields[i].classList.contains('selected')) {
    //             selectedStripes.push(i);
    //         }
    //     }
    //     return selectedStripes;
    // }


    getSelectedPatternIndices() {
        let patternIndecies = [];

        this.patternSelect.images.segments_l0

        for (let i = 0; i < 16; i++) {
            if (this.patternSelect.images.segments_l0[i].state) {
                patternIndecies.push(i);
            }
        }
        return patternIndecies;
    }
}

class HSBColor {
    constructor(h, s, b) {
        this.hue = h;
        this.saturation = s;
        this.brightness = b;
    }

    getStyleColor() {
        let h = this.hue;
        if (h > 255) {
            h = 255;
        }
        let s = this.saturation;
        if (s > 255) {
            s = 255;
        }
        let b = this.brightness;
        if (b > 255) {
            b = 255;
        }
        return hsvToRgb(h, s, b);
    }
}

class AbstractControlPatternSegment {
    constructor(parent, id) {
        this.parent = parent;
        this.id = id;
        this.active = false;
    }

    appendImage() {
        this.active = this.parent.appendPicture("active_" + this.id);
        this.active.style.pointerEvents = "none";
        //this.active.addEventListener("click", this.toggleState, false);
        this.inactive = this.parent.appendPicture("inactive_" + this.id);
        this.inactive.style.pointerEvents = "none";
        //this.inactive.addEventListener("click", this.toggleState, false);
    }

    appendColor(h, s, b) {
        this.color = new HSBColor(h, s, b);
    }

    appendState(s) {
        this.state = s;
    }

    updateColor() {
        if (this.color != null) {
//            this.area.style.setProperty("fill", this.color.getStyleColor());
            this.area.style.fill = this.color.getStyleColor();
//            this.area.setAttribute("style", "fill:" + this.color.getStyleColor());
        }
    }

    setColorH(h) {
        this.color.hue = h;
        this.updateColor();
    }

    setColorS(s) {
        this.color.saturation = s;
        this.updateColor();
    }

    setColorB(b) {
        this.color.brightness = b;
        this.updateColor();
    }

    appendArea(area) {
        let points = "";
        let areas = area.split(",");
        for (let i = 0; i < areas.length / 2; i++) {
            if (points != "") {
                points += " ";
            }
            points += areas[i * 2] + "," + areas[(i * 2) + 1];
        }
        this.area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        this.area.setAttribute('points', points);
        this.area.style.pointerEvents = "all";
        let localThis = this;
        this.area.addEventListener("click", function () {
            localThis.toggleState()
        });
        this.parent.svgEl.appendChild(this.area);
        return this.area;
    }

    toggleState(e) {
        console.log("click toggle")
        let section = this.id.substring(0, 1);
        let segment = parseInt(this.id.substring(2, 4)) - 1;

        if (section === "0") {
            this.state = !this.state;
        } else if (section === "1") {
            if (this.parent.images.segments_l0[segment * 2].state || this.parent.images.segments_l0[segment * 2 + 1].state) {
                this.parent.images.segments_l0[segment * 2].state = false;
                this.parent.images.segments_l0[segment * 2 + 1].state = false;
            } else {
                this.parent.images.segments_l0[segment * 2].state = true;
                this.parent.images.segments_l0[segment * 2 + 1].state = true;
            }
        } else if (section === "2") {
            if (this.parent.images.segments_l0[segment * 4].state || this.parent.images.segments_l0[segment * 4 + 1].state || this.parent.images.segments_l0[segment * 4 + 2].state || this.parent.images.segments_l0[segment * 4 + 3].state) {
                this.parent.images.segments_l0[segment * 4].state = false;
                this.parent.images.segments_l0[segment * 4 + 1].state = false;
                this.parent.images.segments_l0[segment * 4 + 2].state = false;
                this.parent.images.segments_l0[segment * 4 + 3].state = false;
            } else {
                this.parent.images.segments_l0[segment * 4].state = true;
                this.parent.images.segments_l0[segment * 4 + 1].state = true;
                this.parent.images.segments_l0[segment * 4 + 2].state = true;
                this.parent.images.segments_l0[segment * 4 + 3].state = true;
            }
        } else {
            let oneActive = false;
            for (let i = 0; i < 16; i++) {
                if (this.parent.images.segments_l0[i].state) {
                    oneActive = true;
                }
            }
            for (let i = 0; i < 16; i++) {
                this.parent.images.segments_l0[i].state = !oneActive;
            }
        }
        this.parent.updateImage()
    }

    setVisibility(s) {
        if (s == true) {
            this.active.setAttribute("visibility", "visible");
            this.inactive.setAttribute("visibility", "hidden");
        } else {
            this.active.setAttribute("visibility", "hidden");
            this.inactive.setAttribute("visibility", "visible");
        }
    }

    updateVisibility() {
        let section = this.id.substring(0, 1);
        let segment = parseInt(this.id.substring(2, 4)) - 1;

        if (section == "0") {
            this.setVisibility(this.state);
        } else if (section == "1") {
            if (this.parent.images.segments_l0[segment * 2].state || this.parent.images.segments_l0[segment * 2 + 1].state) {
                this.setVisibility(false);
            } else {
                this.setVisibility(true);
            }
        } else if (section == "2") {
            if (this.parent.images.segments_l0[segment * 4].state || this.parent.images.segments_l0[segment * 4 + 1].state || this.parent.images.segments_l0[segment * 4 + 2].state || this.parent.images.segments_l0[segment * 4 + 3].state) {
                this.setVisibility(false);
            } else {
                this.setVisibility(true);
            }
        } else {
            let oneActive = false;
            console.log(this.parent.images.segments_l0);
            for (let i = 0; i < 16; i++) {
                if (this.parent.images.segments_l0[i].state) {
                    oneActive = true;
                }
            }
            this.setVisibility(!oneActive);
        }
    }
}

class AbstractControlPatternSelectionView {
    constructor(parent) {
        let localThis = this;
        this.parent = parent;
        this.image_base_path = "/assets/img/pattern";
        this.image_map = new PatternMap();
        console.log(this.image_map);
        this.svgEl = this.parent.htmlView.getElementsByClassName('pattern_canvas')[0];
        this.svgMinEl = this.parent.htmlView.getElementsByClassName('pattern_canvas_minimized')[0];
        this.svgMinEl.style.display = "none";
        this.toggleSvgEl = this.parent.htmlView.getElementsByClassName('toggle_pattern_canvas_btn')[0];
        this.toggleSvgEl.addEventListener('click', function () {
            if (localThis.svgEl.style.display !== "none") {
                localThis.svgEl.style.display = "none";
                localThis.svgMinEl.style.display = "block";
            } else {
                localThis.svgMinEl.style.display = "none";
                localThis.svgEl.style.display = "block";
            }
        })
        this.images = new Object();
        this.images.segments_l0 = [];
        this.images.segments_l1 = [];
        this.images.segments_l2 = [];
        // first add the segment objects and the segment area
        for (let i = 0; i < 16; i++) {
            let id = "0_" + (i + 1).toString().padStart(2, '0');
            console.log(id);
            let segment = new AbstractControlPatternSegment(this, id);
            segment.appendArea(this.getArea(id));
            segment.appendColor(255, 255, 255);
            segment.appendState(true);
            this.images.segments_l0.push(segment);
        }

        for (let i = 0; i < 8; i++) {
            let id = "1_" + (i + 1).toString().padStart(2, '0');
            let segment = new AbstractControlPatternSegment(this, id);
            segment.appendArea(this.getArea(id));
            this.images.segments_l1.push(segment);
        }

        for (let i = 0; i < 4; i++) {
            let id = "2_" + (i + 1).toString().padStart(2, '0');
            let segment = new AbstractControlPatternSegment(this, id);
            segment.appendArea(this.getArea(id));
            this.images.segments_l2.push(segment);
        }

        this.images.segment_l3 = new AbstractControlPatternSegment(this, "3_01");
        this.images.segment_l3.appendArea(this.getArea("3_01"));


        // now add the background image
        this.images.background = this.appendPicture("background");
        this.images.background.style.pointerEvents = "none";

        // and finally add the segment pictures
        for (let i = 0; i < this.images.segments_l0.length; i++) {
            this.images.segments_l0[i].appendImage()
            //this.images.segments_l0[i].appendArea(this.getArea(this.images.segments_l0[i].id));
        }
        for (let i = 0; i < this.images.segments_l1.length; i++) {
            this.images.segments_l1[i].appendImage()
        }
        for (let i = 0; i < this.images.segments_l2.length; i++) {
            this.images.segments_l2[i].appendImage()
        }

        this.images.segment_l3.appendImage()

        this.updateImage();
    }

    appendPicture(name) {
        let newImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
        //newImage.classList.add(name)
        newImage.setAttribute('href', this.image_base_path + "/" + name + ".png");
        this.svgEl.appendChild(newImage);
        return newImage
    }

    getArea(id) {
        for (let i = 0; i < this.image_map.map.length; i++) {
            if (this.image_map.map[i].id == id) {
                return this.image_map.map[i].area;
            }
        }
    }

    updateImage() {
        // and finally add the segment pictures
        for (let i = 0; i < this.images.segments_l0.length; i++) {
            this.images.segments_l0[i].updateColor();
            this.images.segments_l0[i].updateVisibility();
        }
        for (let i = 0; i < this.images.segments_l1.length; i++) {
            this.images.segments_l1[i].updateVisibility();
        }
        for (let i = 0; i < this.images.segments_l2.length; i++) {
            this.images.segments_l2[i].updateVisibility();
        }

        this.images.segment_l3.updateVisibility();
    }

}

class Preset {
    constructor(name, config, palette) {
        let localThis = this;
        this.name = name;
        this.config = config;
        this.palette = palette;

        this.selectButton = document.createElement('button');
        this.selectButton.addEventListener('input', function () {
            localThis.loadPreset();
        });
    }

    loadPreset() {

    }

    getSelectButton() {
        return this.selectButton;
    }
}

class PresetSelect {
    constructor(parent) {
        this.parent = parent;

        this.viewPort = document.createElement('div');
        // MOA fixme setup the viewports dimension and hide it
        this.parent.appendChild(this.viewPort);
    }

    loadPreset() {

    }

    async showPresetSelect() {
        this.presets = await this.connection.get("/presets");

        for (let i = 0; i < this.presets.length; i++) {
            let presetButton = document.createElement('button');
            this.patternHue.addEventListener('input', function () {
                localThis.inputHue();
                localThis.changeHue();
            });
            this.presets[i].Name;
        }
    }

    async hidePresetSelect() {

    }
}


class AbstractControlParameterView {
    constructor(parent) {
        this.parent = parent;
        this.htmlNode = this.parent.htmlView;
        let localThis = this;
        this.patternHue = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_pattern_hue")[0];
        this.patternHue.addEventListener('input', function () {
            localThis.inputHue();
            localThis.changeHue();
        });
        this.patternSaturation = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_pattern_saturation")[0];
        this.patternSaturation.addEventListener('input', function () {
            localThis.inputSaturation();
            localThis.changeSaturation();
        });
        this.patternBrightness = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_pattern_brightness")[0];
        this.patternBrightness.addEventListener('input', function () {
            localThis.inputBrightness();
            localThis.changeBrightness();
        });
        this.stripeBrightness = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_stripe_brightness")[0];
        this.stripeBrightness.addEventListener('input', function () {
            localThis.inputStripeBrightness();
        });
        this.stripeOverlayDiv = this.htmlNode.getElementsByClassName("parameter_ctrl_stripe_overlay_div")[0];
        this.stripeOverlay = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_stripe_overlay")[0];
        this.stripeOverlay.addEventListener('input', function () {
            localThis.inputStripeOverlay();
        });
        this.stripeSpeed = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_stripe_speed")[0];
        this.stripeSpeed.addEventListener('input', function () {
            localThis.inputStripeSpeed();
        });
        this.stripeStretch = this.htmlNode.getElementsByClassName("parameter_ctrl_slider_stripe_stretch")[0];
        this.stripeStretch.addEventListener('input', function () {
            localThis.inputStripeStretch();
        });
        this.loadPresetBtn = this.htmlNode.getElementsByClassName("load_preset_btn")[0];
        this.loadPresetBtn.addEventListener('click', function () {
            localThis.loadPreset();
        });
        this.savePresetBtn = this.htmlNode.getElementsByClassName("save_preset_btn")[0];
        this.savePresetBtn.addEventListener('click', function () {
            localThis.savePreset();
        });
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        this.setCurrentConfig();

        let parameterSelectFields = this.htmlNode.getElementsByClassName('parameter_ctrl_select');
        for (let i = 0; i < parameterSelectFields.length; i++) {
            for (let j = 0; j < parameterSelectFields[i].classList.length; j++) {
                // MOA fixme change it to event handler in the constructor
                if ((parameterSelectFields[i].classList[j] != 'round_button') && (parameterSelectFields[i].classList[j] != 'parameter_ctrl_select') && (parameterSelectFields[i].classList[j] != 'selected')) {
                    parameterSelectFields[i].setAttribute('onclick', "selectParameterCtrlElement('" + this.linkedAbstract.id + "', '" + parameterSelectFields[i].classList[j] + "');");
                }
            }
        }
    }

    loadPreset() {
        // MOA fixme TBD
    }

    savePreset() {
        // MOA fixme TBD
    }

    inputHue() {
        this.updateParameterH(this.patternHue);
    }

    changeHue() {
        this.sendPattern();
    }

    inputSaturation() {
        this.updateParameterS(this.patternSaturation);
    }

    changeSaturation() {
        this.sendPattern();
    }

    inputBrightness() {
        this.updateParameterB(this.patternBrightness);
    }

    changeBrightness() {
        this.sendPattern();
    }

    inputStripeBrightness() {
        this.sendConfig();
    }

    inputStripeOverlay() {
        this.sendConfig();
    }

    inputStripeSpeed() {
        this.sendConfig();
    }

    inputStripeStretch() {
        this.sendConfig();
    }

    setCurrentConfig() {
        this.stripeOverlayDiv.style.display = "none";
        for (let i = 0; i < this.linkedAbstract.config.stripes.length; i++) {
            let config = this.linkedAbstract.config.stripes[i].config;
            if (config != null && config.setup.overlayID > 1 && config.setup.overlayID < 6) {
                this.stripeOverlayDiv.style.display = "block";
            }
        }

        for (let i = 0; i < this.linkedAbstract.config.stripes.length; i++) {
            let config = this.linkedAbstract.config.stripes[i].config;
            // MOA fixme needs also to check if something is selected, but for now keep it simple
            if (config != null) {
                if (config.config.brightness == 255) {
                    config.config.brightness = 256;
                }
                this.stripeBrightness.value = config.config.brightness;
                this.stripeSpeed.value = config.config.movement_speed;
                this.stripeSpeed.value = config.config.movement_speed;
                this.stripeStretch.value = config.config.stretch;
                if (config.config.overlay_ratio == 255) {
                    config.config.overlay_ratio = 256;
                }
                this.stripeOverlay.value = config.config.overlay_ratio;

                this.setCurrentPatternPalette(config.palette.palette);

                return;
            }
        }
    }

    selectParameterCtrlElement(id) {
        // Declare all variables
        let i, tabcontent, tablinks;

        tabcontent = this.htmlNode.getElementsByClassName("parameter_ctrl_select");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].classList.remove("selected");
        }

        let slider = this.htmlNode.getElementsByClassName("parameter_ctrl_slider")[0];
        if (id == "parameter_ctrl_speed") {
            slider.min = -2
            slider.max = 2
        } else {
            slider.min = 0
            slider.max = 255
        }
        this.htmlNode.getElementsByClassName(id)[0].classList.add("selected");
    }

    updateParameterH(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.parent.selectionView.patternSelect.images.segments_l0.length; i++) {
            if (this.parent.selectionView.patternSelect.images.segments_l0[i].state) {
                console.log(this.parent.selectionView.patternSelect.images.segments_l0[i])
                this.parent.selectionView.patternSelect.images.segments_l0[i].setColorH(newValue);
            }
        }
        this.parent.selectionView.patternSelect.updateImage();
    }

    updateParameterS(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.parent.selectionView.patternSelect.images.segments_l0.length; i++) {
            if (this.parent.selectionView.patternSelect.images.segments_l0[i].state) {
                console.log(this.parent.selectionView.patternSelect.images.segments_l0[i])
                this.parent.selectionView.patternSelect.images.segments_l0[i].setColorS(newValue);
            }
        }
        this.parent.selectionView.patternSelect.updateImage();
    }

    updateParameterB(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.parent.selectionView.patternSelect.images.segments_l0.length; i++) {
            if (this.parent.selectionView.patternSelect.images.segments_l0[i].state) {
                console.log(this.parent.selectionView.patternSelect.images.segments_l0[i])
                this.parent.selectionView.patternSelect.images.segments_l0[i].setColorB(newValue);
            }
        }
        this.parent.selectionView.patternSelect.updateImage();
    }

    getConfig() {
        let config = new Object();
        config.movement_speed = this.getCurrentStripeSpeed();
        config.brightness = this.getCurrentStripeBrightness();
        config.stretch = this.getCurrentStripeStretch();
        config.overlay_ratio = this.getCurrentStripeOverlay();
        return config;
    }

    getCurrentStripeSpeed() {
        return parseInt(this.stripeSpeed.value);

    }

    getCurrentStripeBrightness() {
        let brightness = parseInt(this.stripeBrightness.value);
        if (brightness > 255) {
            return 255;
        }
        return brightness;

    }

    getCurrentStripeOverlay() {
        let brightness = parseInt(this.stripeOverlay.value);
        if (brightness > 255) {
            return 255;
        }
        return brightness;

    }

    getCurrentStripeStretch() {
        return parseInt(this.stripeStretch.value);
    }

    getCurrentPatternPalette() {
        let segments = this.parent.selectionView.patternSelect.images.segments_l0;

        let palette = new Object();
        palette.palette = [];
        for (let i = 0; i < 16; i++) {
            let element = new Object();
            element.index = i + 1;
            element.h = segments[i].color.hue;
            ;
            if (element.h > 255) {
                element.h = 255;
            }
            element.s = segments[i].color.saturation;
            if (element.s > 255) {
                element.s = 255;
            }
            element.v = segments[i].color.brightness;
            if (element.v > 255) {
                element.v = 255;
            }
            palette.palette.push(element);
        }
        return palette;
    }

    setCurrentPatternPalette(palette) {
        console.log(palette);
        for (let i = 0; i < 16; i++) {
            let paletteIndex = palette[i].index - 1;
            if (palette[i].h == 255) {
                palette[i].h = 256;
            }
            this.parent.selectionView.patternSelect.images.segments_l0[paletteIndex].color.hue = palette[i].h;
            if (palette[i].s == 255) {
                palette[i].s = 256;
            }
            this.parent.selectionView.patternSelect.images.segments_l0[paletteIndex].color.saturation = palette[i].s;
            if (palette[i].v == 255) {
                palette[i].v = 256;
            }
            this.parent.selectionView.patternSelect.images.segments_l0[paletteIndex].color.brightness = palette[i].v;
            this.parent.selectionView.patternSelect.images.segments_l0[paletteIndex].updateColor();
        }
    }

    sendPattern() {
        let config = this.parent.linkedAbstract.config;

        let selectedStripes = this.parent.linkedAbstract.stripeView.getSelectedStripes();
        let selectedPatternIndicies = this.parent.selectionView.getSelectedPatternIndices();

        console.log(selectedStripes);
        if (selectedStripes.length == 0) {
            // MOA TBD raise a warning
            return;
        }

        let obj = new Object();
        obj.config = new Object();

        obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/palette";
        obj.config.stripe_ids = selectedStripes;
        obj.config.palette = this.getCurrentPatternPalette();
        // for (let i = 0; i < config.stripes.length; i++) {
        //     if (config.stripes[i].stripe_id == selectedStripes[0]) {
        //         if ((config.stripes[i].config == null) || (config.stripes[i].config.palette == null)) {
        //             continue;
        //         }
        //         obj.config.palette = config.stripes[i].config.palette;
        //         break;
        //     }
        // }
        // if (obj.config.palette == null) {
        //     return;
        // }
        // for (let i = 0; i < selectedPatternIndicies.length; i++) {
        //     for (let j = 0; j < obj.config.palette.palette.length; j++) {
        //         if (obj.config.palette.palette[j].index == selectedPatternIndicies[i]) {
        //             obj.config.palette.palette[j].h = 255;
        //             obj.config.palette.palette[j].s = 255;
        //             obj.config.palette.palette[j].v = 255;
        //         }
        //     }
        // }

        console.log('---- SENDING PATTERN ----')
        console.log(obj);
        console.log(JSON.stringify(obj.config));

        overview.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    sendConfig() {
        let config = this.parent.linkedAbstract.config;

        let selectedStripes = this.parent.linkedAbstract.stripeView.getSelectedStripes();

        if (selectedStripes.length == 0) {
            // MOA TBD raise a warning
            return;
        }


        let obj = new Object();
        obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/config";

        obj.config = new Object();
        obj.config.stripe_ids = selectedStripes;
        obj.config.config = this.getConfig();

        console.log('---- SENDING CONFIG ----')
        console.log(obj);

        overview.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }


    updateParameter() {
        let config = this.parent.linkedAbstract.config;
        console.log(this.parent.linkedAbstract);
        console.log(config);

        let selectedStripes = this.parent.linkedAbstract.stripeView.getSelectedStripes();
        let selectedPatternIndicies = this.parent.selectionView.getSelectedPatternIndices();
        console.log(selectedStripes);
        console.log(selectedPatternIndicies);
        if (selectedStripes.length == 0) {
            return;
        }


        let selectedCtrlType;
        let tabcontent = this.htmlNode.getElementsByClassName("parameter_ctrl_select");
        for (let i = 0; i < tabcontent.length; i++) {
            if (tabcontent[i].classList.contains("selected") == true) {
                selectedCtrlType = tabcontent[i].getAttribute("data-ctrl-type")
                break;
            }
        }


        let slider = this.htmlNode.getElementsByClassName("parameter_ctrl_slider")[0];
        let newValue = parseInt(slider.value);

        let obj = new Object();
        obj.config = new Object();

        if (selectedCtrlType == "h") {
            document.getElementsByClassName("colorshow")[0].style.background = hsvToRgb(newValue / 255, 1, 1);
            obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/palette";
            obj.config.stripe_ids = selectedStripes;
            for (let i = 0; i < config.stripes.length; i++) {
                if (config.stripes[i].stripe_id == selectedStripes[0]) {
                    if ((config.stripes[i].config == null) || (config.stripes[i].config.palette == null)) {
                        continue;
                    }
                    obj.config.palette = config.stripes[i].config.palette;
                    break;
                }
            }
            if (obj.config.palette == null) {
                return;
            }
            for (let i = 0; i < selectedPatternIndicies.length; i++) {
                for (let j = 0; j < obj.config.palette.palette.length; j++) {
                    if (obj.config.palette.palette[j].index == selectedPatternIndicies[i]) {
                        obj.config.palette.palette[j].h = newValue;
                    }
                }
            }
        } else if (selectedCtrlType == "s") {
            document.getElementsByClassName("colorshow")[0].style.background = hsvToRgb(1, newValue / 255, 1);
            obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/palette";
            obj.config.stripe_ids = selectedStripes;
            for (let i = 0; i < config.stripes.length; i++) {
                if (config.stripes[i].stripe_id == selectedStripes[0]) {
                    if ((config.stripes[i].config == null) || (config.stripes[i].config.palette == null)) {
                        continue;
                    }
                    obj.config.palette = config.stripes[i].config.palette;
                    break;
                }
            }
            if (obj.config.palette == null) {
                return;
            }
            for (let i = 0; i < selectedPatternIndicies.length; i++) {
                for (let j = 0; j < obj.config.palette.palette.length; j++) {
                    if (obj.config.palette.palette[j].index == selectedPatternIndicies[i]) {
                        obj.config.palette.palette[j].s = newValue;
                    }
                }
            }
        } else if (selectedCtrlType == "v") {
            document.getElementsByClassName("colorshow")[0].style.background = hsvToRgb(1, 1, newValue / 255);
            obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/palette";
            obj.config.stripe_ids = selectedStripes;
            for (let i = 0; i < config.stripes.length; i++) {
                if (config.stripes[i].stripe_id == selectedStripes[0]) {
                    if ((config.stripes[i].config == null) || (config.stripes[i].config.palette == null)) {
                        continue;
                    }
                    obj.config.palette = config.stripes[i].config.palette;
                    break;
                }
            }
            if (obj.config.palette == null) {
                return;
            }
            for (let i = 0; i < selectedPatternIndicies.length; i++) {
                for (let j = 0; j < obj.config.palette.palette.length; j++) {
                    if (obj.config.palette.palette[j].index == selectedPatternIndicies[i]) {
                        obj.config.palette.palette[j].v = newValue;
                    }
                }
            }
        } else if (selectedCtrlType == "speed") {
            obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/config";
            obj.config.stripe_ids = selectedStripes;
            for (let i = 0; i < config.stripes.length; i++) {
                if (config.stripes[i].stripe_id == selectedStripes[0]) {
                    if ((config.stripes[i].config == null) || (config.stripes[i].config.config == null)) {
                        continue;
                    }
                    obj.config.config = config.stripes[i].config.config;
                    break;
                }
            }
            if (obj.config.config == null) {
                return;
            }
            obj.config.config.movement_speed = newValue;
        } else if (selectedCtrlType == "overlay") {
            obj.apiPath = "/abstract/" + this.parent.linkedAbstract.id + "/stripes/config";
            obj.config.stripe_ids = selectedStripes;
            for (let i = 0; i < config.stripes.length; i++) {
                if (config.stripes[i].stripe_id == selectedStripes[0]) {
                    if ((config.stripes[i].config == null) || (config.stripes[i].config.config == null)) {
                        continue;
                    }
                    obj.config.config = config.stripes[i].config.config;
                    break;
                }
            }
            if (obj.config.config == null) {
                return;
            }
            obj.config.config.overlay_ratio = newValue;
        }

        console.log(JSON.stringify(obj))
        overview.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

}

// the basic restAPI connection
class APIConnection {
    constructor() {
    }

    get = async function (ep) {
        const response = await fetch('/api' + ep);
        const jsonResponse = await response.json(); //extract JSON from the http response
        return jsonResponse
    }

    post = async function (ep, jsonBody) {
        const response = await fetch('/api' + ep, {
            method: 'POST',
            body: jsonBody,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const jsonResponse = await response.json(); //extract JSON from the http response
        return jsonResponse
    }
}


// helper functions
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomTranslate(b, min, max) {
    return b + "% { transform: translate(" + getRandomInt(min, max) + "px, " + getRandomInt(min, max) + "px); }\n"
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h1, s1, v1) {
    let h = h1 / 255;
    let s = s1 / 255;
    let v = v1 / 255;
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }

    rValue = parseInt(r * 255);
    gValue = parseInt(g * 255);
    bValue = parseInt(b * 255);
    return "#" + rValue.toString(16).padStart(2, "0") + gValue.toString(16).padStart(2, "0") + bValue.toString(16).padStart(2, "0");
}

class PatternMap {
    constructor() {
        this.map = [];
        this.appendArea("0_01", "243,21,268,24,291,29,323,36,298,91,280,83,258,81,242,80");
        this.appendArea("0_02", "322,38,347,50,367,62,394,85,354,124,332,110,318,101,304,91");
        this.appendArea("0_03", "396,87,414,108,431,133,441,158,389,177,381,158,369,142,357,127");
        this.appendArea("0_04", "391,183,444,161,452,184,456,210,461,239,403,238,399,208");
        this.appendArea("0_05", "402,242,459,242,457,271,452,297,443,321,391,300,398,279,401,264");
        this.appendArea("0_06", "390,303,440,323,432,347,416,370,397,393,355,352,379,323");
        this.appendArea("0_07", "354,356,392,395,374,414,349,428,324,442,304,388,331,374");
        this.appendArea("0_08", "302,390,320,441,297,452,273,458,241,458,242,401,273,398");
        this.appendArea("0_09", "239,402,237,459,210,458,183,452,158,442,179,390,206,396");
        this.appendArea("0_10", "179,388,154,442,114,421,85,397,128,355,147,374");
        this.appendArea("0_11", "125,352,81,396,54,357,38,325,91,304,103,328");
        this.appendArea("0_12", "21,241,81,239,83,271,94,301,35,323,24,283");
        this.appendArea("0_13", "78,240,22,240,22,198,36,159,90,181,81,207");
        this.appendArea("0_14", "39,153,57,117,84,85,125,126,103,151,92,178");
        this.appendArea("0_15", "83,83,118,56,155,34,181,91,151,105,127,124");
        this.appendArea("0_16", "162,38,199,21,237,19,239,80,209,81,183,88");
        this.appendArea("1_01", "243,82,274,87,305,96,332,112,350,127,310,166,292,153,267,142,242,140");
        this.appendArea("1_02", "353,130,373,157,386,181,395,214,396,237,343,239,338,213,330,191,313,170");
        this.appendArea("1_03", "400,241,395,270,388,297,372,327,354,348,314,313,330,291,341,267,341,240");
        this.appendArea("1_04", "309,313,350,356,329,370,302,386,268,394,242,396,243,342,267,340,291,329");
        this.appendArea("1_05", "237,342,237,400,206,394,182,387,153,370,127,355,168,314,184,325,206,336");
        this.appendArea("1_06", "126,351,105,326,94,300,84,267,83,243,138,242,143,271,155,295,167,311");
        this.appendArea("1_07", "81,239,85,209,93,183,105,154,126,129,166,171,150,191,142,211,138,239");
        this.appendArea("1_08", "129,126,155,107,180,93,212,85,240,83,238,138,207,142,186,154,169,167");
        this.appendArea("2_01", "239,140,282,149,308,170,331,198,338,239,294,237,286,214,268,195,244,189");
        this.appendArea("2_02", "292,242,338,242,331,279,311,308,281,332,241,339,242,292,265,287,285,269");
        this.appendArea("2_03", "238,337,198,332,169,309,149,279,141,242,185,242,192,265,208,284,238,295");
        this.appendArea("2_04", "141,238,147,204,168,169,205,147,239,140,239,185,211,196,193,212,187,240");
        this.appendArea("3_01", "241,192,262,194,281,210,289,232,286,253,279,273,260,286,240,291,220,288,202,276,193,257,190,233,201,207,217,194");
    }

    appendArea(id, area) {
        let newArea = new Object();
        newArea.id = id;
        newArea.area = area;
        this.map.push(newArea);
    }
}

function parseCSV(str) {
    let arr = [];
    let quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c + 1];        // Current character, next character
        arr[row] = arr[row] || [];             // Create a new row if necessary
        arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') {
            arr[row][col] += cc;
            ++c;
            continue;
        }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') {
            quote = !quote;
            continue;
        }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) {
            ++col;
            continue;
        }

        // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
        // and move on to the next row and move to column 0 of that new row
        if (cc == '\r' && nc == '\n' && !quote) {
            ++row;
            col = 0;
            ++c;
            continue;
        }

        // If it's a newline (LF or CR) and we're not in a quoted field,
        // move on to the next row and move to column 0 of that new row
        if (cc == '\n' && !quote) {
            ++row;
            col = 0;
            continue;
        }
        if (cc == '\r' && !quote) {
            ++row;
            col = 0;
            continue;
        }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}

// function selectSelectionTab(tabID) {
//     // Declare all variables
//     var i, tabcontent, tablinks;
//
//     // Get all elements with class="tabcontent" and hide them
//     tabcontent = document.getElementsByClassName("selection_tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }
//
//     // Get all elements with class="tablinks" and remove the class "active"
//     tablinks = document.getElementsByClassName("selection_tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//         tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//
//     // Show the current tab, and add an "active" class to the button that opened the tab
//     document.getElementById(tabID).style.display = "block";
//     document.getElementById(tabID + "_btn").className += " active";
// }
//
//
// function selectParameterTab(tabID) {
//     // Declare all variables
//     var i, tabcontent, tablinks;
//
//     // Get all elements with class="tabcontent" and hide them
//     tabcontent = document.getElementsByClassName("parameter_tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }
//
//     // Get all elements with class="tablinks" and remove the class "active"
//     tablinks = document.getElementsByClassName("parameter_tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//         tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//
//     // Show the current tab, and add an "active" class to the button that opened the tab
//     document.getElementById(tabID).style.display = "block";
//     document.getElementById(tabID + "_btn").className += " active";
// }

//
// class Hummel {
//     constructor(height, width) {
//         this.height = height;
//         this.width = width;
//     }
// }

//
// let newPosX = 0, newPosY = 0, startPosX = 0, startPosY = 0;
//
// let hummelCnt = 0;
//
// let mouseButtonIsDown = false;
//
// hummeln = [];
//
// const maxSpeed = 100;
// const borderSizeLeftPercent = 2;
// const borderSizeTopPercent = 2;
// const hummelImageSize = 40;
// const flowerImageSize = 180;
//
// function createHummel(parentElement) {
//     hummelCnt += 1;
//     hummelID = 'hummel' + hummelCnt;
//
//     xPercent = getRandomInt(5, 95);
//     yPercent = getRandomInt(5, 95);
//
//     x = (parentElement.offsetWidth / 100) * xPercent;
//     y = (parentElement.offsetHeight / 100) * yPercent;
//
//     elements = createHummelElements(parentElement, hummelID);
//     styles = createHummelStyle(hummelID, xPercent, yPercent);
//
//     newHummel = {
//         hummelID: hummelID,
//         parent: parentElement,
//         elements: {
//             hummel: elements.hummel,
//             //    buzz_zone: elements.buzz_zone,
//             body: elements.body,
//         },
//         startPosX: 0,
//         startPosY: 0,
//         posX: x,
//         posY: y,
//         speed: getRandomInt(0, maxSpeed),
//         direction: getRandomInt(1, 360),
//         loopEnd: 0,
//         loopSpeed: 0,
//         autoMove: true,
//         imageSize: hummelImageSize,
//
//         mouseDownCallback: function (e) {
//             mouseButtonIsDown = true;
//
//             e.preventDefault();
//             hummel = findHummel(this);
//
//             // get the starting position of the cursor
//             hummel.startPosX = e.clientX;
//             hummel.startPosY = e.clientY;
//
//             moveCallback = hummel.moveMouseCallback.bind(hummel);
//
//             hummel.autoMove = false;
//             document.addEventListener('mousemove', moveCallback);
//
//             mouseUpCallback = function () {
//                 mouseButtonIsDown = false;
//                 document.removeEventListener('mousemove', moveCallback);
//                 document.removeEventListener('mouseup', mouseUpCallback);
//                 hummel.autoMove = true;
//                 console.log("automove enabled again");
//             }
//             document.addEventListener('mouseup', mouseUpCallback);
//         },
//         moveMouseCallback: function (e) {
//             hummel = this;
//
//             // calculate the new position
//             newPosX = hummel.startPosX - e.clientX;
//             newPosY = hummel.startPosY - e.clientY;
//
//             // with each move we also want to update the start X and Y
//             hummel.startPosX = e.clientX;
//             hummel.startPosY = e.clientY;
//             // console.log(hummel.hummelID + " mouse move");
//
//             // console.log(hummel.elements.hummel.style)
//             // set the element's new position:
//             hummel.posX = hummel.elements.hummel.offsetLeft - newPosX
//             hummel.posY = hummel.elements.hummel.offsetTop - newPosY
//
//             hummel.elements.hummel.style.left = hummel.posX + "px";
//             hummel.elements.hummel.style.top = hummel.posY + "px";
//         },
//         automaticMovementAction: function () {
//             hummel = this;
//             screenHeight = hummel.parent.offsetHeight;
//             minY = (screenHeight / 100) * borderSizeTopPercent;
//             maxY = screenHeight - minY - hummel.imageSize;
//
//             screenWidth = hummel.parent.offsetWidth;
//             minX = (screenWidth / 100) * borderSizeLeftPercent;
//             maxX = screenWidth - minX - hummel.imageSize;
//
//             if (hummel.posX < minX) {
//                 hummel.direction = getRandomInt(45, 135);
//                 //console.log("minX reached, new direction: "+ hummel.direction)
//
//                 hummel.speed = maxSpeed;
//             } else if (hummel.posX > maxX) {
//                 hummel.direction = getRandomInt(225, 315);
//                 //console.log("maxX reached, new direction: "+ hummel.direction)
//
//                 hummel.speed = maxSpeed;
//             } else if (hummel.posY < minY) {
//                 hummel.direction = getRandomInt(135, 225);
//                 //console.log("minY reached, new direction: "+ hummel.direction)
//                 hummel.speed = maxSpeed;
//             } else if (hummel.posY > maxY) {
//                 hummel.direction = getRandomInt(-45, 45);
//                 //console.log("maxY reached, new direction: "+ hummel.direction)
//
//                 hummel.speed = maxSpeed;
//             } else {
//                 seed = getRandomInt(0, 1000)
//                 if (seed == 0) {
//                     oldSpeed = hummel.Speed;
//                     hummel.speed = getRandomInt(0, 100);
//                     //console.log("change speed from "+oldSpeed+" to "+ hummel.speed)
//                 } else if (seed == 1) {
//                     hummel.direction = getRandomInt(0, 360);
//                     //console.log("change direction from "+ oldDirection +" to " + hummel.direction);
//                 } else if (seed == 2) {
//                     hummel.speed = 100;
//                     loopValue = 360;
//                     if (getRandomInt(1, 2) == 1) {
//                         hummel.direction += loopValue;
//                     } else {
//                         hummel.direction -= loopValue;
//                     }
//                     hummel.loopSpeed = getRandomInt(3, 10);
//                     hummel.loopEnd = getRandomInt(1, 360);
//                     console.log(hummel.hummelID + ": do a loop with " + loopValue)
//                 } else if ((seed > 100) && (seed < 200)) {
//                     //console.log("direction correction")
//                     hummel.direction += getRandomInt(-2, 2);
//                 }
//             }
//
//             hummel.direction += getRandomInt(-1, 1);
//
//             if (hummel.loopEnd > 0) {
//                 //console.log(hummel.hummelID + ": loop action")
//                 if (hummel.direction > hummel.loopEnd) {
//                     hummel.direction -= hummel.loopSpeed;
//                     if (hummel.direction < hummel.loopEnd) {
//                         hummel.direction = hummel.loopEnd;
//                     }
//                 } else if (hummel.direction < hummel.loopEnd) {
//                     hummel.direction += hummel.loopSpeed;
//                     if (hummel.direction > hummel.loopEnd) {
//                         hummel.direction = hummel.loopEnd;
//                     }
//                 }
//                 if (hummel.direction == hummel.loopEnd) {
//                     hummel.loopEnd = 0;
//                 }
//             }
//
//             if (hummel.speed > (maxSpeed / 2)) {
//                 hummel.speed -= maxSpeed / 20;
//             } else if (hummel.speed < (maxSpeed / 2)) {
//                 hummel.speed += maxSpeed / 20;
//             }
//
//             // do the movement
//             hummel.posX += (Math.cos((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));
//             hummel.posY += (Math.sin((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));
//
//             //  console.log(hummel.direction + ": "+ Math.cos((180 / Math.PI) * hummel.direction) + "/" + Math.sin((180 / Math.PI) * hummel.direction))
//
//             hummel.elements.hummel.style.left = hummel.posX + "px";
//             hummel.elements.hummel.style.top = hummel.posY + "px";
//             hummel.elements.hummel.style.transform = "rotate(" + (hummel.direction - 45) + "deg)"
//         }
//     };
//
//     this.elements.hummel.addEventListener('mousedown', newHummel.mouseDownCallback);
//
//     hummeln.push(newHummel)
//
//     return newHummel;
// }
//
// function createFlower(parentElement, flowerID) {
//     xPercent = getRandomInt(5, 85);
//     yPercent = getRandomInt(5, 85);
//
//     x = (parentElement.offsetWidth / 100) * xPercent;
//     y = (parentElement.offsetHeight / 100) * yPercent;
//
//     elements = createFlowerElements(parentElement, flowerID);
//     styles = createFlowerStyle(flowerID, xPercent, yPercent);
// }
//
// function automaticMovement() {
//     for (let i = 0; i < hummeln.length; i++) {
//         if (hummeln[i].autoMove == true) {
//             // move the hummel
//             moveAction = hummeln[i].automaticMovementAction.bind(hummeln[i]);
//
//             moveAction();
//         } else {
//             if (mouseButtonIsDown == false) {
//                 hummeln[i].autoMove = true;
//                 console.log(hummeln[i].hummelID + " fix autmovement");
//             }
//         }
//     }
// }
//
// function findHummel(el) {
//     for (let i = 0; i < hummeln.length; i++) {
//         if (el.className == hummeln[i].hummelID) {
//             return hummeln[i];
//         }
//     }
// }
//
// function createHummelElements(parentElement, hummelID) {
//     const hummelEl = document.createElement("div");
//     hummelEl.setAttribute('class', hummelID)
//
//     parentElement.appendChild(hummelEl);
//
//     const hummelBodyEl = document.createElement("img");
//     hummelBodyEl.setAttribute('class', hummelID + '_body');
//     hummelBodyEl.setAttribute('src', 'assets/img/hummel.gif');
//
//     hummelEl.appendChild(hummelBodyEl);
//
//     return {hummel: hummelEl, body: hummelBodyEl};
// }
//
// function createHummelStyle(hummelID, x, y) {
//     const style = document.createElement("style");
//
//     style.innerHTML = "\n"
//
//     style.innerHTML += "\n"
//     style.innerHTML += "." + hummelID + "{\n"
//     style.innerHTML += "    width:50px;\n"
//     style.innerHTML += "    height:50px;\n"
//     style.innerHTML += "    left:" + x + "%;\n"
//     style.innerHTML += "    top:" + y + "%;\n"
//     style.innerHTML += "    position:absolute;\n"
// //    style.innerHTML += "    background:#0000ff;\n"
//     style.innerHTML += "    cursor:move;\n"
//     style.innerHTML += "    z-index: 3;\n"
//     style.innerHTML += "}\n"
//
//     // add hummel body style
//     style.innerHTML += "\n"
//     style.innerHTML += "." + hummelID + "_body {\n"
//     style.innerHTML += "    width:" + hummelImageSize + "px;\n"
//     style.innerHTML += "    height:" + hummelImageSize + "px;\n"
//     style.innerHTML += "    left:5px;\n"
//     style.innerHTML += "    top:5px;\n"
// //    style.innerHTML += "    z-index: 3;\n"
// //    style.innerHTML += "    background:#ff0000;\n"
//     style.innerHTML += "    animation-name: " + hummelID + "_floating;\n"
//     style.innerHTML += "    animation-duration: 10s;\n"
//     style.innerHTML += "    animation-iteration-count: infinite;\n"
//     style.innerHTML += "    animation-direction: alternate;\n"
//     style.innerHTML += "    animation-timing-function: ease-in-out;\n"
//     //   style.innerHTML += "    box-shadow: 1px 1px 2px black, 0 0 25px blue, 0 0 5px darkblue;\n"
//     style.innerHTML += "}\n"
//
//     // add keyframes for individual hummel floating
//     style.innerHTML += "\n"
//     style.innerHTML += "@keyframes " + hummelID + "_floating {\n";
//     for (n = 0; n < 11; ++n) {
//         style.innerHTML += randomTranslate(n * 10, 0, 10);
//     }
//     style.innerHTML += "}\n";
//     document.head.appendChild(style);
// }
//
// function toggleSelectedElement(elementID) {
//     el = document.getElementById(elementID);
//     el.classList.toggle("selected")
// }
//
// function showFlowerView(flowerID) {
//     document.getElementById("selection_leds_btn").click();
//     document.getElementById("parameter_ctrl_btn").click();
//
//     style = document.getElementById('control_view').style;
//
//     style.animation = "fadeInEffect 1s";
//     style.display = "block";
// }
//
// function hideFlowerView() {
//     style = document.getElementById('control_view').style;
//
//     style.animation = "fadeOutEffect 1s";
//     setTimeout(function () {
//         style.display = "none";
//     }, 900);
// }
//
// function createFlowerControlElements(parentElement, objectID) {
//     const ctrlView = document.createElement("div");
//     ctrlView.setAttribute('id', "controlView_" + objectID)
//     ctrlView.setAttribute('data-object-id', objectID)
//     parentElement.appendChild(ctrlView);
//
//     const selectView = document.createElement("div");
//     selectView.classList.add("selection_tab_" + objectID, "tab");
//     selectView.setAttribute('data-object-id', objectID)
//     ctrlView.appendChild(selectView);
//
//     const selLedBtn = document.createElement("button");
//     selLedBtn.setAttribute('id', "selection_leds_btn_" + objectID)
//     selLedBtn.classList.add("selection_tablinks_" + objectID);
//     selLedBtn.setAttribute('onclick', "selectSelectionTab('selection_leds', " + objectID + ")")
//     selLedBtn.innerHTML = "LEDs";
//     selectView.appendChild(selLedBtn);
//
//     const selPatternBtn = document.createElement("button");
//     selPatternBtn.setAttribute('id', "selection_pattern_btn_" + objectID)
//     selPatternBtn.classList.add("selection_tablinks_" + objectID);
//     selPatternBtn.setAttribute('onclick', "selectSelectionTab('selection_pattern', " + objectID + ")")
//     selPatternBtn.innerHTML = "Pattern";
//     selectView.appendChild(selPatternBtn);
//
//     const closeBtn = document.createElement("button");
//     closeBtn.setAttribute('onclick', "hideFlowerView()")
//     closeBtn.innerHTML = "Close";
//     selectView.appendChild(closeBtn);
//
//
// }
//
// function createFlowerElements(parentElement, flowerID) {
//     // createFlowerControlElements(parentElement, flowerID);
//
//     const flowerEl = document.createElement("div");
//     flowerEl.setAttribute('class', flowerID)
//     parentElement.appendChild(flowerEl);
//
//     const flowerAnchorEl = document.createElement("div");
//     flowerAnchorEl.setAttribute('onclick', "showFlowerView('" + flowerID + "')");
//     flowerEl.appendChild(flowerAnchorEl);
//
//     const flowerBodyEl = document.createElement("img");
//     flowerBodyEl.setAttribute('class', flowerID + '_body');
//     flowerBodyEl.setAttribute('src', 'assets/img/flower.gif');
//     flowerAnchorEl.appendChild(flowerBodyEl);
//
//     return {flower: flowerEl, body: flowerBodyEl};
// }
//
// function createFlowerStyle(flowerID, x, y) {
//     const style = document.createElement("style");
//
//     style.innerHTML = "\n"
//
//     style.innerHTML += "\n"
//     style.innerHTML += "." + flowerID + "{\n"
//     style.innerHTML += "    width:200px;\n"
//     style.innerHTML += "    height:200px;\n"
//     style.innerHTML += "    left:" + x + "%;\n"
//     style.innerHTML += "    top:" + y + "%;\n"
//     style.innerHTML += "    position:absolute;\n"
//     style.innerHTML += "    z-index: 2;\n"
// //    style.innerHTML += "    background:#0000ff;\n"
//     style.innerHTML += "}\n"
//
//     // add hummel body style
//     style.innerHTML += "\n"
//     style.innerHTML += "." + flowerID + "_body {\n"
//     style.innerHTML += "    width:" + flowerImageSize + "px;\n"
//     style.innerHTML += "    height:" + flowerImageSize + "px;\n"
//     style.innerHTML += "    left:5px;\n"
//     style.innerHTML += "    top:5px;\n"
// //    style.innerHTML += "    z-index: 2;\n"
//     // style.innerHTML += "    background:#ff0000;\n"
//     style.innerHTML += "    animation-name: " + flowerID + "_floating;\n"
//     style.innerHTML += "    animation-duration: 20s;\n"
//     style.innerHTML += "    animation-iteration-count: infinite;\n"
//     style.innerHTML += "    animation-direction: alternate;\n"
//     style.innerHTML += "    animation-timing-function: ease-in-out;\n"
//     style.innerHTML += "}\n"
//
//     // add keyframes for individual hummel floating
//     style.innerHTML += "\n"
//     style.innerHTML += "@keyframes " + flowerID + "_floating {\n";
//     for (n = 0; n < 11; ++n) {
//         style.innerHTML += randomTranslate(n * 10, 0, 20);
//     }
//     style.innerHTML += "}\n";
//     document.head.appendChild(style);
// }
//
// function generateHummeln(x, wiese) {
//     for (let i = 0; i < x; i++) {
//         createHummel(wiese);
//
//     }
// }
//
// function initialize() {
//     const wiese = document.querySelector('.hummel_wiese');
//     //  generateHummeln(15, wiese)
//
//
//     createFlower(wiese, "flower123");
//     setInterval(automaticMovement, 40);
// }
//
// function updateObject() {
//     var obj = new Object();
//     obj.id = "pfv1";
//     obj.led_config = new Object();
//     obj.led_config.radial_stripes = [];
//
//     tabcontent = document.getElementsByClassName("parameter_ctrl_select");
//     for (i = 0; i < tabcontent.length; i++) {
//         if (tabcontent[i].classList.contains("selected") == true) {
//             selectedCtrlType = tabcontent[i].getAttribute("data-ctrl-type")
//             break;
//         }
//     }
//
//     slider = document.getElementById("parameter_ctrl_slider");
//     newValue = slider.value;
//
//     var selectedSegments = [];
//     tabcontent = document.getElementsByClassName("led_select_field");
//     for (i = 0; i < tabcontent.length; i++) {
//         if (tabcontent[i].classList.contains("selected") == true) {
//             selectedSegments.push(tabcontent[i].getAttribute("data-id"))
//         }
//     }
//
//     var selectedPatternIndecies = [];
//     tabcontent = document.getElementsByClassName("pattern_select_field");
//     for (i = 0; i < tabcontent.length; i++) {
//         if (tabcontent[i].classList.contains("selected") == true) {
//             selectedPatternIndecies.push(parseInt(tabcontent[i].getAttribute("data-id")));
//         }
//     }
//     for (si = 0; si < selectedSegments.length; si++) {
//         stripeObj = new Object();
//         stripeObj.stripe_name = selectedSegments[si];
//         stripeObj.config = new Object();
//
//
//         if (selectedCtrlType == "h") {
//             stripeObj.config.palette = new Object();
//             stripeObj.config.palette.palette = [];
//             for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
//                 newPatternEntry = new Object();
//                 newPatternEntry.id = selectedPatternIndecies[pi];
//                 newPatternEntry.h = newValue * 1;
//                 stripeObj.config.palette.palette.push(newPatternEntry);
//             }
//             fillMissingPaletteEntries(stripeObj.config.palette)
//         } else if (selectedCtrlType == "s") {
//             stripeObj.config.palette = new Object();
//             stripeObj.config.palette.palette = [];
//             for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
//                 newPatternEntry = new Object();
//                 newPatternEntry.id = selectedPatternIndecies[pi];
//                 newPatternEntry.s = newValue * 1;
//                 stripeObj.config.palette.palette.push(newPatternEntry);
//             }
//             fillMissingPaletteEntries(stripeObj.config.palette)
//         } else if (selectedCtrlType == "v") {
//             stripeObj.config.palette = new Object();
//             stripeObj.config.palette.palette = [];
//             for (pi = 0; pi < selectedPatternIndecies.length; pi++) {
//                 newPatternEntry = new Object();
//                 newPatternEntry.id = selectedPatternIndecies[pi];
//                 newPatternEntry.v = newValue * 1;
//                 stripeObj.config.palette.palette.push(newPatternEntry);
//             }
//             fillMissingPaletteEntries(stripeObj.config.palette)
//         } else if (selectedCtrlType == "speed") {
//             stripeObj.config.base = new Object();
//             absSpeed = newValue;
//             if (absSpeed < 0) {
//                 stripeObj.config.base.movement_speed = absSpeed * -1;
//                 stripeObj.config.base.movement_direction = false;
//             } else {
//                 stripeObj.config.base.movement_speed = absSpeed * 1;
//                 stripeObj.config.base.movement_direction = true;
//             }
//         } else if (selectedCtrlType == "overlay") {
//
//         }
//
//         // and now add the config
//         obj.led_config.radial_stripes.push(stripeObj);
//     }
//
//     console.log(JSON.stringify(obj.led_config))
//     post("api/object/" + obj.id + "/stripe", obj.led_config);
// }
//
// function post(url, data) {
//     return fetch(url, {method: "POST", headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
// }
//
// function fillMissingPaletteEntries(palette) {
//     for (i = 1; i < 17; i++) {
//         found = false
//         for (pi = 0; pi < palette.palette.length; pi++) {
//             if (palette.palette[pi].id == i) {
//                 found = true
//             }
//         }
//         if (found == false) {
//             newPatternEntry = new Object();
//             newPatternEntry.id = i
//             palette.palette.push(newPatternEntry)
//         }
//     }
// }
//
// function selectParameterCtrlElement(id) {
//     // Declare all variables
//     var i, tabcontent, tablinks;
//
//     tabcontent = document.getElementsByClassName("parameter_ctrl_select");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].classList.remove("selected");
//     }
//
//     slider = document.getElementById("parameter_ctrl_slider");
//     if (id == "parameter_ctrl_speed") {
//         slider.min = -2
//         slider.max = 2
//     } else if ((id == "parameter_ctrl_h") || (id == "parameter_ctrl_s") || (id == "parameter_ctrl_v")) {
//         slider.min = 0
//         slider.max = 255
//     }
//     document.getElementById(id).classList.add("selected");
// }
//
// function selectSelectionTab(tabID) {
//     // Declare all variables
//     var i, tabcontent, tablinks;
//
//     // Get all elements with class="tabcontent" and hide them
//     tabcontent = document.getElementsByClassName("selection_tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }
//
//     // Get all elements with class="tablinks" and remove the class "active"
//     tablinks = document.getElementsByClassName("selection_tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//         tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//
//     // Show the current tab, and add an "active" class to the button that opened the tab
//     document.getElementById(tabID).style.display = "block";
//     document.getElementById(tabID + "_btn").className += " active";
// }
//
//
// function selectParameterTab(tabID) {
//     // Declare all variables
//     var i, tabcontent, tablinks;
//
//     // Get all elements with class="tabcontent" and hide them
//     tabcontent = document.getElementsByClassName("parameter_tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }
//
//     // Get all elements with class="tablinks" and remove the class "active"
//     tablinks = document.getElementsByClassName("parameter_tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//         tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//
//     // Show the current tab, and add an "active" class to the button that opened the tab
//     document.getElementById(tabID).style.display = "block";
//     document.getElementById(tabID + "_btn").className += " active";
// }