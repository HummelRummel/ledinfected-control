package hummelapi

type (
	HummelArduinoLedStripe struct {
		connection *HummelArduinoConnection
		stripeType uint8
		setupType  uint8

		currentConfig *HummelArduinoLedStripeConfig
	}
)

func (o *HummelArduinoLedStripe) SetSetup(ledPin uint8, virtualLen uint8, s0NumLeds, s0Offset, s1NumLeds, s1Offset, s2NumLeds, s2Offset, s3NumLeds, s3Offset uint8) error {
	_, err := o.connection.HummelCommand(o.setupType, hummelCommandCodeSetupConfig, []byte{ledPin, virtualLen, s0NumLeds, s0Offset, s1NumLeds, s1Offset, s2NumLeds, s2Offset, s3NumLeds,s3Offset})
	if err != nil {
		return err
	}
//	o.config.Pin.NumLEDs = numLeds
	return nil
}

func (o *HummelArduinoLedStripe) SaveSetup() error {
	_, err := o.connection.HummelCommand(o.setupType, hummelCommandCodeSetupSave, nil)
	return err
}

func (o *HummelArduinoLedStripe) SetConfig(speed uint8, directionBool bool, brightness uint8) error {
	direction := uint8(0)
	if directionBool {
		direction = 1
	}
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodeConfig, []byte{speed,direction,brightness})
	if err != nil {
		return err
	}
	return nil
}

func (o *HummelArduinoLedStripe) fillMissing(palette *HummelArduinoLedStripePaletteConfig) {
	nullVal := uint8(0);
	for _,e:=range palette.Palette {
		if e.H == nil {
			if o.currentConfig == nil {
				e.H = &nullVal;
			} else {
				hsv := o.currentConfig.Palette.getHSVByID(e.ID)
				if hsv != nil {
					e.H = hsv.H
				} else {
					e.H = &nullVal
				}
			}
		}
		if e.S == nil {
			if o.currentConfig == nil {
				e.S = &nullVal;
			} else {
				hsv := o.currentConfig.Palette.getHSVByID(e.ID)
				if hsv != nil {
					e.S = hsv.S
				} else {
					e.S = &nullVal
				}
			}
		}
		if e.V == nil {
			if o.currentConfig == nil {
				e.V = &nullVal;
			} else {
				hsv := o.currentConfig.Palette.getHSVByID(e.ID)
				if hsv != nil {
					e.V = hsv.V
				} else {
					e.V = &nullVal
				}
			}
		}
	}
}

func (o *HummelArduinoLedStripe) SetPaletteCHSV(palette *HummelArduinoLedStripePaletteConfig) error {
	o.fillMissing(palette)
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodePaletteCHSV, palette.getBytes())
	if err != nil {
		return err
	}
//	o.config.Palette = palette
	return nil
}

func (o *HummelArduinoLedStripe) SaveConfig() error {
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodeSave, nil)
	return err
}
