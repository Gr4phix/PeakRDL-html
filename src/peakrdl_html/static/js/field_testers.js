// This file is part of PeakRDL-html <https://github.com/SystemRDL/PeakRDL-html>.
// and can be redistributed under the terms of GNU GPL v3 <https://www.gnu.org/licenses/>.

// registry of register values by address string in hex
var RegValueRegistery = {};

function init_reg_value(){
    var state = get_reg_state();
    if(state != null) {
        var reg_el = document.getElementById("_RegValueTester");
        reg_el.value = "0x" + state.value.toString(16);
        reg_el.classList.remove("invalid");
        update_field_value_testers();
    } else {
        reset_field_inputs();
    }

    for(var i=0; i<RAL.get_node(CurrentID).fields.length; i++){
        update_field_enum_visibility(i);
    }
}

function save_reg_state(){
    var addr_key = RAL.get_absolute_addr(CurrentID).toString(16);
    var reg_el = document.getElementById("_RegValueTester");

    var state = {};
    state.value = toBigInt(reg_el.value);
    state = userHooks.save_extra_reg_state(state)
    RegValueRegistery[addr_key] = state;
}

function get_reg_state(){
    var addr_key = RAL.get_absolute_addr(CurrentID).toString(16);
    if(addr_key in RegValueRegistery) {
        return RegValueRegistery[addr_key];
    } else {
        return null;
    }
}

function init_radix_buttons(){
    var node = RAL.get_node(CurrentID);
    for(var i=0; i<node.fields.length; i++){
        var el = document.getElementById("_RadixButton" + node.fields[i].name);
        el.innerHTML = node.fields[i].disp;
    }
}

function reset_field_inputs(){
    var node = RAL.get_node(CurrentID);
    for(var i=0; i<node.fields.length; i++){
        var el = document.getElementById("_FieldValueTester" + node.fields[i].name);
        el.value = format_field_value(i, node.fields[i].reset);
        if("encode" in node.fields[i]) {
            var el = document.getElementById("_FieldValueEnumTester" + node.fields[i].name);
            el.value = "0x" + node.fields[i].reset.toString(16);
        }
    }
    update_reg_value_tester();
}

function update_field_value_testers(){
    // Update all the field tester inputs based on the register input
    for(var i=0; i<RAL.get_node(CurrentID).fields.length; i++){
        update_field_value_tester(i);
    }
    userHooks.onRegValueEditorChange();
}

function update_reg_value_tester(){
    // Update the register tester input based on all of the individual field inputs
    var reg_value = bigInt(0);
    var node = RAL.get_node(CurrentID);
    for(var i=0; i<node.fields.length; i++){
        var msb = node.fields[i].msb;
        var lsb = node.fields[i].lsb;
        var el = document.getElementById("_FieldValueTester" + node.fields[i].name);
        var value = toBigInt(el.value);
        var mask = bigInt(1).shiftLeft(msb - lsb + 1).subtract(1);
        value = value.and(mask);
        reg_value = reg_value.add(value.shiftLeft(lsb));
    }
    var reg_el = document.getElementById("_RegValueTester");
    reg_el.value = "0x" + reg_value.toString(16);
    reg_el.classList.remove("invalid");
    userHooks.onRegValueEditorChange();
}

function update_field_value_tester(idx){
    var reg_el = document.getElementById("_RegValueTester");
    var reg_value = toBigInt(reg_el.value);
    var node = RAL.get_node(CurrentID);

    var msb = node.fields[idx].msb;
    var lsb = node.fields[idx].lsb;
    var value = reg_value.shiftRight(lsb);
    var mask = bigInt(1).shiftLeft(msb - lsb + 1).subtract(1);
    value = value.and(mask);
    var el = document.getElementById("_FieldValueTester" + node.fields[idx].name);
    el.value = format_field_value(idx, value);
    el.classList.remove("invalid");

    if("encode" in RAL.get_node(CurrentID).fields[idx]) {
        var el = document.getElementById("_FieldValueEnumTester" + node.fields[idx].name);
        el.value = "0x" + value.toString(16);
    }
}

function format_field_value(idx, value) {
    if(RAL.get_node(CurrentID).fields[idx].disp == "D"){
        return(value.toString());
    } else {
        return("0x" + value.toString(16));
    }
}

function update_field_enum_visibility(idx){
    var node = RAL.get_node(CurrentID);

    if(!("encode" in node.fields[idx])) return;

    var d = node.fields[idx].disp;
    var enum_el = document.getElementById("_FieldValueEnumTester" + node.fields[idx].name);
    var txt_el = document.getElementById("_FieldValueTester" + node.fields[idx].name);
    if(d == "E") {
        enum_el.style.display = "inline";
        txt_el.style.display = "none";
    } else {
        enum_el.style.display = "none";
        txt_el.style.display = "inline";
    }
}

//==============================================================================
// Events
//==============================================================================

function onRadixSwitch(el){
    var idx = RAL.lookup_field_idx(el.dataset.name);
    var node = RAL.get_node(CurrentID);
    var d = node.fields[idx].disp;
    if(d == "H") {
        d = "D";
    } else if((d == "D") && ("encode" in node.fields[idx])) {
        d = "E";
    } else {
        d = "H";
    }

    el.innerHTML = d;
    node.fields[idx].disp = d;
    update_field_enum_visibility(idx);
    update_field_value_tester(idx);
}

function onDecodedFieldEnumChange(el) {
    var idx = RAL.lookup_field_idx(el.dataset.name);
    var el2 = document.getElementById("_FieldValueTester" + RAL.get_node(CurrentID).fields[idx].name);
    el2.value = el.value;
    update_reg_value_tester();
    save_reg_state();
}

function onDecodedFieldInput(el){
    var idx = RAL.lookup_field_idx(el.dataset.name);
    var node = RAL.get_node(CurrentID);
    var msb = node.fields[idx].msb;
    var lsb = node.fields[idx].lsb;
    var value;

    try {
        value = toBigInt(el.value);
    } catch(error) {
        value = bigInt(-1);
    }

    var max_value = bigInt(1).shiftLeft(msb - lsb + 1);
    if(value.lt(0) || (value.geq(max_value))){
        if(!el.classList.contains("invalid")) el.classList.add("invalid");
        return;
    }
    el.classList.remove("invalid");

    if("encode" in node.fields[idx]) {
        var el2 = document.getElementById("_FieldValueEnumTester" + node.fields[idx].name);
        el2.value = "0x" + value.toString(16);
    }
    update_reg_value_tester();
    save_reg_state();
}

function onEncodedRegInput(el){
    var value;
    try {
        value = toBigInt(el.value);
    } catch(error) {
        value = bigInt(-1);
    }

    if(value.lt(0)){
        if(!el.classList.contains("invalid")) el.classList.add("invalid");
        return;
    }
    el.classList.remove("invalid");
    update_field_value_testers();
    save_reg_state();
}

function onResetRegValue(el){
    reset_field_inputs();
    save_reg_state();
}
