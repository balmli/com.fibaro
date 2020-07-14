'use strict';

const {ZwaveDevice} = require('homey-zwavedriver');

class FibaroRollerShutterDevice extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('dim', 'SWITCH_MULTILEVEL');
  }

}

module.exports = FibaroRollerShutterDevice;
