package hummelapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type (
	LEDInfectedAbstract struct {
		AbstractID string                          `json:"abstract_id"` // arduinoID of the LED abstract
		Info       *LEDInfectedAbstractGlobalInfo  `json:"info"`        // info of the LED abstract (cannot be changed)
		Setup      *LEDInfectedAbstractGlobalSetup `json:"setup"`       // setup of the LED abstract (configurable)
		Stripes    []*LEDInfectedAbstractStripe    `json:"stripes"`     // stripes of the LED abstract
	}

	ImageDimension struct {
		Height int `json:"height"`
		Width  int `json:"width"`
	}
	AbstractImage struct {
		ImageBasePath string         `json:"image_base_path"`
		Overview      ImageDimension `json:"overview"`
	}
	LEDInfectedAbstractGlobalInfo struct {
		Name    string        `json:"name"`     // human readable name of the abstract
		Image   AbstractImage `json:"image"`    // image definition for the abstract
		SrcFile string        `json:"src_file"` // source file of the abstract
	}

	LEDInfectedAbstractGlobalSetup struct {
		Position *LEDInfectedAbstractGlobalPosition `json:"position"` // position on the hummel wiese
	}

	LEDInfectedAbstractStripe struct {
		StripeID string                          `json:"stripe_id"`
		Setup    *LEDInfectedAbstractStripeSetup `json:"setup"`
		Config   *LEDInfectedArduinoStripeConfig `json:"config"`

		arduinoStrip *LEDInfectedArduinoStripe
	}

	LEDInfectedAbstractStripeSetup struct {
		ArduinoID       uint8  `json:"arduino_id"`
		ArduinoStripeID uint8  `json:"arduino_stripe_id"`
		Name            string `json:"name"` // human readable name of the stripe
	}

	LEDInfectedAbstractGlobalPosition struct {
		X int `json:"x"` // BlumenWiese x position
		Y int `json:"y"` // BlumenWises y position
	}
)

func GetAllLEDInfectedAbstracts(configDir string) ([]*LEDInfectedAbstract, error) {
	o := []*LEDInfectedAbstract{}

	matches, err := filepath.Glob(configDir + "/*.json")
	if err != nil {
		return nil, err
	}
	for _, m := range matches {
		buf, err := os.ReadFile(m)
		if err != nil {
			fmt.Printf("failed to read %s: %s", m, err)
			continue
		}
		abstract := &LEDInfectedAbstract{}
		err = json.Unmarshal(buf, abstract)
		if err != nil {
			fmt.Printf("failed to unmarshal %s: %s", m, err)
			continue
		}
		if abstract.Info == nil {
			return nil, fmt.Errorf("missing info field in %s", m)
		}
		abstract.Info.SrcFile = m
		o = append(o, abstract)
	}
	return o, nil
}

func (o *LEDInfectedAbstract) UpdateArduino(arduino *LEDInfectedArduino) error {
	for _, stripe := range o.Stripes {
		if stripe.Setup.ArduinoID != arduino.GetID() {
			continue
		}
		arduinoStripe, err := arduino.GetStripe(stripe.Setup.ArduinoStripeID)
		if err != nil {
			return err
		}
		stripe.Config = arduinoStripe.Config
		stripe.arduinoStrip = arduinoStripe
	}
	return nil
}

func (o *LEDInfectedAbstract) ResetArduino(arduino *LEDInfectedArduino) error {
	for _, stripe := range o.Stripes {
		if stripe.Setup.ArduinoID != arduino.GetID() {
			continue
		}
		_, err := arduino.GetStripe(stripe.arduinoStrip.StripeID)
		if err != nil {
			return err
		}
		stripe.Config = nil
		stripe.arduinoStrip = nil
	}
	return nil
}

func (o *LEDInfectedAbstract) SetSetup(setup *LEDInfectedAbstractGlobalSetup) error {
	o.Setup = setup
	return nil
}

