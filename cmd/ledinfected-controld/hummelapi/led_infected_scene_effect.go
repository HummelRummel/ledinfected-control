package hummelapi

import "fmt"

type (
	LEDInfectedSceneEffect struct {
		AbstractID string   `json:"abstract_id"`
		StripeIDs  []string `json:"stripe_ids"`
		PresetID   string   `json:"preset_id"`
		abstract   *LEDInfectedAbstract
		preset     *LEDInfectedPreset
	}
)

func (o *LEDInfectedSceneEffect) Show() error {
	var lastErr error
	if o.preset == nil {
		return fmt.Errorf("preset (%s) is nil", o.PresetID)
	}
	if o.abstract == nil {
		return fmt.Errorf("abstract (%s) is nil", o.AbstractID)
	}
	if o.preset.Config != nil {
		if err := o.abstract.SetConfig(o.preset.Config, o.StripeIDs...); err != nil {
			lastErr = err
		}
	}
	if o.preset.Palette != nil {
		if err := o.abstract.SetPalette(o.preset.Palette, o.StripeIDs...); err != nil {
			lastErr = err
		}
	}

	// fixme MOA TBD trigger sync
	return lastErr
}
