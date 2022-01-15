package hummelapi

import "fmt"

type (
	HummelArduinoConfig struct {
		ID      *uint8                            `json:"id"`
		DevFile *string                           `json:"dev_file"`
		Circle  *HummelArduinoLedStripeConfig    `json:"circle"`
		Radials [4]*HummelArduinoLedStripeConfig `json:"radials"`
	}
	HummelArduinoLedStripeConfig struct {
		StripeID *string                              `json:"id"`
		Pin      *HummelArduinoLedStripePinConfig     `json:"pin"`
		Base     *HummelArduinoLedStripeBaseConfig    `json:"base"`
		Palette  *HummelArduinoLedStripePaletteConfig `json:"palette"`
	}
	HummelArduinoLedStripePinConfig struct {
		LedPin     *uint8                                             `json:"led_pin"`
		VirtualLen *uint8                                             `json:"virtual_len"`
		SubStripes [4]HummelArduinoLedStripePinConfigSubStripeConfig `json:"sub_stripes"`
	}
	//fixme refactoring needed arduino config and control objects should be unified
	HummelArduinoLedStripePinConfigSubStripeConfig struct {
		Index   *uint8 `json:"index"` // Index of the line in the stripe
		NumLEDs *uint8 `json:"num_leds"`
		Offset  *uint8 `json:"offset"`
	}
	HummelArduinoLedStripeBaseConfig struct {
		Brightness        *uint8 `json:"brightness"`
		MovementSpeed     *uint8 `json:"movement_speed"`
		MovementDirection *bool  `json:"movement_direction"`
		SpeedCorrection   *uint8 `json:"speed_correction"`
	}
	HummelArduinoLedStripePaletteConfig struct {
		Palette [16]*CHSV `json:"palette"`
	}
)

func (o *HummelArduinoLedStripePaletteConfig) getHSVByID(id uint8) *CHSV {
	for _,e := range o.Palette {
		if e.ID == id {
			return e
		}
	}
	return nil
}

func (o *HummelArduinoLedStripePaletteConfig) getBytes() []byte {
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

func castStripePinConfig(buf []byte, offset int) (*HummelArduinoLedStripePinConfig, error) {
	o := &HummelArduinoLedStripePinConfig{
		LedPin:     &buf[offset+0],
		VirtualLen: &buf[offset+1],
	}

	for i := 1; i < 4; i++ {
		o.SubStripes[0].NumLEDs = &buf[offset+2+(i*2)]
		o.SubStripes[1].Offset = &buf[offset+3+(i*2)]
	}
	return o, nil
}

func castStripeBaseConfig(buf []byte, offset int) (*HummelArduinoLedStripeBaseConfig, error) {
	direction := buf[offset+2] != 0

	return &HummelArduinoLedStripeBaseConfig{
		Brightness:        &buf[offset+0],
		MovementSpeed:     &buf[offset+1],
		MovementDirection: &direction,
	}, nil
}

func castStripePalatteConfig(buf []byte, offset int) (*HummelArduinoLedStripePaletteConfig, error) {
	o := &HummelArduinoLedStripePaletteConfig{}
	for i := 0; i < 16; i++ {
		byteBaseIndex := i * 3
		o.Palette[i] = &CHSV{
			ID: uint8(i + 1),
			H:  &buf[offset+byteBaseIndex],
			S:  &buf[offset+byteBaseIndex+1],
			V:  &buf[offset+byteBaseIndex+2],
		}
	}
	return o, nil
}

func castStripePalatteConfigTyp(buf []byte, offset int) (*HummelArduinoLedStripePaletteConfig, error) {
	if len(buf) != 48 {
		return nil, fmt.Errorf("failed cast palette config, expected 48 bytes, got %d", len(buf))
	}

	o := &HummelArduinoLedStripePaletteConfig{}
	for i := 0; i < 16; i++ {
		byteBaseIndex := i * 3
		o.Palette[i] = &CHSV{
			ID: uint8(i + 1),
			H:  &buf[offset+byteBaseIndex],
			S:  &buf[offset+byteBaseIndex+1],
			V:  &buf[offset+byteBaseIndex+2],
		}
	}
	return o, nil
}
