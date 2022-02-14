package hummelapi

import "fmt"

const (
	stripeTypeCircle        = 0
	stripeTypeRadial        = 1
	stripeTypeStraight      = 2
	stripeTypeVirtualCircle = 3
)

type (
	LEDInfectedArduinoVersion struct {
		Major uint8 `json:"major"`
		Minor uint8 `json:"minor"`
	}

	LEDInfectedArduinoConfigGlobalSetup struct {
		ID         uint8                     `json:"arduino_id"`
		NumStripes uint8                     `json:"num_stripes"`
		DevFile    string                    `json:"dev_file"`
		Version    LEDInfectedArduinoVersion `json:"version"`
	}

	LEDInfectedArduinoConfigStripeSetup struct {
		LedPin             uint8                                           `json:"led_pin"`
		StripeType         uint8                                           `json:"stripe_type"`
		VirtualLen         uint8                                           `json:"virtual_len"`
		StretchCalibration uint8                                           `json:"stretch_calibration"`
		SyncCalibration    uint8                                           `json:"sync_calibration"`
		OverlayID          uint8                                           `json:"overlay_id"`
		SubStripes         [4]LEDInfectedArduinoConfigStripeSetupSubStripe `json:"sub_stripes"`
	}

	LEDInfectedArduinoConfigStripeSetupSubStripe struct {
		Index     uint8 `json:"index"` // Index of the line in the stripe
		NumLEDs   uint8 `json:"num_leds"`
		Offset    uint8 `json:"offset"`
		RadialPos uint8 `json:"radial_pos"`
	}
	LEDInfectedArduinoConfigStripeConfig struct {
		Brightness    uint8 `json:"brightness"`
		MovementSpeed int8  `json:"movement_speed"`
		Stretch       int8  `json:"stretch"`
		OverlayRatio  uint8 `json:"overlay_ratio"`
		Sync          int8  `json:"sync"`
	}
	LEDInfectedArduinoConfigStripePalette struct {
		Palette [16]*CHSV `json:"palette"`
	}
)

func (o *LEDInfectedArduinoConfigGlobalSetup) String() string {
	return fmt.Sprintf("id:%d, slen: %d, dev: %s", o.ID, o.NumStripes, o.DevFile)
}

func (o *LEDInfectedArduinoConfigStripeSetup) getBytes() []byte {
	var buf []byte
	buf = append(buf, o.LedPin)
	buf = append(buf, o.StripeType)
	buf = append(buf, o.VirtualLen)
	buf = append(buf, o.StretchCalibration)
	buf = append(buf, o.SyncCalibration)
	buf = append(buf, o.OverlayID)
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
		LedPin:             buf[0],
		StripeType:         buf[1],
		VirtualLen:         buf[2],
		StretchCalibration: buf[3],
		SyncCalibration:    buf[4],
		OverlayID:          buf[5],
	}

	for i := 0; i < 4; i++ {
		o.SubStripes[i].Index = uint8(i)
		o.SubStripes[i].NumLEDs = buf[6+(i*3)]
		o.SubStripes[i].Offset = buf[7+(i*3)]
		o.SubStripes[i].RadialPos = buf[8+(i*3)]
	}
	return o, nil
}

func (o *LEDInfectedArduinoConfigStripeConfig) getBytes() []byte {
	var buf []byte
	buf = append(buf, o.Brightness)
	buf = append(buf, uint8(o.MovementSpeed))
	buf = append(buf, uint8(o.Stretch))
	buf = append(buf, o.OverlayRatio)
	buf = append(buf, uint8(o.Sync))
	return buf
}

func castConfigStripeConfig(buf []byte) (*LEDInfectedArduinoConfigStripeConfig, error) {
	return &LEDInfectedArduinoConfigStripeConfig{
		Brightness:    buf[0],
		MovementSpeed: int8(buf[1]),
		Stretch:       int8(buf[2]),
		OverlayRatio:  buf[3],
		Sync:          int8(buf[4]),
	}, nil
}

func (o *LEDInfectedArduinoConfigStripePalette) getHSVByID(id uint8) *CHSV {
	for _, e := range o.Palette {
		if e.Index == id {
			return e
		}
	}
	return nil
}

func (o *LEDInfectedArduinoConfigStripePalette) getBytes() []byte {
	var sortedPaletteCHSV [16]*CHSV
	for i := 0; i < 16; i++ {
		sortedPaletteCHSV[o.Palette[i].Index-1] = o.Palette[i]
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
			Index: uint8(i + 1),
			H:     &buf[byteBaseIndex],
			S:     &buf[byteBaseIndex+1],
			V:     &buf[byteBaseIndex+2],
		}
	}
	return o, nil
}
