package hummelapi

import "fmt"

type (
	HummelControlObject struct {
		Name      *string                       `json:"name"`        // human readable name of the object
		ID        string                        `json:"id"`          // id of the object
		ImgBaseID *string                       `json:"img_base_id"` // id for selecting the correct object images
		Position  *HummelControlObjectPosition  `json:"position"`    // position on the hummel wiese
		LEDConfig *HummelControlObjectLEDConfig `json:"led_config"`  // config of the leds
	}

	HummelControlObjectLEDConfig struct {
		CircleStripes []*HummelControlObjectLEDStripe `json:"cricle_stripes"` // cycle stripes of the object
		RadialStripes []*HummelControlObjectLEDStripe `json:"radial_stripes"` // radial stripes of the object
	}

	HummelControlObjectLEDStripe struct {
		StripeName string                        `json:"stripe_name"` // name of the stripe
		ArduinoID  *uint8                        `json:"arduino_id"`  // id of the arduino connected to the stripe
		Config     *HummelArduinoLedStripeConfig `json:"config"`
		IsVirtual  *bool                         `json:"is_virtual"` // if the circle stripe is only virtual
		RadialPos  *uint8                        `json:"radial_pos"` // position of the radial stripe
	}

	HummelControlObjectPosition struct {
		X int `json:"x"` // BlumenWiese x position
		Y int `json:"y"` // BlumenWises y position
	}
)

func (o *HummelControlObjectLEDConfig) GetRadialStripeByName(stripeName string) (*HummelControlObjectLEDStripe, error) {
	for _, r := range o.RadialStripes {
		if r.StripeName == stripeName {
			return r, nil
		}
	}
	return nil, fmt.Errorf("stripe not found")
}

func (o *HummelControlObjectLEDStripe) Fill(s *HummelControlObjectLEDStripe) error {
	if o.StripeName != s.StripeName {
		return fmt.Errorf("wrong stripe")
	}
	if s.Config == nil {
		return fmt.Errorf("empty config given, nothing to fill up")
	}
	if s.ArduinoID == nil {
		s.ArduinoID = o.ArduinoID
	}
	if s.Config.StripeID == nil {
		s.Config.StripeID = o.Config.StripeID
	}
	if s.Config.Base == nil {
		s.Config.Base = o.Config.Base
	}
	if s.Config.Base.MovementSpeed == nil {
		s.Config.Base.MovementSpeed = o.Config.Base.MovementSpeed
	}
	if s.Config.Base.MovementDirection == nil {
		s.Config.Base.MovementDirection = o.Config.Base.MovementDirection
	}
	if s.Config.Base.Brightness == nil {
		s.Config.Base.Brightness = o.Config.Base.Brightness
	}
	if s.Config.Base.SpeedCorrection == nil {
		s.Config.Base.SpeedCorrection = o.Config.Base.SpeedCorrection
	}
	if s.Config.Pin == nil {
		s.Config.Pin = o.Config.Pin
	}
	if s.Config.Pin.LedPin == nil {
		s.Config.Pin.LedPin = o.Config.Pin.LedPin
	}
	if s.Config.Pin.VirtualLen == nil {
		s.Config.Pin.VirtualLen = o.Config.Pin.VirtualLen
	}
	if s.Config.Palette == nil {
		s.Config.Palette = o.Config.Palette
	}
	for _,p:=range s.Config.Palette.Palette {
		if p == nil {
			return fmt.Errorf("invalid palette")
		}
		refP := o.Config.Palette.getHSVByID(p.ID)
		if refP == nil {
			return fmt.Errorf("palette not found")
		}
		if p.H == nil {
			p.H = refP.H
		}
		if p.S == nil {
			p.S = refP.S
		}
		if p.V == nil {
			p.V = refP.V
		}
	}
	return nil
}