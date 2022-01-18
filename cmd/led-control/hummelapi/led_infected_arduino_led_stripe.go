package hummelapi

type (
	LEDInfectedArduinoStripe struct {
		connection *LEDInfectedArduinoConnection
		StripeID   uint8

		Config *LEDInfectedArduinoStripeConfig
	}

	LEDInfectedArduinoStripeConfig struct {
		Setup   *LEDInfectedArduinoConfigStripeSetup   `json:"setup"`
		Config  *LEDInfectedArduinoConfigStripeConfig  `json:"Config"`
		Palette *LEDInfectedArduinoConfigStripePalette `json:"palette"`
	}
)

func newLEDInfectedArduinoStripe(arduino *LEDInfectedArduino, stripeID uint8) (*LEDInfectedArduinoStripe, error) {
	setup, err := arduino.connection.StripeGetSetup(stripeID)
	if err != nil {
		return nil, err
	}
	config, err := arduino.connection.StripeGetConfig(stripeID)
	if err != nil {
		return nil, err
	}
	palette, err := arduino.connection.StripeGetPalette(stripeID)
	if err != nil {
		return nil, err
	}

	return &LEDInfectedArduinoStripe{
		connection: arduino.connection,
		StripeID:   stripeID,
		Config: &LEDInfectedArduinoStripeConfig{
			Setup:   setup,
			Config:  config,
			Palette: palette,
		},
	}, nil
}

func (o *LEDInfectedArduinoStripe) GetSetup() *LEDInfectedArduinoConfigStripeSetup {
	return o.Config.Setup
}

func (o *LEDInfectedArduinoStripe) SetSetup(setup *LEDInfectedArduinoConfigStripeSetup) error {
	if err := o.connection.StripeSetSetup(o.StripeID, setup); err != nil {
		return err
	}
	o.Config.Setup = setup
	return nil
}

func (o *LEDInfectedArduinoStripe) SaveSetup() error {
	return o.connection.StripeSetupSave(o.StripeID)
}

func (o *LEDInfectedArduinoStripe) GetConfig() *LEDInfectedArduinoConfigStripeConfig {
	return o.Config.Config
}

func (o *LEDInfectedArduinoStripe) SetConfig(config *LEDInfectedArduinoConfigStripeConfig) error {
	if err := o.connection.StripeSetConfig(o.StripeID, config); err != nil {
		return err
	}
	o.Config.Config = config
	return nil
}

func (o *LEDInfectedArduinoStripe) GetConfigPalette() *LEDInfectedArduinoConfigStripePalette {
	return o.Config.Palette
}

func (o *LEDInfectedArduinoStripe) SetPalette(palette *LEDInfectedArduinoConfigStripePalette) error {
	if err := o.connection.StripeSetPalette(o.StripeID, palette); err != nil {
		return err
	}
	o.Config.Palette = palette
	return nil
}

func (o *LEDInfectedArduinoStripe) Save() error {
	return o.connection.StripeSave(o.StripeID)
}
