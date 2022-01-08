package hummelapi

type (
	HummelControlObject struct {
		ID        string                        `json:"id"`
		Position  HummelControlObjectPosition   `json:"position"`
		LEDConfig HummelControlObjectLEDConfig  `json:"led_config"`
		Features  []HummelControlObjectFeatures `json:"features"`
	}

	HummelControlObjectLEDConfig struct {
		LEDSelectionView string                               `json:"led_selection_view"`
		CircleStripes    []HummelControlObjectLEDCircleStripe `json:"stripes"`
		RadialStripes    []HummelControlObjectLEDRadialStripe `json:"stripes"`
	}

	HummelControlObjectLEDCircleStripe struct {
		ID        string `json:"id"`
		NumLEDs   uint8  `json:"num_leds"`
		IsVirtual bool   `json:"is_virtual"`
	}

	HummelControlObjectLEDRadialStripe struct {
		ID      string `json:"id"`
		NumLEDs uint8  `json:"num_leds"`
	}

	HummelControlObjectFeatures struct {
		CanOverlay bool `json:"can_overlay"`
	}

	HummelControlObjectPosition struct {
		X int `json:"x"`
		Y int `json:"y"`
	}
)
