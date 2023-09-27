/*
* @Author: josephsteccato
* @Date:   2023-09-24 14:47:08
* @Last Modified by:   josephsteccato
* @Last Modified time: 2023-09-27 14:11:47

    "three-slider.js" - JSUI by steech (joe steccato)

    a JSUI version of ll.slishi.maxpat by klaus filip
    
    three-slider.js JSUI

    - this slider provides three different sliders for controlling a single value
        1) coarse: changes value by 100, ranging from slider min to max
        2) medium: changes value by 1, ranging from 0 to 100
        3) fine: changes decimal value, ranging from 0.0 to 1.0

    - check the DEFAULT_ATTR object to see what attributes can be set
    using "jsarguments"

    ** requires jsHelpers.js **
*/
autowatch = 1;
outlets = 2;

var jsHelpers = require("jsHelpers")
var { parseAttributes, parseColor, console } = jsHelpers

var DEFAULT_ATTR = {
    min: 0,
    max: 10000,

    coarse_scale: .05,
    medium_scale: .8,
    fine_scale: 1.8,

    bgcolor: [1,1,1,1],
    bordercolor: [0,0,0,1],
}

// clone the DEFAULT_ATTR
var ATTR = JSON.parse(JSON.stringify(DEFAULT_ATTR))

setAttributesFromArgs()

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var width = box.rect[2] - box.rect[0];
var height = box.rect[3] - box.rect[1];
var borderAmount = width/24;

var value = 0.0;   // Starting value in the middle
var coarse = 0.0;  // 0 to 10, multiply by 100 for actual change
var medium = 0.0;  // 0 to 10, multiply by 10 for actual change
var fine = 0.0;    // 0 to 10, multiply by 1 for actual change

var cursorHidden = false;
var currentMousePosition = 0 // y only
var mouseDelta = 0


/* INLET MESSAGES */
function bang(){
    outlet(0, value);
}

function set(newValue){
    value = getMinMax(newValue)
    mgraphics.redraw();
}

function msg_float(newValue){
    set(newValue)
    outlet(0, value);
}

function msg_int(newValue){ 
    msg_float(newValue) 
}

function min(newMin) { ATTR.min = newMin }
function max(newMax) { ATTR.max = newMax }

function bgcolor() { 
    var arr = arrayfromargs(messagename, arguments); 
    parseAndSetColor(arr, 'bgcolor')
}

function bordercolor() { 
    var arr = arrayfromargs(messagename, arguments); 
    parseAndSetColor(arr, 'bordercolor')
}

/*  JSUI AND DRAWING */
function paint() {
    mgraphics.clear_surface();

    // Background color (really the "border" color)
    mgraphics.set_source_rgba(ATTR.bordercolor[0], ATTR.bordercolor[1], ATTR.bordercolor[2], ATTR.bordercolor[3]);
    mgraphics.rectangle(-1, -1, width+1, height+1);
    mgraphics.fill();

    var vfine = value % 1.;
    var vmedium = value % 100.;

    // Draw sliders
    drawSlider(0.0, width * 0.5, (value / ATTR.max), false);
    drawSlider(0.5, (width * 0.25) + borderAmount, vmedium / 100., false);
    drawSlider(0.75, (width * 0.25), vfine, true);
}

function onresize(w, h) {
    width = w;
    height = h;
    // to-do: change slider orientation if w > h ???
    mgraphics.redraw();
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
    currentMousePosition = y
    mouseDelta = 0
    currentSlider = getSliderFromPosition(x)

    fine = value % 1;                      // Decimal part
    medium = (value - fine) % 100;         // Number between 1 and 100
    coarse = value - medium - fine;        // Everything 100 and over    

    handleMouse(y)
    outlet(1, 'hide')
}

function ondrag(x, y, button, cmd, shift, capslock, option, ctrl) {
    mouseDelta += y - currentMousePosition

    if(button == 0){
        currentSlider = -1;
        cursorHidden = 0;
        currentSliderLoop = 0;
        outlet(1, 'show')
    }
    if((mouseDelta) == 0){
        return
    }
    handleMouse(y)
    outlet(1, 'update')
}

