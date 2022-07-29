package hummelapi

import (
	"encoding/json"
	"fmt"
	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/mqtt"
	"os"
	"path/filepath"
	"sync"
)

type (
	LEDInfectedAbstract struct {
		AbstractID string                          `json:"abstract_id"` // arduinoID of the LED abstract
		Info       *LEDInfectedAbstractGlobalInfo  `json:"info"`        // info of the LED abstract (cannot be changed)
		Setup      *LEDInfectedAbstractGlobalSetup `json:"setup"`       // setup of the LED abstract (configurable)
		Stripes    []*LEDInfectedAbstractStripe    `json:"stripes"`     // stripes of the LED abstract

		overwriteBrightness *uint8
		linkedArduinos      []*LEDInfectedArduino
		getPreset           func(presetID string) (*LEDInfectedPreset, error)
		mqtt                *mqtt.Core
		baseTopic           string
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
		AreaMax  string `json:"max_view"`
		AreaMin  string `json:"min_view"`
	}
	ImageDimension struct {
		Height int `json:"height"`
		Width  int `json:"width"`
	}

	LEDInfectedAbstractGlobalSetup struct {
		Position *LEDInfectedAbstractGlobalPosition `json:"position"` // position on the hummel wiese
		Triggers []*LEDInfectedAbstractTrigger      `json:"triggers"`
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

	LEDInfectedAbstractTrigger struct {
		TriggerID      string `json:"trigger_id"`
		ArduinoID      uint8  `json:"arduino_id"`
		ArduinoInputID uint8  `json:"arduino_input_id"`

		parent *LEDInfectedAbstract
	}

	LEDInfectedAbstractGlobalPosition struct {
		X int `json:"x"` // BlumenWiese x position
		Y int `json:"y"` // BlumenWises y position
	}
)

func (o *LEDInfectedAbstractTrigger) callback(value byte) {
	if err := o.parent.mqtt.Publish(fmt.Sprintf("%s/trigger/%s", o.parent.baseTopic, o.TriggerID), 0, false, fmt.Sprintf("%t", value != 0)); err != nil {
		fmt.Printf("could not publish trigger %s state: %s", o.TriggerID, err)
	}
}

func GetAllLEDInfectedAbstracts(configDir string, getPreset func(presetID string) (*LEDInfectedPreset, error), mqtt *mqtt.Core) ([]*LEDInfectedAbstract, error) {
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
		for _, t := range abstract.Setup.Triggers {
			t.parent = abstract
		}
		abstract.mqtt = mqtt
		abstract.baseTopic = "ledinfected/" + abstract.AbstractID
		mqtt.RegisterAbstractCallback(abstract.AbstractID, abstract.mqttMessageHandler)
		abstract.getPreset = getPreset
		o = append(o, abstract)
	}
	return o, nil
}

func (o *LEDInfectedAbstract) MQTTUpdateStatus() error {
	online := 0
	for _, stripe := range o.Stripes {
		if stripe.Config != nil {
			online += 1
		}
	}

	var status string
	if online == 0 {
		status = "offline"
	} else if len(o.Stripes) == online {
		status = "online"
	} else {
		status = "partly-online"
	}
	return o.mqtt.Publish(o.baseTopic+"/status", 0, true, status)
}

