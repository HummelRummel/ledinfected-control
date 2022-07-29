package hummelapi

import "fmt"

type (
	LEDInfectedSceneEffect struct {
		AbstractID     string   `json:"abstract_id"`
		StripeIDs      []string `json:"stripe_ids"`
		EffectType     string   `json:"effect_type"`
		EffectIntValue int      `json:"effect_value"`
		EffectPresetID string   `json:"preset_id"`
		Sync           bool     `json:"sync"`
		abstract       *LEDInfectedAbstract
		preset         *LEDInfectedPreset
	}
)

func (o *LEDInfectedSceneEffect) Show() error {
	var lastErr error
	switch o.EffectType {
	case "preset", "":
		if o.preset == nil {
			return fmt.Errorf("preset (%s) is nil", o.EffectPresetID)
		}
		if o.abstract == nil {
			return fmt.Errorf("abstract (%s) is nil", o.AbstractID)
		}
		fmt.Printf("applying preset %s\n", o.EffectPresetID)
		if o.preset.Config != nil {
			// MOA 3000Grad TBD, overwrite brightness
			fmt.Printf("applying config of preset %s to abstract %s\n", o.EffectPresetID, o.AbstractID)
			if err := o.abstract.SetConfig(o.preset.Config, o.StripeIDs...); err != nil {
				lastErr = err
			}
		}
		if o.preset.Palette != nil {
			fmt.Printf("applying pallete of preset %s to abstract %s\n", o.EffectPresetID, o.AbstractID)
			if err := o.abstract.SetPalette(o.preset.Palette, o.StripeIDs...); err != nil {
				lastErr = err
			}
		}
	case "speed":
		config := o.abstract.GetArduinoStripeConfig()
		if config == nil {
			fmt.Printf("skipping speed effect for %s, no arduino online\n", o.AbstractID)
		}
		config.Config.MovementSpeed = int8(o.EffectIntValue)
		fmt.Printf("applying speed config to abstract %s\n", o.AbstractID)
		return o.abstract.SetConfig(config.Config, o.StripeIDs...)
	case "stretch":
		config := o.abstract.GetArduinoStripeConfig()
		if config == nil {
			fmt.Printf("skipping stretch effect for %s, no arduino online\n", o.AbstractID)
		}
		config.Config.Stretch = int8(o.EffectIntValue)
		fmt.Printf("applying stretch config to abstract %s\n", o.AbstractID)
		return o.abstract.SetConfig(config.Config, o.StripeIDs...)
	case "overlay":
		config := o.abstract.GetArduinoStripeConfig()
		if config == nil {
			fmt.Printf("skipping overlay effect for %s, no arduino online\n", o.AbstractID)
		}
		config.Config.OverlayRatio = uint8(o.EffectIntValue)
		fmt.Printf("applying overlay config to abstract %s\n", o.AbstractID)
		return o.abstract.SetConfig(config.Config, o.StripeIDs...)
	default:
		return fmt.Errorf("unknown effect type %s for abstract %s", o.EffectType, o.AbstractID)
	}

	if o.Sync {
		o.abstract.Sync()
	}

	return lastErr
}
