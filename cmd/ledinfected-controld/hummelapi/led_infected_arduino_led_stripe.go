package hummelapi

import (
	"fmt"
)

type (
	LEDInfectedArduinoStripe struct {
		connection *LEDInfectedArduinoConnection
		StripeID   uint8

		Config *LEDInfectedArduinoStripeConfig
	}

	LEDInfectedArduinoStripeConfig struct {
		Setup   *LEDInfectedArduinoConfigStripeSetup   `json:"setup"`
		Config  *LEDInfectedArduinoConfigStripeConfig  `json:"config"`
		Palette *LEDInfectedArduinoConfigStripePalette `json:"palette"`
	}
)

func newLEDInfectedArduinoStripe(arduino *LEDInfectedArduino, stripeID uint8) (*LEDInfectedArduinoStripe, error) {
	//time.Sleep(time.Millisecond*1000)
	fmt.Printf("MOA: get stripe[%d] setup\n", stripeID)
	setup, err := arduino.connection.StripeGetSetup(stripeID)
	if err != nil {
		return nil, err
	}
	//time.Sleep(time.Millisecond*1000)
	fmt.Printf("MOA: get stripe[%d] config\n", stripeID)
	config, err := arduino.connection.StripeGetConfig(stripeID)
	if err != nil {
		return nil, err
	}
	//time.Sleep(time.Millisecond*1000)
	fmt.Printf("MOA: get stripe[%d] palette\n", stripeID)
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
	if err := o.connection.StripeSetConfig(1<<o.StripeID, config); err != nil {
		return err
	}
	o.Config.Config = config
	return nil
}

func (o *LEDInfectedArduinoStripe) GetConfigPalette() *LEDInfectedArduinoConfigStripePalette {
	return o.Config.Palette
}

func (o *LEDInfectedArduinoStripe) SetPalette(palette *LEDInfectedArduinoConfigStripePalette) error {
	if err := o.connection.StripeSetPalette(1<<o.StripeID, palette); err != nil {
		return err
	}
	o.Config.Palette = palette
	return nil
}

func (o *LEDInfectedArduinoStripe) Save() error {
	return o.connection.StripeSave(1 << o.StripeID)
}
