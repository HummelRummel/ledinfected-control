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

    overview.controls.controls[0].selectionView.patternSelect.updateBackground();
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
            stripe.selected = false;
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
        this.baseEl.style.height = "80%";
        this.imageEl = document.createElement("img");
        this.imageEl.setAttribute('src', config.info.image.image_base_path + "/empty.png");
        this.imageEl.useMap = "#" + imgMapName;
        this.imageEl.style.maxHeight = "100%";
        this.imageEl.style.maxWidth = "auto";
        this.imageEl.style.backgroundSize = "contain";

        this.baseEl.appendChild(this.imageEl);
        // make the image map dynamic
        $(this.imageEl).rwdImageMaps();
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
        this.htmlView.getElementsByClassName("selection_stripes_btn")[0].setAttribute('onclick', "selectSelectionTab('" + this.linkedAbstract.id + "', 'selection_stripes');");
        this.htmlView.getElementsByClassName("selection_pattern_btn")[0].setAttribute('onclick', "selectSelectionTab('" + this.linkedAbstract.id + "', 'selection_pattern');");
        this.htmlView.getElementsByClassName("selection_pattern_new_btn")[0].setAttribute('onclick', "selectSelectionTab('" + this.linkedAbstract.id + "', 'selection_pattern_new');");
        this.htmlView.getElementsByClassName("parameter_ctrl_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_ctrl');");
        this.htmlView.getElementsByClassName("parameter_presets_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_presets');");
        this.htmlView.getElementsByClassName("parameter_admin_btn")[0].setAttribute('onclick', "selectParameterTab('" + this.linkedAbstract.id + "', 'parameter_admin');");
        this.htmlView.style.animation = "fadeInEffect 1s";
        this.htmlView.style.display = "block";

        this.selectionView.showAbstract(abstract);
        this.parameterView.showAbstract(abstract);
    }

    hide() {
        let stripesSelectAbstract = this.htmlView.getElementsByClassName('selection_stripes')[0];
        stripesSelectAbstract.removeChild(this.linkedAbstract.stripeView.getHTMLElement())

        this.linkedAbstract = null;
        this.config = null;
        this.htmlView.id = "";
        this.htmlView.style.animation = "fadeOutEffect 1s";
        //this.htmlView.style.display = "block";
        let style = this.htmlView.style

        setTimeout(function () {
            style.display = "none";
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

        this.patternSelect = new AbstractControlParameterSelectionView(this.parent)
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        let stripesSelectAbstract = this.htmlNode.getElementsByClassName('selection_stripes')[0];
        stripesSelectAbstract.appendChild(this.linkedAbstract.stripeView.getHTMLElement());

        let ledPatternFields = this.htmlNode.getElementsByClassName('pattern_select_field');
        for (let i = 0; i < ledPatternFields.length; i++) {
            for (let j = 0; j < ledPatternFields[i].classList.length; j++) {
                if ((ledPatternFields[i].classList[j] != 'round_button') && (ledPatternFields[i].classList[j] != 'pattern_select_field') && (ledPatternFields[i].classList[j] != 'selected')) {
                    ledPatternFields[i].setAttribute('onclick', "toggleSelectedElement('" + this.linkedAbstract.id + "', '" + ledPatternFields[i].classList[j] + "');");
                }
            }
        }

        /*
        <!-- Image Map Generated by http://www.image-map.net/ -->
<img src="background.png" usemap="#pattern-selection-map">

         */
    }

    selectSelectionTab(tabID) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = this.htmlNode.getElementsByClassName("selection_tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

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
            $(window).trigger('resize');
        }
        if (tabID == "selection_pattern_new") {
            $(window).trigger('resize');
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

    selectAllStripes() {

    }

    unselectAllStripes() {

    }

    getSelectedPatternIndices() {
        let patternIndecies = [];

        this.patternSelect.fields

        for (let i = 0; i < 16; i++) {
            if (this.patternSelect.fields[i].active) {
                patternIndecies.push(i);
            }
        }
        return patternIndecies;
    }

    selectCompletePattern() {

    }

    unselectCompletePattern() {

    }
}

class AbstractControlParameterSelectionView {
    constructor(parent) {
        this.parent = parent;
        this.image_base_path = "/assets/img/pattern";

        this.baseEl = document.createElement("div");
        this.baseEl.style.width = "100%";
        this.baseEl.style.height = "80%";
        this.imageEl = document.createElement("img");
        this.imageEl.setAttribute('src', this.image_base_path + "/empty.png");
        this.imageEl.useMap = "#pattern-selection-map";
        this.imageEl.style.maxHeight = "100%";
        this.imageEl.style.maxWidth = "auto";
        this.imageEl.style.backgroundSize = "contain";

        this.baseEl.appendChild(this.imageEl);
        let patternSelect = this.parent.htmlView.getElementsByClassName('selection_pattern_new')[0];
        patternSelect.appendChild(this.baseEl);

        // make the image map dynamic
        $(this.imageEl).rwdImageMaps();
        this.fields = [];
        for (let i = 0; i < 16; i++) {
            let f = new Object();
            f.active = false;
            this.fields.push(f);
        }
        this.updateBackground();
    }


    updateBackground() {
        let backgroundString = "";
        let noneSelected = true;
        for (let i = 0; i < this.fields.length; i++) {
            if (backgroundString != "") {
                backgroundString += ", ";
            }
            if (this.fields[i].active) {
                noneSelected = false;
                backgroundString += "url(" + this.image_base_path + "/active_0_" + (i + 1).toString().padStart(2, '0') + ".png)";
            } else {
                backgroundString += "url(" + this.image_base_path + "/inactive_0_" + (i + 1).toString().padStart(2, '0') + ".png)";
            }
        }

        for (let i = 0; i < 8; i++) {
            if (this.fields[i * 2].active || this.fields[i * 2 + 1].active) {
                backgroundString += ", url(" + this.image_base_path + "/inactive_1_" + (i + 1).toString().padStart(2, '0') + ".png)";
            } else {
                backgroundString += ", url(" + this.image_base_path + "/active_1_" + (i + 1).toString().padStart(2, '0') + ".png)";
            }
        }

        for (let i = 0; i < 4; i++) {
            if (this.fields[i * 4].active || this.fields[i * 4 + 1].active || this.fields[i * 4 + 2].active || this.fields[i * 4 + 3].active) {
                backgroundString += ", url(" + this.image_base_path + "/inactive_2_" + (i + 1).toString().padStart(2, '0') + ".png)";
            } else {
                backgroundString += ", url(" + this.image_base_path + "/active_2_" + (i + 1).toString().padStart(2, '0') + ".png)";
            }
        }

        if (noneSelected) {
            backgroundString += ", url(" + this.image_base_path + "/active_3_01.png)";
        } else {
            backgroundString += ", url(" + this.image_base_path + "/inactive_3_01.png)";
        }
        backgroundString += ", url(" + this.image_base_path + "/background.png)"
        console.log(backgroundString);
        this.imageEl.style.backgroundImage = backgroundString
    }
}

class AbstractControlParameterView {
    constructor(parent) {
        this.parent = parent;
        this.htmlNode = this.parent.htmlView;
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        let parameterSelectFields = this.htmlNode.getElementsByClassName('parameter_ctrl_select');
        for (let i = 0; i < parameterSelectFields.length; i++) {
            for (let j = 0; j < parameterSelectFields[i].classList.length; j++) {
                if ((parameterSelectFields[i].classList[j] != 'round_button') && (parameterSelectFields[i].classList[j] != 'parameter_ctrl_select') && (parameterSelectFields[i].classList[j] != 'selected')) {
                    parameterSelectFields[i].setAttribute('onclick', "selectParameterCtrlElement('" + this.linkedAbstract.id + "', '" + parameterSelectFields[i].classList[j] + "');");
                }
            }
        }
        this.htmlNode.getElementsByClassName('parameter_ctrl_slider')[0].setAttribute('oninput', "updateParameter('" + this.linkedAbstract.id + "');");
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
function hsvToRgb(h, s, v) {
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