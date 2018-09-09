'use strict';

const Homey = require('homey');
const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

class FibaroDimmerTwoDevice extends ZwaveDevice {

	async onMeshInit() {
		this._momentaryTrigger = new Homey.FlowCardTriggerDevice('FGD-212_momentary')
			.register().registerRunListener(this._switchTriggersRunListener.bind(this));
		this._toggleTrigger = new Homey.FlowCardTriggerDevice('FGD-212_toggle')
			.register().registerRunListener(this._switchTriggersRunListener.bind(this));
		this._rollerTrigger = new Homey.FlowCardTriggerDevice('FGD-212_roller')
			.register().registerRunListener(this._switchTriggersRunListener.bind(this));

		this._brightnessAction = new Homey.FlowCardAction('FGD-212_set_brightness')
			.register().registerRunListener(this._setBrightnessRunListener.bind(this));
		this._dimDurationAction = new Homey.FlowCardAction('FGD-212_dim_duration')
			.register().registerRunListener(this._dimDurationRunListener.bind(this));
		this._setTimerAction = new Homey.FlowCardAction('FGD-212_set_timer')
			.register().registerRunListener(this._setTimerRunListener.bind(this));
		this._resetMeterAction = new Homey.FlowCardAction('FGD-212_reset_meter')
			.register().registerRunListener(this._resetMeterRunListener.bind(this));

		this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
		this.registerCapability('dim', 'SWITCH_MULTILEVEL');
		this.registerCapability('measure_power', 'SENSOR_MULTILEVEL');
		this.registerCapability('meter_power', 'METER');

		this.registerSetting('force_no_dim', value => new Buffer([value ? 2 : 0]));
		this.registerSetting('kwh_report', value => new Buffer([value * 100]));

		this.registerReportListener('SCENE_ACTIVATION', 'SCENE_ACTIVATION_SET', (report) => {
			if (report.hasOwnProperty('Scene ID')) {
				const data = {
					scene: report['Scene ID'].toString(),
				};

				switch (this.getSetting('switch_type')) {
				case '0':
					this._momentaryTrigger.trigger(this, null, data);
					break;
				case '1':
					this._toggleTrigger.trigger(this, null, data);
					break;
				case '2':
					this._rollerTrigger.trigger(this, null, data);
					break;
				}
			}
		});
	}

	async _setBrightnessRunListener(args, state) {
		if (!args.hasOwnProperty('set_forced_brightness_level')) throw Error('set_forced_brightness_level_property_missing');
		if (typeof args.set_forced_brightness_level !== 'number') throw Error('forced_brightness_level_is_not_a_number');
		if (args.set_forced_brightness_level > 1) throw Error('forced_brightness_level_out_of_range');

		try {
			let result = await args.device.configurationSet({
				id: 'forced_brightness_level'
			}, Math.round(args.set_forced_brightness_level * 99));
			return args.device.setSettings({
				'forced_brightness_level': args.set_forced_brightness_level
			});
		}
		catch (error) {
			args.device.log(error.message);
			throw error;
		}
		throw Error('unknown_error');

	}

	async _dimDurationRunListener(args, state) {
		if (!args.hasOwnProperty('dimming_duration')) return Promise.reject('dimming_duration_property_missing');
		if (typeof args.dimming_duration !== 'number') return Promise.reject('dimming_duration_is_not_a_number');
		if (args.brightness_level > 1) return Promise.reject('brightness_level_out_of_range');
		if (args.dimming_duration > 127) return Promise.reject('dimming_duration_out_of_range');

		if (args.device.node.CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL) {
			return await args.device.node.CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_SET({
				Value: new Buffer([Math.round(args.brightness_level * 99)]),
				'Dimming Duration': new Buffer([args.dimming_duration + (args.duration_unit * 127)]),
			});
		}
		return Promise.reject('unknown_error');
	}

	async _setTimerRunListener(args, state) {
		if (!args.hasOwnProperty('set_timer_functionality')) throw Error('set_timer_property_missing');
		if (args.set_timer_functionality > 32767) throw Error('set_timer_out_of_range');

		let value = null;
		try {
			value = new Buffer(2);
			value.writeIntBE(args.set_timer_functionality, 0, 2);
		}
		catch (err) {
			throw Error('failed_to_write_config_value_to_buffer');
		}

		try {
			let result = await args.device.configurationSet({
				id: 'timer_functionality'
			}, value);
			return args.device.setSettings({
				'timer_functionality': args.set_timer_functionality
			});
		}
		catch (error) {
			args.device.log(error.message);
			throw error;
		}
		throw Error('unknown_error');
	}

	async _resetMeterRunListener(args, state) {
		if (args.device.node.CommandClass.COMMAND_CLASS_METER) {
			return await args.device.node.CommandClass.COMMAND_CLASS_METER.METER_RESET({});
		}
		return Promise.reject('unknown_error');
	}

	_switchTriggersRunListener(args, state) {
		return state && args && state.scene === args.scene;
	}
}

module.exports = FibaroDimmerTwoDevice;