func (o *LEDInfectedAbstract) Save() error {
	bytes, err := json.Marshal(o)
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %s", o.Info.SrcFile, err)
	}

	// now unmarshal it so we have a new struct, where we can remove the arduino config
	abstract := &LEDInfectedAbstract{}
	err = json.Unmarshal(bytes, abstract)
	for i, _ := range abstract.Stripes {
		abstract.Stripes[i].Config = nil
	}
	// and now marshal it again
	bytes, err = json.MarshalIndent(o, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %s", o.Info.SrcFile, err)
	}

	// Open a new file for writing only
	file, err := os.OpenFile(o.Info.SrcFile, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0666)
	if err != nil {
		return fmt.Errorf("failed to open %s: %s", o.Info.SrcFile, err)
	}
	defer file.Close()

	_, err = file.Write(bytes)
	if err != nil {
		return fmt.Errorf("failed to write %s: %s", o.Info.SrcFile, err)
	}

	return nil
}

func (o *LEDInfectedAbstract) SetConfig(config *LEDInfectedArduinoConfigStripeConfig, stripeIDs ...string) error {
	selectedStripes := []*LEDInfectedAbstractStripe{}

	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				selectedStripes = append(selectedStripes, abStripe)
				found = true
			}
		}
		if !found {
			return fmt.Errorf("could not found stripe %s", id)
		}
	}

	if len(selectedStripes) < 1 {
		return fmt.Errorf("no stripe selected")
	}

	for len(selectedStripes) > 0 {
		arduinoConnection := selectedStripes[0].arduinoStrip.connection
		arduinoID := selectedStripes[0].Setup.ArduinoID
		stripeMask := uint8(0)
		for i := len(selectedStripes) - 1; i >= 0; i-- {
			if selectedStripes[i].Setup.ArduinoID == arduinoID {
				stripeMask += (1 << selectedStripes[i].Setup.ArduinoStripeID)
				selectedStripes[i].Config.Config = config
				selectedStripes = append(selectedStripes[:i], selectedStripes[i+1:]...)
			}
		}
		if err := arduinoConnection.StripeSetConfig(stripeMask, config); err != nil {
			return err
		}
	}
	return nil
}

func (o *LEDInfectedAbstract) SetPalette(palette *LEDInfectedArduinoConfigStripePalette, stripeIDs ...string) error {
	selectedStripes := []*LEDInfectedAbstractStripe{}

	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				selectedStripes = append(selectedStripes, abStripe)
				found = true
			}
		}
		if !found {
			return fmt.Errorf("could not find stripe %s", id)
		}
	}

	if len(selectedStripes) < 1 {
		return fmt.Errorf("no stripe selected")
	}

	for len(selectedStripes) > 0 {
		arduinoConnection := selectedStripes[0].arduinoStrip.connection
		arduinoID := selectedStripes[0].Setup.ArduinoID
		stripeMask := uint8(0)
		for i := len(selectedStripes) - 1; i >= 0; i-- {
			if selectedStripes[i].Setup.ArduinoID == arduinoID {
				stripeMask += (1 << selectedStripes[i].Setup.ArduinoStripeID)
				selectedStripes[i].Config.Palette = palette
				selectedStripes = append(selectedStripes[:i], selectedStripes[i+1:]...)
			}
		}
		if err := arduinoConnection.StripeSetPalette(stripeMask, palette); err != nil {
			return err
		}
	}
	return nil
}

func (o *LEDInfectedAbstractStripe) SetSetup(setup *LEDInfectedAbstractStripeSetup) error {
	o.Setup = setup
	return nil
}

func (o *LEDInfectedAbstractStripe) SetConfig(config *LEDInfectedArduinoConfigStripeConfig) error {
	if o.arduinoStrip == nil {
		return fmt.Errorf("no arduino connected to stripe %s", o.StripeID)
	}
	return o.arduinoStrip.SetConfig(config)
}

func (o *LEDInfectedAbstractStripe) SetPalette(palette *LEDInfectedArduinoConfigStripePalette) error {
	if o.arduinoStrip == nil {
		return fmt.Errorf("no arduino connected to stripe %s", o.StripeID)
	}
	return o.arduinoStrip.SetPalette(palette)
}

func (o *LEDInfectedAbstractStripe) Save() error {
	if o.arduinoStrip == nil {
		return fmt.Errorf("no arduino connected to stripe %s", o.StripeID)
	}
	return o.arduinoStrip.Save()
}
