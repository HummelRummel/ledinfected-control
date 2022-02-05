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

		linkedArduinos []*LEDInfectedArduino
	}
	LEDInfectedAbstractGlobalInfo struct {
		Name    string         `json:"name"`     // human readable name of the abstract
		Image   AbstractImages `json:"image"`    // image definition for the abstract
		SrcFile string         `json:"src_file"` // source file of the abstract
	}
	AbstractImages struct {
		ImageBasePath string                       `json:"image_base_path"`
		Overview      AbstractOverviewImage        `json:"overview"`
		StripeView    AbstractImageStripeViewImage `json:"stripe_view"`
	}
	AbstractOverviewImage struct {
		Dimension ImageDimension `json:"dimension"`
	}
	AbstractImageStripeViewImage struct {
		ImgMap []ImageMapArea `json:"img_map"`
	}
	ImageMapArea struct {
		StripeID string `json:"stripe_id"`
		Area     string `json:"area"`
	}
	ImageDimension struct {
		Height int `json:"height"`
		Width  int `json:"width"`
	}

	LEDInfectedAbstractGlobalSetup struct {
		Position *LEDInfectedAbstractGlobalPosition `json:"position"` // position on the hummel wiese
	}

	LEDInfectedAbstractStripe struct {
		StripeID string                          `json:"stripe_id"`
		Setup    *LEDInfectedAbstractStripeSetup `json:"setup"`
		Config   *LEDInfectedArduinoStripeConfig `json:"config"`

		parent *LEDInfectedAbstract
	}

	LedInfectedAbstractStripeArduinoSetup struct {
		ArduinoID       uint8 `json:"arduino_id"`
		ArduinoStripeID uint8 `json:"arduino_stripe_id"`
		Sync            uint8 `json:"sync"`
	}

	LEDInfectedAbstractStripeSetup struct {
		ArduinoStripes []LedInfectedAbstractStripeArduinoSetup `json:"arduino_stripes"`
		Name           string                                  `json:"name"` // human readable name of the stripe
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
			fmt.Printf("failed to read %s: %s\n", m, err)
			continue
		}
		abstract := &LEDInfectedAbstract{}
		err = json.Unmarshal(buf, abstract)
		if err != nil {
			fmt.Printf("failed to unmarshal %s: %s\n", m, err)
			continue
		}

		if abstract.Info == nil {
			return nil, fmt.Errorf("missing info field in %s", m)
		}
		abstract.Info.SrcFile = m

		for _, s := range abstract.Stripes {
			s.parent = abstract
		}
		o = append(o, abstract)
	}
	return o, nil
}

func (o *LEDInfectedAbstract) UpdateArduino(arduino *LEDInfectedArduino) error {
	for _, stripe := range o.Stripes {
		for _, arduinoStripeSetup := range stripe.Setup.ArduinoStripes {
			if arduinoStripeSetup.ArduinoID != arduino.GetID() {
				continue
			}
			arduinoStripe, err := arduino.GetStripe(arduinoStripeSetup.ArduinoStripeID)
			if err != nil {
				return err
			}
			stripe.Config = arduinoStripe.Config
			if o.getArduinoByID(arduino.GetID()) == nil {
				o.linkedArduinos = append(o.linkedArduinos, arduino)
			}
		}
	}
	return nil
}