func (o *LEDInfectedAbstract) mqttMessageHandler(topic string, msg string) {
	fmt.Printf("[%s]-[%s]: %s\n", o.AbstractID, topic, msg)
	switch topic {
	case "status":
	// nothing to do here
	case "preset":
		p, err := o.getPreset(msg)
		if err != nil {
			fmt.Printf("WARN: preset not found\n")
			return
		}
		for _, s := range o.Stripes {
			if s.Config == nil {
				fmt.Printf("WARN: arduino for stripe %s is offline, preset is not applied\n", s.StripeID)
				continue
			}
			if err := s.LoadPreset(p); err != nil {
				fmt.Printf("WARN: failed to load preset for stripe %s: %s", s.StripeID, err)
			}
		}
	case "config":
		config := &LEDInfectedArduinoConfigStripeConfig{}
		if err := json.Unmarshal([]byte(msg), config); err != nil {
			fmt.Printf("WARN: invalid config: %s\n", err)
			return
		}
		if err := o.SetConfig(config, o.getAllStripeIDs()...); err != nil {
			fmt.Printf("WARN: failed to set config: %s\n", err)
			return
		}
	case "palette":
		palette := &LEDInfectedArduinoConfigStripePalette{}
		if err := json.Unmarshal([]byte(msg), palette); err != nil {
			fmt.Printf("WARN: invalid palette: %s\n", err)
			return
		}
		if err := o.SetPalette(palette, o.getAllStripeIDs()...); err != nil {
			fmt.Printf("WARN: failed to set palette: %s\n", err)
			return
		}
	default:
		fmt.Printf("unhandled topic\n")
	}
}

func (o *LEDInfectedAbstract) UpdateArduino(arduino *LEDInfectedArduino) error {
	changed := false
	for _, stripe := range o.Stripes {
		for _, arduinoStripeSetup := range stripe.Setup.ArduinoStripes {
			if arduinoStripeSetup.ArduinoID != arduino.GetID() {
				continue
			}
			arduinoStripe, err := arduino.GetStripe(arduinoStripeSetup.ArduinoStripeID)
			if err != nil {
				return err
			}
			if (stripe.Config != nil) != (arduinoStripe.Config != nil) {
				changed = true
			}
			stripe.Config = arduinoStripe.Config
			for _, t := range o.Setup.Triggers {
				if t.ArduinoID == arduino.GetID() {
					for _, i := range arduino.Inputs {
						if t.ArduinoInputID == i.ArduinoInputID {
							i.RegisterInputCallback(t.callback)
						}
					}
				}
			}
			if o.getArduinoByID(arduino.GetID()) == nil {
				o.linkedArduinos = append(o.linkedArduinos, arduino)
			}
		}
	}
	if changed {
		return o.MQTTUpdateStatus()
	}
	return nil
}
func (o *LEDInfectedAbstract) getAllStripeIDs() []string {
	var stripeIDs []string
	for _, s := range o.Stripes {
		stripeIDs = append(stripeIDs, s.StripeID)
	}
	return stripeIDs
}
func (o *LEDInfectedAbstract) ResetArduino(arduino *LEDInfectedArduino) error {
	changed := false
	sendMQTTStatusIfChanged := func() error {
		if changed {
			return o.MQTTUpdateStatus()
		}
		return nil
	}
	for _, stripe := range o.Stripes {
		for _, arduinoStripeSetup := range stripe.Setup.ArduinoStripes {
			if arduinoStripeSetup.ArduinoID != arduino.GetID() {
				continue
			}
			if stripe.Config != nil {
				changed = true
			}
			stripe.Config = nil
		}
	}

	for i, a := range o.linkedArduinos {
		if a.GetID() == arduino.GetID() {
			o.linkedArduinos = append(o.linkedArduinos[:i], o.linkedArduinos[i+1:]...)
			return sendMQTTStatusIfChanged()
		}
	}
	return sendMQTTStatusIfChanged()
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
		if o.overwriteBrightness != nil {
			config.Brightness = *o.overwriteBrightness
		}
		if err := arduino.connection.StripeSetConfig(stripeMask, config); err != nil {
			return err
		}
	}
	return nil
}

func (o *LEDInfectedAbstract) setOverwriteBrightness(brightness uint8) {
	o.overwriteBrightness = &brightness
}

func (o *LEDInfectedAbstract) SetConfigBrightness(brightness uint8, stripeIDs ...string) error {
	config := o.GetArduinoStripeConfig()
	if config == nil {
		fmt.Printf("skipping brightness config for %s, no arduino online\n", o.AbstractID)
		return nil
	}
	config.Config.Brightness = brightness
	fmt.Printf("applying brightness config to abstract %s\n", o.AbstractID)
	return o.SetConfig(config.Config, stripeIDs...)
}

