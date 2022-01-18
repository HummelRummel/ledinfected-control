package hummelapi

const (
	stripeTypeCircle        = 0
	stripeTypeRadial        = 1
	stripeTypeStraight      = 2
	stripeTypeVirtualCircle = 3
)

type (
	LEDInfectedArduinoConfigGlobalSetup struct {
		ID         uint8  `json:"arduinoID"`
		NumStripes uint8  `json:"num_stripes"`
		DevFile    string `json:"dev_file"`
	}

	LEDInfectedArduinoConfigStripeSetup struct {
		LedPin     uint8                                           `json:"led_pin"`
		StripeType uint8                                           `json:"stripe_type"`
		VirtualLen uint8                                           `json:"virtual_len"`
		SubStripes [4]LEDInfectedArduinoConfigStripeSetupSubStripe `json:"sub_stripes"`
	}

	LEDInfectedArduinoConfigStripeSetupSubStripe struct {
		Index     uint8 `json:"index"` // Index of the line in the stripe
		NumLEDs   uint8 `json:"num_leds"`
		Offset    uint8 `json:"offset"`
		RadialPos uint8 `json:"radial_pos"`
	}
	LEDInfectedArduinoConfigStripeConfig struct {
		Brightness        uint8 `json:"brightness"`
		MovementSpeed     int8  `json:"movement_speed"`
		PatternCorrection int8  `json:"speed_correction"`
	}
	LEDInfectedArduinoConfigStripePalette struct {
		Palette [16]*CHSV `json:"palette"`
	}
)

func (o *LEDInfectedArduinoConfigStripeSetup) getBytes() []byte {
	var buf []byte
	buf[0] = o.LedPin
	buf[1] = o.StripeType
	buf[2] = o.VirtualLen
	for _, subStripe := range o.SubStripes {
		buf = append(buf,
			subStripe.NumLEDs,
			subStripe.Offset,
			subStripe.RadialPos,
		)
	}
	return buf
}

func castConfigStripeSetup(buf []byte) (*LEDInfectedArduinoConfigStripeSetup, error) {
	o := &LEDInfectedArduinoConfigStripeSetup{
		LedPin:     buf[0],
		StripeType: buf[1],
		VirtualLen: buf[2],
	}

	for i := 0; i < 4; i++ {
		o.SubStripes[i].NumLEDs = buf[3+(i*3)]
		o.SubStripes[i].Offset = buf[4+(i*3)]
		o.SubStripes[i].RadialPos = buf[5+(i*3)]
	}
	return o, nil
}

func (o *LEDInfectedArduinoConfigStripeConfig) getBytes() []byte {
	var buf []byte
	buf[0] = o.Brightness
	buf[1] = uint8(o.MovementSpeed)
	buf[2] = uint8(o.PatternCorrection)
	return buf
}

func castConfigStripeConfig(buf []byte) (*LEDInfectedArduinoConfigStripeConfig, error) {
	return &LEDInfectedArduinoConfigStripeConfig{
		Brightness:        buf[0],
		MovementSpeed:     int8(buf[1]),
		PatternCorrection: int8(buf[2]),
	}, nil
}

func (o *LEDInfectedArduinoConfigStripePalette) getHSVByID(id uint8) *CHSV {
	for _, e := range o.Palette {
		if e.ID == id {
			return e
		}
	}
	return nil
}

func (o *LEDInfectedArduinoConfigStripePalette) getBytes() []byte {
	var sortedPaletteCHSV [16]*CHSV
	for i := 0; i < 16; i++ {
		sortedPaletteCHSV[o.Palette[i].ID-1] = o.Palette[i]
	}
	var paletteBytes []byte
	for i := 0; i < 16; i++ {
		paletteBytes = append(paletteBytes, *sortedPaletteCHSV[i].H, *sortedPaletteCHSV[i].S, *sortedPaletteCHSV[i].V)
	}
	return paletteBytes
}

func castConfigStripePalatte(buf []byte) (*LEDInfectedArduinoConfigStripePalette, error) {
	o := &LEDInfectedArduinoConfigStripePalette{}
	for i := 0; i < 16; i++ {
		byteBaseIndex := i * 3
		o.Palette[i] = &CHSV{
			ID: uint8(i + 1),
			H:  &buf[byteBaseIndex],
			S:  &buf[byteBaseIndex+1],
			V:  &buf[byteBaseIndex+2],
		}
	}
	return o, nil
}
