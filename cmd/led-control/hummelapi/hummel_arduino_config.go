package hummelapi

import "fmt"

type (
	HummelArduinoConfig struct {
		ID      uint8                            `json:"id"`
		DevFile string                           `json:"dev_file"`
		Circle  *HummelArduinoLedStripeConfig    `json:"circle"`
		Radials [4]*HummelArduinoLedStripeConfig `json:"radials"`
	}
	HummelArduinoLedStripeConfig struct {
		StripeID string                               `json:"id"`
		Pin      *HummelArduinoLedStripePinConfig     `json:"pin"`
		Base     *HummelArduinoLedStripeBaseConfig    `json:"base"`
		Palette  *HummelArduinoLedStripePaletteConfig `json:"palette"`
	}
	HummelArduinoLedStripePinConfig struct {
		LedPin  uint8 `json:"led_pin"`
		NumLEDs uint8 `json:"num_leds"`
	}
	HummelArduinoLedStripeBaseConfig struct {
		Brightness        uint8 `json:"brightness"`
		MovementSpeed     uint8 `json:"movement_speed"`
		MovementDirection bool  `json:"movement_direction"`
	}
	HummelArduinoLedStripePaletteConfig struct {
		Palette [16]CHSV `json:"palette"`
	}
)

func (o *HummelArduinoLedStripePaletteConfig) getBytes() []byte {
	var paletteBytes []byte
	for i := 0; i < 16; i++ {
		paletteBytes = append(paletteBytes, o.Palette[i].H, o.Palette[i].S, o.Palette[i].V)
	}
	return paletteBytes
}

func castStripePinConfig(buf []byte, offset int) (*HummelArduinoLedStripePinConfig, error) {
	return &HummelArduinoLedStripePinConfig{
		LedPin:  buf[offset+0],
		NumLEDs: buf[offset+1],
	}, nil
}

func castStripeBaseConfig(buf []byte, offset int) (*HummelArduinoLedStripeBaseConfig, error) {
	return &HummelArduinoLedStripeBaseConfig{
		Brightness:        buf[offset+0],
		MovementSpeed:     buf[offset+1],
		MovementDirection: buf[offset+2] != 0,
	}, nil
}

func castStripePalatteConfig(buf []byte, offset int) (*HummelArduinoLedStripePaletteConfig, error) {
	o := &HummelArduinoLedStripePaletteConfig{}
	for i := 0; i < 16; i++ {
		byteBaseIndex := i * 3
		o.Palette[i] = CHSV{
			H: buf[offset+byteBaseIndex],
			S: buf[offset+byteBaseIndex+1],
			V: buf[offset+byteBaseIndex+2],
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
		o.Palette[i] = CHSV{
			H: buf[offset+byteBaseIndex],
			S: buf[offset+byteBaseIndex+1],
			V: buf[offset+byteBaseIndex+2],
		}
	}
	return o, nil
}