func (o *LEDInfectedAbstract) SetConfigSpeed(speed int8, stripeIDs ...string) error {
	config := o.GetArduinoStripeConfig()
	if config == nil {
		fmt.Printf("skipping speed config for %s, no arduino online\n", o.AbstractID)
		return nil
	}
	config.Config.MovementSpeed = speed
	fmt.Printf("applying speed config to abstract %s\n", o.AbstractID)
	return o.SetConfig(config.Config, stripeIDs...)
}

func (o *LEDInfectedAbstract) SetConfigStretch(stretch int8, stripeIDs ...string) error {
	config := o.GetArduinoStripeConfig()
	if config == nil {
		fmt.Printf("skipping stretch config for %s, no arduino online\n", o.AbstractID)
		return nil
	}
	config.Config.Stretch = stretch
	fmt.Printf("applying stretch config to abstract %s\n", o.AbstractID)
	return o.SetConfig(config.Config, stripeIDs...)
}

func (o *LEDInfectedAbstract) SetConfigOverlay(overlay uint8, stripeIDs ...string) error {
	config := o.GetArduinoStripeConfig()
	if config == nil {
		fmt.Printf("skipping overlay config for %s, no arduino online\n", o.AbstractID)
		return nil
	}
	config.Config.OverlayRatio = overlay
	fmt.Printf("applying overlay config to abstract %s\n", o.AbstractID)
	return o.SetConfig(config.Config, stripeIDs...)
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

func (o *LEDInfectedAbstract) Sync() {
	wg := sync.WaitGroup{}
	for _, a := range o.linkedArduinos {
		wg.Add(1)
		go func(ard *LEDInfectedArduino) {
			if err := ard.GlobalSync(); err != nil {
				fmt.Printf("failed to sync ardunio %d: %s\n", ard.GetID(), err)
			}
			defer wg.Done()
		}(a)
	}
	wg.Wait()
}

func (o *LEDInfectedAbstract) SaveMulti(stripeIDs ...string) error {
	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				abStripe.Save()
				found = true
			}
		}
		if !found {
			return fmt.Errorf("could not found stripe %s", id)
		}
	}

	return nil
}

func (o *LEDInfectedAbstract) LoadPresetMulti(p *LEDInfectedPreset, stripeIDs ...string) error {
	for _, id := range stripeIDs {
		found := false
		for _, abStripe := range o.Stripes {
			if abStripe.StripeID == id {
				abStripe.LoadPreset(p)
				found = true
			}
		}
		if !found {
			return fmt.Errorf("could not found stripe %s", id)
		}
	}

	return nil
}

func (o *LEDInfectedAbstract) GetArduinoStripeConfig() *LEDInfectedArduinoStripeConfig {
	for _, s := range o.Stripes {
		if s.Config != nil {
			return s.Config
		}
	}
	return nil
}
func (o *LEDInfectedAbstractStripe) SetSetup(setup *LEDInfectedAbstractStripeSetup) error {
	o.Setup = setup
	return nil
}

func (o *LEDInfectedAbstractStripe) SetConfig(config *LEDInfectedArduinoConfigStripeConfig) error {
	if o.parent.overwriteBrightness != nil {
		config.Brightness = *o.parent.overwriteBrightness
	}
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

func (o *LEDInfectedAbstractStripe) LoadPreset(preset *LEDInfectedPreset) error {
	if preset.Config != nil {
		if err := o.SetConfig(preset.Config); err != nil {
			return err
		}
	}
	if preset.Palette != nil {
		if err := o.SetPalette(preset.Palette); err != nil {
			return err
		}
	}
	for _, s := range o.Setup.ArduinoStripes {
		if _, stripe := o.parent.getArduinoStripeByID(s.ArduinoID, s.ArduinoStripeID); stripe != nil {
			if err := stripe.Save(); err != nil {
				return err
			}
		}
	}
	return nil
}