// Handle mouse movement, setting value for current selected slider
function handleMouse(y) {
    var sliderAmount = ((mouseDelta/currentMousePosition) - 1) * -1
    var sliderStartAmount = 1 - (currentMousePosition / height);

    if(currentSlider == 0) {
        sliderAmount *= ATTR.coarse_scale
        coarse = roundDownTo(ATTR.max * (sliderAmount + sliderStartAmount), 100) + ATTR.min;
    }
    if(currentSlider == 1) {
        sliderAmount *= ATTR.medium_scale
        medium = roundDownTo(100 * (sliderAmount + sliderStartAmount), 1);
    }
    if(currentSlider == 2) {
        sliderAmount *= ATTR.fine_scale
        fine = (sliderAmount + sliderStartAmount);
    }

    value = getMinMax(coarse + medium + fine);
    outlet(0, value); // Assuming outlet is a function defined elsewhere in your code
    mgraphics.redraw(); // Assuming mgraphics is an object defined elsewhere in your code
}

// Draw slider
function drawSlider(xPosition, sliderWidth, sliderValue, isLast) {
    var sliderHeight = 1. * height;
    var sliderX = xPosition * width;

    if(isLast){
        sliderX += borderAmount
    }

    // Slider background
    mgraphics.set_source_rgba(ATTR.bgcolor[0], ATTR.bgcolor[1], ATTR.bgcolor[2], ATTR.bgcolor[3]);
    mgraphics.rectangle(sliderX, 0., sliderWidth - borderAmount, sliderHeight);
    mgraphics.fill();

    // Slider bar
    mgraphics.set_source_rgba(ATTR.bordercolor[0], ATTR.bordercolor[1], ATTR.bordercolor[2], ATTR.bordercolor[3]);
    mgraphics.rectangle(sliderX, ((1 - sliderValue) * sliderHeight) - (borderAmount/2), sliderWidth, borderAmount);
    mgraphics.fill();
}

// Check if value within min & max
function getMinMax(newValue){
    if(newValue < ATTR.min) {
        newValue = ATTR.min;
    }
    if(newValue > ATTR.max) {
        newValue = ATTR.max;
    }
    return newValue
}

// Round down value to "round" amount
function roundDownTo(value, round) {
    if (value >= 0) {
        return Math.floor(value / round) * round;
    } else {
        return Math.ceil(value / round) * round;
    }
}

// Determine which slider user has focused in onclick method
function getSliderFromPosition(x){
	if (x >= 0.0 && (x < (0.5 * width))) {
		return 0 // coarse
	} else if ((x >= (0.5 * width)) && (x < (0.75 * width))) {
		return 1 // medium
	} else if ((x >= (0.75 * width)) && (x < (1. * width))) {
		return 2 // fine
	}
}

// Parse color from inlet message and set attribute
function parseAndSetColor(arr, colorName){
    arr.shift(); 
    var str = arr.join(" ")
    var color = parseColor(str)
    if(!color){
        return
    }
    ATTR[colorName] = color;
    mgraphics.redraw();
}

// Parse raw "jsarguments" and set values of ATTR object
function setAttributesFromArgs(){
    var parsedAttributes = parseAttributes(jsarguments)
    var keys = Object.keys(parsedAttributes)
    var unknown = []

    for(var i=0; i<keys.length; i++){
        if(ATTR[keys[i]]){
            ATTR[keys[i]] = parsedAttributes[keys[i]]
        }else{
            unknown.push(keys[i])
        }
    }
    if(unknown.length){
        console.error("Some arguments not recognized: '" + unknown.join(", ") + "'")
    }
    checkAttributes()
}

// Check formatting & reformat color attributes (if necessary)
function checkAttributes(){
    if(typeof ATTR.bgcolor !== "object"){
        var color = parseColor(ATTR.bgcolor)
        if(color){
            ATTR.bgcolor = color
        }else{
            ATTR.bgcolor = DEFAULT_ATTR.bgcolor
        }
    }
    if(typeof ATTR.bordercolor !== "object"){
        var color = parseColor(ATTR.bordercolor)
        if(color){
            ATTR.bordercolor = color
        }else{
            ATTR.bordercolor = DEFAULT_ATTR.bordercolor
        }
    }
}

// Catch-all
function anything(msg){ console.error("doesn't understand '" + messagename + "'") }