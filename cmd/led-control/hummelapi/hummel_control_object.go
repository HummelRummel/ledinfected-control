package hummelapi

type (
	HummelControlObject struct {
		ID        string                       `json:"id"`          // id of the object
		ImgBaseID string                       `json:"img_base_id"` // id for selecting the correct object images
		Position  HummelControlObjectPosition  `json:"position"`    // position on the hummel wiese
		LEDConfig HummelControlObjectLEDConfig `json:"led_config"`  // config of the leds
	}

	HummelControlObjectLEDConfig struct {
		CircleStripes []HummelControlObjectLEDStripe `json:"cricle_stripes"`  // cycle stripes of the object
		RadialStripes []HummelControlObjectLEDStripe `json:"raadial_stripes"` // radial stripes of the object
	}

	HummelControlObjectLEDStripe struct {
		StripeName    string                            `json:"stripe_name"`     // name of the stripe
		ArduinoID     uint8                             `json:"arduino_id"`      // id of the arduino connected to the stripe
		//StripeID      string                            `json:"stripe_id"`       // id of the stripe
		//LEDLineSetups []HummelControlObjectLEDLineSetup `json:"led_line_setups"` // physical setup of the LEDs
		Config        HummelArduinoLedStripeConfig      `json:"config"`
		IsVirtual     *bool                              `json:"is_virtual"` // if the circle stripe is only virtual
		RadialPos     *uint8                             `json:"radial_pos"` // position of the radial stripe
	}

	//HummelControlObjectLEDLineSetup struct {
	//	Index     uint8 `json:"index"`      // Index of the line in the stripe
	//	NumLEDS   uint8 `json:"num_leds"`   // Number of LEDs of this line
	//	LedOffset uint8 `json:"led_offset"` // Offset of the LEDs of that line
	//}

	HummelControlObjectPosition struct {
		X int `json:"x"` // BlumenWiese x position
		Y int `json:"y"` // BlumenWises y position
	}
)