func (o *LEDInfectedAbstract) ResetArduino(arduino *LEDInfectedArduino) error {
	for _, stripe := range o.Stripes {
		for _, arduinoStripeSetup := range stripe.Setup.ArduinoStripes {
			if arduinoStripeSetup.ArduinoID != arduino.GetID() {
				continue
			}
			//		_, err := arduino.GetStripe(stripe.arduinoStrip.StripeID)
			//		if err != nil {
			//			return err
			//		}
			stripe.Config = nil
			//		stripe.arduinoStrip = nil
		}
	}
	for i, a := range o.linkedArduinos {
		if a.GetID() == arduino.GetID() {
			o.linkedArduinos = append(o.linkedArduinos[:i], o.linkedArduinos[i+1:]...)
			return nil
		}
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

func (o *LEDInfectedAbstract) getArduinoByID(arduinoID uint8) *LEDInfectedArduino {
	for _, a := range o.linkedArduinos {
		if a.GetID() == arduinoID {
			return a
		}
	}
	return nil
}

func (o *LEDInfectedAbstract) getArduinoStripeByID(arduinoID uint8, arduinoStripeID uint8) (*LEDInfectedArduino, *LEDInfectedArduinoStripe) {
	arduino := o.getArduinoByID(arduinoID)
	if arduino == nil {
		return nil, nil
	}
	for _, stripe := range arduino.Stripes {
		if stripe.StripeID == arduinoStripeID {
			return arduino, stripe
		}
	}
	return arduino, nil
}

func (o *LEDInfectedAbstract) SetConfig(config *LEDInfectedArduinoConfigStripeConfig, stripeIDs ...string) error {
	selectedStripes := []LedInfectedAbstractStripeArduinoSetup{}

	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				selectedStripes = append(selectedStripes, abStripe.Setup.ArduinoStripes...)
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
		arduinoID := selectedStripes[0].ArduinoID
		arduino := o.getArduinoByID(arduinoID)
		if arduino == nil {
			fmt.Printf("arduino with ID %d not online, skipping stripe %d\n", arduinoID, selectedStripes[0].ArduinoStripeID)
			selectedStripes = append(selectedStripes[:0], selectedStripes[1:]...)
			continue
		}
		stripeMask := uint8(0)
		for i := len(selectedStripes) - 1; i >= 0; i-- {
			if selectedStripes[i].ArduinoID == arduinoID {
				arduinoStripeID := selectedStripes[i].ArduinoStripeID
				stripeMask += (1 << arduinoStripeID)
				if arduino != nil {
					arduinoStripe, err := arduino.GetStripe(arduinoStripeID)
					if err != nil {
						fmt.Printf("invalid stripe ID %d\n", arduinoStripeID)
						continue
					}
					arduinoStripe.Config.Config = config
				}
				selectedStripes = append(selectedStripes[:i], selectedStripes[i+1:]...)
			}
		}
		if err := arduino.connection.StripeSetConfig(stripeMask, config); err != nil {
			return err
		}
	}
	return nil
}

func (o *LEDInfectedAbstract) SetPalette(palette *LEDInfectedArduinoConfigStripePalette, stripeIDs ...string) error {
	selectedStripes := []LedInfectedAbstractStripeArduinoSetup{}

	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				selectedStripes = append(selectedStripes, abStripe.Setup.ArduinoStripes...)
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
		arduinoID := selectedStripes[0].ArduinoID
		arduino := o.getArduinoByID(arduinoID)
		if arduino == nil {
			fmt.Printf("arduino with ID %d not online, skipping stripe %d\n", arduinoID, selectedStripes[0].ArduinoStripeID)
			selectedStripes = append(selectedStripes[:0], selectedStripes[1:]...)
			continue
		}
		stripeMask := uint8(0)
		for i := len(selectedStripes) - 1; i >= 0; i-- {
			if selectedStripes[i].ArduinoID == arduinoID {
				arduinoStripeID := selectedStripes[i].ArduinoStripeID
				stripeMask += (1 << arduinoStripeID)
				if arduino != nil {
					arduinoStripe, err := arduino.GetStripe(arduinoStripeID)
					if err != nil {
						fmt.Printf("invalid stripe ID %d\n", arduinoStripeID)
						continue
					}
					arduinoStripe.Config.Palette = palette
				}
				selectedStripes = append(selectedStripes[:i], selectedStripes[i+1:]...)
			}
		}
		if err := arduino.connection.StripeSetPalette(stripeMask, palette); err != nil {
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
	for _, s := range o.Setup.ArduinoStripes {
		if _, stripe := o.parent.getArduinoStripeByID(s.ArduinoID, s.ArduinoStripeID); stripe != nil {
			if err := stripe.SetConfig(config); err != nil {
				return err
			}
		}
	}
	return nil
}

func (o *LEDInfectedAbstractStripe) SetPalette(palette *LEDInfectedArduinoConfigStripePalette) error {
	for _, s := range o.Setup.ArduinoStripes {
		if _, stripe := o.parent.getArduinoStripeByID(s.ArduinoID, s.ArduinoStripeID); stripe != nil {
			if err := stripe.SetPalette(palette); err != nil {
				return err
			}
		}
	}
	return nil
}

func (o *LEDInfectedAbstractStripe) Save() error {
	for _, s := range o.Setup.ArduinoStripes {
		if _, stripe := o.parent.getArduinoStripeByID(s.ArduinoID, s.ArduinoStripeID); stripe != nil {
			if err := stripe.Save(); err != nil {
				return err
			}
		}
	}
	return nil
}
