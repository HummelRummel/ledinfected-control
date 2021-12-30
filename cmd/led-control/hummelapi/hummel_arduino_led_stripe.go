package hummelapi

type (
	HummelArduinoLedStripe struct {
		connection *HummelArduinoConnection
		stripeType uint8
		setupType  uint8

//		config *HummelArduinoLedStripeConfig
	}
)

func (o *HummelArduinoLedStripe) SetLedPin(pin uint8) error {
	_, err := o.connection.HummelCommand(o.setupType, hummelCommandCodeSetupLedPin, []byte{pin})
	if err != nil {
		return err
	}
//	o.config.Pin.LedPin = pin
	return nil
}

func (o *HummelArduinoLedStripe) SetNumLeds(numLeds uint8) error {
	_, err := o.connection.HummelCommand(o.setupType, hummelCommandCodeSetupNumLeds, []byte{numLeds})
	if err != nil {
		return err
	}
//	o.config.Pin.NumLEDs = numLeds
	return nil
}

func (o *HummelArduinoLedStripe) SavePinConfig() error {
	_, err := o.connection.HummelCommand(o.setupType, hummelCommandCodeSetupSave, nil)
	return err
}

func (o *HummelArduinoLedStripe) SetBrightness(brightness uint8) error {
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodeBrightness, []byte{brightness})
	if err != nil {
		return err
	}
//	o.config.Base.Brightness = brightness
	return nil
}

func (o *HummelArduinoLedStripe) SetMovementSpeed(speed uint8) error {
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodeMovementSpeed, []byte{speed})
	if err != nil {
		return err
	}
//	o.config.Base.MovementSpeed = speed
	return nil
}

func (o *HummelArduinoLedStripe) SetMovementDirection(direction bool) error {
	val := uint8(0)
	if direction {
		val = 1
	}
	_, err := o.connection.HummelCommand(o.stripeType, hummelCommandCodeMovementDirection, []byte{val})
	if err != nil {
		return err
	}
//	o.config.Base.MovementDirection = (val == 1)
	return nil
}

func (o *HummelArduinoLedStripe) SetPaletteCHSV(palette *HummelArduinoLedStripePaletteConfig) error {
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
